# Driftkontroll 2026-10-22 — ärenden #61, #69 och #75

Målmiljö: `oafvefbplfjxwgmjcwvx` (projektportfolj). Resultaten nedan kommer från målmiljön. Projektdata, kontouppgifter och hemligheter ingår inte i rapporten.

## #69 — gemensamt portföljdokument

Beslutet 2026-10-21 gäller: en användare, ingen uppdelning av JSONB-dokumentet nu. Instrumenteringen finns på main i `src/lib/matning.js` och Data → Lagring. Den varnar över 1 024 kB eller 1 500 ms p95 för sparning i appen. Tester omfattar även en simulerad portfölj efter ett års drift.

| Mätning i produktion | Resultat |
| --- | ---: |
| `portfolj/state`, JSON-text | 114 302 byte, cirka 111,6 KiB |
| `portfolj/state`, komprimerat lagrat värde | 41 536 byte |
| `portfolj/ekonomi`, JSON-text | 1 897 byte |
| No-op UPDATE på portföljen, 30 prov, databas-p95 | 0,880 ms |

UPDATE-proven kördes i en transaktion som avslutades med ROLLBACK. Databas-p95 omfattar **inte** nätverk, autentisering, JSON-serialisering eller klientens sparflöde och ska inte förväxlas med appens p95. Den senare mäts vid verkliga sparningar i användarens flik. Ingen klient-p95 har hämtats från användarens session i denna kontroll.

Ärendet kan avslutas enligt det befintliga beslutet att mäta och bevaka i stället för att migrera. En uppdelning ska tas upp igen om någon varningsgräns passeras eller fler användare får åtkomst.

## #75 — behörigheter

### Genomfört i målmiljön

- RLS är på för samtliga sju tabeller i `public`.
- Buckets `protokoll` och `ritningar` är privata.
- `reservera_paminnelser` och `markera_paminnelser` är inte körbara av `anon` eller `authenticated`.
- Onödiga `TRUNCATE`, `REFERENCES` och `TRIGGER`-rättigheter hittades för klientrollerna. De har återkallats från tabellerna i `public`, och från motsvarande standardrättigheter för nya tabeller skapade av `postgres`. DML-rättigheter och RLS-policyer är oförändrade.
- Migration `20261022094219_begransa_tabellrattigheter` är applicerad i produktion.
- `supabase/prov/behorighetsprov-roller.sql` kördes efter ändringen: **24 av 24 kontroller passerade**. Provet använder simulerade JWT-claims för anonym, ej tillåten, montör och admin. Montörens tillfälliga allowlist-rad, provrader och no-op-skrivningar rullades tillbaka. Detta är ett SQL/RLS-prov, inte ett prov av inloggning eller tokensignatur.
- Anonymt HTTP-anrop till portfölj/allowlist gav 0 rader. Anonymt anrop till intern reservations-RPC gav HTTP 401 med PostgreSQL-kod 42501.

| SQL-prov | Anonym | Ej tillåten | Montör | Admin |
| --- | --- | --- | --- | --- |
| Läsa portfölj | Nekat | Nekat | Tillåtet | Tillåtet |
| Uppdatera portfölj | Nekat | Nekat | Tillåtet | Tillåtet |
| Uppdatera ekonomi | Nekat | Nekat | Nekat | Tillåtet |
| Skapa separat provrad | Nekat | Nekat | Nekat | Tillåtet |
| Köra intern reservations-RPC | Nekat | Nekat | Nekat | Nekat |
| TRUNCATE-rättighet | Saknas | Saknas | Saknas | Saknas |

### Rättat i provskriptet

`scripts/behorighetsprov.mjs` gav tidigare sluttexten ”Inga avvikelser” och exitkod 0 även när inloggningar saknades. Saknade/otillräckliga prov ger nu exitkod 2 och ett uttryckligt ofullständigt resultat. Nätfel, JWT-fel, schemafel och tomt underlag kan inte räknas som bevis på nekad åtkomst. Montörens INSERT-förväntan följer nu den verkliga adminpolicyn. Städning kontrolleras, och direktskrivningsprovet för godkännanden använder ingen riktig projektidentitet.

En anonym API-körning av det rättade skriptet gav exitkod 2 med 48 ej verifierade prov. Det är ett förväntat **ofullständigt** resultat när övriga rollinloggningar saknas.

### Återstår — håll #75 öppet

- Kör API-provet med riktiga inloggningar för relevanta roller. SQL-claims är inte en ersättning för det.
- Verifiera plan, PITR/backup, senaste lyckade backup och ett återläsningsprov i Supabase Dashboard → Database → Backups.
- Aktivera/verifiera skydd mot läckta lösenord i Auth. Advisors rapporterar att det är avstängt.
- Advisors markerar även de tre avsiktliga SECURITY DEFINER-funktionerna `is_allowed`, `is_admin` och `registrera_godkannande`. Funktionernas källkod har granskats: hjälpfunktionerna gör allowlist-kontroll; kvitteringsfunktionen kräver `auth.uid()` och `is_allowed()`. Inga EXECUTE-rättigheter har öppnats för anonym.

## #61 — påminnelser

- De två befintliga påminnelsemigrationerna är applicerade.
- Edge Function `frist-paminnelser` är nu driftsatt: ACTIVE, version 1. Den driftsatta koden är oförändrad från main vid `e3de2d68ec2bd32cfaa17fa981e686d2b684f149`.
- Funktionen har egen autentisering med `x-paminnelse-nyckel`; plattformens JWT-kontroll är därför av. Ett anrop utan nyckeln verifierades till HTTP 401, `obehörig`.
- 27 berörda tester för frister, återförsök och lagringsmätning passerade före driftsättning.
- Inga påminnelser skickades under kontrollen.

### Återstår — håll #61 öppet

Vid inventeringen saknades `pg_cron`, `pg_net` och Vault-hemligheter. Ingen fungerande leveranskanal kunde verifieras med tillgängliga anslutningar. Schemat har därför inte aktiverats.

1. Ange/verifiera `PAMINNELSE_NYCKEL` i Edge Function Secrets.
2. Konfigurera Teams-webhook och/eller Resend med avsändare/mottagare i Secrets. Alla konfigurerade kanaler ska lyckas enligt beslutet 2026-10-21. Lägg aldrig hemligheter i GitHub eller chatten.
3. Sätt `projekt_url` och samma `paminnelse_nyckel` i Vault.
4. Gör ett autentiserat `?torr=1`-anrop för att kontrollera urvalet utan att skicka. Kontrollera kanalinställningarna separat; nuvarande torrsvar verifierar inte kanalnycklarna.
5. Kör `supabase/manuellt/frist_paminnelser_schema.sql`. Filen har fått en kontroll som stoppar schemaläggningen om Vault-värdena saknas.
6. Verifiera leverans och återförsök med ett avgränsat, uttryckligen godkänt utskick, därefter cron-loggen. Stäng först då #61.
