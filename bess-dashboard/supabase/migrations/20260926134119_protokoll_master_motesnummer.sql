-- Protokollarkiv: MASTER följer mötesnumret, inte uppladdningsordningen.
--
-- Tidigare blev det senast inlästa protokollet MASTER. Då tog ett äldre möte
-- som kom in i efterhand över (Alvesta möte 5 via Drive efter BM-10), och en
-- raderad MASTER lämnade projektet utan någon (Växjö BM-09).
--
-- Nu gäller, för varje projekt:
--   - protokollet med högst mötesnummer är MASTER
--   - ett nytt protokoll tar över när numret är lika med eller högre än
--     nuvarande MASTER:s — en ny version av samma möte ersätter den gamla
--   - ett äldre möte, eller ett protokoll utan nummer när MASTER har ett,
--     arkiveras direkt
--   - raderas MASTER blir näst bästa protokoll MASTER
-- Mötesnummer som saknas (Make-flödet skickar inget) läses ur filnamnet med
-- samma mönster som appen (moteNrUrFilnamn i src/lib/importera.js).
-- Samma regel finns i klienten för lokalt läge (medNyMaster).

-- "Byggmöte 9 - Växjö 2026-09-14.pdf" → BM-09, "BM07 protokoll" → BM-07.
create or replace function public.protokoll_motenr(filnamn text)
returns text
language sql
immutable
set search_path = public
as $$
  select 'BM-' || lpad((coalesce(
           substring(filnamn from '(?i)bygg\s*m[öo]te[\s_-]*(?:nr\.?\s*)?(\d{1,3})'),
           substring(filnamn from '(?i)\yBM[\s_-]*(\d{1,3})\y')
         )::int)::text, 2, '0')
$$;

-- "BM-09" → 9, null när numret saknas.
create or replace function public.protokoll_motenr_tal(mote_nr text)
returns int
language sql
immutable
set search_path = public
as $$
  select nullif(substring(coalesce(mote_nr, '') from '\d+'), '')::int
$$;

-- Nytt protokoll: sätt mötesnummer och avgör om det tar över som MASTER.
create or replace function public.protokoll_ny_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nytt_tal   int;
  master_tal int;
begin
  new.mote_nr := coalesce(nullif(btrim(new.mote_nr), ''), public.protokoll_motenr(new.filnamn));
  new.status := 'master';
  if new.projekt_id is null then
    return new;
  end if;

  nytt_tal := public.protokoll_motenr_tal(new.mote_nr);
  select public.protokoll_motenr_tal(p.mote_nr)
    into master_tal
    from public.protokoll p
   where p.projekt_id = new.projekt_id
     and p.status = 'master'
   limit 1;

  if master_tal is not null and (nytt_tal is null or nytt_tal < master_tal) then
    new.status := 'arkiverad';
    return new;
  end if;

  update public.protokoll
     set status = 'arkiverad'
   where projekt_id = new.projekt_id
     and status = 'master';
  return new;
end;
$$;

-- Väljer om MASTER för ett projekt: högst mötesnummer, vid lika det senast
-- inlästa. Arkiverar först så att index för en MASTER per projekt håller.
create or replace function public.protokoll_valj_master(p_projekt text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vald uuid;
begin
  select id
    into vald
    from public.protokoll
   where projekt_id = p_projekt
   order by public.protokoll_motenr_tal(mote_nr) desc nulls last, inlast desc
   limit 1;

  update public.protokoll
     set status = 'arkiverad'
   where projekt_id = p_projekt
     and status = 'master'
     and id is distinct from vald;

  if vald is not null then
    update public.protokoll set status = 'master' where id = vald and status <> 'master';
  end if;
end;
$$;

-- Raderas MASTER blir näst bästa protokoll MASTER.
create or replace function public.protokoll_efter_borttag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'master' and old.projekt_id is not null then
    perform public.protokoll_valj_master(old.projekt_id);
  end if;
  return null;
end;
$$;

revoke all on function public.protokoll_ny_master() from public, anon, authenticated;
revoke all on function public.protokoll_valj_master(text) from public, anon, authenticated;
revoke all on function public.protokoll_efter_borttag() from public, anon, authenticated;

drop trigger if exists protokoll_ny_master on public.protokoll;
create trigger protokoll_ny_master
  before insert on public.protokoll
  for each row execute function public.protokoll_ny_master();

drop trigger if exists protokoll_efter_borttag on public.protokoll;
create trigger protokoll_efter_borttag
  after delete on public.protokoll
  for each row execute function public.protokoll_efter_borttag();

-- Befintliga rader: fyll i mötesnummer ur filnamnet och välj om MASTER.
update public.protokoll
   set mote_nr = public.protokoll_motenr(filnamn)
 where nullif(btrim(mote_nr), '') is null
   and public.protokoll_motenr(filnamn) is not null;

do $$
declare
  r record;
begin
  for r in select distinct projekt_id from public.protokoll where projekt_id is not null loop
    perform public.protokoll_valj_master(r.projekt_id);
  end loop;
end;
$$;
