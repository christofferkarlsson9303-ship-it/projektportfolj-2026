# Behörighetsprov i målmiljön — 2026-10-22

Gäller issue #75 (granskningens bilaga A, avsnitt 4) och slutför #59 (godkännanden) och migrationsdelen av #61 (påminnelser). Målmiljö: Supabase-projektet `projektportfolj` (eu-north-1, Postgres 17).

**Sammanfattning:** RLS är påslaget på alla sju tabeller i `public`, alla policyer gäller bara rollen `authenticated`, och båda Storage-buckets är privata. Anonym kan varken läsa eller skriva. En inloggad användare som inte står i `allowed_users` ser inga rader och kan inte kvittera. Provet hittade inga behörighetsfel. Fyra saker återstår att prova eller göra och står under *Inte verifierat*.

## Vad som gjordes i produktion samma dag

Fem migrationer hade inte applicerats (`list_migrations` slutade vid `20261014070720_site_ritningar`). De applicerades i datumordning:

| Migration | Resultat |
| --- | --- |
| `20260929200000_frist_paminnelser` | Tabellen finns, RLS på, läsning för tillåtna |
| `20261016180000_projektkatalog` | `projekt` med 6 projekt (fylld ur portföljen), trigger på `app_state`, främmande nyckel på `protokoll` validerad (10 protokoll, inga frikopplades) |
| `20261016190000_andringslogg_idempotens` | Kolumnen `klient_nyckel` och unikt index |
| `20261021120000_frist_paminnelser_per_kanal` | Status per kanal, lås, återförsök. Funktionerna är inte anropbara av `anon`/`authenticated` |
| `20261021130000_godkannanden` | Tabell och `registrera_godkannande()`, bara `authenticated` kan anropa |

Verktyget för migrationer gav timeout på de större satserna, så fyra av dem kördes som enskilda SQL-satser i stället för en transaktion. Under några minuter fanns tabellen `projekt` utan RLS (en sats hängde) innan den slogs på. Den innehöll bara projektnamn. Jag kan inte utesluta att den under den tiden gick att läsa med den publika nyckeln, men tabellen var ny och inget i appen läste den. Migrationshistoriken (`supabase_migrations.schema_migrations`) är rättad till repots versionsnummer.

## Grants och policyer

| Tabell | RLS | Policyer (alla `authenticated`) |
| --- | --- | --- |
| `allowed_users` | på | admin ALL, tillåtna SELECT |
| `andringslogg` | på | tillåtna SELECT och INSERT (append-only, inga UPDATE/DELETE) |
| `app_state` | på | tillåtna SELECT och UPDATE, admin INSERT och DELETE |
| `frist_paminnelser` | på | tillåtna SELECT |
| `godkannanden` | på | tillåtna SELECT (skrivs bara via funktionen) |
| `projekt` | på | tillåtna SELECT |
| `protokoll` | på | tillåtna SELECT och INSERT, admin UPDATE och DELETE |

`anon` har tabellrättigheter (Supabases standard), men inga policyer, så RLS ger noll rader och nekar skrivning.

**Storage:** `protokoll` (privat, 25 MB, ingen MIME-begränsning) och `ritningar` (privat, 50 MB, bara pdf/png/jpeg/webp). Policyer: tillåtna får läsa och ladda upp, admin får ta bort ritningar. Ingen UPDATE-policy finns, så befintliga filer går inte att skriva över.

## Provet

Körde som ett `DO`-block med `set local role` och simulerade JWT-claims. Blocket avslutades alltid med ett avsiktligt fel, så ingenting sparades. Efteråt: `godkannanden` 0 rader, `andringslogg` 198 rader (oförändrat), inga provrader.

| Roll | Prov | Utfall |
| --- | --- | --- |
| Anonym | läsa `app_state`, `andringslogg`, `godkannanden`, `projekt` | 0 rader |
| Anonym | skriva `andringslogg`, `godkannanden` | nekad (42501) |
| Anonym | `registrera_godkannande()` | nekad (42501) |
| Inloggad, ej på listan | läsa `app_state` | 0 rader |
| Inloggad, ej på listan | `registrera_godkannande()` | nekad (42501) |
| Tillåten | läsa `app_state` | 2 rader |
| Tillåten | skriva direkt i `godkannanden` | nekad (42501) |
| Tillåten | `registrera_godkannande()` (grind) | ok; `kvitterad_av` = användarens uid, tid satt av databasen |
| Tillåten | samma värde igen | samma rad, ingen dubblett |
| Tillåten | egenkontroll med framtida datum | nekad (22023) |
| Tillåten | egenkontroll utan kontrollant | nekad (22023) |
| Tillåten | okänt projekt | nekad (22023) |
| Tillåten | `reservera_paminnelser()` | nekad (42501) |

## Säkerhetsrådgivaren (Supabase)

- **`is_admin()`, `is_allowed()` och `registrera_godkannande()` är `SECURITY DEFINER` och körbara av `authenticated`.** Avsiktligt: de två första används i policyerna och ger bara ett ja/nej; den tredje validerar behörighet inuti. Ingen åtgärd.
- **Skydd mot läckta lösenord är av.** Ska slås på i Supabase Auth-inställningarna (Authentication → Policies). Kan inte göras via databasen.

## Inte verifierat

1. **Montör och admin som skilda roller.** Projektet har en användare (beslut F01), så tillåten användare och admin kunde inte prövas separat. `is_admin()`-policyerna är lästa men inte exekverade som en annan användare.
2. **Riktiga inloggningar via API:t.** Provet simulerade rollerna i databasen. `scripts/behorighetsprov.mjs` kör mot det riktiga API:t med inloggningar och bör köras av dig.
3. **Backup.** Går inte att läsa härifrån. Kontrollera i Supabase (Database → Backups) att dagliga säkerhetskopior eller PITR är påslaget.
4. **Edge Function `frist-paminnelser`** är inte driftsatt (`list_edge_functions` är tom). Migrationen för #61 är på plats, men påminnelserna skickas först när funktionen driftsätts med sina kanalnycklar. #61 stängs då.
