# Prototyp 36037 — vad Grok byggde, och var det bor här

Datum: 2026-10-04. Beställare: Christoffer Karlsson, ONE Nordic. Projekt i berättelsen: **36037 Växjö Batteripark**.

Prototypen är en kommandobrygga för en projektledare: mindre admin, snabb yta, papper till fältet. Den gjordes i en **annan** kodbas (TanStack Start, zustand, localStorage, ingen inloggning). Den här filen är bryggan till `bess-dashboard` och till [PR 28](https://github.com/christofferkarlsson9303-ship-it/projektportfolj-2026/pull/28).

Läs [`CLAUDE.md`](../CLAUDE.md) först. Den här filen är specen.

## Två kodbaser — slå inte ihop dem

| | Produktionsapp (det här repot) | Prototyp (finns inte här) |
| --- | --- | --- |
| Stack | Vite, React, Tailwind, designsystem `src/components/ds/` | TanStack Start, Tailwind v4, zustand `bess-portfolj-v1` |
| Data | `portfolj/state` + `portfolj/ekonomi`, RLS, merge i `src/lib/sammanfoga.js` | En lokal store. Seed, inte kunddata. |
| Utskrift | `byggFaltmaterial` + PR 28 `useSnabbUtskrift` + PDF | `window.print()` och en egen A4-mall |
| Tid | `kritiskLinje()` med beroenden och baslinje | Hårdkodat läge 2026-10-04, alla förseningar 0 |

Prototypens routes var `/` (Idag), `/tidplan`, `/ata`, `/site`, `/falt`. De är **vyer som redan har id** här (`idag`, `tidplan`, `ata`, `epc`, `punkter`), plus en site som inte finns ännu. Lägg inte fem nya routes ovanpå `src/data/vyer.js` om vyn redan finns.

## Vad prototypen visade, mot det som redan finns

| Yta i prototypen | Redan i appen | Saknas | Gör så här |
| --- | --- | --- | --- |
| Domen ”i tid · slutbesiktning · 0 dagar · 5 faser styr” överst på Idag | Samma tre tal i `KritiskLinje.jsx` på Tidplan. Översiktens `Gantt.jsx` anropar samma motor. | Idag (`src/sections/Idag.jsx`) leder inte med den domen. | Visa `kritiskLinje(state, pid, idag())` överst på Idag via `StatTile` + `StatusBadge`. Länk till Tidplan. Räkna inte om. |
| Tabell FAS / STANDARDPLAN / BERÄKNAT / FÖRSENING / MARGINAL / VÄNTAR PÅ, märke STYR SLUTDATUM, röd kant, M1–M7 | `KritiskLinje.jsx` har exakt de kolumnerna. Märket säger ”Styr slutdatum”. Knappen ”Spara som ursprunglig plan” finns och skriver `SPARA_BASLINJE`. | Inget i kalkylen. | Rör inte tabellen för att den ska ”se ut som prototypen”. Prototypen saknar baslinje, slack och kedja. |
| ”Skriv ut arbetslista” från dagens punkter | PR 28: `ArbetslistaSnabb` på Öppna punkter, `fasblankett` i Bygga batteripark, samma saker i Ctrl+K. | Idag anropar inte hooken. | På Idag: `snabb.arbetslista(pid, { utforare })`. Ingen ny mall. |
| ÄTA-kalkylator: chips, övertid 0/50/100 %, 10 % på material/UE, CSV, avi med två signaturer | Vy `ata` följer ärenden. `src/lib/planering.js` har tidkostnad (faktor 1,5 / 2 / 3) och 10 % entreprenadarvode på fakturaunderlag (ABT 06 kap. 6 § 9). | Ingen radkalkyl som bygger ÄTA-beloppet. | Se avsnittet ÄTA. Läs ÄTA-objektet i reducern innan du lägger fält. |
| Gåbar 3D-site, situationsplan som bild, skid/container/E-House/trafo/nålar | Finns inte. | Hela ytan. | Egen PR. Se avsnittet 3D. Inte i PR 28. |
| Fältpaket med montörsfilter | `docs/faltmaterial.md`, panelen, PR 28. | — | Ändra inte panelen för att prototypen hade en enklare sida. |

## PR 28 — rör inte beteendet

Gren `snabbutskrift`, en commit ovanpå `main` (`17d4468`). 13 filer, inga nya bibliotek.

- `src/components/field/SnabbUtskrift.jsx` — `useSnabbUtskrift().arbetslista(pid, { utforare, ids })` och `.fasblankett(pid, fas, { enhet })`. Tom lista ger toast, inte en tom sida.
- Vald utförare sparas per projekt i `localStorage` under `bess-snabbutskrift-v1-${pid}`.
- `ArbetslistaSnabb` ligger på Öppna punkter. ”Fler val…” öppnar panelen.
- `DataTable` har `urvalText` och `onUrvalFler`.
- `EgenkontrollLage.jsx`: **Skriv ut fasens blankett** bredvid **Registrera egenkontroller**.
- `Kommandopalett.jsx`: ”Arbetslista till [namn]”, ”Arbetslista för alla”, ”Egenkontroll fas N – …”.
- Dokumenten är samma som panelen: `src/lib/snabbutskrift.js` → `PrintableTodoList` / `EgenkontrollDocument`.
- Tester: `e2e/snabbutskrift.spec.js`, plus uppdaterade `e2e/faltmaterial.spec.js` och `e2e/lagplan.spec.js`.

Nästa Idag-knapp ska anropa den här hooken. Skapa inte `window.print()` vid sidan av `#utskrift`.

## Idag — komposition, inte ny data

`src/sections/Idag.jsx`. Lead i `src/data/vyer.js` får stå kvar om du inte blivit ombedd att ändra copy.

Överst, för valt projekt, ett kort (befintlig `Card`):

- Märke från samma gren som `KritiskLinje`: `I tid` / `N dagar sent mot kontraktet` / `Uppgifter saknas`. Inte en hårdkodad grön piller när motorn säger något annat.
- Tre `StatTile`: beräknad slutbesiktning (`k.slutPrognos`), mot ursprunglig plan (`k.motBaslinje`, ”—” om baslinje saknas), antal faser som styr (`k.faser` där `kritisk`).
- En rad med de kritiska faserna (nummer + kort namn) som länkar dit `oppnaPost("epc", "fas-N")` redan gör från tidplanstabellen.
- Saknas start eller slut: samma `Callout` som `KritiskLinje` (”Ange projektets startdatum…”), inte påhittade datum.

Under det, det som kräver åtgärd idag (det Idag redan listar). För en öppen punkt med utförare: knapp **Skriv ut arbetslista** → `snabb.arbetslista`. För ÄTA under utredning: länk till vy `ata`, inte en kopia av registret.

Situationsplanen (vita skid, blå containrar, nålar) är prototypen på `/`. Den är en bild av 3D-modellen. Rita den inte som dekoration på Idag förrän volymerna finns i state. En död karta som inte följer projektet är sämre än ingen.

## ÄTA-kalkylatorn

Prototypen räknade så här, per rad:

```text
summa = antal × á-pris × (1 + övertidProcent / 100) × (1 + påslagProcent / 100)
```

- Arbete, maskin: övertid 0, 50 eller 100 procent. Påslag 0.
- Fordon (km): inget tillägg.
- Material och UE: antal är faktisk kostnad i kronor, á-pris 1, påslag 10. Det är ABT 06 kap. 6 § 9, samma regel som fakturaunderlaget.
- Moms 25 procent visas. Att betala = netto + moms.
- CSV: semikolon, UTF-8 BOM, kolumner Datum, Beskrivning, Resurs, Antal, ÖT %, Påslag %, Summa.
- Avi: logotyp, ÄTA-nr, projekt, beställare, orsak, rader, netto/moms, två signaturrader (ONE Nordic och beställare). Vit bakgrund även i mörkt läge. Menyer skrivs inte ut.

Prislista som prototypen använde när appen inte hade en radkalkyl. **Slå upp befintliga á-priser först** (`planering.js`, personer, resurser). Använd listan bara som startvärden om resursen saknar pris. Döp inte om poster som redan finns.

| Resurs | Kategori | Enhet | Á-pris | Påslag |
| --- | --- | --- | --- | --- |
| Montör | Arbete | tim | 945 | 0 |
| Ledande montör | Arbete | tim | 1010 | 0 |
| Projektledare | Arbete | tim | 1245 | 0 |
| Provningsingenjör | Arbete | tim | 1540 | 0 |
| Termograför | Arbete | tim | 1400 | 0 |
| Elkonstruktör | Arbete | tim | 1325 | 0 |
| Eldriftledare/kopplingsledare | Arbete | tim | 1245 | 0 |
| Anläggningsarbetare | Arbete | tim | 627 | 0 |
| Betongarbetare | Arbete | tim | 690 | 0 |
| Arbets-/projektledare (Bygg) | Arbete | tim | 780 | 0 |
| Grävmaskin 15–18 ton | Maskin | tim | 1320 | 0 |
| Lastbil, 4 axlar | Maskin | tim | 1125 | 0 |
| Servicebil / Personbil | Fordon | km | 16 | 0 |
| Material (faktisk kostnad) | Material & UE | kr | 1 | 10 |
| Underentreprenör (faktisk kostnad) | Material & UE | kr | 1 | 10 |
| Hjälpmedel & verktyg | Material & UE | kr | 1 | 10 |
| Traktamente & resekostnader (faktisk) | Material & UE | kr | 1 | 10 |

Övertid 50 procent = faktor 1,5 och 100 procent = faktor 2. Produktionsappens tidrapport har även faktor 3. Om ÄTA-raden är tid ur tidrapporten: använd tidslag där, inte ett nytt procentfält bredvid. Om raden är en kalkyl på ÄTA-avin: procenten ovan är rätt modell.

Kalkylen hör till **ett** ÄTA-nummer. ”Öppna i kalkyl” från registret fyller nr, titel och låter raderna räkna fram beloppet. När användaren sparar skrivs beloppet tillbaka på ÄTA-posten som redan finns. Lägg raderna på den posten om den inte redan har rader. Ingen egen localStorage-nyckel som glider ifrån `portfolj/state`.

Enter på beskrivning lägger en ny rad med samma resurs. Chips: högst fyra första resurserna per kategori, plus en tom rad.

## 3D-site — egen PR, när den beställs

Inte en del av PR 28. Inga nya bibliotek förrän den PR:en.

Beteende som prototypen redan provat:

- Tomt: 80 × 52 m. Kameran orbitar tills användaren går in.
- Seed, mitt på planen: 6 SKID (rad z = −10), 6 containrar (z = 2), x = −22,5 … 22,5 steg 9. E-House vid x = −32, z = −4, roterad 90°. Trafo T1 och MV vid x = 32. Bod vid x = −32, z = 16.
- Mått: SKID/container 6,1 × 2,5 × 2,9 m. E-House 12 × 3,2 × 3,4. Trafo 3,2 × 2,6 × 2,6.
- Nålar är öppna fältpunkter, inte lös text. I appen ska nålen peka på en punkt i `punkter` (id), så utskrift via PR 28 fortfarande träffar rätt uppgift.
- Lägg till: skid, container, E-House, trafo, låda, nål. Klick på marken placerar. Markerad volym kan dras, döpas om, få mått och rotation, tas bort.
- **Gång, inte fordon.** three.js, högerhänt, +Y upp. `yaw = 0` tittar mot −Z. Framåt `(-sin yaw, 0, -cos yaw)`, höger `(cos yaw, 0, -sin yaw)`. W fram, S bak, **A strafe vänster** (minus höger), D höger. Shift springer. Q upp, E ner. Mus tittar: `yaw -= movementX`, `pitch -= movementY`. Piltangenter samma som WASD.
- Kollision: volymens låda i lokal rotation, marginal ca 0,45 m. Blockerad steg stannar.
- Situationsplan: användaren väljer en bild, anger bredd i meter och norr i grader. Djupet följer bildens proportion. Bilden är marktextur. **Spara den inte i `portfolj/state`.** En data-URL spränger JSONB-raden och synken. `sessionStorage` eller en egen Storage-bucket senare. Utan bild: grus och körytor, modellen ska ändå synas.
- Mobil: joystick nere till vänster, minst 44 px. Orbit och ”Gå in” som knappar, inte bara tangentbord.
- Återställ sätter seedet igen, inte en tom tomt.

## Seedet är en berättelse, inte en import

Använd det för att känna igen skärmdumpen. Skriv det inte in i en riktig portfölj.

- Projekt 36037 Växjö Batteripark, beställare Växjö Energi AB, entreprenör ONE Nordic AB. NTP 2026-02-02. Slutbesiktning i den stillastående bilden: 2026-12-02. ”I dag” i bilden: 2026-10-04.
- Faser 0–9 klara, 10–14 styr slutdatum (stationshus och MV, leverans och lyft, anslutning, idrifttagning, besiktning), 15 planerad.
- M1–M4 fakturerade, M5–M7 väntar. I **appen** kommer de talen ur grindar och baslinje, inte ur den här listan.
- Öppna punkter i prototypen: lyftplan SKID 3–6 (Lag A), DC-säkringar ur (Lag B), jordning 0,25 % (Lag C), fiber/CAN i E-House (Lag C). Batch C-lärdomen (lyftdon, 0,25 % jord, två kablar/400 A, STOPP är manuell) finns redan som lärdomar i Bygga batteripark. Lägg den inte som en ny varningsruta om den redan syns på rätt fas.

## Copy och utskrift

Svenska. Korta meningar. Inga emojis. Papper är vitt även i mörkt läge. Sidhuvud med ONE-logotyp, sidnummer, signaturrad där någon ska skriva på. Det är redan så fältmaterialet är byggt. Följ det.

## Föreslagen ordning när användaren säger kör

1. Låt PR 28 mergas eller ligga. Blanda inte 3D eller ÄTA-rader in i den diffen.
2. Ny gren från uppdaterad `main`: Idag visar `kritiskLinje` och anropar `useSnabbUtskrift`. Tester för att knappen skriver till `#utskrift` utan dialog.
3. Ny gren: ÄTA-rader på befintligt ärende, formeln ovan, avi via befintlig print/PDF-väg.
4. Ny gren, eget beslut om `three`: 3D enligt kontraktet här. A ska strafe:a vänster. Bilden utanför JSONB.
