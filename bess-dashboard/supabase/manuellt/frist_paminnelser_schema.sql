-- Schemaläggning av frist-paminnelser. Körs MANUELLT en gång i SQL-editorn,
-- efter att funktionen är driftsatt och hemligheterna satta — den ligger inte
-- bland migreringarna eftersom den behöver projektets hemligheter.
--
-- 1. Lägg hemligheterna i Vault (samma PAMINNELSE_NYCKEL som funktionen har):
--      select vault.create_secret('https://oafvefbplfjxwgmjcwvx.supabase.co', 'projekt_url');
--      select vault.create_secret('<samma som PAMINNELSE_NYCKEL>', 'paminnelse_nyckel');
-- 2. Kör resten av filen.

-- Starta inte ett tomt/bortkopplat jobb. Edge-funktionens kanaler kontrolleras separat
-- med ett autentiserat ?torr=1-anrop innan schemat aktiveras.
do $$ begin
  if not exists (select 1 from vault.decrypted_secrets where name='projekt_url' and coalesce(decrypted_secret,'') <> '')
     or not exists (select 1 from vault.decrypted_secrets where name='paminnelse_nyckel' and coalesce(decrypted_secret,'') <> '') then
    raise exception 'Schemaläggning avbruten: projekt_url och paminnelse_nyckel måste finnas i Vault';
  end if;
end $$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'frist-paminnelser',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'projekt_url')
               || '/functions/v1/frist-paminnelser',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-paminnelse-nyckel', (select decrypted_secret from vault.decrypted_secrets where name = 'paminnelse_nyckel')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- Stoppa:  select cron.unschedule('frist-paminnelser');
-- Logg:    select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'frist-paminnelser') order by start_time desc limit 20;
