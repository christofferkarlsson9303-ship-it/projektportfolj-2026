# Site audit: Projektportfölj BESS (`bess-dashboard/`)

Datum: 2026-10-11 · Granskad version: `main` + PR #45 (`06c2760`)

## Så här är granskningen gjord (läs först)

- **Genomgånget:** `package.json` och konfiguration, tillstånds- och synklagret (`src/state/`), inloggning, Supabase-migrationerna och edge-funktionen, export och import (`src/lib/export*.js`, `importera.js`), felgränsen, designsystemets tokens och CSS, samt strukturen i `src/`. Dessutom sökningar över hela koden (`grep`) efter säkerhetsmönster, ARIA, bilder, `TODO`, nycklar och breakpoints.
- **Kört:** produktionsbygge (storlek), `npm audit`, kontrastberäkning på designtokens, en genomgång av alla 30 vyer i en riktig webbläsare (inga konsolfel), samt hela testsviten tidigare (495 enhetstester, 432 e2e).
- **Inte gjort:** ingen Lighthouse-, axe- eller skärmläsartest, ingen penetrationstest mot den riktiga Supabase-instansen och ingen rad-för-rad-läsning av alla ca 35 000 rader. Fynd som bygger på läsning av en fil står med filnamn. Allt som är ett **antagande** är markerat som det.

---

## 1. Översikt och arkitektur

### Teknik

| Del | Val |
|---|---|
| Ramverk | React 19 (`react`, `react-dom` 19.2), Vite 8, JavaScript (JSX) |
| Typning | TypeScript bara för tre datafiler (`src/**/*.ts`), kontrolleras med `tsc`. Resten är JS |
| Styling | Eget designsystem i `src/styles/design-system.css` (ca 2 100 rader) plus Tailwind 3 som läser samma CSS-variabler. Tailwinds `preflight` är avstängt |
| Diagram, 3D, dokument | Recharts, three (3D-siten), `@react-pdf/renderer` (PDF), `exceljs` (Excel), `pdfjs-dist` (läsa protokoll) |
| Data | Supabase (JSONB-rader i `app_state`, RLS, realtid, edge-funktion för påminnelser) eller `localStorage` i lokalt läge |
| Test och kvalitet | Vitest (38 testfiler), Playwright (32 specar, desktop + mobil), oxlint, GitHub Actions (`bess-dashboard.yml`) |
| Bygge | `vite-plugin-singlefile`: hela appen blir **en enda `index.html`** |

### Mappstruktur

`src/` är tydligt uppdelad och följer ansvar:

- `sections/` (46 filer): en fil per vy, registrerad i `sections/index.js`
- `components/` (77): `ds/` (designsystemet), `ui/`, `layout/`, `epc/`, `oversikt/`, `print/`, `field/` m.fl.
- `lib/` (71): ren affärslogik utan React (beräkningar, fasregler, export, import)
- `state/` (13): reducer, providers, Supabase-adapter, synk
- `data/` (19): seeddata, kataloger, konstanter

Styrkan är att logiken ligger i rena funktioner som är enhetstestade. Svagheten är att flera vyfiler är stora (15 filer över 400 rader, störst `Data.jsx` 693 och `Tidslinje.jsx` 760).

### Tillstånd, routning och API-anrop

- **Tillstånd:** en enda ren reducer (`portfolj-reducer.js`, 813 rader) över hela portföljen. `PortfolioProvider` sköter autospar (1,2 s), lokal spegel och synk. Tre kontexter: portfölj, UI (vy, tema, dialoger) och inloggning. Vyerna ser portföljen genom `aktivVy()` som döljer förlorade anbud.
- **Routning:** egen hash-router i `UiProvider` (`#/vy/projekt`). Okända vy-id faller tillbaka på Översikt. Ingen routerbibliotek.
- **API:** Supabase via ett litet dokument-API (`db-supabase.js`). Optimistisk låsning med versionsnummer, och vid konflikt slås ändringarna ihop fält för fält (`sammanfoga.js`). Ändringsloggen är en egen tabell som bara går att lägga till i. Inga andra externa API-anrop, förutom Google Fonts (se 4).
- **Hela portföljen är ett JSONB-dokument** (ca 14 KB seed). Det är enkelt och fungerar för nuvarande storlek, men skrivningar skickar hela dokumentet.

**Betyg: Bra.** Tydlig struktur, rena funktioner, bra tester. Se punkt 9 och 10 under åtgärdslistan för typning och filstorlek.

---

## 2. Visuellt, UI och UX

### Designsystem och kontinuitet

