-- Caps that protect the free model quota and the pharmacist's phone.

-- true while this session (and the whole site) is under its limits
create or replace function public.assistant_allowed(p_session text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.assistant_logs where session = p_session and created_at > now() - interval '1 hour') < 40
    and (select count(*) from public.assistant_logs where created_at > now() - interval '1 day') < 1500;
$$;
revoke all on function public.assistant_allowed from public;
grant execute on function public.assistant_allowed to anon, authenticated;

-- call-back requests: only the session and time are kept here, the phone number goes to Telegram
create table public.callback_requests (
  id bigint generated always as identity primary key,
  session text not null,
  created_at timestamptz not null default now()
);
alter table public.callback_requests enable row level security;
create index callback_requests_session_idx on public.callback_requests (session, created_at desc);

create or replace function public.claim_callback_slot(p_session text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.callback_requests where session = p_session and created_at > now() - interval '1 hour') >= 3 then
    return false;
  end if;
  insert into public.callback_requests (session) values (left(p_session, 40));
  return true;
end;
$$;
revoke all on function public.claim_callback_slot from public;
grant execute on function public.claim_callback_slot to anon, authenticated;
