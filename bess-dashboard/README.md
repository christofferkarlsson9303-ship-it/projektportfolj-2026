# Projektportfölj BESS

Claude och andra agenter: läs [`CLAUDE.md`](CLAUDE.md) och [`docs/prototyp-36037.md`](docs/prototyp-36037.md) innan ni ändrar Idag, tidplan, ÄTA eller utskrift. PR 28 är snabbutskrift. Grok-prototypen ska inte mergas som en andra app.

React-versionen av projektportföljen för ONE Nordics batteriparker. Alla vyer
är flyttade från originalfilen, som är arkiverad i
[`arkiv/`](arkiv/README.md) som referens för originalets beteende.

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

### Samtidiga ändringar

Varje rad i `app_state` har en version. En skrivning går bara igenom om
versionen är den klienten senast *tog in* — en realtidsändring som inte lästs
in (för att användaren stod i ett fält) räknas inte. Hinner någon annan före
blir det konflikt, och då slås ändringarna ihop mot senast gemensamma läge
(`src/lib/sammanfoga.js`): rader med id slås ihop fält för fält, så två
personer som ändrar olika saker får båda behålla sina ändringar. Har båda
ändrat samma fält gäller den egna versionen, och en toast säger till.

`src/state/PortfolioProvider.test.js` provar detta med två användare mot en
falsk Supabase i minnet (`src/test/falskSupabase.js`).

### Schemat

Hela databasschemat ligger i `supabase/migrations/` — tabeller, RLS-regler,
`is_allowed()` / `is_admin()`, versionsräknaren och ändringsloggen. Filerna
före 2026-09-24 är exporterade ur projektets migreringshistorik i efterhand;
nya ändringar görs som nya filer här och körs med `supabase db push`.

### Tidplan med beroenden (Blir vi klara i tid)

`src/lib/kritiskLinje.js` räknar prognos per fas och kritisk linje över de
16 byggfaserna, med standardnätet i `src/data/fasberoenden.js`. Passerade
grindar ligger fast, faser som dragit över räknas klara tidigast i dag, egna
datum och bekräftad BESS-leverans förs vidare. Avstånden tas ur baslinjen
(`epcBaslinje`, sparas i Tidplan) eller standardplanen; ett glapp i ett
finish–start-beroende är buffert, inte krav. Visas i Tidplan och som ram
runt kritiska faser i översiktens Gantt-schema.

### Påminnelser om frister

Edge Function `supabase/functions/frist-paminnelser` körs var 15:e minut och
skickar en påminnelse när en frist blir akut (≤ 12 h kvar av 24) och när den
passerat — underrättelse om ÄTA/hinder och incidentrapport. 24 timmar är er
egen rutin. När projektet har en kontraktsprofil skrivs kontraktets gräns med
i påminnelsen (Batch C: 10 bankdagar för hinder, §18.2). Varje frist påminns en gång per nivå (`frist_paminnelser`).
Fristlogiken ligger i `supabase/functions/_shared/frister.js` och testas mot
appens `fristrader` så att de inte glider isär.

Driftsättning:
1. Kör migreringen `20260929200000_frist_paminnelser.sql`.
2. `supabase functions deploy frist-paminnelser` och sätt hemligheterna:
   `PAMINNELSE_NYCKEL` (valfri lång sträng) samt `TEAMS_WEBHOOK_URL` och/eller
   `RESEND_API_KEY` + `PAMINNELSE_TILL` (+ `PAMINNELSE_FRAN`, `APP_URL`).
3. Prova: `curl -H "x-paminnelse-nyckel: …" "<projekt>/functions/v1/frist-paminnelser?torr=1"`.
4. Kör `supabase/manuellt/frist_paminnelser_schema.sql` för schemaläggningen.

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
| `StatGroup` | Samma nyckeltal inuti ett kort, utan egen ram. |
| `Callout` | Upplysning, antagande eller varning — tonen sitter i kanten och ikonen, inte i ytan. |
| `Meter` | Mätare för andel av en helhet, i samma ton som Gantt-schemat. |
| `Overline` | Liten versal rubrik för ett avsnitt inuti ett kort. |
| `CheckList` | Avbockningslista för underlag, ronder och kontrollpunkter. |
| `TableRegion` | Rullbar, namngiven yta för en egen tabell (DataTable har sin egen). |
| `RiskScore` | Riskvärde som märke — nivån (låg, medel, hög) står i text, inte bara i färgen. |

Alla vyer är byggda av dem. Formulärkontrollerna (`Falt`, `NumFalt`,
`DatumFalt`, `Kryss`, `SelStatus`, `TaBortKnapp`) ligger i
`src/components/ui/Falt.jsx`. Status ur registrens egna listor (`fakturerad`,
`oppen`, `godkand` …) visas med `<StatusBadge {...registerStatus(status)} />`.

### Gantt-schemat

`src/components/ui/Tidslinje.jsx` ritar Tidplanen (och ÄTA-vyns tidslinje)
som ett Gantt-schema: ett kollapsbart spår per projekt, en rad per post,
staplar från start till slut och en romb för händelser på ett enda datum.
Zoom Dag / Vecka / Månad / Kvartal byter skala och rutnät (veckonummer i
rubriken), och den orange i dag-linjen rullas i bild när schemat ritas.

