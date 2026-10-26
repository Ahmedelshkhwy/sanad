-- سَنَد: core schema. Every table has row level security; health data is owner-only.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  pseudonym text check (char_length(pseudonym) <= 40),
  area text check (char_length(area) <= 80),
  role text not null default 'user' check (role in ('user', 'pharmacist', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('pharmacist', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create policy "profiles: owner reads" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy "profiles: owner updates" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin updates" on public.profiles for update to authenticated
  using ((select public.is_admin()));

-- users can never promote themselves
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role can only be changed by an admin';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.health_profiles (user_id) values (new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------- health profile
create table public.health_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_year int check (birth_year between 1900 and 2100),
  sex text check (sex in ('male', 'female')),
  pregnant boolean not null default false,
  chronic_conditions text[] not null default '{}',
  medications text[] not null default '{}',
  allergies text[] not null default '{}',
  share_with_assistant boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.health_profiles enable row level security;
create policy "health: owner only" on public.health_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- knowledge base
create table public.kb_entries (
  id text primary key,
  question text not null,
  answer text not null,
  source text not null default '',
  level text not null default 'normal' check (level in ('normal', 'pharmacist')),
  approved boolean not null default false,
  reviewed_at timestamptz,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.kb_entries enable row level security;
create policy "kb: approved are public" on public.kb_entries for select
  using (approved or (select public.is_staff()));
create policy "kb: staff write" on public.kb_entries for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create table public.kb_variants (
  id bigint generated always as identity primary key,
  entry_id text not null references public.kb_entries (id) on delete cascade,
  text text not null,
  embedding extensions.vector(768),
  unique (entry_id, text)
);
alter table public.kb_variants enable row level security;
create policy "kb variants: staff read" on public.kb_variants for select to authenticated
  using ((select public.is_staff()));
create policy "kb variants: staff write" on public.kb_variants for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create index kb_variants_embedding_idx on public.kb_variants using hnsw (embedding extensions.vector_cosine_ops);

-- nearest approved entries for a question embedding (one row per entry)
create or replace function public.match_kb(query_embedding extensions.vector(768), match_count int default 3)
returns table (id text, question text, answer text, source text, level text, similarity float)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.question, e.answer, e.source, e.level, best.similarity
  from (
    select v.entry_id, max(1 - (v.embedding operator(extensions.<=>) query_embedding)) as similarity
    from public.kb_variants v
    where v.embedding is not null
    group by v.entry_id
  ) best
  join public.kb_entries e on e.id = best.entry_id and e.approved
  order by best.similarity desc
  limit least(greatest(match_count, 1), 10);
$$;

-- -------------------------------------------------------- assistant log
create table public.assistant_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  session text not null,
  question text not null check (char_length(question) <= 500),
  mode text not null,
  ref text,
  similarity float,
  reply text not null default '',
  needs_pharmacist boolean not null default false,
  reason text not null default '',
  rating smallint check (rating in (-1, 1)),
  created_at timestamptz not null default now()
);
alter table public.assistant_logs enable row level security;
create policy "logs: owner and staff read" on public.assistant_logs for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "logs: staff update" on public.assistant_logs for update to authenticated
  using ((select public.is_staff()));
create index assistant_logs_user_idx on public.assistant_logs (user_id, created_at desc);

-- ---------------------------------------------------- help requests
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'medicine' check (kind in ('medicine', 'question')),
  medicine_name text check (char_length(medicine_name) <= 120),
  strength text check (char_length(strength) <= 60),
  area text not null check (char_length(area) between 2 and 80),
  details text not null default '' check (char_length(details) <= 1000),
  contact_phone text check (contact_phone ~ '^\+?[0-9]{8,15}$'),
  status text not null default 'new' check (status in ('new', 'reviewing', 'searching', 'found', 'not_found', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'medicine' or medicine_name is not null)
);
alter table public.help_requests enable row level security;
create policy "requests: owner reads" on public.help_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "requests: owner creates" on public.help_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'new');
create policy "requests: staff updates" on public.help_requests for update to authenticated
  using ((select public.is_staff()));
create index help_requests_user_idx on public.help_requests (user_id, created_at desc);
create index help_requests_status_idx on public.help_requests (status, created_at desc);

create table public.request_updates (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.help_requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  status text not null check (status in ('new', 'reviewing', 'searching', 'found', 'not_found', 'closed')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.request_updates enable row level security;
create policy "updates: owner and staff read" on public.request_updates for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.help_requests r where r.id = request_id and r.user_id = (select auth.uid()))
  );
create policy "updates: staff create" on public.request_updates for insert to authenticated
  with check ((select public.is_staff()) and author_id = (select auth.uid()));

-- ------------------------------------------------------- notifications
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications: owner reads" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: owner marks read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- a status update moves the request and notifies its owner
create or replace function public.apply_request_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  label text;
begin
  update public.help_requests set status = new.status, updated_at = now()
    where id = new.request_id returning user_id into owner;
  label := case new.status
    when 'reviewing' then 'طلبك بيتراجع'
    when 'searching' then 'بندوّر على الدوا'
    when 'found' then 'لقينا الدوا'
    when 'not_found' then 'ملقيناش الدوا لحد دلوقتي'
    when 'closed' then 'الطلب اتقفل'
    else 'تحديث على طلبك'
  end;
  insert into public.notifications (user_id, title, body, link)
    values (owner, label, new.note, '/requests/' || new.request_id);
  return new;
end;
$$;
create trigger request_updates_apply after insert on public.request_updates
  for each row execute function public.apply_request_update();

-- ----------------------------------------------------------- community
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_label text not null check (char_length(author_label) between 1 and 60),
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts: published are public" on public.posts for select
  using (status = 'published' or author_id = (select auth.uid()) or (select public.is_staff()));
create policy "posts: members create" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'published');
create policy "posts: author edits" on public.posts for update to authenticated
  using (author_id = (select auth.uid()) and status = 'published')
  with check (author_id = (select auth.uid()) and status = 'published');
create policy "posts: author deletes" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));
create policy "posts: staff moderates" on public.posts for update to authenticated
  using ((select public.is_staff()));
