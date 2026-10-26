-- Move internal helpers out of the exposed API schema and tighten policies.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
alter function public.guard_profile_role() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.apply_request_update() set schema private;

-- the helpers reference each other by name: keep them resolving after the move
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
  return new;
end;
$$;

revoke all on function private.guard_profile_role() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.apply_request_update() from public, anon, authenticated;
revoke all on function private.is_staff() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- one policy per role and action
drop policy "kb: staff write" on public.kb_entries;
create policy "kb: staff inserts" on public.kb_entries for insert to authenticated with check ((select private.is_staff()));
create policy "kb: staff updates" on public.kb_entries for update to authenticated using ((select private.is_staff()));
create policy "kb: staff deletes" on public.kb_entries for delete to authenticated using ((select private.is_staff()));

drop policy "kb variants: staff read" on public.kb_variants;

drop policy "posts: author edits" on public.posts;
drop policy "posts: staff moderates" on public.posts;
create policy "posts: author edits or staff moderates" on public.posts for update to authenticated
  using ((author_id = (select auth.uid()) and status = 'published') or (select private.is_staff()))
  with check ((author_id = (select auth.uid()) and status = 'published') or (select private.is_staff()));

drop policy "profiles: owner updates" on public.profiles;
drop policy "profiles: admin updates" on public.profiles;
create policy "profiles: owner or admin updates" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create index request_updates_author_idx on public.request_updates (author_id);
