# Claude — läs detta innan du skriver kod

Du är i **bess-dashboard**: Vite, React, Tailwind, `localStorage` eller Supabase JSONB. Inte TanStack Start. Inte zustand. Inte en ny app.

En visuell prototyp byggdes 2026-10-04 i ett annat verktyg (Grok). Den ligger **inte** i det här repot och ska inte klistras in. Beteendet som är värt att behålla står i [`docs/prototyp-36037.md`](docs/prototyp-36037.md). Läs den filen helt innan du rör Idag, tidplan, ÄTA eller site.

## Vad som redan är sant

- **Tidplanen ”Blir vi klara i tid” finns.** `src/components/tidplan/KritiskLinje.jsx` + `src/lib/kritiskLinje.js` + `src/data/fasberoenden.js`. Kolumnerna fas, standardplan, beräknat, försening, marginal, väntar på, och tabellen M1–M7, är redan där. Prototypens ”0 dagar” och fasta datum 2026-12-02 är seed för 36037, inte en kalkyl. Byt inte ut motorn.
- **Ett klick till papper är PR 28**, grenen `snabbutskrift`. `useSnabbUtskrift()` i `src/components/field/SnabbUtskrift.jsx` skriver ut arbetslista och fasblankett utan att öppna panelen. Panelen (`FaltmaterialPanel.jsx`) finns kvar för fler val. Ctrl/Cmd+K har samma dokument. Bygg inte en ny utskriftsväg.
- **Designsystemet** är `src/components/ds/` (`Card`, `StatTile`, `StatusBadge`, `Callout`). Nya ytor använder det. Inga nya hex-färger, inget parallellt tema.
- **Data** är två JSONB-rader: `portfolj/state` och `portfolj/ekonomi`. RLS skyddar. Ändra inte schemat för en kalkylator eller en bild.

## Gör inte

- Portera inte prototypens filer (`src/routes/*`, zustand-store, `@react-three/fiber`).
- `three` finns bara för siten (`src/sections/Site/`, PR `site-3d`). Lägg inte till `@react-three/fiber`, `drei` eller ett UI-kit.
- Skriv inte över användarens portfölj med prototypens seed (36037, ÄTA-012, Lag A–C).
- Lägg inte in montörsinloggning, chatt eller drag-and-drop i Gantt.
- Döp inte om `SnabbUtskrift`, `KritiskLinje`, `DataTable` eller `byggFaltmaterial`.
- `npm run dev` är Vite på port 5173 här. Blanda inte ihop det med någon annan förhandsvisning.

## Om användaren vill ha ”den coolare siten” i den här appen

Tre inkrement, i den ordningen, var och en en egen commit. Specen har detaljerna.

1. **Idag** leder med domen från `kritiskLinje()` (i tid / slutbesiktning / mot plan / faser som styr) och `useSnabbUtskrift()` på öppna punkter. Ingen ny tidmotor. Ingen SVG-karta förrän 3D finns.
2. **ÄTA-kalkylator** inuti befintlig vy `ata`: resurser, övertid, 10 % på material/UE, avi och CSV. Beloppet skrivs på befintligt ÄTA-objekt. Ingen andra prislista om `planering.js` redan har á-priset.
3. **3D-site** på egen branch: gåbar park, situationsplan som bild, skid/container/E-House/trafo/nål. WASD är gång (strafe), inte fordonsstyrning. A går åt vänster. Bilden får inte in i `portfolj/state`.

## Verifiering när du ändrat appkod

`npm run lint`, `npm run typecheck`, `npm test`, och berört `npm run e2e`. Kör e2e utan `.env.local`. PR 28 låste utskrift i `e2e/snabbutskrift.spec.js` — de testen ska fortfarande gå igenom.
