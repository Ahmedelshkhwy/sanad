-- Photos on a medicine request: the medicine box, or the prescription.
-- The bucket is private and has no storage policies, so only the server (service role)
-- reads or writes files. Who may see which photo is decided here, in the tables below:
--   the owner and staff see every photo of a request;
--   a pharmacy sees a photo only when it is shared (box photos, never prescriptions),
--   the request was sent to it, and the request is still open.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create table public.request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  kind text not null check (kind in ('box', 'prescription')),
  path text not null unique,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind = 'box' or not shared)
);
alter table public.request_photos enable row level security;
create index request_photos_request_idx on public.request_photos (request_id);

create policy "photos: owner and staff read" on public.request_photos for select to authenticated
  using ((select private.is_staff()) or exists (
    select 1 from public.help_requests r where r.id = request_id and r.user_id = (select auth.uid())
  ));
-- inserts and deletes come from the server only; staff choose whether a box photo is shared
create policy "photos: staff update" on public.request_photos for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- the photos a pharmacy may see: shared, on a request sent to it, still open
create or replace function public.provider_photos(p_provider uuid)
returns table (request_id uuid, path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.provider_members m join public.providers p on p.id = m.provider_id
    where m.provider_id = p_provider and m.user_id = (select auth.uid()) and p.status = 'verified' and p.active
  ) then raise exception 'forbidden'; end if;
  return query
    select ph.request_id, ph.path
    from public.request_photos ph
    join public.request_targets t on t.request_id = ph.request_id and t.provider_id = p_provider
    join public.help_requests r on r.id = ph.request_id
    where ph.shared and r.status in ('published', 'available') and (r.expires_at is null or r.expires_at >= now());
end;
$$;
revoke all on function public.provider_photos(uuid) from public, anon;
grant execute on function public.provider_photos(uuid) to authenticated;

-- photos of requests closed more than 30 days ago, or older than 90 days: the server deletes the files, then the rows
create or replace function public.stale_photos()
returns table (id uuid, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select ph.id, ph.path
  from public.request_photos ph join public.help_requests r on r.id = ph.request_id
  where (r.status in ('completed', 'rejected', 'expired', 'cancelled') and r.updated_at < now() - interval '30 days')
     or ph.created_at < now() - interval '90 days'
  limit 200;
$$;
revoke all on function public.stale_photos() from public, anon, authenticated;
grant execute on function public.stale_photos() to service_role;

-- staff write the medicine name read from a photo before the request goes to pharmacies
create or replace function public.rename_request(p_request uuid, p_name text, p_strength text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_staff()) then raise exception 'forbidden'; end if;
  if char_length(trim(p_name)) not between 2 and 120 then raise exception 'invalid name'; end if;
  update public.help_requests
    set medicine_name = trim(p_name), strength = nullif(left(trim(coalesce(p_strength, '')), 60), ''), updated_at = now()
    where id = p_request and status = 'pending_review';
  perform private.audit('request', p_request::text, 'rename', jsonb_build_object('name', trim(p_name)));
end;
$$;
revoke all on function public.rename_request(uuid, text, text) from public, anon;
grant execute on function public.rename_request(uuid, text, text) to authenticated;
