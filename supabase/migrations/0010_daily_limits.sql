-- Daily limits per account so one person can't flood requests, posts or comments
-- (each new request also pings the team on Telegram). Staff are exempt.

create or replace function private.daily_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  n int;
begin
  if private.is_staff() then return new; end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 day''', tg_table_name, tg_argv[0])
    into n using who;
  if n >= tg_argv[1]::int then raise exception 'too_many'; end if;
  return new;
end;
$$;
revoke all on function private.daily_limit() from public, anon, authenticated;

create trigger help_requests_daily_limit before insert on public.help_requests
  for each row execute function private.daily_limit('user_id', '5');
create trigger posts_daily_limit before insert on public.posts
  for each row execute function private.daily_limit('author_id', '5');
create trigger comments_daily_limit before insert on public.comments
  for each row execute function private.daily_limit('author_id', '30');

create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists comments_author_created_idx on public.comments (author_id, created_at desc);
