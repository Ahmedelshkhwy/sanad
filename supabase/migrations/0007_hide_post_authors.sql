-- Posts can be published with no name. Keep author_id out of what the API returns, so an
-- anonymous post can't be linked to the same person's named posts by comparing ids.

revoke select on public.posts from anon, authenticated;
grant select (id, author_label, title, body, status, created_at) on public.posts to anon, authenticated;

revoke select on public.comments from anon, authenticated;
grant select (id, post_id, author_label, body, status, created_at) on public.comments to anon, authenticated;

-- lets the author see their own controls (delete) without reading author_id
create or replace function public.owns_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.posts p where p.id = p_post and p.author_id = (select auth.uid()));
$$;
revoke all on function public.owns_post(uuid) from public;
grant execute on function public.owns_post(uuid) to authenticated;
