-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email') and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from anon;

-- Ekonomidokumentet och nya nycklar: bara admin får skriva. Övrigt: alla tillåtna.
drop policy if exists "allowed insert" on public.app_state;
drop policy if exists "allowed update" on public.app_state;
drop policy if exists "allowed delete" on public.app_state;

create policy "admin insert" on public.app_state for insert to authenticated
  with check ((select public.is_admin()));

create policy "allowed update" on public.app_state for update to authenticated
  using ((select public.is_allowed()) and (key <> 'portfolj/ekonomi' or (select public.is_admin())))
  with check ((select public.is_allowed()) and (key <> 'portfolj/ekonomi' or (select public.is_admin())));

create policy "admin delete" on public.app_state for delete to authenticated
  using ((select public.is_admin()));

-- Admin hanterar tillåtelselistan
create policy "admin manage allowed_users" on public.allowed_users for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Realtidssynk mellan användare
do $$ begin
  alter publication supabase_realtime add table public.app_state;
exception when duplicate_object then null; end $$;

alter table public.app_state replica identity full;
