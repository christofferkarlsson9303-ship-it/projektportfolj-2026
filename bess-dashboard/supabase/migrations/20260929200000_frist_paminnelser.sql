-- Skickade påminnelser om ABT 06-frister.
--
-- Edge Function frist-paminnelser reserverar (nyckel, niva) här innan den
-- skickar, så att varje frist påminns en gång när den blir akut (≤ 12 h kvar)
-- och en gång när den passerat — även om funktionen körs var 15:e minut.
-- nyckel är "ur:<id>" eller "inc:<id>".
--
-- Funktionen skriver med service-nyckeln (förbi RLS). Inloggade på listan
-- får läsa, så att appen kan visa att en påminnelse gått ut. Ingen får
-- skriva via API:t.

create table public.frist_paminnelser (
  nyckel   text        not null,
  niva     text        not null check (niva in ('akut', 'forfallen')),
  skickad  timestamptz not null default now(),
  primary key (nyckel, niva)
);

alter table public.frist_paminnelser enable row level security;

create policy "allowed las frist_paminnelser" on public.frist_paminnelser
  for select to authenticated using ((select public.is_allowed()));
