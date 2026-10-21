-- Behörighetsprov, del 1: lista faktiska grants och policyer i målmiljön (granskning #75).
-- Körs i Supabase SQL-editorn som postgres. Läser bara. Spara utdata i
-- docs/behorighetsprov-<datum>.md tillsammans med resultatet av skriptet
-- scripts/behorighetsprov.mjs (del 2).

-- 1. RLS påslaget per tabell i public
select c.relname as tabell, c.relrowsecurity as rls_pa, c.relforcerowsecurity as rls_tvingad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by 1;

-- 2. Policyer i public och storage
select schemaname, tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname in ('public', 'storage')
 order by schemaname, tablename, policyname;

-- 3. Tabellrättigheter för anon och authenticated
select table_schema, table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as rattigheter
  from information_schema.role_table_grants
 where grantee in ('anon', 'authenticated') and table_schema in ('public', 'storage')
 group by 1, 2, 3
 order by 1, 2, 3;

-- 4. Funktioner: security definer och vem som får köra dem
select p.proname as funktion, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_kor,
       has_function_privilege('authenticated', p.oid, 'execute') as inloggad_kor,
       coalesce(array_to_string(p.proconfig, ', '), '') as installningar
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
 order by 1;

-- 5. Storage-buckets: publika eller privata
select id, name, public, file_size_limit from storage.buckets order by 1;

-- 6. Vilka som står på listan och deras roll
select email, role, created_at from public.allowed_users order by role, email;

-- 7. Backup: PITR och senaste säkerhetskopior syns i Dashboard → Database → Backups.
--    Notera i rapporten: plan, PITR på/av, senaste lyckade backup och om en
--    återläsning har provats.