- Palett, ytor, toner och skuggor är CSS-variabler (`:root`), med ljust och mörkt läge (både via systeminställning och `data-theme`). Tailwind pekar på samma variabler, så det är ett system, inte två.
- 14 återanvändbara komponenter i `components/ds/` (Card, StatusBadge, Callout, Meter, RiskScore m.fl.). Nya ytor använder dem, enligt `CLAUDE.md`.
- **Brister i kontinuiteten:** 242 hårdkodade hex-värden i CSS utanför tokens (till exempel `#00a3c7` vid hover), 150 inline-`style={{…}}` i JSX och en sidhuvudfärg på sidebaren som skrivs ut som hex i stället för token. PDF-komponenterna använder hex av nödvändighet (react-pdf kan inte läsa CSS-variabler), vilket är rimligt.
- Dött innehåll: `src/assets/hero.png`, `react.svg`, `vite.svg` och `public/icons.svg` används ingenstans.

### Responsivitet

- Mobilanpassning finns på riktigt: tabeller blir kort med `data-label` på smal skärm (`design-system.css`), sidomenyn blir utfällbar, guidens stegväljare blir en `select`, och e2e-sviten körs på både desktop och mobil.
- **Brist:** 68 media queries med **9 olika maxbredder** (520, 560, 640, 760, 768, 820, 900, 980, 1024) och Tailwind-klasser med standardbrytpunkter (640/768/1024). Brytpunkterna är inte samordnade, så layouten kan hoppa på olika bredder i olika vyer. Det är en risk för små visuella fel mellan 520 och 1024 px.

### Tillgänglighet

**Bra:**
- `lang="sv"`, hopplänk till innehållet, `<main>` som landmärke, 159 `aria-hidden` på dekorativa ikoner, 155 `aria-label`, `role="dialog"` med `aria-modal`, fokusfälla och Escape i dialogen, `aria-live` på statusmeddelanden och `aria-current` i guiden.
- Alla `<img>` har `alt` (tom på dekorativa logotyper, text på de meningsbärande). Inga klickbara `div`/`span` hittades (inga `onClick` på icke-interaktiva element).
- `prefers-reduced-motion` och `:focus-visible` finns i CSS. Bara fem platser sätter `outline: none`, och de har egen fokusstil.

**Brister (beräknade ur tokens, inte uppmätta i webbläsare):**

| Par | Kontrast | WCAG AA (4,5:1) |
|---|---|---|
| Vit text på primärknapp (`.btn`, `#00b6de`) | **2,40:1** | Underkänd |
| Sekundärknapp, text `#00b6de` på vitt | **2,40:1** | Underkänd |
| `--ink-faint` på vit yta (40 användningar i JSX, 99 i CSS) | **2,91:1** | Underkänd |
| `--ink-faint` på `--sunken` | 2,58:1 | Underkänd |
| `--ink-soft` på `--sunken` | 4,28:1 | Gränsfall |
| Mörkt läge: `ink-faint` / `ink-soft` på yta | 4,72 / 6,81 | Godkänd |

Primärknappen används 180 gånger. Det här är den största enskilda tillgänglighetsbristen. Dessutom: sidopanelen (`Slideover`) flyttar fokus in och stänger med Escape, men jag hittade ingen kod som återför fokus till utlösaren vid stängning (inte testat i webbläsare), och riskmatrisen och trafikljuset bygger på färg, men har textetiketter bredvid (bra).

**Betyg: Designsystem Bra · Responsivitet Bra (samordna brytpunkter) · Tillgänglighet Behöver förbättras (kontrast).**

---

## 3. Funktionalitet och logik

### Kritiska flöden (verifierade i kod och körda e2e-tester)

- **Projektstart:** åtta faser, låsning, PDF med spärr, omräkning av gamla data, förlorade anbud med arkiv och återaktivering. Täckt av enhets- och e2e-tester, och logiken ligger i rena funktioner (`projektfas.js`, `projektstart.js`).
- **Spar och synk:** autospar, lokal spegel, versionskonflikt med sammanslagning, flush vid `pagehide`. Täckt av tester (`PortfolioProvider.test.js`, `synk.test.js`, `db-supabase.test.js`).
- **Export:** CSV skyddar mot formelinjektion (`citera()` prefixar `=`, `+`, `@`, `-`), Excel lagrar text som text. Bra.
- **Inloggning:** magisk länk, behörighet slås upp mot `allowed_users`.

### Felhantering

