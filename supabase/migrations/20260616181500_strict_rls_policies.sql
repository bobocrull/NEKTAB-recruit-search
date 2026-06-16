-- 1. Drop existing permissive policies
drop policy if exists "authenticated can read searches" on public.recruitment_searches;
drop policy if exists "authenticated can update searches" on public.recruitment_searches;

drop policy if exists "authenticated can read search candidates" on public.search_candidates;
drop policy if exists "authenticated can create search candidates" on public.search_candidates;
drop policy if exists "authenticated can update search candidates" on public.search_candidates;

drop policy if exists "authenticated can read notes" on public.candidate_notes;
drop policy if exists "authenticated can create notes" on public.candidate_notes;
drop policy if exists "authenticated can update own notes" on public.candidate_notes;

drop policy if exists "authenticated can read events" on public.candidate_events;
drop policy if exists "authenticated can create events" on public.candidate_events;

drop policy if exists "authenticated can read enrichment requests" on public.enrichment_requests;
drop policy if exists "authenticated can create enrichment requests" on public.enrichment_requests;
drop policy if exists "authenticated can update enrichment requests" on public.enrichment_requests;

drop policy if exists "authenticated can read exports" on public.data_exports;
drop policy if exists "authenticated can create exports" on public.data_exports;

drop policy if exists "authenticated can read candidate sources" on public.candidate_sources;
drop policy if exists "authenticated can create candidate sources" on public.candidate_sources;


-- 2. Create strict IDOR/BOLA-compliant owner policies

-- recruitment_searches: only allow reading/updating searches created by the user
create policy "authenticated can read own searches" on public.recruitment_searches 
  for select to authenticated using (created_by = auth.uid() and archived_at is null);

create policy "authenticated can update own searches" on public.recruitment_searches 
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- search_candidates: only allow select/insert/update if the parent search belongs to the user
create policy "authenticated can read own search candidates" on public.search_candidates 
  for select to authenticated using (
    exists (
      select 1 from public.recruitment_searches 
      where recruitment_searches.id = search_candidates.search_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can create own search candidates" on public.search_candidates 
  for insert to authenticated with check (
    exists (
      select 1 from public.recruitment_searches 
      where recruitment_searches.id = search_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can update own search candidates" on public.search_candidates 
  for update to authenticated using (
    exists (
      select 1 from public.recruitment_searches 
      where recruitment_searches.id = search_candidates.search_id 
      and recruitment_searches.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.recruitment_searches 
      where recruitment_searches.id = search_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

-- candidate_sources: restrict read to sources of candidates connected to the user's searches
create policy "authenticated can read own candidate sources" on public.candidate_sources 
  for select to authenticated using (
    exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.candidate_id = candidate_sources.candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can create own candidate sources" on public.candidate_sources 
  for insert to authenticated with check (true);

-- candidate_notes: only allow select/insert/update if the search_candidate belongs to a search owned by the user
create policy "authenticated can read own notes" on public.candidate_notes 
  for select to authenticated using (
    exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.id = candidate_notes.search_candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can create own notes" on public.candidate_notes 
  for insert to authenticated with check (
    created_by = auth.uid() 
    and exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.id = search_candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can update own notes" on public.candidate_notes 
  for update to authenticated using (
    created_by = auth.uid() 
    and exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.id = candidate_notes.search_candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  ) with check (
    created_by = auth.uid() 
    and exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.id = search_candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

-- candidate_events: only allow select/insert if the search_candidate (or candidate) is associated with a search owned by the user
create policy "authenticated can read own events" on public.candidate_events 
  for select to authenticated using (
    search_candidate_id is null 
    or exists (
      select 1 from public.search_candidates 
      join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
      where search_candidates.id = candidate_events.search_candidate_id 
      and recruitment_searches.created_by = auth.uid()
    )
  );

create policy "authenticated can create own events" on public.candidate_events 
  for insert to authenticated with check (
    created_by = auth.uid() 
    and (
      search_candidate_id is null 
      or exists (
        select 1 from public.search_candidates 
        join public.recruitment_searches on recruitment_searches.id = search_candidates.search_id 
        where search_candidates.id = search_candidate_id 
        and recruitment_searches.created_by = auth.uid()
      )
    )
  );

-- enrichment_requests: restrict to owner
create policy "authenticated can read own enrichment requests" on public.enrichment_requests 
  for select to authenticated using (requested_by = auth.uid());

create policy "authenticated can create own enrichment requests" on public.enrichment_requests 
  for insert to authenticated with check (requested_by = auth.uid());

create policy "authenticated can update own enrichment requests" on public.enrichment_requests 
  for update to authenticated using (requested_by = auth.uid()) with check (requested_by = auth.uid());

-- data_exports: restrict to owner
create policy "authenticated can read own exports" on public.data_exports 
  for select to authenticated using (created_by = auth.uid());

create policy "authenticated can create own exports" on public.data_exports 
  for insert to authenticated with check (created_by = auth.uid());
