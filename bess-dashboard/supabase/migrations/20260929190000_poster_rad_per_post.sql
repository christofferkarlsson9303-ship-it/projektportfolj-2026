-- Rad per post i stället för ett enda portföljdokument.
--
-- Hittills låg hela portföljen som en JSONB-blob i app_state
-- ('portfolj/state'). Två personer som ändrade olika risker krockade ändå, det
-- fanns ingen historik per post och inget gick att fråga på i SQL.
--
-- Nu:
--   poster            en rad per post: (lista, id) → data. Version per rad,
--                     så samtidiga ändringar på olika poster aldrig krockar.
--   poster_historik   varje version av varje post, med vem och när. Fylls av
--                     en trigger och kan inte ändras eller tas bort — det är
--                     spåret vid en tvist om vad som gällde när.
--
-- Borttagning är mjuk (borttagen = true): posten försvinner ur appen men
-- finns kvar i historiken. Ingen delete-policy finns.
--
-- 'portfolj/state' i app_state lämnas orörd som reserv. Klienten läser och
-- skriver poster när tabellen finns och faller annars tillbaka på app_state.
-- Ekonomidokumentet ('portfolj/ekonomi') ligger kvar i app_state med sin
-- administratörsregel.

create table public.poster (
  lista          text        not null,
  id             text        not null,
  projekt_id     text,
  ordning        integer     not null default 0,
  data           jsonb       not null,
  version        bigint      not null default 1,
  borttagen      boolean     not null default false,
  skapad         timestamptz not null default now(),
  uppdaterad     timestamptz not null default now(),
  uppdaterad_av  text        default (auth.jwt() ->> 'email'),
  primary key (lista, id),
  constraint poster_data_ar_objekt check (jsonb_typeof(data) = 'object')
);

create index poster_projekt_idx on public.poster (projekt_id, lista) where not borttagen;

create table public.poster_historik (
  hid        bigint generated always as identity primary key,
  lista      text        not null,
  id         text        not null,
  version    bigint      not null,
  operation  text        not null check (operation in ('skapad', 'andrad', 'borttagen', 'aterstalld')),
  data       jsonb       not null,
  tid        timestamptz not null default now(),
  av         text
);

create index poster_historik_post_idx on public.poster_historik (lista, id, version desc);
create index poster_historik_tid_idx on public.poster_historik (tid desc);

-- ---------- Triggrar ----------

-- Före skrivning: version, tidsstämpel, avsändare och projekt_id sätts av
-- databasen. Klienten kan inte skriva i någon annans namn eller backa versionen.
create or replace function public.poster_fore_skrivning()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.projekt_id := new.data ->> 'projektId';
  new.uppdaterad := now();
  new.uppdaterad_av := coalesce(auth.jwt() ->> 'email', new.uppdaterad_av, 'system');
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.skapad := old.skapad;
  else
    new.version := 1;
  end if;
  return new;
end;
$$;

create trigger poster_fore_skrivning
  before insert or update on public.poster
  for each row execute function public.poster_fore_skrivning();

-- Efter skrivning: en historikrad per ny version. Bara ordningsbyte
-- (samma data, samma borttagen) ger ingen historikrad.
-- security definer: historiktabellen har ingen insert-policy, så bara
-- triggern kan skriva dit.
create or replace function public.poster_historik_logga()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  op text;
begin
  if tg_op = 'INSERT' then
    op := case when new.borttagen then 'borttagen' else 'skapad' end;
  elsif new.data = old.data and new.borttagen = old.borttagen then
    return null;
  elsif new.borttagen and not old.borttagen then
    op := 'borttagen';
  elsif old.borttagen and not new.borttagen then
    op := 'aterstalld';
  else
    op := 'andrad';
  end if;

  insert into public.poster_historik (lista, id, version, operation, data, tid, av)
  values (new.lista, new.id, new.version, op, new.data, new.uppdaterad, new.uppdaterad_av);
  return null;
end;
$$;

revoke all on function public.poster_historik_logga() from public, anon, authenticated;

create trigger poster_historik_logga
  after insert or update on public.poster
  for each row execute function public.poster_historik_logga();

-- ---------- Behörighet ----------

alter table public.poster enable row level security;
alter table public.poster_historik enable row level security;

create policy "allowed las poster" on public.poster
  for select to authenticated using ((select public.is_allowed()));

create policy "allowed skapa poster" on public.poster
  for insert to authenticated with check ((select public.is_allowed()));

create policy "allowed andra poster" on public.poster
  for update to authenticated
  using ((select public.is_allowed()))
  with check ((select public.is_allowed()));

-- Ingen delete-policy: borttagning sker med borttagen = true.

create policy "allowed las historik" on public.poster_historik
  for select to authenticated using ((select public.is_allowed()));

-- Ingen insert/update/delete-policy på historiken: append-only via triggern.

grant select, insert, update on public.poster to authenticated;
grant select on public.poster_historik to authenticated;

-- ---------- Realtid ----------

do $$ begin
  alter publication supabase_realtime add table public.poster;
exception when duplicate_object then null; end $$;

-- ---------- Överföring från portföljdokumentet ----------

-- Varje element i varje lista blir en rad. Rader utan id (rutinstatus) får
-- samma nyckel som klienten använder; övriga utan id en hash av innehållet.
insert into public.poster (lista, id, ordning, data, uppdaterad_av)
select
  k.key,
  coalesce(
    nullif(e.elem ->> 'id', ''),
    case when k.key = 'rutinstatus'
      then 'rs-' || coalesce(e.elem ->> 'projektId', '') || '-' || coalesce(e.elem ->> 'punkt', '')
    end,
    '~' || md5(e.elem::text)
  ),
  (e.ord - 1)::integer,
  e.elem,
  'migrering'
from public.app_state s
cross join lateral jsonb_each(s.value) as k(key, value)
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(k.value) = 'array' then k.value else '[]'::jsonb end
) with ordinality as e(elem, ord)
where s.key = 'portfolj/state'
  and jsonb_typeof(e.elem) = 'object'
on conflict (lista, id) do nothing;