- Felgräns per sektion (`Felgrans.jsx`) med nollställning vid vybyte. Bra.
- **Brist 1, tyst lagringsfel (Hög):** i `PortfolioProvider.jsx` sväljs fel från `localStorage.setItem` (full lagring eller blockerad) med en tom `catch`. Statusraden skriver ändå **"Lokalt läge · sparad HH:MM"**. Användaren får alltså ett falskt "sparat". I lokalt läge är `localStorage` den enda lagringen, så data kan gå förlorad utan varning. Samma mönster finns vid `pagehide`.
- **Brist 2, felgränsen sitter bara runt vyn:** `PortfolioProvider`, `AppShell`, sidomenyn och kommandopaletten ligger utanför. Ett fel där ger en vit sida. Felgränsen visar dessutom det råa felmeddelandet i gränssnittet.
- **Brist 3, återställning från säkerhetskopia (Medium):** `forslagBackup` kontrollerar bara att `projekt` är en lista. Övriga listors rader valideras inte. `normalisera` släpper bara igenom listor, men fält med fel typ kan fortfarande krascha en vy (felgränsen fångar det, men datan är då skadad).
- Brutna länkar: hash-routern faller tillbaka på Översikt. Inga externa länkar att bryta, förutom Google Fonts.

### Saknade funktioner, TODO och buggar

- Inga `TODO`, `FIXME` eller `console.log` i koden (bara två `console.error` i felhantering). Kodbasen är ovanligt ren.
- **Möjlig bugg (Låg):** behörighetsuppslaget i `AuthProvider.jsx` använder `.ilike("email", epost)`. `_` och `%` i en e-postadress tolkas då som jokertecken. Servern (RLS) jämför exakt med `lower(email) =`, så ingen data läcker, men gränssnittet kan släppa in fel person förbi klientgrinden.
- **Terminologi:** EPC-stegen, projektfaserna och byggplanens delar hette alla "fas". Åtgärdat i PR #45 (Moment, Fas, Etapp).
- Äldre appversioner känner inte igen de nya status- och fasvärdena (se `docs/projektfaser.md`). Går bara att lösa genom att uppdatera alla klienter.

**Betyg: Funktionalitet Bra · Felhantering Behöver förbättras.**

---

## 4. Prestanda och säkerhet

### Prestanda

- **Det största problemet: bundlestorlek.** `dist/index.html` är **6,65 MB (2,18 MB gzip)**. Eftersom `vite-plugin-singlefile` inlinar allt är de `lazy()`- och `import()`-anrop som finns (3D-siten, Excel, PDF, pdfjs) **meningslösa**: koden ligger ändå i samma fil och måste laddas och tolkas innan appen visas. `e2e/hjalpare.js` kommenterar fortfarande "knappt 900 kB", så storleken har vuxit utan att någon märkt det. För en app som används ute på byggplatser, ofta på mobilnät, är det här det mest kännbara. (Antagande: nätet i fält är långsammare än kontor. Inte uppmätt.)
- **Typsnitt:** webben hämtar Roboto Slab och Open Sans från Google Fonts (`index.html`) trots att `woff`-filer redan finns i `src/assets/fonts`. Det är ett externt anrop, ett tredjepartsberoende och (antagande) ett dataskyddsfall att bedöma, och appen är inte "självbärande" som bygget utger sig för att vara.
- **Omrenderingar:** `React.memo` används inte alls. Portföljkontexten får nytt värde vid varje ändring, så alla konsumenter renderas om. Det märks inte vid dagens datamängd (14 KB seed) och `useMemo`/`useCallback` används i 42 filer, men det blir en kostnad när portföljen växer. Autospar gör `JSON.stringify` av hela tillståndet synkront vid varje ändring.
- **Bilder:** små (logotyp 21 KB, hero 13 KB, ej använd). Inga ooptimerade bilder.
- **Index som `key`:** 9 ställen använder radindex som React-nyckel (kan ge fel vid omsortering).

### Säkerhet

**Bra:**
- Behörighet ligger i **RLS i databasen**, inte i klienten. `is_allowed()` och `is_admin()` är `security definer` med låst `search_path`, `EXECUTE` är indraget för `anon`, ekonomidata är admin-låst, ändringsloggen är append-only. Publishable-nyckeln i `.env.example` är avsiktligt publik och dokumenterad.
- Inga hemliga nycklar i koden. Edge-funktionen läser hemligheter ur miljön och kräver en delad nyckel.
- Inga `eval`, `innerHTML` eller liknande. Det enda `dangerouslySetInnerHTML` (sidomenyns ikoner) matas av statiska SVG-strängar i `data/vyer.js`, inte av användarinmatning. React escapar övrig text.
- CSV-formelinjektion hanterad.

**Luckor:**
- **Inga RLS-tester i repot.** `supabase/tests/` testar bara påminnelselogiken, inte policyerna. Policyerna ser rätt ut vid läsning, men inget bevakar att de förblir rätt.
- **Bred skrivrätt:** varje användare på listan (`montor`) kan skriva över hela `portfolj/state`. Versionslåsning och sammanslagning mildrar slarv, men det finns ingen rad- eller fältnivå i behörigheten.
- **Inga säkerhetsheaders eller CSP** (ingen `vercel.json` eller meta-CSP). Appen laddar skript från samma ursprung och teckensnitt från Google, så en CSP vore enkel att införa.
- **Edge-funktionen** jämför nyckeln med `!==` (inte konstanttidsjämförelse). Låg risk bakom en lång slumpnyckel, men enkelt att rätta.
- **Beroenden:** `npm audit` ger 2 moderata fynd (`exceljs` → `uuid`, ingen praktisk exponering i hur uuid används här). `jszip` importeras i `protokolltext.js` men finns inte i `package.json` (kommer med `exceljs`). Ett odeklarerat beroende.
- Importen validerar bara på ytan, se punkt 3.

