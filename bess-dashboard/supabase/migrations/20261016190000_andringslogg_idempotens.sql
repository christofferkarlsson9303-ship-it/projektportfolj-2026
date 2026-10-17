-- Idempotenta loggposter (granskning 2026-10-16, F04 / Codex-granskning PR #76).
--
-- Klienten skickar om en loggpost när skrivningen misslyckas. Om INSERT redan
-- gått igenom men svaret tappades blev det en dubblett. Nu har varje post en
-- stabil klient_nyckel (tid + hash av texten) och ett unikt index per
-- användare. Klienten skriver med ON CONFLICT (anvandare, klient_nyckel)
-- DO NOTHING, vilket bara kräver den befintliga INSERT-regeln — tabellen
-- förblir append-only.
--
-- Äldre rader och äldre klienter har klient_nyckel = null. Null räknas som
-- olika i ett unikt index, så de påverkas inte.
--
-- Ordning: kan köras före eller efter att appen deployats. Utan kolumnen
-- faller klienten tillbaka till vanlig INSERT utan nyckel.
--
-- EJ APPLICERAD. Kör i Supabase efter granskning.

alter table public.andringslogg
  add column if not exists klient_nyckel text;

create unique index if not exists andringslogg_anvandare_klient_nyckel
  on public.andringslogg (anvandare, klient_nyckel);
