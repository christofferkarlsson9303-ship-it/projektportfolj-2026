# Modellbaserade ärenden på siten (Steg A)

Siten (`src/sections/Site/`) är en delad vy: 3D till vänster, ärendepanel till höger, med en avdelare som går att dra eller flytta med piltangenter (läget sparas i `localStorage`). Under `lg` staplas delarna. Ärendena är UR/ÄTA-posterna (`state.ur`), samma som i ÄTA-vyn.

**Ingen IFC och ingen ny backend.** Ett "objekt" är ett `siteObjekt` (volym eller nål) och dess `id` är dess GUID. Finns ett explicit `guid` på objektet går det före `id` i jämförelsen (`lib/modellDiff.js`), så en framtida IFC-import kan fylla i `guid` utan att något annat ändras. Allt ligger i `portfolj/state`; inget schema eller Supabase-migrering ändrades.

## Fält på ärendet (UR/ÄTA-posten)

| Fält | Innehåll |
|---|---|
| `objectGuid` | Objektets id på siten |
| `viewpoint` | `{ cameraPosition: [x,y,z], target: [x,y,z], fov }` — kamerans vy när ärendet kopplades |
| `boundingBox` | `{ min: [x,y,z], max: [x,y,z] }` — objektets omslutande låda i världen (meter) |
| `modelVersionId` | Id på den senaste sparade modellversionen vid kopplingen, annars tom text |

Alla fyra är valfria och saknas på ärenden som inte är kopplade. De sätts bara via reducer-åtgärderna `ATA_KOPPLA_OBJEKT` och `ATA_LOSS_OBJEKT` (validering i `lib/modellKoppling.js`, `kopplingFel`). Kopplingen avvisas om ärendet eller objektet saknas, eller om objektet hör till ett annat projekt. Tas objektet bort senare ligger kopplingen kvar och UI:t säger att objektet inte finns längre.

## Modellversioner och jämförelse

`state.modellVersioner` är en lista ögonblicksbilder: `{ id, projektId, namn, datum, objekt: [siteObjekt…] }`. De 20 senaste per projekt sparas. `MODELLVERSION_SKAPA` tar bilden ur state, inte ur anroparen.

`diffaModeller(a, b)` (`lib/modellDiff.js`) är en ren funktion och returnerar `{ tillagda, borttagna, andrade: [{ guid, falt }], oforandrade }`. "Ändrat" är läge, rotation, mått, typ, namn, BESS-data, status och specifikation. Tal jämförs med tolerans (0,001). Samma funktion kan flyttas till en server utan ändring.

Färger i 3D (designsystemets tokens, inga egna hex): Tillagd `--ok-ink`, Borttagen `--rod` (genomskinligt spöke på den gamla platsen), Modifierad `--orange`. Observera att Modifierad är orange, inte gul, och Tillagd är grönblå — paletten har ingen ren grön eller gul.

## Samspelet 3D ↔ ärenden

- Klick på ett objekt i 3D markerar det (`siteVal` i `UiProvider`), och ärendepanelen och ÄTA-registret filtreras till objektets ärenden. "Visa alla" släpper filtret.
- Klick på ett ärende flyger kameran till objektets omslutande låda (`viewpointForBox`, `flygBana`, mjuk start och stopp, 0,45–1,4 s). Knappen "Ärendets vy" flyger till den sparade kameravyn. Med `prefers-reduced-motion` hoppar kameran direkt. Flygningen steg för steg görs i scenens animationsloop (WebGLRenderer använder `requestAnimationFrame`).
- Gåläget har ingen flygning: "Visa i 3D" byter till orbit först.
- Från ÄTA-vyn: ärendepanelen har avsnittet "Koppling till 3D-modellen" och registret har en rad som visar att filtret är på.

## Verktyg i 3D-vyn

- **Sektion:** sex `THREE.Plane` (`renderer.clippingPlanes`) från `klippPlan()`, med reglage per axel (en slider kan inte dras förbi sin motsats) och lådans kanter ritade.
- **Mät:** raycast mot objekt och mark, två klick ger rakt, horisontellt och höjdskillnad (`avstand()`). Ett tredje klick börjar om.
- **Gå in:** den befintliga gåläges-koden (pekarlås + egen blickstyrning i `lib/site.js`). `PointerLockControls` skulle bara duplicera den.
- **Jämför med:** välj en sparad modellversion — objekten färgas efter diffen och en teckenförklaring visas.

## Inte gjort (Steg B)

IFC-laddning (`web-ifc`), `expressID`, en server-side `POST /api/models/diff`, modellversioner som egen tabell och BCF-export/-import. Se till att besluta modellkälla först; `guid`-fältet och `diffaModeller` är förberedda för det.
