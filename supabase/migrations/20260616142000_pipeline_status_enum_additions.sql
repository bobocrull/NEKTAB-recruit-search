-- Alter pipeline_status enum to add new values from the frontend
ALTER TYPE public.pipeline_status ADD VALUE IF NOT EXISTS 'Kontakta';
ALTER TYPE public.pipeline_status ADD VALUE IF NOT EXISTS 'Avvakta';
ALTER TYPE public.pipeline_status ADD VALUE IF NOT EXISTS 'Ej relevant';
ALTER TYPE public.pipeline_status ADD VALUE IF NOT EXISTS 'Skickad till Cinode';

-- Create profile trigger function to automatically create a profile for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.app_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'NEKTAB Manager'),
    'manager'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
