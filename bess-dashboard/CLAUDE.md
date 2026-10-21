# Claude — läs detta innan du skriver kod

Du är i **bess-dashboard**: Vite, React, Tailwind, `localStorage` eller Supabase JSONB. Inte TanStack Start. Inte zustand. Inte en ny app.

En visuell prototyp byggdes 2026-10-04 i ett annat verktyg (Grok). Den ligger **inte** i det här repot och ska inte klistras in. Beteendet som är värt att behålla står i [`docs/prototyp-36037.md`](docs/prototyp-36037.md). Läs den filen helt innan du rör Idag, tidplan, ÄTA eller site.

## Vad som redan är sant

- **Tidplanen ”Blir vi klara i tid” finns.** `src/components/tidplan/KritiskLinje.jsx` + `src/lib/kritiskLinje.js` + `src/data/fasberoenden.js`. Kolumnerna fas, standardplan, beräknat, försening, marginal, väntar på, och tabellen M1–M7, är redan där. Prototypens ”0 dagar” och fasta datum 2026-12-02 är seed för 36037, inte en kalkyl. Byt inte ut motorn.
- **Ett klick till papper är PR 28**, grenen `snabbutskrift`. `useSnabbUtskrift()` i `src/components/field/SnabbUtskrift.jsx` skriver ut arbetslista och fasblankett utan att öppna panelen. Panelen (`FaltmaterialPanel.jsx`) finns kvar för fler val. Ctrl/Cmd+K har samma dokument. Bygg inte en ny utskriftsväg.
- **Designsystemet** är `src/components/ds/` (`Card`, `StatTile`, `StatusBadge`, `Callout`). Nya ytor använder det. Inga nya hex-färger, inget parallellt tema.
- **ÄTA-kalkylen finns på två ställen med samma kod.** Kortet i vy `ata` (”Öppna i kalkyl”) och egen flik `atakalkyl` (`AtaKalkylVy.jsx`). Logiken ligger i `src/sections/Ata/useAtaKalkyl.jsx` och tabellen i `KalkylTabell.jsx`. Ändra där, inte i två kopior.
- **Ärenden på siten.** UR/ÄTA-poster kan kopplas till ett `siteObjekt` (`objectGuid`, `viewpoint`, `boundingBox`, `modelVersionId`) och 3D-vyn kan jämföra modellversioner. Läs [`docs/modellarenden.md`](docs/modellarenden.md) innan du ändrar det. IFC-import (web-ifc, metadata i state, geometri i IndexedDB) och BCF-export finns; läs avsnitten där. Ingen egen backend.
- **Data** är två JSONB-rader: `portfolj/state` och `portfolj/ekonomi`. RLS skyddar. Ändra inte schemat för en kalkylator eller en bild. Undantag och beslut om schema står under *Teknisk granskning 2026-10-16* nedan.

## Teknisk granskning 2026-10-16

Granskningen (commit `0e7f85961c8a`, fynd F01–F15) ligger till grund för GitHub-issues märkta `granskning`. Etapp A finns på grenen `granskning/etapp-a`.

**Regler som gäller nu:**

- **Kontrolltäckning.** `kontrollage()` räknar en punkt som verifierad först när varje omfattning som registrerats i fasen är komplett. Gör inte tillbaka till "minst en rad".
- **Datum** i kontroller valideras med `arGiltigtDatum()` i `src/lib/datum.js`. Använd den, inte `Date.parse`.
- **Inga ärenden är ingen driftstatus.** `komponentLage()` ger ton `ingen`, aldrig `ok`. Grönt får inte betyda "inget registrerat".
- **SoC** är manuellt inmatad. `parkSumma()` ger `soc = null` vid delvis underlag och `socUnderlag` med metod och täckning. Visa grunden, aldrig en viktad siffra som tappat containrar.
- **Ändringsloggen** markeras skickad först efter svar från tabellen. Varje post skrivs med `klient_nyckel` (`loggKlientNyckel()`) och `ON CONFLICT DO NOTHING`, så återförsök ger inga dubbletter.
- **Projekt-ID** hårdkodas aldrig i SQL. `public.projekt` fylls från `portfolj/state` av en trigger.
- **Krantext och kontrollintervall:** skriv aldrig kranklass som villkor ("≥ 45 t kran"). Kran väljs i lyftplanen mot bruttolast och lastdiagram. Kontrollintervall är riskbaserade enligt anläggningens kontrollprogram, inga generella år.

**Beslut som styr schema och server.** F01 (projektbehörighet), F05 (serverkvitterade godkännanden) och F15 (dela upp datamodellen) kräver nya tabeller och Postgres-funktioner (`security definer`, anropade som RPC) i Supabase. Det är **inte** "egen backend" i den här filens mening, men det är schemaändringar. Gör dem först när beslutet nedan är ifyllt.

