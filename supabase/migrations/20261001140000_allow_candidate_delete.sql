-- Allow authenticated users to delete candidates from the candidates table
create policy "authenticated can delete candidates" on public.candidates 
  for delete to authenticated using (true);
