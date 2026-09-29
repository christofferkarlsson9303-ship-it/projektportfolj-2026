-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

create table public.andringslogg (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  anvandare text not null default (auth.jwt() ->> 'email'),
  projekt_id text,
  text text not null
);

create index andringslogg_ts_idx on public.andringslogg (ts desc);
create index andringslogg_projekt_ts_idx on public.andringslogg (projekt_id, ts desc);

alter table public.andringslogg enable row level security;

-- Alla på listan får läsa hela spåret.
create policy "allowed las andringslogg" on public.andringslogg
  for select to authenticated
  using ((select public.is_allowed()));

-- Skriva får man bara göra i eget namn. Ingen update- eller delete-policy
-- finns, vilket gör tabellen append-only för inloggade användare — poster kan
-- läggas till men aldrig ändras eller tas bort i efterhand.
create policy "allowed skriv andringslogg" on public.andringslogg
  for insert to authenticated
  with check ((select public.is_allowed()) and anvandare = (auth.jwt() ->> 'email'));

alter publication supabase_realtime add table public.andringslogg;
