-- Published doctor consultations (open datasets such as Shifaa, Apache-2.0), cleaned of
-- patient and doctor names. They are reference material for the assistant, not
-- pharmacist-approved answers: the assistant may lean on them, but never shows them as approved.

create table public.ref_consultations (
  id text primary key,
  title text not null,
  question text not null,
  answer text not null,
  topic text not null default '',
  section text not null default '',
  year int,
  dataset text not null default 'shifaa',
  embedding extensions.halfvec(768)
);

alter table public.ref_consultations enable row level security;

create policy "staff read references" on public.ref_consultations
  for select to authenticated using ((select private.is_staff()));

create index ref_consultations_embedding_idx on public.ref_consultations
  using hnsw (embedding extensions.halfvec_cosine_ops);

-- nearest consultations to a question; readable by the assistant for anyone
create or replace function public.match_ref(query_embedding extensions.vector(768), match_count int default 3)
returns table (id text, title text, question text, answer text, topic text, similarity float)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.title, r.question, r.answer, r.topic,
         1 - (r.embedding operator(extensions.<=>) query_embedding::extensions.halfvec(768)) as similarity
  from public.ref_consultations r
  where r.embedding is not null
  order by r.embedding operator(extensions.<=>) query_embedding::extensions.halfvec(768)
  limit least(greatest(match_count, 1), 5);
$$;
revoke all on function public.match_ref(extensions.vector, int) from public;
grant execute on function public.match_ref(extensions.vector, int) to anon, authenticated;
