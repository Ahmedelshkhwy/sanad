-- Medicine requests can be forwarded to a partner pharmacy, and the home page shows the
-- active pharmacies as Sanad's network (names and areas only; phones and notes stay staff-only).

alter table public.help_requests
  add column partner_id uuid references public.partners (id) on delete set null;
create index help_requests_partner_idx on public.help_requests (partner_id);

create or replace function public.network_pharmacies()
returns table (name text, area text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.area
  from public.partners p
  where p.active and p.kind = 'pharmacy'
  order by p.created_at
  limit 24;
$$;
revoke all on function public.network_pharmacies() from public;
grant execute on function public.network_pharmacies() to anon, authenticated;
