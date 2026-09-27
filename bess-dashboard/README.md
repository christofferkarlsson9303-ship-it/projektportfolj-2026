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

## Designsystemet

Nya vyer byggs av komponenterna i `src/components/ds/` — Tailwind på
designsystemets tokens (`tailwind.config.js`), så att samma komponent är rätt i
ljust och mörkt läge och följer ONE Nordics profil. Avstånden följer en
8 px-skala (`gap-4`, `gap-6`, `p-4`, `p-6`).

| Komponent | Används till |
| --- | --- |
| `Card` | Varje avgränsad ruta: rubrik, underrubrik, statusmärke och åtgärd i huvudet. |
| `StatusBadge` | All status (`forsenad`, `starta_nu`, `pagar`, `kommande`, `klar` …) — tonerna står i `src/lib/status.js`. |
| `ProgressSummary` | Framdrift: kontrollpunkter, hållpunkter och grindar som tal och mätare. |
| `LeadTimeList` | Åtgärdsrader med status, titel, datum och förskjutning linjerade. |
| `DataList` | Nyckel–värde-rader i stället för löpande text. |
| `SectionHeading` | Rubrik och ingress för en sektion utanför kort. |
| `StatTile` | Nyckeltalsruta: etikett, tal och en rad om vad talet betyder. |
| `Callout` | Upplysning, antagande eller varning — tonen sitter i kanten och ikonen, inte i ytan. |
| `Meter` | Mätare för andel av en helhet, i samma ton som Gantt-schemat. |

Översikten (`DashboardView`), Bygga batteripark, Milstolpar M1–M7, ÄTA och
hinder och Dagbok är byggda av dem. De äldre vyerna får samma statusmärke via
`Pill`, samma nyckeltalsruta via `Kpi` (→ `StatTile`), samma upplysning via
`Note` (→ `Callout`) och samma kortform via `.card`.

## Bygga batteripark

Kapitlet *Bygga batteripark* (vy-id `epc`) bygger på "Bygga batteripark som
totalentreprenad" (v1.1, 2026-09-26): 16 faser med grind (G0–G15), 286
kontrollpunkter varav 47 hållpunkter, betalmilstolparna M1–M7, nyckelvärden,
ledtider, tio lärdomar från Batch C och tolv motsägelser att reda ut. Version
1.1 bygger på en genomgång av samtliga källor i åtta NotebookLM-böcker; de nya
punkterna ligger sist i varje fas under "Från källgenomgången". Kapitlet är en guide och en lägesbild, inte en
att göra-lista: överst står var varje projekt är i de 16 faserna, under det
guiden steg för steg med kontrollpunkterna som referens.

| Fil | Innehåll |
| --- | --- |
| `src/data/bessChecklistData.ts` | Checklistan som data. Id:n (`"7.3"`, `"lop.4"`) står i länkar och ledtidernas punkthänvisning och får aldrig numreras om — nya punkter läggs sist i fasen med nästa lediga nummer. |
| `src/data/bessChecklistData.test.js` | Låser antalen (16/286/47/7/12), att id:n från 1.0 finns kvar och kopplingarna mellan faser, grindar, milstolpar och ledtider. |
| `src/lib/epc.js` | Lägesbild, fasplan, grindar, milstolpar, ledtider och hållpunkter per projekt. |

Varje punkt bockas av per projekt (eller sätts som ej aktuell), och en
passerad grind gör dessutom alla fasens punkter klara. Per projekt sparas bara
det som avviker: passerade grindar, egna fasdatum och anteckningar i
`epcFaser`, ledtider som markerats klara i förväg i `epcLedtider`, avbockade
punkter i `epcPunkter` och kommentarer i `epcKommentarer`.

**Nästa uppgift** på Översikten tar första posten i kön från `nastaUppgifter`:
försenade och akuta ledtider först, sedan öppna punkter i försenade och
pågående faser i checklistans ordning, och grinden när en fas är klar. Bockas
den av vaskas nästa fram direkt, och det senaste går att ångra.

**Erfarenhetsåterföring:** kommentarer av typen avvikelse eller lärdom blir
erfarenhetslistan (`erfarenheter`), rangordnad på påverkan, hur många projekt
samma punkt gett problem i, och kostnad. Andra projekts erfarenheter visas på
samma punkt i guiden och på Nästa uppgift, så lärdomen dyker upp när den
behövs. Listan går att skriva ut som A4.

**Fasplanen** räknas fram ur projektets startdatum (NTP), BESS-leveransen och
färdigställandet (slutbesiktning) — se `MALL_SKALA` i datafilen. Varje fas kan få
egna datum. Batch C saknar startdatum i underlaget; 2026-02-02 är satt som
ANTAGANDE och markeras tills någon anger det rätta.

**Grindar** räknas som passerade när de markerats i guiden, när milstolpen de
låser är fakturerad, eller när en senare grind är passerad.

**Ledtiderna** räknas bakåt från kända datum (leveranslistan, tidplanen,
färdigställande) och annars från fasplanen. Röd = sista startdatum passerat,
gul = inom 14 dagar (`VARNING_DAGAR`).
