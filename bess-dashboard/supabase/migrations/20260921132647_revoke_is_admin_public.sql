-- Exporterad 2026-09-29 ur supabase_migrations.schema_migrations i projektet
-- (oafvefbplfjxwgmjcwvx). Applicerad i databasen sedan tidigare; filen finns
-- här så att schemat går att granska och återskapa från repot.

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
