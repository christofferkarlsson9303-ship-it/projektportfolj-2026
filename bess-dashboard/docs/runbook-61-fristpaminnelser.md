# Runbook #61 – aktivera fristpåminnelser (ABT 06, 24-timmarsrutin)

Status 2026-10-29: **förberett, inte aktiverat.** Stegen 1–6 kräver hemligheter och en produktionsändring och görs av Christoffer. Inga hemligheter i GitHub, chatten eller den här filen.

## Läge i produktion (läst 2026-10-29, endast läsning)

| Del | Läge |
|---|---|
| Edge Function `frist-paminnelser` | ACTIVE, **version 2**, `verify_jwt: false` |
| Driftsatt kod jämfört med main | **Äldre än main**: jämför nyckeln med `!==` (main: `likaNycklar`, konstant tid) och har stavfelet "kontraktets grans" i utskicket. → Driftsätt om (steg 2). |
| `pg_cron` / `pg_net` | Tillgängliga (1.6.4 / 0.20.4), **inte installerade** |
| Vault | Installerad. `projekt_url` och `paminnelse_nyckel` **saknas** |
| `frist_paminnelser` | 0 rader – inget har någonsin skickats |

## Verifierat lokalt 2026-10-29

- **Schemaskriptet** (`supabase/manuellt/frist_paminnelser_schema.sql`) på Postgres 16 med stubbar för Vault, `cron` och `net`:
  - saknad eller tom hemlighet → stoppar med "Schemaläggning avbruten", inget jobb skapas
  - båda hemligheterna → ett jobb `frist-paminnelser`, `*/15 * * * *`
  - jobbets anrop → `<projekt_url>/functions/v1/frist-paminnelser`, header `x-paminnelse-nyckel`, timeout 10 s
  - skriptet kört två gånger → fortfarande ett jobb (`cron.schedule` med samma namn uppdaterar; gäller pg_cron ≥ 1.3, produktion har 1.6.4)
  - *Ej verifierat lokalt:* riktiga `pg_cron`/`pg_net`. Det görs i steg 5–6.
- **Funktionstester:** `npx vitest run supabase/tests` → 29/29.
- **Torrkörning av urvalet mot produktionsdata** (riktig `korPaminnelser` med `torr: true`, inga kanaler, ingen reservation):
  - **1 påminnelse skulle gå ut vid första körningen:** `PASSERAD · Alvesta Batteripark · UR010 Nätverks kablage till Techinova …` – underrättelsedatum tomt, händelse 2026-09-30.
  - `UR003 Servis` (Alvesta) saknar händelsedatum → nivå "oklar", ingen påminnelse.

## Beslut före aktivering

- [ ] **UR010 Alvesta:** är underrättelsen skickad? Systerposten UR009 Växjö har underrättelse 2026-09-30.
  - Skickad → fyll i underrättelsedatum i appen före steg 5. Första körningen skickar då inget.
  - Inte skickad → låt påminnelsen gå. Den blir provutskicket i steg 6.
- [ ] **Kanal:** Teams (Workflows-webhook), mejl (Resend) eller båda. Enligt beslut 2026-10-21 ska **alla konfigurerade kanaler lyckas**. Konfigurera bara de du vill ha.

## Steg

### 1. Secrets för Edge Function

Supabase Dashboard → Edge Functions → Secrets (eller `supabase secrets set …`):

| Namn | Krävs | Värde |
|---|---|---|
| `PAMINNELSE_NYCKEL` | ja | lång slumpad sträng, t.ex. `openssl rand -hex 32` |
| `TEAMS_WEBHOOK_URL` | om Teams | URL från Teams → Workflows → "Post to a channel when a webhook request is received" |
| `RESEND_API_KEY` + `PAMINNELSE_TILL` | om mejl | API-nyckel; mottagare kommaseparerade |
| `PAMINNELSE_FRAN` | nej | t.ex. `Projektportfölj <pl@one-nordic.se>` (domänen måste vara verifierad i Resend) |
| `APP_URL` | nej | länk till appen i utskicket |

