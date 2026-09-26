# Projektportfölj BESS

React-versionen av projektportföljen för ONE Nordics batteriparker. Migreras
sektion för sektion från `Projektportfolj_standalone_2026-09-17.html`, som
ligger kvar orörd och fortfarande gäller för de vyer som inte flyttats än.

## Komma igång

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # en enda självbärande index.html i dist/
npm run lint
npm run typecheck  # TypeScript-kontroll av checklistdatan
npm test         # Vitest
npm run e2e      # Playwright, desktop + mobil
```

## Lagring och inloggning

Appen har två lägen, och väljer själv efter om Supabase är konfigurerat.

**Lokalt läge** — utan `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` sparas
allt i `localStorage` och ingen inloggning krävs. Det är läget e2e-testen kör i.

**Delat läge** — med variablerna satta krävs inloggning med magisk länk, och
adressen måste finnas i tabellen `allowed_users`. Se `.env.example`.

> Lägger du `.env.local` i projektet hamnar Playwright bakom inloggningsgrinden
> och testen faller. Kör testen utan den filen.

### Datamodellen

Hela portföljen ligger som två JSONB-rader i `app_state`:

| Nyckel | Innehåll | Vem får skriva |
| --- | --- | --- |
| `portfolj/state` | allt utom kontraktsvärde och betalplan | alla på listan |
| `portfolj/ekonomi` | kontraktsvärde och betalplan | bara `role = 'admin'` |

Behörigheten ligger i RLS, inte i klienten — `is_allowed()` och `is_admin()`
slår mot `allowed_users` via e-posten i JWT:n. Publishable-nyckeln är publik
till sin natur och följer med klientbygget; det är RLS som skyddar datan.

`src/state/db-supabase.js` lägger ett litet dokument-API ovanpå Supabase
(`doc(nyckel).get() / .set() / .onSnapshot()`) som `PortfolioProvider` är
skriven mot. En detalj värd att känna till: PostgREST svarar **inte** med fel
när RLS nekar en `UPDATE` — den returnerar noll rader. Adaptern räknar därför
rader och kastar själv, annars skulle en nekad ekonomiändring se ut att ha
sparats.

### Innan delat läge fungerar

Lägg till appens adress under *Authentication → URL Configuration* i Supabase,
annars skickar den magiska länken användaren till fel ställe.

## BESS EPC Checklista

Kapitlet *BESS EPC Checklista* bygger på "Bygga batteripark som totalentreprenad"
(v1.0, 2026-09-26): 16 faser med grind (G0–G15), 199 kontrollpunkter varav 33
hållpunkter, betalmilstolparna M1–M7, ledtider och tio lärdomar från Batch C.

| Fil | Innehåll |
| --- | --- |
| `src/data/bessChecklistData.ts` | Checklistan som data. Id:n (`"7.3"`, `"lop.4"`) är nycklar i sparad data och får aldrig numreras om. |
| `src/data/bessChecklistData.test.js` | Låser antalen (16/199/33/7) och kopplingarna mellan faser, grindar, milstolpar och ledtider. |
| `src/lib/epc.js` | Fasplan, grindar, milstolpar, ledtider och hållpunkter per projekt. |

Per projekt sparas bara det som avviker: avbockade punkter och kopplade UR i
`epcStatus`, egna fasdatum, passerade grindar och anteckningar i `epcFaser`.

**Fasplanen** räknas fram ur projektets startdatum (NTP), BESS-leveransen och
färdigställandet (slutbesiktning) — se `MALL_SKALA` i datafilen. Varje fas kan få
egna datum. Batch C saknar startdatum i underlaget; 2026-02-02 är satt som
ANTAGANDE och markeras tills någon anger det rätta.

**Grindar** räknas som passerade när de angetts i checklistan, när milstolpen de
låser är fakturerad, eller när en senare grind är passerad.

**Ledtiderna** räknas bakåt från kända datum (leveranslistan, tidplanen,
färdigställande) och annars från fasplanen. Röd = sista startdatum passerat,
gul = inom 14 dagar (`VARNING_DAGAR`).
