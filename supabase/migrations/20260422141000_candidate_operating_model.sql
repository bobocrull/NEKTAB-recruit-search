create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'recruiter', 'manager', 'viewer');
create type public.pipeline_status as enum ('Ny', 'Intressant', 'Kontaktad', 'Svarat', 'Ej aktuell', 'Intervju');
create type public.feedback_tag as enum ('Relevant', 'Inte relevant', 'Fel bransch', 'För junior', 'Fel geografi', 'Saknar nyckelkompetens');
create type public.candidate_recommendation as enum ('Kontakta nu', 'Kanske', 'Avvakta', 'Ej relevant');
create type public.event_type as enum ('created', 'shortlisted', 'status_changed', 'feedback_added', 'note_added', 'contacted', 'exported', 'enrichment_requested', 'deleted');

create table public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recruitment_searches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  job_description text,
  manager_profile jsonb not null default '{}'::jsonb,
  parsed_requirements jsonb not null default '{}'::jsonb,
  role_category text,
  created_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  name text not null,
  current_role text,
  company text,
  years_of_experience numeric,
  skills text[] not null default '{}',
  location text,
  linkedin_url text,
  email text,
  phone text,
  avatar_url text,
  profile_image_url text,
  data_confidence jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_sources (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  source_name text not null,
  source_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  found_at timestamptz not null default now()
);

create table public.search_candidates (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.recruitment_searches(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  score integer not null default 0,
  score_breakdown jsonb not null default '[]'::jsonb,
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  skill_evidence jsonb not null default '[]'::jsonb,
  decision_summary text,
  red_flags text[] not null default '{}',
  recommendation public.candidate_recommendation not null default 'Kanske',
  pipeline_status public.pipeline_status not null default 'Ny',
  feedback public.feedback_tag,
  assigned_to uuid references public.app_profiles(id),
  shortlisted_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (search_id, candidate_id)
);

create table public.candidate_notes (
  id uuid primary key default gen_random_uuid(),
  search_candidate_id uuid not null references public.search_candidates(id) on delete cascade,
  body text not null,
  created_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  search_candidate_id uuid references public.search_candidates(id) on delete cascade,
  event_type public.event_type not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now()
);

create table public.enrichment_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  provider text,
  status text not null default 'requested',
  result jsonb not null default '{}'::jsonb,
  requested_by uuid references public.app_profiles(id),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.recruitment_searches(id) on delete set null,
  exported_candidate_ids uuid[] not null default '{}',
  export_reason text,
  created_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now()
);

create index candidates_name_idx on public.candidates using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(current_role, '')));
create index candidates_skills_idx on public.candidates using gin (skills);
create index search_candidates_search_idx on public.search_candidates(search_id, score desc);
create index candidate_events_candidate_idx on public.candidate_events(candidate_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_app_profiles_updated_at before update on public.app_profiles for each row execute function public.touch_updated_at();
create trigger touch_recruitment_searches_updated_at before update on public.recruitment_searches for each row execute function public.touch_updated_at();
create trigger touch_candidates_updated_at before update on public.candidates for each row execute function public.touch_updated_at();
create trigger touch_search_candidates_updated_at before update on public.search_candidates for each row execute function public.touch_updated_at();
create trigger touch_candidate_notes_updated_at before update on public.candidate_notes for each row execute function public.touch_updated_at();

alter table public.app_profiles enable row level security;
alter table public.recruitment_searches enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_sources enable row level security;
alter table public.search_candidates enable row level security;
alter table public.candidate_notes enable row level security;
alter table public.candidate_events enable row level security;
alter table public.enrichment_requests enable row level security;
alter table public.data_exports enable row level security;

create policy "authenticated can read profiles" on public.app_profiles for select to authenticated using (true);
create policy "users can update own profile" on public.app_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "authenticated can read searches" on public.recruitment_searches for select to authenticated using (archived_at is null);
create policy "authenticated can create searches" on public.recruitment_searches for insert to authenticated with check (created_by = auth.uid());
create policy "authenticated can update searches" on public.recruitment_searches for update to authenticated using (true) with check (true);

create policy "authenticated can read candidates" on public.candidates for select to authenticated using (true);
create policy "authenticated can upsert candidates" on public.candidates for insert to authenticated with check (true);
create policy "authenticated can update candidates" on public.candidates for update to authenticated using (true) with check (true);

create policy "authenticated can read candidate sources" on public.candidate_sources for select to authenticated using (true);
create policy "authenticated can create candidate sources" on public.candidate_sources for insert to authenticated with check (true);

create policy "authenticated can read search candidates" on public.search_candidates for select to authenticated using (true);
create policy "authenticated can create search candidates" on public.search_candidates for insert to authenticated with check (true);
create policy "authenticated can update search candidates" on public.search_candidates for update to authenticated using (true) with check (true);

create policy "authenticated can read notes" on public.candidate_notes for select to authenticated using (true);
create policy "authenticated can create notes" on public.candidate_notes for insert to authenticated with check (created_by = auth.uid());
create policy "authenticated can update own notes" on public.candidate_notes for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "authenticated can read events" on public.candidate_events for select to authenticated using (true);
create policy "authenticated can create events" on public.candidate_events for insert to authenticated with check (created_by = auth.uid());

create policy "authenticated can read enrichment requests" on public.enrichment_requests for select to authenticated using (true);
create policy "authenticated can create enrichment requests" on public.enrichment_requests for insert to authenticated with check (requested_by = auth.uid());
create policy "authenticated can update enrichment requests" on public.enrichment_requests for update to authenticated using (true) with check (true);

create policy "authenticated can read exports" on public.data_exports for select to authenticated using (true);
create policy "authenticated can create exports" on public.data_exports for insert to authenticated with check (created_by = auth.uid());
