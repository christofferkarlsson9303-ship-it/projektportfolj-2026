-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

-- Vilka e-postadresser som får använda appen
create table public.allowed_users (
  email text primary key,
  role text not null default 'montor' check (role in ('admin','montor')),
  created_at timestamptz not null default now()
);
alter table public.allowed_users enable row level security;

create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;
revoke execute on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;

-- Godkända användare får se listan
create policy "allowed read allowed_users" on public.allowed_users
  for select to authenticated using ((select public.is_allowed()));

-- Appens data: ersätter localStorage (nyckel -> JSON)
create table public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email')
);
alter table public.app_state enable row level security;

create policy "allowed select" on public.app_state
  for select to authenticated using ((select public.is_allowed()));
create policy "allowed insert" on public.app_state
  for insert to authenticated with check ((select public.is_allowed()));
create policy "allowed update" on public.app_state
  for update to authenticated using ((select public.is_allowed())) with check ((select public.is_allowed()));
create policy "allowed delete" on public.app_state
  for delete to authenticated using ((select public.is_allowed()));

create or replace function public.touch_app_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end; $$;
create trigger app_state_touch before insert or update on public.app_state
  for each row execute function public.touch_app_state();

-- Liveuppdatering mellan användare
alter publication supabase_realtime add table public.app_state;
