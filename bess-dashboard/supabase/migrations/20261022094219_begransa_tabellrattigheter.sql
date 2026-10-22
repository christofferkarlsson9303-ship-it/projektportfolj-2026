-- Skapad med Supabase CLI. Filnamnet följer versionen kvitterad av målmiljön.
-- Applicerad 2026-10-22 i oafvefbplfjxwgmjcwvx; verifierad med 24 rollback-prov.
-- RLS gäller inte för TRUNCATE. Vanlig SELECT/INSERT/UPDATE/DELETE och policyer lämnas kvar.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;
