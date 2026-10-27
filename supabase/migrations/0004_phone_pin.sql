-- Sign-in with a phone number and a 5-digit PIN.
-- The PIN never reaches the database: the server derives the account password from it
-- with a secret key, so guessing has to go through the site, where this lockout applies.

alter table public.profiles add column phone text unique check (phone ~ '^[0-9]{8,15}$');

create table private.pin_attempts (
  phone text primary key,
  failures int not null default 0,
  locked_until timestamptz
);

-- true unless this number is locked after too many wrong PINs
create or replace function public.pin_allowed(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select locked_until is null or locked_until < now() from private.pin_attempts where phone = p_phone), true);
$$;

-- a wrong PIN: 5 in a row lock the number for 15 minutes
create or replace function public.pin_failed(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_phone !~ '^[0-9]{8,15}$' then
    return;
  end if;
  insert into private.pin_attempts as a (phone, failures) values (p_phone, 1)
  on conflict (phone) do update
    set failures = case when a.locked_until is not null and a.locked_until < now() then 1 else a.failures + 1 end,
        locked_until = case
          when a.locked_until is not null and a.locked_until < now() then null
          when a.failures + 1 >= 5 then now() + interval '15 minutes'
          else a.locked_until
        end;
end;
$$;

-- a correct PIN clears the counter, but only for the signed-in owner of that number
create or replace function public.pin_succeeded(p_phone text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.pin_attempts a
  where a.phone = p_phone
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.phone = p_phone);
$$;

revoke all on function public.pin_allowed(text) from public;
revoke all on function public.pin_failed(text) from public;
revoke all on function public.pin_succeeded(text) from public;
grant execute on function public.pin_allowed(text) to anon, authenticated;
grant execute on function public.pin_failed(text) to anon, authenticated;
grant execute on function public.pin_succeeded(text) to authenticated;

-- the phone is written by the server (service role) at sign-up; signed-in users and visitors can't set or move it
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'role can only be changed by an admin';
  end if;
  if new.phone is distinct from old.phone and (select auth.role()) in ('anon', 'authenticated') and not private.is_admin() then
    raise exception 'phone can only be set by the server';
  end if;
  return new;
end;
$$;

-- clears the lockout after an admin resets someone's PIN (server only)
create or replace function public.pin_unlock(p_phone text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.pin_attempts where phone = p_phone;
$$;
revoke all on function public.pin_unlock(text) from public, anon, authenticated;
grant execute on function public.pin_unlock(text) to service_role;