| Beslut | Status | Påverkar |
| --- | --- | --- |
| Ska beställare/UE få åtkomst till appen? | Ej beslutat | F01, F15 |
| Synkkö: full operationskö eller förenklad variant i Etapp A? | Ej beslutat | F03 |
| Formella godkännanden i egen tabell med `auth.uid()` och servertid | Ej beslutat | F05 |
| Påminnelser: räcker en kanal eller måste alla lyckas? | Ej beslutat | F07 |
| Frys nya vyer tills Etapp A är mergad | Ej beslutat | Alla |

Fyll i datum och beslut i tabellen när det är fattat. Migrationer i `supabase/migrations/` appliceras manuellt efter granskning; skriv i filens huvud om den är applicerad.

## Projektval och Idag (2026-10-21)

- **Projektval görs på ett ställe**: `Projektrad` i toppraden (`components/layout/Projektrad.jsx`). `Projektvaljare` ritar inget längre; lägg inte tillbaka egna väljare i vyer. "Nytt projekt" ligger också i toppraden.
- **Portföljläge** (`lage` i `UiProvider`) finns bara i vyer som listas i `PORTFOLJVYER` (nu: Idag). Övriga vyer arbetar alltid i `valtProjekt`.
- **Idag filtreras med `arbetslage(state, horisont, pid)`**. Utan `pid` är det hela portföljen. Rader för `bada` följer `gallerFor()`.
- **Frist och uppföljning är två fält på punkter** (`forfaller`, `uppfoljning`). `punktDatum()` avgör var punkten hamnar: en passerad frist vinner alltid. Uppföljning skriver aldrig om fristen.
- **Kommentarer på punkter** är en lista med id (`kommentarer`) via `PUNKT_KOMMENTAR`, så att `sammanfoga.js` slår ihop två personers kommentarer. `av` är det inskrivna namnet i sidomenyn, inte en verifierad identitet.
- **"Mina uppgifter" finns inte än.** `agare` är fritext; bygg det först när ansvar tilldelas uttryckligen.

## Gör inte

- Portera inte prototypens filer (`src/routes/*`, zustand-store, `@react-three/fiber`).
- `three` finns bara för siten (`src/sections/Site/`, PR `site-3d`). Lägg inte till `@react-three/fiber`, `drei` eller ett UI-kit.
- Skriv inte över användarens portfölj med prototypens seed (36037, ÄTA-012, Lag A–C).
- Lägg inte in montörsinloggning, chatt eller drag-and-drop i Gantt.
- Döp inte om `SnabbUtskrift`, `KritiskLinje`, `DataTable` eller `byggFaltmaterial`.
- `npm run dev` är Vite på port 5173 här. Blanda inte ihop det med någon annan förhandsvisning.

## Fas och moment

- **Fas** betyder alltid ONE-P fas 1–8 (`data/projektfaser.ts`): Projektstart, projektkort, milstolpar, statushuvud.
- **Moment** betyder alltid EPC-checklistans steg 0–15 med grind G0–G15 (`data/bessChecklistData.ts`): Bygga batteripark, Gantt-raderna, egenkontrollerna.
- Skriv "Moment 11 · Leverans, lyft & montage", aldrig "Fas 11". När båda behövs: "Moment 11, fas 5". Variabelnamn som `fas`, `faslage` och ankare som `fas-11` ligger kvar; det är bara texten användaren ser som följer regeln.

## Om användaren vill ha ”den coolare siten” i den här appen

Tre inkrement, i den ordningen, var och en en egen commit. Specen har detaljerna.

1. **Idag** leder med domen från `kritiskLinje()` (i tid / slutbesiktning / mot plan / faser som styr) och `useSnabbUtskrift()` på öppna punkter. Ingen ny tidmotor. Ingen SVG-karta förrän 3D finns.
2. **ÄTA-kalkylator** inuti befintlig vy `ata`: resurser, övertid, 10 % på material/UE, avi och CSV. Beloppet skrivs på befintligt ÄTA-objekt. Ingen andra prislista om `planering.js` redan har á-priset.
3. **3D-site** på egen branch: gåbar park, situationsplan som bild, skid/container/E-House/trafo/nål. WASD är gång (strafe), inte fordonsstyrning. A går åt vänster. Bilden får inte in i `portfolj/state`.

## Verifiering när du ändrat appkod

`npm run lint`, `npm run typecheck`, `npm test`, och berört `npm run e2e`. Kör e2e utan `.env.local`. PR 28 låste utskrift i `e2e/snabbutskrift.spec.js` — de testen ska fortfarande gå igenom.