create index posts_created_idx on public.posts (status, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_label text not null check (char_length(author_label) between 1 and 60),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "comments: published are public" on public.comments for select
  using (status = 'published' or author_id = (select auth.uid()) or (select public.is_staff()));
create policy "comments: members create" on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid()) and status = 'published'
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
create policy "comments: author deletes" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));
create policy "comments: staff moderates" on public.comments for update to authenticated
  using ((select public.is_staff()));
create index comments_post_idx on public.comments (post_id, created_at);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reason text not null check (reason in ('misinformation', 'personal_data', 'abuse', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
alter table public.reports enable row level security;
create policy "reports: reporter creates" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');
create policy "reports: staff reads" on public.reports for select to authenticated
  using ((select public.is_staff()) or reporter_id = (select auth.uid()));
create policy "reports: staff resolves" on public.reports for update to authenticated
  using ((select public.is_staff()));

-- -------------------------------------------------------- partners
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind text not null default 'pharmacy' check (kind in ('pharmacy', 'clinic', 'organization')),
  area text not null default '',
  phone text,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create policy "partners: staff only" on public.partners for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- the assistant route logs through this function (works for visitors too); it caps volume per session
create or replace function public.log_assistant(
  p_session text, p_question text, p_mode text, p_ref text, p_similarity float,
  p_reply text, p_needs_pharmacist boolean, p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if (select count(*) from public.assistant_logs
      where session = p_session and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate limit';
  end if;
  insert into public.assistant_logs (user_id, session, question, mode, ref, similarity, reply, needs_pharmacist, reason)
  values ((select auth.uid()), left(p_session, 40), left(p_question, 500), left(p_mode, 20), left(p_ref, 20),
          p_similarity, left(p_reply, 6000), coalesce(p_needs_pharmacist, false), left(coalesce(p_reason, ''), 500))
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.log_assistant from public;
grant execute on function public.log_assistant to anon, authenticated;

-- foreign-key and lookup indexes
create index assistant_logs_session_idx on public.assistant_logs (session, created_at desc);
create index request_updates_request_idx on public.request_updates (request_id, created_at);
create index posts_author_idx on public.posts (author_id);
create index comments_author_idx on public.comments (author_id);
create index reports_post_idx on public.reports (post_id);
create index reports_comment_idx on public.reports (comment_id);
create index reports_reporter_idx on public.reports (reporter_id);
