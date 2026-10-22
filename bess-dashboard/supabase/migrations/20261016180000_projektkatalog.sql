-- Projektkatalog i stället för fasta projekt-ID (granskning 2026-10-16, F02).
--
-- protokoll_normalisera() satte projekt_id till null för allt utom 36037 och
-- 36038. Ett nytt projekt fick därför sina protokoll frikopplade direkt.
--
-- Nu finns en tabell public.projekt. Den fylls automatiskt från portföljen:
-- när portfolj/state sparas läggs projektens id och namn in (eller uppdateras).
-- Ingen klientändring behövs. Triggern på protokoll nollar fortfarande okända
-- id, så Make-flödet (Drive) inte stoppas av ett id som ännu inte finns —
-- men "känt" betyder nu "finns i katalogen", inte "är 36037 eller 36038".
--
-- Projekt tas aldrig bort ur katalogen av triggern. Ett projekt som tas bort
-- ur portföljen behåller sina protokoll.
--
-- APPLICERAD 2026-10-22 i produktion (projektportfolj, eu-north-1), sats för sats. Se docs/behorighetsprov-2026-10-22.md.
-- Prova efteråt: skapa ett testprojekt i appen, spara, ladda upp ett
-- protokoll på det och kontrollera att projekt_id står kvar.

create table if not exists public.projekt (
  id      text primary key check (length(trim(id)) > 0),
  namn    text,
  skapad  timestamptz not null default now(),
  andrad  timestamptz not null default now()
);

alter table public.projekt enable row level security;

-- Läsning som resten av appen. Inga skrivregler för klienten: katalogen
-- skrivs av triggern nedan (security definer) eller av administratören i SQL.
drop policy if exists "allowed read projekt" on public.projekt;
create policy "allowed read projekt" on public.projekt
  for select to authenticated using ((select public.is_allowed()));

-- Projekten som triggern tidigare kände till.
insert into public.projekt (id, namn) values
  ('36037', 'Växjö Batteripark'),
  ('36038', 'Alvesta Batteripark')
on conflict (id) do nothing;

-- Katalogen följer portföljen.
create or replace function public.projekt_fran_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.key = 'portfolj/state' and jsonb_typeof(new.value -> 'projekt') = 'array' then
    insert into public.projekt (id, namn)
    select trim(p ->> 'id'), nullif(trim(p ->> 'namn'), '')
      from jsonb_array_elements(new.value -> 'projekt') as p
     where coalesce(trim(p ->> 'id'), '') <> ''
    on conflict (id) do update
      set namn = coalesce(excluded.namn, public.projekt.namn),
          andrad = now()
      where public.projekt.namn is distinct from coalesce(excluded.namn, public.projekt.namn);
  end if;
  return new;
end;
$$;

revoke all on function public.projekt_fran_state() from public, anon, authenticated;

drop trigger if exists trg_projekt_fran_state on public.app_state;
create trigger trg_projekt_fran_state
  after insert or update of value on public.app_state
  for each row execute function public.projekt_fran_state();

-- Fyll katalogen med projekten som redan finns i portföljen.
insert into public.projekt (id, namn)
select trim(p ->> 'id'), nullif(trim(p ->> 'namn'), '')
  from public.app_state s,
       jsonb_array_elements(case when jsonb_typeof(s.value -> 'projekt') = 'array' then s.value -> 'projekt' else '[]'::jsonb end) as p
 where s.key = 'portfolj/state'
   and coalesce(trim(p ->> 'id'), '') <> ''
on conflict (id) do nothing;

-- Protokoll: okända id nollas som förut, men mot katalogen.
create or replace function public.protokoll_normalisera()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.projekt_id is not null then
    new.projekt_id := nullif(trim(new.projekt_id), '');
  end if;
  if new.projekt_id is not null
     and not exists (select 1 from public.projekt where id = new.projekt_id) then
    new.projekt_id := null;
  end if;
  return new;
end $$;
revoke execute on function public.protokoll_normalisera() from public, anon, authenticated;

-- Främmande nyckel: triggern körs före kontrollen, så okända id blir null
-- i stället för att stoppa insättningen.
alter table public.protokoll
  drop constraint if exists protokoll_projekt_fk;
alter table public.protokoll
  add constraint protokoll_projekt_fk foreign key (projekt_id)
  references public.projekt (id) on update cascade on delete set null
  not valid;
alter table public.protokoll validate constraint protokoll_projekt_fk;

-- Redan frikopplade protokoll går inte att koppla automatiskt — det
-- ursprungliga id:t skrevs över med null. Lista dem och koppla för hand:
--   select id, filnamn, mote_nr, inlast, kalla from public.protokoll
--    where projekt_id is null order by inlast desc;
--   update public.protokoll set projekt_id = '<id>' where id = '<uuid>';
