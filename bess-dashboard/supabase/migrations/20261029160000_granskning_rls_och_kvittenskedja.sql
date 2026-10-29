-- Kodgranskning 2026-10-29. FÖRSLAG – inte applicerad.
-- Kör först i en branch/lokalt (supabase db reset) och därefter sats för sats i produktion.
-- Förkontroll gjord 2026-10-29: inga dubbletter av godkannanden.foregaende i produktion.

-- 1. Performance advisor "auth_rls_initplan": auth.jwt() utvärderades per rad.
--    Samma regel, men JWT-anropet körs en gång per sats.
drop policy if exists "allowed skriv andringslogg" on public.andringslogg;
create policy "allowed skriv andringslogg" on public.andringslogg
  for insert to authenticated
  with check ((select public.is_allowed()) and anvandare = (select auth.jwt() ->> 'email'));

-- 2. Performance advisor "unindexed_foreign_keys" + skydd mot förgrenad kvittenskedja.
--    registrera_godkannande() läser senaste kvittens och pekar på den. Två samtidiga anrop
--    kan annars båda peka på samma föregående rad (gren). Med unikt index får det andra
--    anropet fel 23505 i stället, och klienten kan läsa om och försöka igen.
create unique index if not exists godkannanden_foregaende_uniq
  on public.godkannanden (foregaende)
  where foregaende is not null;