**Betyg: Prestanda Behöver förbättras (bundlen) · Säkerhet Bra, med luckor (tester, headers).**

---

## 5. Sammanfattning och prioriterad åtgärdslista

### Betyg per område

| Område | Betyg |
|---|---|
| Arkitektur och kodstruktur | **Bra** |
| Designsystem och styling | **Bra** |
| Responsivitet | **Bra** (samordna brytpunkter) |
| Tillgänglighet | **Behöver förbättras** (kontrast) |
| Funktionalitet och logik | **Bra** |
| Felhantering | **Behöver förbättras** (tyst lagringsfel) |
| Prestanda | **Behöver förbättras** (6,65 MB i en fil) |
| Säkerhet | **Bra, med luckor** (inga RLS-tester, inga headers) |

Inget område är kritiskt i meningen "trasigt", men tre saker bör åtgärdas innan appen används av fler.

### Åtgärdslista

| # | Prio | Åtgärd | Varför |
|---|---|---|---|
| 1 | **Hög** | Sluta leverera webben som en enda fil: bygg med riktig koddelning (ladda 3D, Excel, PDF och pdfjs först när de behövs), och behåll singlefile som separat bygge om en fristående fil behövs | 6,65 MB / 2,18 MB gzip vid första laddning. `lazy()` har ingen effekt idag |
| 2 | **Hög** | ✅ Åtgärdad 2026-10-11 (`lib/lokalLagring.js`, e2e `lagring.spec.js`). Visa lagringsfel: om `localStorage.setItem` misslyckas, visa en tydlig varning i statusraden i stället för "sparad" | Tyst dataförlust i lokalt läge |
| 3 | **Hög** | Rätta kontrasten: använd en mörkare blå för knappbakgrund och text (till exempel `#00728f`, ca 5,6:1 mot vitt) och höj `--ink-faint` till minst 4,5:1 | Primärknappen (180 användningar) och sekundär text underkänns i WCAG AA | ✅ Åtgärdad 2026-10-11: ny token `--knapp-bla` (#00728f, 5,5:1) för knappar, `--text-bla` för blå text (ljust läge #00728f, mörkt läge oförändrat #00b6de), `--ink-faint` #5a6e77 (4,7:1 på sunken) och `--ink-soft` #4d6068. `--one-bla` finns kvar för dekor.
| 4 | **Medium** | Lägg till RLS-tester (pgTAP eller ett skript mot lokal Supabase) för `allowed_users`, `app_state` och `protokoll` | Policyerna är det som skyddar all data, men ingenting bevakar dem |
| 5 | **Medium** | Self-hosta typsnitten (filerna finns redan) och lägg till CSP och säkerhetsheaders | Tar bort Google som tredjepart och stänger en lucka |
| 6 | **Medium** | Validera säkerhetskopian vid återställning (typ och fält per lista) i stället för att bara kontrollera `projekt` | Skadad import kan korrumpera data |
| 7 | **Medium** | Lägg en felgräns runt hela appen (utanför `PortfolioProvider`) och visa inte råa felmeddelanden för användaren | Idag ger ett fel i skalet en vit sida |
| 8 | **Låg** | Samordna brytpunkterna (välj tre) och flytta hårdkodade hex och inline-stilar till tokens | Mindre layouthopp, enklare underhåll |
| 9 | **Låg** | Byt `.ilike` mot exakt `lower()`-jämförelse i `AuthProvider`, använd konstanttidsjämförelse i edge-funktionen, deklarera `jszip`, uppdatera `exceljs` när en version utan `uuid`-fyndet finns | Små säkerhets- och hygienfynd |
| 10 | **Låg** | Ta bort döda filer (`hero.png`, `react.svg`, `vite.svg`, `icons.svg`), byt index som `key` (9 ställen), uppdatera kommentaren om "900 kB", och dela de största vyfilerna (>600 rader) | Röjning och framtida läsbarhet |

### Det som är starkt (behåll)

- Rena, enhetstestade funktioner för affärslogiken och en stor e2e-svit på både desktop och mobil.
- RLS som enda auktoritet för behörighet, och optimistisk låsning med sammanslagning.
- Ett riktigt designsystem med tokens, ljust och mörkt läge, och bra grundläggande tillgänglighet.
- Ovanligt ren kod: inga `TODO`, inga `console.log`, ingen `eval`.
