-- Serverkvitterade egenkontroller och grindgodkännanden (granskning F05).
-- Beslut 2026-10-21: formella godkännanden i egen tabell med auth.uid() och servertid.
-- EJ APPLICERAD. Granskas och körs manuellt i SQL-editorn (se CLAUDE.md).
-- Kräver public.projekt (20261016180000_projektkatalog.sql).
--
-- Portföljens JSON (app_state) är fortfarande arbetskopian. Det formella beviset är
-- en rad här: vem som kvitterade (auth.uid(), e-post ur JWT) och när (now()) sätts av
-- databasen, inte av klienten. Klienten kan bara skriva via registrera_godkannande(),
-- som validerar övergången och loggar i andringslogg i samma transaktion.
-- "Utförd av" (den som gjorde kontrollen, fritext) hålls isär från "kvitterad av".

create table if not exists public.godkannanden (
  id              uuid        primary key default gen_random_uuid(),
  projekt_id      text        not null references public.projekt (id),
  typ             text        not null check (typ in ('egenkontroll', 'grind')),
  objekt_id       text        not null,
  varde           jsonb       not null,
  utford_av       text,
  kvitterad_av    uuid        not null,
  kvitterad_epost text        not null,
  kvitterad_tid   timestamptz not null default now(),
  foregaende      uuid        references public.godkannanden (id)
);

create index if not exists godkannanden_objekt_idx on public.godkannanden (projekt_id, typ, objekt_id, kvitterad_tid desc);

alter table public.godkannanden enable row level security;

-- Läsning som resten av appen. Inga insert/update/delete-regler: tabellen skrivs
-- bara av funktionen nedan och är därmed append-only för klienten.
drop policy if exists "allowed las godkannanden" on public.godkannanden;
create policy "allowed las godkannanden" on public.godkannanden
  for select to authenticated using ((select public.is_allowed()));

create or replace function public.registrera_godkannande(
  p_projekt_id text,
  p_typ        text,
  p_objekt_id  text,
  p_varde      jsonb,
  p_utford_av  text default null
)
returns public.godkannanden
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_epost text := auth.jwt() ->> 'email';
  v_fore  public.godkannanden;
  v_ny    public.godkannanden;
  v_res   text;
  v_datum text;
  v_text  text;
begin
  if v_uid is null or not public.is_allowed() then
    raise exception 'Inte behörig att kvittera' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projekt where id = p_projekt_id) then
    raise exception 'Okänt projekt %', p_projekt_id using errcode = '22023';
  end if;

  if p_typ = 'egenkontroll' then
    v_res := coalesce(p_varde ->> 'resultat', '');
    v_datum := coalesce(p_varde ->> 'datum', '');
    if v_res not in ('ok', 'ej-ok', 'ej-tillamplig') then
      raise exception 'Ogiltigt resultat: %', v_res using errcode = '22023';
    end if;
    if v_datum !~ '^\d{4}-\d{2}-\d{2}$' or to_char(to_date(v_datum, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_datum then
      raise exception 'Ogiltigt kontrolldatum: %', v_datum using errcode = '22023';
    end if;
    if to_date(v_datum, 'YYYY-MM-DD') > (now() at time zone 'Europe/Stockholm')::date then
      raise exception 'Kontrolldatum i framtiden: %', v_datum using errcode = '22023';
    end if;
    if coalesce(trim(p_varde ->> 'kontrollant'), '') = '' or coalesce(trim(p_varde ->> 'referens'), '') = '' then
      raise exception 'Kontrollant och bevis/protokollreferens krävs' using errcode = '22023';
    end if;
    if v_res = 'ej-tillamplig' and coalesce(trim(p_varde ->> 'notering'), '') = '' then
      raise exception 'Ej tillämplig kräver motivering' using errcode = '22023';
    end if;
    v_text := format('Egenkontroll %s kvitterad i databasen: %s %s, utförd av %s', p_objekt_id, v_res, v_datum, coalesce(nullif(trim(p_utford_av), ''), p_varde ->> 'kontrollant'));
  elsif p_typ = 'grind' then
    v_datum := coalesce(p_varde ->> 'grindDatum', '');
    if v_datum <> '' and (v_datum !~ '^\d{4}-\d{2}-\d{2}$' or to_char(to_date(v_datum, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> v_datum) then
      raise exception 'Ogiltigt grinddatum: %', v_datum using errcode = '22023';
    end if;
    v_text := case when v_datum = '' then format('%s återöppnad, kvitterad i databasen', p_objekt_id)
                   else format('%s passerad %s, kvitterad i databasen', p_objekt_id, v_datum) end;
  else
    raise exception 'Okänd typ: %', p_typ using errcode = '22023';
  end if;

  select * into v_fore from public.godkannanden
   where projekt_id = p_projekt_id and typ = p_typ and objekt_id = p_objekt_id
   order by kvitterad_tid desc limit 1;

  -- Samma värde som senaste kvittensen: ingen ny rad.
  if v_fore.id is not null and v_fore.varde = p_varde then
    return v_fore;
  end if;

  insert into public.godkannanden (projekt_id, typ, objekt_id, varde, utford_av, kvitterad_av, kvitterad_epost, foregaende)
  values (p_projekt_id, p_typ, p_objekt_id, p_varde, nullif(trim(p_utford_av), ''), v_uid, v_epost, v_fore.id)
  returning * into v_ny;

  -- Logg i samma transaktion: misslyckas den rullas kvittensen tillbaka.
  insert into public.andringslogg (anvandare, projekt_id, text) values (v_epost, p_projekt_id, v_text);

  return v_ny;
end;
$$;

revoke all on function public.registrera_godkannande(text, text, text, jsonb, text) from public, anon;
grant execute on function public.registrera_godkannande(text, text, text, jsonb, text) to authenticated;
