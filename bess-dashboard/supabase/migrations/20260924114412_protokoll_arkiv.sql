-- Protokollarkiv: uppladdade mötesprotokoll per projekt med MASTER/arkiverad.
--
-- Filerna ligger i den privata bucketen "protokoll"; tabellen håller
-- metadata och status. MASTER-regeln sköts av en trigger, så den gäller
-- både för uppladdning i appen och för rader som Make-flödet (Google Drive)
-- skriver med service-nyckeln.
--
-- Behörighet följer samma mönster som app_state: inloggade på
-- allowed_users får läsa och lägga till; ändra status och ta bort är
-- förbehållet administratören.

create table if not exists public.protokoll (
  id            uuid primary key default gen_random_uuid(),
  projekt_id    text,
  filnamn       text not null,
  mote_nr       text,
  storage_path  text,
  storlek       bigint,
  mime          text,
  kalla         text not null default 'manuell' check (kalla in ('manuell', 'drive')),
  status        text not null default 'master' check (status in ('master', 'arkiverad')),
  inlast        timestamptz not null default now(),
  inlast_av     text default (auth.jwt() ->> 'email')
);

create index if not exists protokoll_projekt_idx on public.protokoll (projekt_id, inlast desc);

-- Högst en MASTER per projekt, garanterat av databasen och inte bara av triggern.
create unique index if not exists protokoll_en_master_per_projekt
  on public.protokoll (projekt_id) where status = 'master' and projekt_id is not null;

-- Det nya protokollet blir MASTER; äldre för samma projekt arkiveras.
-- security definer: arkiveringen ska ske även när den som laddar upp saknar
-- uppdateringsrätt på tabellen.
create or replace function public.protokoll_ny_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'master';
  if new.projekt_id is not null then
    update public.protokoll
       set status = 'arkiverad'
     where projekt_id = new.projekt_id
       and status = 'master';
  end if;
  return new;
end;
$$;

revoke all on function public.protokoll_ny_master() from public, anon, authenticated;

drop trigger if exists protokoll_ny_master on public.protokoll;
create trigger protokoll_ny_master
  before insert on public.protokoll
  for each row execute function public.protokoll_ny_master();

alter table public.protokoll enable row level security;

create policy "allowed las protokoll" on public.protokoll
  for select to authenticated using ((select public.is_allowed()));

create policy "allowed ladda upp protokoll" on public.protokoll
  for insert to authenticated with check ((select public.is_allowed()));

create policy "admin andra protokoll" on public.protokoll
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin ta bort protokoll" on public.protokoll
  for delete to authenticated using ((select public.is_admin()));

-- Privat bucket för själva filerna. 25 MB räcker gott för protokoll.
insert into storage.buckets (id, name, public, file_size_limit)
values ('protokoll', 'protokoll', false, 26214400)
on conflict (id) do nothing;

create policy "allowed las protokollfiler" on storage.objects
  for select to authenticated using (bucket_id = 'protokoll' and (select public.is_allowed()));

create policy "allowed ladda upp protokollfiler" on storage.objects
  for insert to authenticated with check (bucket_id = 'protokoll' and (select public.is_allowed()));
