-- Phase 1: the medicine-request lifecycle and partner pharmacy accounts, on shared
-- building blocks (regions, providers and their members, an audit log, notifications)
-- that later services reuse.
--
-- Every state change goes through one function that checks the transition, writes the
-- timeline, the audit log and the notifications in the same transaction. The app never
-- updates these tables directly, so a failed step can't leave a request half-moved.

-- ----------------------------------------------------------------- regions
-- a tree: governorate > city/centre > village. A provider covering a city sees its villages.
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'village' check (kind in ('governorate', 'city', 'village')),
  parent_id uuid references public.regions (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (parent_id, name)
);
alter table public.regions enable row level security;
create policy "regions: public read" on public.regions for select using (active or (select private.is_staff()));
create policy "regions: admin inserts" on public.regions for insert to authenticated with check ((select private.is_admin()));
create policy "regions: admin updates" on public.regions for update to authenticated using ((select private.is_admin()));
create index regions_parent_idx on public.regions (parent_id);

-- the region and every region above it
create or replace function private.region_path(p_region uuid)
returns table (id uuid, depth int)
language sql
stable
security definer
set search_path = ''
as $$
  with recursive up as (
    select r.id, r.parent_id, 0 as depth from public.regions r where r.id = p_region
    union all
    select r.id, r.parent_id, up.depth + 1 from public.regions r join up on r.id = up.parent_id where up.depth < 6
  )
  select up.id, up.depth from up;
$$;

