-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

-- Versionsräknare för optimistisk låsning. Klienten skriver bara om den version
-- den läste fortfarande är aktuell, annars vet vi att någon hunnit före.
alter table public.app_state add column version bigint not null default 1;

create or replace function public.app_state_bump_version()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_state_version_trigger
  before update on public.app_state
  for each row execute function public.app_state_bump_version();
