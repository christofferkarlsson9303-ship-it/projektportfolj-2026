-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

create or replace function public.protokoll_normalisera()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.projekt_id is not null and new.projekt_id not in ('36037','36038') then
    new.projekt_id := null;
  end if;
  return new;
end $$;
revoke execute on function public.protokoll_normalisera() from public, anon, authenticated;
drop trigger if exists trg_protokoll_normalisera on public.protokoll;
create trigger trg_protokoll_normalisera before insert or update on public.protokoll
for each row execute function public.protokoll_normalisera();
