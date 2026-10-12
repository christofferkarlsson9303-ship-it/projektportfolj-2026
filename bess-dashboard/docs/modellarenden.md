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

## BCF 2.1 (Steg B1)

Ärendepanelen har kryssrutor per ärende, **Exportera BCF (n)** och **Importera BCF …**. Logiken ligger i `src/lib/bcfHanterare.js` (ren, utan WebGL och DOM; XML skrivs som text och läses av en liten egen parser, zip via `jszip`).

**Export** ger en `.bcfzip`: `bcf.version`, `project.bcfp` och en mapp per ärende (mappnamn = topic-GUID) med `markup.bcf`, `viewpoint.bcfv` och `snapshot.png`. Skärmdumpen tas ur 3D-scenen från ärendets egen kameravy (`skarmdump(viewpoint)`), och saknas där scenen inte kan ritas. Ärendet får ett `bcfGuid` så att en senare import uppdaterar det i stället för att dubblera.

| Ärendet | BCF |
|---|---|
| `benamning` | `Topic/Title` |
| `klass` | `TopicType` (ÄTA, Hinder, Hinder och ÄTA, Ärende) |
| `status` | `TopicStatus` (Open, In Progress, Resolved, Closed) |
| `handelseDatum`, `ansvarig` | `CreationDate`, `AssignedTo` |
| `nr`, exakt status och klass | `Labels`: `ata-nr:`, `ata-status:`, `ata-klass:` (ger förlustfri rundtur) |
| `viewpoint` | `PerspectiveCamera` (position, riktning, upp, FOV) |
| `objectGuid` | `Components/Selection/Component` (`IfcGuid` om det är ett IFC-GUID, annars `AuthoringToolId`) |

Koordinater byts mellan appens Y-upp och BCF:s Z-upp: `(x, y, z)` blir `(x, −z, y)`. BCF har inget kameramål, så vid import läggs målet vid det matchade objektets mitt, annars 10 m framför kameran.

**Import** (`lasBcf` → `planeraImport` → `ATA_IMPORTERA_BCF`) visar först en bekräftelse (nya, uppdaterade, kopplade, kommentarer som hoppas över). Ett topic med känt `bcfGuid` uppdaterar ärendet, annars skapas ett nytt med nummer ur projektets serie. Reducern skriver bara BCF-fält (`BCF_FALT`) och tar bort ogiltig status, kameravy eller koppling i stället för att spara dem. Komponenter som inte matchar något objekt sparas i `bcfKomponenter` så att de kan kopplas när modellen finns. BCF 3.0, ortogonala kameror och kommentarer stöds inte (antalet kommentarer rapporteras).

## Inte gjort (Steg B, resten)

IFC-laddning (`web-ifc`) och `expressID`, en server-side `POST /api/models/diff` och modellversioner som egen tabell. Se till att besluta modellkälla först; `guid`-fältet och `diffaModeller` är förberedda för det.
