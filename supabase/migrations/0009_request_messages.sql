-- Messages on a request: staff and the targeted pharmacies can write to the requester,
-- and every pharmacy that confirms the medicine notifies the requester by name.

alter table public.request_updates
  add column kind text not null default 'status' check (kind in ('status', 'message')),
  add column source text not null default '' check (char_length(source) <= 120);

drop function private.move_request(uuid, text, text, boolean);
create function private.move_request(p_request uuid, p_to text, p_note text, p_notify boolean default true, p_source text default '')
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
  insert into public.request_updates (request_id, author_id, status, note, source)
    values (p_request, (select auth.uid()), p_to, coalesce(p_note, ''), coalesce(p_source, ''));
  perform private.audit('help_request', p_request::text, 'status', jsonb_build_object('from', r.status, 'to', p_to));
  if p_notify then
    perform private.notify(r.user_id,
      case p_to
        when 'approved' then 'اتوافق على طلبك'
        when 'published' then 'طلبك اتبعت للصيدليات'
        when 'available' then 'الدوا متوفر في ' || coalesce(nullif(p_source, ''), 'صيدلية')
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
revoke all on function private.move_request(uuid, text, text, boolean, text) from public, anon, authenticated;

/** A timeline message plus a notification, without changing the status. */
create function private.post_message(p_request uuid, p_source text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.help_requests;
begin
  select * into r from public.help_requests where id = p_request;
  insert into public.request_updates (request_id, author_id, status, note, kind, source)
    values (p_request, (select auth.uid()), r.status, p_note, 'message', p_source);
  perform private.notify(r.user_id, 'رسالة من ' || p_source, p_note, '/requests/' || p_request);
end;
$$;
revoke all on function private.post_message(uuid, text, text) from public, anon, authenticated;

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
  msg text;
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

  select 'صيدلية ' || name into pname from public.providers where id = p_provider;
  msg := pname || ' أكّدت إن الدوا عندها.' || coalesce(nullif(E'\n' || left(coalesce(p_note, ''), 300), E'\n'), '');
  if p_response = 'available' and t.response is distinct from 'available' then
    -- every pharmacy that confirms tells the requester, the first one also moves the status
    if r.status = 'published' then
      perform private.move_request(p_request, 'available', msg, true, pname);
    else
      insert into public.request_updates (request_id, author_id, status, note, source)
        values (p_request, (select auth.uid()), 'available', msg, pname);
      perform private.notify(r.user_id, 'الدوا متوفر في ' || pname, msg, '/requests/' || p_request);
    end if;
  elsif p_response = 'unavailable' and t.response = 'available' and r.status = 'available'
    and not exists (select 1 from public.request_targets x where x.request_id = p_request and x.response = 'available') then
    perform private.move_request(p_request, 'published', pname || ' بلّغت إن الدوا خلص عندها. لسه بندوّر.', true, pname);
  end if;
end;
$$;

/** Staff write freely to the requester, at any stage. */
create function public.message_request(p_request uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_note, ''))) < 2 then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.help_requests where id = p_request) then raise exception 'not_found'; end if;
  perform private.post_message(p_request, 'فريق سَنَد', left(trim(p_note), 1000));
  perform private.audit('help_request', p_request::text, 'message', '{}');
end;
$$;

/** A targeted pharmacy writes to the requester while the request is open (a few times at most). */
create function public.provider_message(p_request uuid, p_provider uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.help_requests;
  pname text;
begin
  if not exists (
    select 1 from public.provider_members m join public.providers p on p.id = m.provider_id
    where m.provider_id = p_provider and m.user_id = (select auth.uid()) and p.status = 'verified' and p.active
  ) then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_note, ''))) < 2 then raise exception 'invalid_input'; end if;
  select * into r from public.help_requests where id = p_request;
  if r.id is null or not exists (select 1 from public.request_targets t where t.request_id = p_request and t.provider_id = p_provider) then
    raise exception 'not_found';
  end if;
  if r.status not in ('published', 'available') or r.expires_at < now() then raise exception 'closed'; end if;
  if (select count(*) from public.audit_log a
      where a.entity_id = p_request::text and a.action = 'provider_message' and a.data ->> 'provider' = p_provider::text) >= 5 then
    raise exception 'too_many';
  end if;
  select 'صيدلية ' || name into pname from public.providers where id = p_provider;
  perform private.post_message(p_request, pname, left(trim(p_note), 300));
  perform private.audit('help_request', p_request::text, 'provider_message', jsonb_build_object('provider', p_provider));
end;
$$;

revoke all on function public.message_request(uuid, text) from public, anon;
revoke all on function public.provider_message(uuid, uuid, text) from public, anon;
grant execute on function public.message_request(uuid, text) to authenticated;
grant execute on function public.provider_message(uuid, uuid, text) to authenticated;