| Läge | Färg | Ikon |
| --- | --- | --- |
| Klar | Blågrön | bock |
| Pågående | ONE Blå | punkt i ring |
| Försenad | Röd | varningstriangel |
| Planerad | Grå | ring |

Läget visas alltid som färg, ikon och text. Verktygstipset (hovring och
tangentbordsfokus) visar datum, läge och ansvarig; klick öppnar
detaljpanelen där anroparen kan lägga till redigering via `redigera`. I
Tidplanen hämtas byggfaserna ur Bygga batteripark (start, slut och läge),
och milstolpar och leveranser blir staplar när de har ett startdatum.

### Planering och tid

Resurser, Tidrapport, Budget och utfall och Fakturaunderlag räknar i
`src/lib/planering.js` (enhetstestade i `planering.test.js`):

- **Tidkostnad** = timmar × personens á-pris × tidslag (övertid 1,5 / 2 / 3).
- **Beläggning** = planerade timmar mot kapacitet per vecka. Skalan är
  sekventiell: ljust ONE Blå för utrymme kvar, djup Blågrön för 85–100 % och
  rött med varningsikon över kapacitet.
- **Arbetsbudget** i kronor räknas med snittet av á-priserna (ANTAGANDE);
  utfallet alltid med respektive persons á-pris.
- **Fakturaunderlag** = debiterbar tid och kostnad som inte redan ligger i ett
  underlag, plus 10 % entreprenadarvode på kostnaderna (ABT 06 kap. 6 § 9).
  Underlaget låser sina rader i samma steg (`SKAPA_FAKTURAUNDERLAG`) och kan
  ångras tills det är fakturerat.

### ÄTA-kalkylen

"Öppna i kalkyl" i ÄTA-registret eller ärendepanelen räknar rader på ett
befintligt ärende (`src/lib/atakalkyl.js`, `src/sections/Ata/AtaKalkyl.jsx`):

- **Per rad** = antal × á-pris × (1 + övertid % / 100) × (1 + påslag % / 100).
  Arbete och maskin: övertid 0/50/100 %. Fordon per km utan tillägg. Material
  och UE: faktisk kostnad, á-pris 1, påslag 10 % (ABT 06 kap. 6 § 9). Tid ur
  tidrapporten behåller sitt tidslag (faktor 1–3).
- **Priser** slås upp i `kalkylResurser()` i `planering.js`: Bilaga 06.1,
  medarbetarnas á-priser, `KM_PRIS` och `KOSTNADSTYP` först.
  `KALKYL_STARTPRISER` fyller bara luckorna.
- **Data**: raderna ligger på posten i `kalkyl.rader` — samma `kalkyl`-objekt
  som originalverktyget hade; en gammal kalkyl läses om till rader. *Spara*
  skriver nettot (exkl. moms) på ärendets belopp och loggar ändringen.
- **Avi** skrivs ut via `#utskrift` (`AtaAvi.jsx`) eller som PDF (`AtaPdf`,
  typ `avi`), med två signaturrutor. **CSV** har semikolon och BOM.

### Siten i 3D

Vyn *Siten i 3D* (vy-id `site`) visar valt projekts tomt, 80 × 52 m, med
`three` (`src/sections/Site/`, logiken i `src/lib/site.js`):

- **Objekt**: skid och container 6,1 × 2,5 × 2,9 m, E-House 12 × 3,2 × 3,4 m,
  trafo 3,2 × 2,6 × 2,6 m, låda och nål. Välj en mall och klicka på marken —
  i 3D-vyn eller i planvyn. Ett markerat objekt kan dras, döpas om och få
  bredd, djup, höjd och rotation. En nål pekar alltid på en punkt i `punkter`
  (id); en nål utan punkt går inte att spara.
- **Data**: listan `siteObjekt` i `portfolj/state`, en rad per objekt med
  `projektId`. Slås ihop rad för rad i `sammanfoga.js`. *Återställ* tömmer bara
  valt projekt. Flytt och mått loggas inte; placering och borttagning gör det.
- **Gå in**: three, högerhänt, +Y upp, yaw 0 tittar mot −Z. W/S fram och bak,
  A/D strafe åt vänster och höger (pilarna gör samma), Shift springer, Q/E upp
  och ner, musen tittar med pekarlås. Kollision mot volymens låda i lokal
  rotation med 0,45 m marginal — ett blockerat steg stannar. På pekskärm finns
  en joystick nere till vänster.
- **Situationsplan**: en bild som marktextur, med bredd i meter och norr i
  grader. Den ligger bara i `sessionStorage` (`batchc-situationsplan:<projekt>`)
  — aldrig i `portfolj/state`, aldrig i synken.
- **Idag** visar en toppvy ritad ur samma objekt under bandet, bara när
  projektet har volymer. Klick öppnar siten.
- Scenen ritas bara när något ändrats och när den syns. Utan grafikkort
  (SwiftShader) stängs skuggor och autorotation av; utan WebGL visas planvyn.

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