-- "القرية، المركز، المحافظة"
create or replace function public.region_label(p_region uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(r.name, '، ' order by p.depth)
  from private.region_path(p_region) p join public.regions r on r.id = p.id;
$$;
grant execute on function public.region_label(uuid) to anon, authenticated;

insert into public.regions (name, kind) values ('المنوفية', 'governorate');
insert into public.regions (name, kind, parent_id)
  select 'شبين الكوم', 'city', id from public.regions where name = 'المنوفية';

-- --------------------------------------------------------------- providers
-- pharmacies today; clinics, labs and radiology centres use the same table later
alter table public.partners rename to providers;
alter table public.providers drop constraint partners_kind_check;
alter table public.providers add constraint providers_kind_check
  check (kind in ('pharmacy', 'clinic', 'lab', 'radiology', 'organization'));
alter table public.providers
  add column status text not null default 'pending' check (status in ('pending', 'verified', 'suspended', 'rejected')),
  add column region_id uuid references public.regions (id) on delete set null,
  add column address text not null default '' check (char_length(address) <= 200),
  add column whatsapp text check (whatsapp ~ '^[0-9]{8,15}$'),
  add column license_no text not null default '' check (char_length(license_no) <= 60),
  add column verified_at timestamptz,
  add column updated_at timestamptz not null default now();
-- the ones the admin added by hand are already known
update public.providers set status = 'verified', verified_at = now();
create index providers_region_idx on public.providers (region_id);

create table public.provider_members (
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (provider_id, user_id)
);
alter table public.provider_members enable row level security;
create index provider_members_user_idx on public.provider_members (user_id);

create table public.provider_regions (
  provider_id uuid not null references public.providers (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  primary key (provider_id, region_id)
);
alter table public.provider_regions enable row level security;
create index provider_regions_region_idx on public.provider_regions (region_id);
insert into public.provider_regions (provider_id, region_id)
  select p.id, r.id from public.providers p join public.regions r on r.name = p.area and p.kind = 'pharmacy';

create or replace function private.is_member(p_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.provider_members m where m.provider_id = p_provider and m.user_id = (select auth.uid()));
$$;
revoke all on function private.is_member(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;

drop policy "partners: staff only" on public.providers;
create policy "providers: staff and members read" on public.providers for select to authenticated
  using ((select private.is_staff()) or (select private.is_member(id)));
create policy "providers: staff inserts" on public.providers for insert to authenticated with check ((select private.is_staff()));
create policy "providers: staff updates" on public.providers for update to authenticated using ((select private.is_staff()));
create policy "members: own and staff read" on public.provider_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "coverage: staff and members read" on public.provider_regions for select to authenticated
  using ((select private.is_staff()) or (select private.is_member(provider_id)));

-- the home page network: verified pharmacies only
create or replace function public.network_pharmacies()
returns table (name text, area text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, coalesce(public.region_label(p.region_id), p.area)
  from public.providers p
  where p.active and p.status = 'verified' and p.kind = 'pharmacy'
  order by p.created_at
  limit 24;
$$;

-- --------------------------------------------------------------- audit log
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  entity text not null,
  entity_id text not null,
  action text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "audit: staff read" on public.audit_log for select to authenticated using ((select private.is_staff()));
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at);
create index audit_log_actor_idx on public.audit_log (actor_id);

create or replace function private.audit(p_entity text, p_id text, p_action text, p_data jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, entity, entity_id, action, data)
  values ((select auth.uid()), p_entity, p_id, p_action, coalesce(p_data, '{}'));
$$;

create or replace function private.notify(p_user uuid, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link)
  select p_user, p_title, coalesce(p_body, ''), p_link where p_user is not null;
$$;

-- tell everyone who works at a provider
create or replace function private.notify_provider(p_provider uuid, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, link)
  select m.user_id, p_title, coalesce(p_body, ''), p_link from public.provider_members m where m.provider_id = p_provider;
$$;

revoke all on function private.region_path(uuid) from public, anon, authenticated;
revoke all on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.notify(uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.notify_provider(uuid, text, text, text) from public, anon, authenticated;

-- ------------------------------------------------- medicine request statuses
drop trigger request_updates_apply on public.request_updates;
drop function private.apply_request_update();

alter table public.help_requests drop constraint help_requests_status_check;
alter table public.request_updates drop constraint request_updates_status_check;

update public.help_requests set status = case status
  when 'new' then 'pending_review' when 'reviewing' then 'pending_review' when 'searching' then 'approved'
  when 'found' then 'available' when 'not_found' then 'expired' when 'closed' then 'completed' else status end;
update public.request_updates set status = case status
  when 'new' then 'pending_review' when 'reviewing' then 'pending_review' when 'searching' then 'approved'
  when 'found' then 'available' when 'not_found' then 'expired' when 'closed' then 'completed' else status end;

alter table public.help_requests add constraint help_requests_status_check check (status in
  ('pending_review', 'approved', 'published', 'available', 'completed', 'rejected', 'expired', 'cancelled'));
alter table public.request_updates add constraint request_updates_status_check check (status in
  ('pending_review', 'approved', 'published', 'available', 'completed', 'rejected', 'expired', 'cancelled'));
alter table public.help_requests alter column status set default 'pending_review';

drop index public.help_requests_partner_idx;
alter table public.help_requests
  drop column partner_id,
  add column region_id uuid references public.regions (id) on delete set null,
  add column public_note text not null default '' check (char_length(public_note) <= 500),
  add column expires_at timestamptz;
create index help_requests_region_idx on public.help_requests (region_id);

-- writes go through the functions below
drop policy "requests: owner creates" on public.help_requests;
create policy "requests: owner creates" on public.help_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending_review' and public_note = '' and expires_at is null);
drop policy "requests: staff updates" on public.help_requests;
drop policy "updates: staff create" on public.request_updates;

-- which pharmacies a request was published to, and what each one answered
create table public.request_targets (
  request_id uuid not null references public.help_requests (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  response text check (response in ('available', 'unavailable')),
  responded_at timestamptz,
  responded_by uuid references public.profiles (id) on delete set null,
  note text not null default '' check (char_length(note) <= 300),
  primary key (request_id, provider_id)
);
alter table public.request_targets enable row level security;
create policy "targets: staff read" on public.request_targets for select to authenticated using ((select private.is_staff()));
create index request_targets_provider_idx on public.request_targets (provider_id, created_at desc);
create index request_targets_responder_idx on public.request_targets (responded_by);

create or replace function private.can_move(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending_review' then p_to in ('approved', 'rejected', 'cancelled')
    when 'approved' then p_to in ('published', 'rejected', 'cancelled')
    when 'published' then p_to in ('available', 'completed', 'expired', 'cancelled')
    when 'available' then p_to in ('published', 'completed', 'expired', 'cancelled')
    else false
  end;
$$;

-- the one place a request changes status: timeline + audit + owner notification
create or replace function private.move_request(p_request uuid, p_to text, p_note text, p_notify boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.help_requests;
begin
  select * into r from public.help_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if not private.can_move(r.status, p_to) then
    raise exception 'invalid_transition' using detail = r.status || ' -> ' || p_to;
  end if;
  update public.help_requests set status = p_to, updated_at = now() where id = p_request;
  insert into public.request_updates (request_id, author_id, status, note)
    values (p_request, (select auth.uid()), p_to, coalesce(p_note, ''));
  perform private.audit('help_request', p_request::text, 'status', jsonb_build_object('from', r.status, 'to', p_to));
  if p_notify then
    perform private.notify(r.user_id,
      case p_to
        when 'approved' then 'اتوافق على طلبك'
        when 'published' then 'طلبك اتبعت للصيدليات'
        when 'available' then 'الدوا متوفر في صيدلية'
        when 'completed' then 'طلبك اكتمل'
        when 'rejected' then 'طلبك اترفض'
        when 'expired' then 'طلبك انتهى'
        when 'cancelled' then 'طلبك اتلغى'
        else 'تحديث على طلبك'
      end,
      p_note, '/requests/' || p_request);
  end if;
end;
$$;
revoke all on function private.can_move(text, text) from public, anon, authenticated;
revoke all on function private.move_request(uuid, text, text, boolean) from public, anon, authenticated;

-- staff: approve (with the note pharmacies will see) or reject
create or replace function public.review_request(p_request uuid, p_decision text, p_note text default '', p_public_note text default '', p_region uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then raise exception 'forbidden'; end if;
  if p_decision = 'approve' then
    update public.help_requests
      set public_note = left(coalesce(p_public_note, ''), 500), region_id = coalesce(p_region, region_id)
      where id = p_request;
    perform private.move_request(p_request, 'approved', p_note);
  elsif p_decision = 'reject' then
    perform private.move_request(p_request, 'rejected', p_note);
  else
    raise exception 'invalid_input';
  end if;
end;
$$;

-- staff: send an approved request to pharmacies. With no list, every verified pharmacy
-- covering the request's region (or a region above it) gets it. Re-running adds more.
create or replace function public.publish_request(p_request uuid, p_providers uuid[] default null, p_days int default 3)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.help_requests;
  added uuid[];
  pid uuid;
begin
  if not private.is_staff() then raise exception 'forbidden'; end if;
  select * into r from public.help_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if r.status not in ('approved', 'published', 'available') then raise exception 'invalid_transition' using detail = r.status || ' -> published'; end if;

  with chosen as (
    select p.id from public.providers p
    where p.active and p.status = 'verified' and p.kind = 'pharmacy'
      and case
        when p_providers is not null then p.id = any (p_providers)
        else exists (
          select 1 from public.provider_regions pr
          where pr.provider_id = p.id and pr.region_id in (select id from private.region_path(r.region_id))
        )
      end
  ), inserted as (
    insert into public.request_targets (request_id, provider_id)
    select p_request, id from chosen
    on conflict do nothing
    returning provider_id
  )
  select coalesce(array_agg(provider_id), '{}') into added from inserted;

  if cardinality(added) = 0 and not exists (select 1 from public.request_targets t where t.request_id = p_request) then
    raise exception 'no_providers';
  end if;

  foreach pid in array added loop
    perform private.notify_provider(pid, 'طلب دوا جديد',
      coalesce(r.medicine_name, '') || coalesce(' ' || r.strength, ''), '/portal');
  end loop;

  if r.status = 'approved' then
    update public.help_requests set expires_at = now() + make_interval(days => greatest(1, least(p_days, 14))) where id = p_request;
    perform private.move_request(p_request, 'published', '');
  end if;
  perform private.audit('help_request', p_request::text, 'published', jsonb_build_object('added', cardinality(added)));
  return cardinality(added);
end;
$$;

-- a pharmacy answers. One row per pharmacy and request; changing the answer is logged.
-- The owner hears about it when it changes what they can rely on.
create or replace function public.respond_request(p_request uuid, p_provider uuid, p_response text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.help_requests;
  t public.request_targets;
  pname text;
begin
  if p_response not in ('available', 'unavailable') then raise exception 'invalid_input'; end if;
  if not exists (
    select 1 from public.provider_members m join public.providers p on p.id = m.provider_id
    where m.provider_id = p_provider and m.user_id = (select auth.uid()) and p.status = 'verified' and p.active
  ) then raise exception 'forbidden'; end if;

  select * into r from public.help_requests where id = p_request for update;
  select * into t from public.request_targets where request_id = p_request and provider_id = p_provider for update;
  if r.id is null or t.request_id is null then raise exception 'not_found'; end if;
  if r.status not in ('published', 'available') or r.expires_at < now() then raise exception 'closed'; end if;
  if t.response is not distinct from p_response and t.note = coalesce(p_note, '') then return; end if;

  update public.request_targets
    set response = p_response, responded_at = now(), responded_by = (select auth.uid()), note = left(coalesce(p_note, ''), 300),
        seen_at = coalesce(seen_at, now())
    where request_id = p_request and provider_id = p_provider;
  perform private.audit('help_request', p_request::text, 'response',
    jsonb_build_object('provider', p_provider, 'from', t.response, 'to', p_response));

  select name into pname from public.providers where id = p_provider;
  if p_response = 'available' and r.status = 'published' then
    perform private.move_request(p_request, 'available', 'صيدلية ' || pname || ' أكّدت إن الدوا عندها.');
  elsif p_response = 'unavailable' and t.response = 'available' and r.status = 'available'
    and not exists (select 1 from public.request_targets x where x.request_id = p_request and x.response = 'available') then
    perform private.move_request(p_request, 'published', 'صيدلية ' || pname || ' بلّغت إن الدوا خلص عندها. لسه بندوّر.');
  end if;
end;
$$;

-- the owner closes their request (got it / don't need it), or staff do
create or replace function public.finish_request(p_request uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  if p_status not in ('completed', 'cancelled') then raise exception 'invalid_input'; end if;
  select user_id into owner from public.help_requests where id = p_request;
  if owner is null then raise exception 'not_found'; end if;
  if owner <> (select auth.uid()) and not private.is_staff() then raise exception 'forbidden'; end if;
  perform private.move_request(p_request, p_status, p_note, owner <> (select auth.uid()));
end;
$$;

-- published requests past their date close themselves; called when the relevant pages load
create or replace function public.expire_requests()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid;
  n int := 0;
begin
  for rid in
    select id from public.help_requests
    where status in ('published', 'available') and expires_at < now()
    for update skip locked
  loop
    perform private.move_request(rid, 'expired',
      case when exists (select 1 from public.request_targets t where t.request_id = rid and t.response = 'available')
        then 'مدة الطلب خلصت.' else 'مدة الطلب خلصت ومحدش من الصيدليات أكّد إن الدوا عنده.' end);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- what the owner (or staff) sees: pharmacies whose current answer is "available"
create or replace function public.request_offers(p_request uuid)
returns table (provider_name text, phone text, whatsapp text, address text, area text, responded_at timestamptz, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.phone, p.whatsapp, p.address, coalesce(public.region_label(p.region_id), p.area), t.responded_at, t.note
  from public.request_targets t
  join public.help_requests r on r.id = t.request_id
  join public.providers p on p.id = t.provider_id
  where t.request_id = p_request and t.response = 'available'
    and (r.user_id = (select auth.uid()) or private.is_staff())
  order by t.responded_at;
$$;

-- a pharmacy's inbox: only what it needs to answer, never who asked
create or replace function public.provider_inbox(p_provider uuid)
returns table (request_id uuid, medicine_name text, strength text, area text, public_note text, status text,
               published_at timestamptz, expires_at timestamptz, response text, responded_at timestamptz, note text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.provider_members m join public.providers p on p.id = m.provider_id
    where m.provider_id = p_provider and m.user_id = (select auth.uid()) and p.status = 'verified' and p.active
  ) then raise exception 'forbidden'; end if;
  update public.request_targets set seen_at = now() where provider_id = p_provider and seen_at is null;
  return query
    select r.id, r.medicine_name, r.strength, coalesce(public.region_label(r.region_id), r.area), r.public_note,
           case when r.status in ('published', 'available') and r.expires_at < now() then 'expired' else r.status end,
           t.created_at, r.expires_at, t.response, t.responded_at, t.note
    from public.request_targets t join public.help_requests r on r.id = t.request_id
    where t.provider_id = p_provider and t.created_at > now() - interval '60 days'
    order by (r.status in ('published', 'available') and r.expires_at >= now()) desc, t.created_at desc
    limit 200;
end;
$$;

-- ----------------------------------------------------------- provider accounts
-- anyone signed in can apply; nothing sensitive opens until staff verify it
create or replace function public.apply_provider(p_name text, p_region uuid, p_address text, p_phone text, p_whatsapp text, p_license text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  if (select auth.uid()) is null then raise exception 'forbidden'; end if;
  if exists (
    select 1 from public.provider_members m join public.providers p on p.id = m.provider_id
    where m.user_id = (select auth.uid()) and p.status = 'pending'
  ) then raise exception 'already_pending'; end if;
  insert into public.providers (name, kind, area, region_id, address, phone, whatsapp, license_no, status)
    values (p_name, 'pharmacy', coalesce((select name from public.regions where id = p_region), ''), p_region,
            coalesce(p_address, ''), nullif(p_phone, ''), nullif(p_whatsapp, ''), coalesce(p_license, ''), 'pending')
    returning id into pid;
  insert into public.provider_members (provider_id, user_id, role) values (pid, (select auth.uid()), 'owner');
  if p_region is not null then insert into public.provider_regions values (pid, p_region); end if;
  perform private.audit('provider', pid::text, 'applied', '{}');
  return pid;
end;
$$;

-- contact details and coverage, by the provider's owner or staff (name and status stay with staff)
create or replace function public.update_provider(p_provider uuid, p_address text, p_phone text, p_whatsapp text, p_regions uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() and not exists (
    select 1 from public.provider_members m where m.provider_id = p_provider and m.user_id = (select auth.uid()) and m.role = 'owner'
  ) then raise exception 'forbidden'; end if;
  update public.providers
    set address = coalesce(p_address, ''), phone = nullif(p_phone, ''), whatsapp = nullif(p_whatsapp, ''), updated_at = now(),
        region_id = coalesce(p_regions[1], region_id)
    where id = p_provider;
  if p_regions is not null then
    delete from public.provider_regions where provider_id = p_provider and region_id <> all (p_regions);
    insert into public.provider_regions (provider_id, region_id)
      select p_provider, x from unnest(p_regions) x where exists (select 1 from public.regions g where g.id = x)
      on conflict do nothing;
  end if;
  perform private.audit('provider', p_provider::text, 'updated', jsonb_build_object('regions', p_regions));
end;
$$;

create or replace function public.set_provider_status(p_provider uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old text;
begin
  if not private.is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('pending', 'verified', 'suspended', 'rejected') then raise exception 'invalid_input'; end if;
  select status into old from public.providers where id = p_provider for update;
  if old is null then raise exception 'not_found'; end if;
  if old = p_status then return; end if;
  update public.providers
    set status = p_status, updated_at = now(), verified_at = case when p_status = 'verified' then now() else verified_at end
    where id = p_provider;
  perform private.audit('provider', p_provider::text, 'status', jsonb_build_object('from', old, 'to', p_status, 'note', p_note));
  perform private.notify_provider(p_provider,
    case p_status
      when 'verified' then 'حساب الصيدلية اتوثّق'
      when 'suspended' then 'حساب الصيدلية اتوقف'
      when 'rejected' then 'طلب الانضمام اترفض'
      else 'حساب الصيدلية بيتراجع'
    end, p_note, '/portal');
end;
$$;

-- staff link an existing account (by its phone number) to a provider
create or replace function public.add_provider_member(p_provider uuid, p_phone text, p_role text default 'owner')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  if not private.is_staff() then raise exception 'forbidden'; end if;
  select id into uid from public.profiles where phone = p_phone;
  if uid is null then raise exception 'no_account'; end if;
  insert into public.provider_members (provider_id, user_id, role)
    values (p_provider, uid, case when p_role = 'staff' then 'staff' else 'owner' end)
    on conflict do nothing;
  perform private.audit('provider', p_provider::text, 'member_added', jsonb_build_object('user', uid));
  perform private.notify(uid, 'اتضافت لحساب صيدلية', '', '/portal');
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'review_request(uuid, text, text, text, uuid)', 'publish_request(uuid, uuid[], int)',
    'respond_request(uuid, uuid, text, text)', 'finish_request(uuid, text, text)', 'expire_requests()',
    'request_offers(uuid)', 'provider_inbox(uuid)', 'apply_provider(text, uuid, text, text, text, text)',
    'update_provider(uuid, text, text, text, uuid[])', 'set_provider_status(uuid, text, text)',
    'add_provider_member(uuid, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
