-- Roles (kept in a separate table per security best practice)
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can read their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Experiment sessions (anonymous learners; written only by server functions via service role)
create table public.experiment_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token uuid not null default gen_random_uuid() unique,
  participant_code text,
  assigned_group text not null check (assigned_group in ('A','B')),
  is_demo boolean not null default false,
  started_at timestamptz not null default now(),
  lesson_completed_at timestamptz,
  interaction_completed_at timestamptz,
  interaction_answers jsonb,
  activity_status text check (activity_status in ('completed','skipped')),
  activity_completed_at timestamptz,
  observation_text text,
  parent_help smallint check (parent_help in (0,1,2)),
  quiz_completed_at timestamptz,
  quiz_answers jsonb,
  comprehension_score smallint,
  comprehension_total smallint not null default 3,
  meaningfulness smallint check (meaningfulness between 1 and 5),
  decision_reached_at timestamptz,
  continuation_choice text check (continuation_choice in ('continue','finish')),
  next_module_started_at timestamptz,
  classified_status text not null default 'In Progress' check (classified_status in ('In Progress','Continued','Finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Researchers (admins) may read; learners never touch the Data API directly
grant select on public.experiment_sessions to authenticated;
grant all on public.experiment_sessions to service_role;

alter table public.experiment_sessions enable row level security;

create policy "Admins can read sessions"
  on public.experiment_sessions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Automated classification + updated_at maintenance
create or replace function public.classify_session()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.continuation_choice = 'continue' and new.next_module_started_at is not null then
    new.classified_status := 'Continued';
  elsif new.continuation_choice = 'finish' then
    new.classified_status := 'Finished';
  else
    new.classified_status := 'In Progress';
  end if;
  return new;
end
$$;

create trigger classify_experiment_session
  before insert or update on public.experiment_sessions
  for each row execute function public.classify_session();

-- Event log for measurable stage evidence
create table public.experiment_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.experiment_sessions(id) on delete cascade,
  event_name text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

grant select on public.experiment_events to authenticated;
grant all on public.experiment_events to service_role;

alter table public.experiment_events enable row level security;

create policy "Admins can read events"
  on public.experiment_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index experiment_events_session_idx on public.experiment_events(session_id);