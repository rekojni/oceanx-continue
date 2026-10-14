-- Apply after the base schema. No public object reads or browser writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oceanx-evidence', 'oceanx-evidence', false, 300000, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 300000, allowed_mime_types = array['image/jpeg'];

create policy "OceanX admins read evidence" on storage.objects
for select to authenticated
using (bucket_id = 'oceanx-evidence' and public.has_role(auth.uid(), 'admin'));

-- Admins may read research values, but the session capability token stays server-only.
revoke select on public.experiment_sessions from authenticated;
grant select (id, participant_code, assigned_group, is_demo, started_at,
 lesson_completed_at, interaction_completed_at, interaction_answers, activity_status,
 activity_completed_at, observation_text, parent_help, quiz_completed_at, quiz_answers,
 comprehension_score, comprehension_total, meaningfulness, decision_reached_at,
 continuation_choice, next_module_started_at, classified_status, created_at, updated_at)
on public.experiment_sessions to authenticated;
revoke all on public.experiment_sessions, public.experiment_events, public.user_roles from anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- Serial allocation + caller-generated id/token make lost responses retryable.
create function public.oceanx_create_session(_id uuid, _token uuid, _code text, _demo boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.experiment_sessions; a integer; b integer; g text;
begin
 perform pg_advisory_xact_lock(615130);
 select * into s from public.experiment_sessions where id = _id;
 if found then
   if s.session_token <> _token then raise exception 'Session not found'; end if;
   return jsonb_build_object('sessionId', s.id, 'token', s.session_token, 'group', s.assigned_group);
 end if;
 if length(_code) > 40 then raise exception 'Participant code too long'; end if;
 select count(*) filter (where assigned_group = 'A'), count(*) filter (where assigned_group = 'B')
 into a, b from public.experiment_sessions where is_demo = _demo;
 g := case when a < b then 'A' when b < a then 'B' when random() < 0.5 then 'A' else 'B' end;
 insert into public.experiment_sessions (id, session_token, participant_code, assigned_group, is_demo)
 values (_id, _token, nullif(trim(_code), ''), g, _demo) returning * into s;
 insert into public.experiment_events (session_id, event_name, payload)
 values (s.id, 'session_started', jsonb_build_object('group', g));
 return jsonb_build_object('sessionId', s.id, 'token', s.session_token, 'group', g);
end $$;
revoke all on function public.oceanx_create_session(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.oceanx_create_session(uuid, uuid, text, boolean) to service_role;

-- A row lock makes each stage and its audit event one atomic, retry-safe write.
create function public.oceanx_save_step(_id uuid, _token uuid, _step text, _payload jsonb default '{}')
returns boolean language plpgsql security definer set search_path = public as $$
declare s public.experiment_sessions; t timestamptz := clock_timestamp(); score integer;
begin
 select * into s from public.experiment_sessions where id = _id and session_token = _token for update;
 if not found then raise exception 'Session not found'; end if;
 if _step = 'lesson_completed' then
   if s.lesson_completed_at is not null then return true; end if;
   update public.experiment_sessions set lesson_completed_at = t where id = _id;
 elsif _step = 'interaction_completed' then
   if s.lesson_completed_at is null then raise exception 'Complete the lesson first'; end if;
   if s.interaction_completed_at is not null then return true; end if;
   if not (_payload->'answers' ?& array['bottle','apple','crisps']) then raise exception 'Answer all sorting items'; end if;
   update public.experiment_sessions set interaction_completed_at = t, interaction_answers = _payload->'answers' where id = _id;
 elsif _step in ('activity_completed', 'activity_skipped') then
   if s.assigned_group <> 'B' or s.interaction_completed_at is null then raise exception 'Activity unavailable'; end if;
   if s.activity_status is not null then return true; end if;
   if _step = 'activity_completed' and length(trim(coalesce(_payload->>'observationText', ''))) < 5 then raise exception 'Write an observation'; end if;
   update public.experiment_sessions set activity_status = case when _step = 'activity_completed' then 'completed' else 'skipped' end,
   activity_completed_at = t, observation_text = case when _step = 'activity_completed' then trim(_payload->>'observationText') else null end where id = _id;
   if _step = 'activity_completed' and _payload->>'storagePath' is not null then
     insert into public.experiment_events (session_id, event_name, payload)
     values (_id, 'activity_photo_submitted', jsonb_build_object('storagePath', _payload->>'storagePath'));
   end if;
 elsif _step = 'quiz_completed' then
   if s.interaction_completed_at is null or (s.assigned_group = 'B' and s.activity_status is null) then raise exception 'Complete the earlier steps first'; end if;
   if s.quiz_completed_at is not null then return true; end if;
   score := (case when _payload->'answers'->>0 = '1' then 1 else 0 end)
     + (case when _payload->'answers'->>1 = '0' then 1 else 0 end)
     + (case when _payload->'answers'->>2 = '1' then 1 else 0 end);
   update public.experiment_sessions set quiz_completed_at = t, quiz_answers = _payload->'answers',
   comprehension_score = score, meaningfulness = (_payload->>'meaningfulness')::smallint,
   parent_help = (_payload->>'parentHelp')::smallint where id = _id;
 elsif _step = 'decision_viewed' then
   if s.quiz_completed_at is null then raise exception 'Complete the quiz first'; end if;
   if s.decision_reached_at is not null then return true; end if;
   update public.experiment_sessions set decision_reached_at = t where id = _id;
 elsif _step = 'continuation_chosen' then
   if s.decision_reached_at is null then raise exception 'Open the decision screen first'; end if;
   if s.continuation_choice is not null then return true; end if;
   update public.experiment_sessions set continuation_choice = _payload->>'choice' where id = _id;
 elsif _step = 'next_module_started' then
   if s.decision_reached_at is null or s.continuation_choice is distinct from 'continue' then raise exception 'Choose the next journey first'; end if;
   if s.next_module_started_at is not null then return true; end if;
   update public.experiment_sessions set next_module_started_at = t where id = _id;
 else
   raise exception 'Unknown experiment step';
 end if;
 insert into public.experiment_events (session_id, event_name, payload)
 values (_id, _step, _payload - 'storagePath');
 return true;
end $$;
revoke all on function public.oceanx_save_step(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.oceanx_save_step(uuid, uuid, text, jsonb) to service_role;