### 2. Driftsätt funktionen från main

Efter att grenen `drift/61-fristpaminnelser` är mergad:

```bash
cd bess-dashboard
supabase functions deploy frist-paminnelser --project-ref oafvefbplfjxwgmjcwvx --no-verify-jwt
```

Kontroll: version 3, och ett anrop utan nyckel ska ge 401:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://oafvefbplfjxwgmjcwvx.supabase.co/functions/v1/frist-paminnelser
# väntat: 401
```

### 3. Torrkörning i produktion (skickar inget)

```bash
read -s PAMINNELSE_NYCKEL   # klistra in, syns inte
curl -s -X POST "https://oafvefbplfjxwgmjcwvx.supabase.co/functions/v1/frist-paminnelser?torr=1" \
  -H "x-paminnelse-nyckel: $PAMINNELSE_NYCKEL" | jq
```

Väntat: `"torr": true` och `"aktuella"` = 1 (eller 0 om UR010 fått datum). Torrsvaret kontrollerar **inte** kanalnycklarna.

### 4. Hemligheter i Vault

SQL Editor:

```sql
select vault.create_secret('https://oafvefbplfjxwgmjcwvx.supabase.co', 'projekt_url');
select vault.create_secret('<samma värde som PAMINNELSE_NYCKEL>', 'paminnelse_nyckel');
```

Kontroll (visar inte värdet):

```sql
select name, decrypted_secret <> '' as satt from vault.decrypted_secrets
 where name in ('projekt_url', 'paminnelse_nyckel');
```

### 5. Aktivera schemat

Database → Extensions: slå på `pg_cron` och `pg_net`. Alternativt gör skriptet det själv (`create extension if not exists`). Kör sedan hela `supabase/manuellt/frist_paminnelser_schema.sql` i SQL Editor.

```sql
select jobname, schedule, active from cron.job where jobname = 'frist-paminnelser';
```

### 6. Provutskick och loggar

Vänta in nästa kvart, eller kör jobbets kommando en gång för hand:

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'projekt_url') || '/functions/v1/frist-paminnelser',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'x-paminnelse-nyckel', (select decrypted_secret from vault.decrypted_secrets where name = 'paminnelse_nyckel')),
  body := '{}'::jsonb, timeout_milliseconds := 10000);
```

Kontrollera i tur och ordning:

```sql
-- cron körde utan fel
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'frist-paminnelser')
 order by start_time desc limit 5;

-- funktionen svarade 200 (svar sparas 6 h)
select status_code, left(content, 300) as svar, error_msg, created
  from net._http_response order by created desc limit 5;

-- status per kanal: sent = levererad, failed = försöks igen (högst 12 gånger)
select nyckel, niva, kanal, status, forsok, fel, uppdaterad
  from public.frist_paminnelser order by uppdaterad desc;
```

Klart när meddelandet kommit fram i varje konfigurerad kanal och alla rader har `status = 'sent'`. Kör ytterligare en kvart och kontrollera att **inget** skickas igen. Stäng sedan #61.

## Felsökning

| Symptom | Orsak / åtgärd |
|---|---|
| `net._http_response` 401 `obehörig` | Vault-nyckeln ≠ `PAMINNELSE_NYCKEL` |
| 500 "Ingen kanal konfigurerad" | Varken Teams- eller Resend-secrets satta (funktionen kastar bara när det finns något att skicka) |
| `frist_paminnelser.status = failed`, `fel` "Teams svarade 4xx" / "Resend svarade 4xx" | Fel webhook/nyckel, eller overifierad avsändardomän i Resend. Nytt försök var 15:e min, högst 12. |
| Rad fast i `sending` | Körningen dog. Låset går ut efter 10 min och nästa körning tar raden. |
| Inget jobb i `cron.job` | Skriptet stoppades av Vault-kontrollen. Gör om steg 4. |

## Stoppa / backa

```sql
select cron.unschedule('frist-paminnelser');
```

Funktionen och tabellen kan ligga kvar. Utan schema anropas inget.
