-- Hasieva Go Getter 4: local sidecar schema. This migration is intentionally
-- not applied to a cloud project until a synthetic Supabase project is approved.
create extension if not exists pgcrypto;
create schema if not exists app;

create table public.learning_units (
  id text primary key check (id in ('street-style', 'grammar-snack-01')),
  title text not null,
  content_version text not null,
  created_at timestamptz not null default now()
);

insert into public.learning_units (id, title, content_version) values
  ('street-style', 'Street Style', 'go-getter-4-unit-1'),
  ('grammar-snack-01', 'Grammar Snack 01', 'present-simple-continuous-v1')
on conflict (id) do nothing;

-- Telegram IDs are private identifiers. Names and usernames deliberately do
-- not enter this table: reports may add a display name only at rendering time.
create table public.learners (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique check (telegram_user_id > 0),
  auth_user_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learner_progress (
  learner_id uuid not null references public.learners(id) on delete cascade,
  unit_id text not null references public.learning_units(id),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (learner_id, unit_id)
);

-- The current row is small and mutable; accepted snapshots are separate so a
-- teacher report never has to parse a spreadsheet's mixed operational state.
create table public.progress_revisions (
  learner_id uuid not null references public.learners(id) on delete cascade,
  unit_id text not null references public.learning_units(id),
  revision integer not null check (revision > 0),
  request_id uuid not null unique,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  primary key (learner_id, unit_id, revision)
);

create table public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  unit_id text not null references public.learning_units(id),
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (length(event_key) between 1 and 160),
  learner_id uuid not null references public.learners(id) on delete cascade,
  kind text not null check (kind in ('teacher_report', 'learner_reminder', 'completion', 'feedback', 'new_unit')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'superseded')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.delivery_log (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid references public.delivery_outbox(id) on delete set null,
  outcome text not null check (outcome in ('accepted', 'sent', 'retry', 'rejected')),
  provider_message_id text,
  detail_code text not null check (length(detail_code) <= 120),
  created_at timestamptz not null default now()
);

create index delivery_outbox_pending_idx on public.delivery_outbox (available_at, created_at)
  where status = 'pending';

-- RLS applies even though the first migration path uses a verified Edge
-- Function. These policies become active once auth_user_id is bound by the
-- server; direct browser access is otherwise denied by default.
create or replace function app.current_learner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select id from public.learners where auth_user_id = auth.uid() limit 1 $$;

create or replace function app.is_teacher()
returns boolean
language sql
stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher' $$;

alter table public.learning_units enable row level security;
alter table public.learners enable row level security;
alter table public.learner_progress enable row level security;
alter table public.progress_revisions enable row level security;
alter table public.teacher_feedback enable row level security;
alter table public.delivery_outbox enable row level security;
alter table public.delivery_log enable row level security;

create policy "published units are readable" on public.learning_units for select using (true);
create policy "learners read only themselves" on public.learners for select using (id = app.current_learner_id());
create policy "learners read their progress" on public.learner_progress for select using (learner_id = app.current_learner_id());
create policy "learners update their progress" on public.learner_progress for update using (learner_id = app.current_learner_id()) with check (learner_id = app.current_learner_id());
create policy "learners read their revision history" on public.progress_revisions for select using (learner_id = app.current_learner_id());
create policy "learners read feedback" on public.teacher_feedback for select using (learner_id = app.current_learner_id());
create policy "teachers read progress" on public.learner_progress for select using (app.is_teacher());
create policy "teachers read revision history" on public.progress_revisions for select using (app.is_teacher());
create policy "teachers manage feedback" on public.teacher_feedback for all using (app.is_teacher()) with check (app.is_teacher());

-- Only a server using the service-role key may map a verified Telegram ID to a
-- learner and commit a revision. The browser calls the Edge Function, never
-- this RPC and never sees that key.
create or replace function app.server_save_progress(
  p_telegram_user_id bigint,
  p_unit_id text,
  p_expected_revision integer,
  p_state jsonb,
  p_request_id uuid
)
returns table (ok boolean, conflict boolean, revision integer)
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_learner_id uuid;
  v_revision integer;
  v_saved_revision integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'server credentials required';
  end if;
  if p_telegram_user_id <= 0 or p_expected_revision < 0 or p_state is null
    or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 45000 then
    raise exception 'invalid progress payload';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_telegram_user_id::text || ':' || p_unit_id, 0));
  select revision into v_saved_revision from public.progress_revisions where request_id = p_request_id;
  if found then
    return query select true, false, v_saved_revision;
    return;
  end if;

  insert into public.learners (telegram_user_id) values (p_telegram_user_id)
    on conflict (telegram_user_id) do update set updated_at = now()
    returning id into v_learner_id;
  select revision into v_revision from public.learner_progress
    where learner_id = v_learner_id and unit_id = p_unit_id for update;
  v_revision := coalesce(v_revision, 0);
  if v_revision <> p_expected_revision then
    return query select false, true, v_revision;
    return;
  end if;

  insert into public.learner_progress (learner_id, unit_id, revision, state)
    values (v_learner_id, p_unit_id, v_revision + 1, p_state)
    on conflict (learner_id, unit_id) do update
      set revision = excluded.revision, state = excluded.state, updated_at = now();
  insert into public.progress_revisions (learner_id, unit_id, revision, request_id, state)
    values (v_learner_id, p_unit_id, v_revision + 1, p_request_id, p_state);
  return query select true, false, v_revision + 1;
end;
$$;

revoke all on function app.server_save_progress(bigint, text, integer, jsonb, uuid) from public, anon, authenticated;
grant usage on schema app to service_role;
grant execute on function app.server_save_progress(bigint, text, integer, jsonb, uuid) to service_role;
