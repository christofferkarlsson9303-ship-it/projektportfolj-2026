# Projektstart: åtta faser, fyra statusar, låsning och PDF

Gäller fliken Projektstart (`src/sections/Projektstart/`). Skrivet 2026-10-09, omskrivet 2026-10-10 för åtta faser och förlorade anbud.

## Statusar

Fyra aktiva statusar och en arkivstatus. Id:na lagras, etiketterna visas (`src/data/projektfaser.ts`):

| Id | Etikett | Faser |
|---|---|---|
| `PLANERING_OCH_UPPSTART` | Planering och uppstart | 1–2 |
| `PRODUKTION` | Produktion | 3–6 |
| `SLUTBESIKTNING` | Slutbesiktning | 7 |
| `AVSLUTAT_OCH_GARANTI` | Avslutat och garanti | 8 |
| `ANBUD_EJ_VUNNET` | Ej vunnet | arkiv, bara fas 1 |

Fasen styr statusen: när fasen ändras i guiden sätts statusen efter den. Byter någon status för hand i Översikt (rullgardinen finns kvar) sätts projektets fas till statusens första fas (`forstaFasForStatus`), om projektet inte redan ligger i en fas som hör till statusen. `ANBUD_EJ_VUNNET` finns inte i rullgardinen. Den sätts med knappen Markera som ej vunnet eller avropsbeslutet Tacka nej.

Äldre värden (Anbud, Uppstart, Planering, Produktion, Slutbesiktning, Avslutat) mappas om av `normaliseraStatus` vid varje inläsning. Anbud, Uppstart och Planering blir Planering och uppstart.

## Faserna

| Fas | Namn | Status | Guidesidor |
|---|---|---|---|
| 1 | Anbud | Planering och uppstart | Projektkort, Avropsacceptans, Projektdirektiv, Intressenter, Kontrakt och kassaflöde, Organisation och uppstart |
| 2 | Planering | Planering och uppstart | Riskregister, Tidplan och kritisk linje, Godkänd lösning, Tillstånd och nätägare |
| 3 | Etablering | Produktion | HSEQ och etablering |
| 4 | Mark och betong | Produktion | Mark och betong (cBoP) |
| 5 | Montage | Produktion | Leveranser, lyft och montage (eBoP) |
| 6 | Provning | Produktion | Provning och driftsättning |
| 7 | Slutbesiktning | Slutbesiktning | Slutbesiktning och överlämning (grupperna Slutbesiktning, Punchlista, Slutdokumentation) |
| 8 | Avslut och garanti | Avslutat och garanti | Ekonomiskt avslut och lärdomar (Ekonomi, Internt avslut, Erfarenhet, kick-out, slutrapport), Eftermarknad och garanti |

Det blir 17 sidor i faserna och Granska och skapa som 18:e (`fas: null`, alltid öppen). Avslutskatalogen `closeout` är delad mellan tre sidor via `grupper`, och varje kontrollpunkt finns på exakt en av dem.

## Vad som är obligatoriskt

Allt detta ska vara klart för att en fas ska vara godkänd (`fasKrav` i `src/lib/projektfas.js`):

- fält med `obligatoriskt: true` (med `kravVarde` räknas bara det värdet, till exempel avropsbeslutet Gå vidare). Fält med `visaNar` räknas bara när det andra fältet har det angivna värdet.
- tabeller med `obligatorisk: [kolumn-id]`: minst en rad där alla de kolumnerna är ifyllda (mallens startrader räknas alltså inte för riskerna, där ägare krävs)
- alla kontrollpunkter med `kritisk: true`

Fas 1 är stor: kontrakt (betalvillkor, bankgaranti, milstolpe med datum) och organisation (projektledare, uppstartsavstämningen genomförd) ingår, utöver projektkort, avrop och signerat direktiv.

## Låsning

- Projektet startar i fas 1. `aktuellFas(utkast)` är första fas som inte är godkänd, men aldrig lägre än `utkast.fasGolv`.
- Sidor i en fas som är högre än aktuell fas är låsta (`stegLast`). Man kan inte hoppa över en fas.
- Avbockar man något i en tidigare fas låses senare faser igen.
- `fasGolv` används för projekt som redan är igång: de börjar i projektets fas, och tidigare faser räknas som öppna. Golvet sparas i den sparade projektstarten.
- Projektets `fas` och `status` skrivs till projektet bara när fasen ändras (`kortAndringar`). En status som någon satt för hand på projektkortet skrivs inte över av en vanlig sparning.

## Förlorade anbud

Ett anbud som inte vanns får status `ANBUD_EJ_VUNNET`, fas 1, en orsak och ett datum (`orsakEjVunnet`: pris, tid, kvalitet eller annat, `orsakEjVunnetText`, `ejVunnetDatum`). Det sker på två sätt:

- Knappen Markera som ej vunnet på projektkortet i Översikt (bara för projekt i Planering och uppstart). Den kör reducer-åtgärden `MARKERA_EJ_VUNNET`, som loggas i ändringsloggen.
- Avropsbeslutet Tacka nej i guiden. Då visas fälten Orsak till ej vunnet anbud (obligatoriskt) och Kommentar, fas 2–8 döljs (`synligaSteg`), och bara namn och orsak krävs. När projektet skapas eller sparas flyttas det till arkivet. Risker och milstolpar från guiden förs inte över.

**Central definition av aktivt:** `src/lib/arkiv.js`. `aktivaProjekt(state)` är projekten som inte är förlorade. `aktivVy(state)` tar bort förlorade anbud och varje rad med deras `projektId` ur alla listor. Providern ger vyerna `aktivVy` som `state`, så dashboards, resursplanering, kassaflöde, prognoser, larm och väljare räknar utan dem utan att varje vy filtrerar själv. `heltState` är hela datan och används av Data (export, import) och sparningen. `ejVunna` är listan förlorade anbud.

Skrivningar går mot hela datan. `SATT_LISTA` bevarar arkivets rader (`arDold`), så en vy som sorterar eller ersätter en lista kan inte ta bort dem av misstag.

Förlorade anbud visas i en skrivskyddad lista, Förlorade anbud, i Översikt. Det finns ingen knapp för att ta tillbaka ett anbud i appen.

## Omräkning från sex faser

Före åttafasmodellen fanns sex faser. Lagrade data räknas om en gång:

| Gammal fas | Ny fas |
|---|---|
| 1, 2, 3 | 1, 2, 3 |
| 4 Genomförande | 4 för risker i kategori Mark, annars 5 (projekt: 4) |
| 5 Avslut | 7 |
| 6 Garanti | 8 |

Så hindras en andra omräkning: projekt bär `fasModell: 8`, utkast och sparade projektstarter bär `fm: 8`, och risker räknas om tillsammans med sitt projekt (en risk utan eget projekt bär själv `fasModell`). Nya projekt stämplas när de skapas.

Sparade utkast räknas om i `lasUtkast`: golv, trafikljusets fasnycklar, riskernas fas och besökta sidor (`produktion` blir `cbop` och `ebop`, `avslut` blir `avslut` och `ekonomi`).

**Växjö (36037) och Alvesta (36038)** saknade fas. Den räknas ur EPC-checklistan (`src/lib/projektfasEpc.js`): aktuell EPC-fas är den första vars grind inte är passerad, och den mappas till en projektfas. Reserv, om det inte går att räkna, är fas 4. **Det här är ett antagande:** checklistans och guidens faser är två olika modeller, och en projektledare kan ändra projektets fas. Idag ger beräkningen fas 5.

## Risker

Typen finns i `src/data/riskTyper.ts`: `fas` (1–8), `kategori`, `titel`, `sannolikhet`, `konsekvens`, `atgard` (åtgärdsplan), `agare`, `status`. Kategorierna KMA, Ekonomi, Tid och Övrigt är tillagda efter de fem ursprungliga, som inte får döpas om.

`efterInlasning` ger äldre risker och projekt en fas: projektets fas, eller fas 4 för en risk som gäller flera projekt. Mallens startrader i guiden: tid och mark i fas 4, leverans i fas 5.

## Riskens nivåer

En enda definition i `src/lib/risknivaer.js`: låg 1–6 (grön), medel 7–14 (gul), hög 15–25 (röd). Den används av riskmatrisen, `RiskScore`, `riskKlass`, larmen i `flaggor.js`, översiktens "röda risker", metodtabellen på Risker-sidan och Projektstart (märket och donuten).

ONE Nordics extra regel finns kvar: ett extremvärde (5) på en axel är aldrig grönt, så S5 × K1 och S1 × K5 är gula. I övrigt avgör produkten.

## PDF

`projektstartDokument` är ackumulerande och omfattar de godkända faserna: fas 1 till `rapportFas` (`projektfas.js`). För ett projekt som redan är igång räknas även faserna före golvet. Risker med `fas` högre än det som omfattas utelämnas. Huvudet visar projektets aktuella fas ("Fas N av 8"), statusens etikett och vilka faser rapporten omfattar. Fältet orsak till ej vunnet anbud tas bara med när avropsbeslutet är Tacka nej.

PDF för inlämning är spärrad (`pdfSparr`) bara när ingen fas är godkänd än. Då listas det som återstår i fas 1. Att nästa fas har tomma fält spärrar alltså inte PDF:en.

## Metodens delar i guiden

- **Signering av projektdirektivet** (fas 1): projektledare, intern beställare och datum är obligatoriska fält. Fas 2 låses inte upp utan dem.
- **Uppstartsavstämning** (fas 1, sidan Organisation och uppstart): katalogen `kickoff` med punkterna ur metoden 6.3. Den genomförda avstämningen är kritisk, alltså en grind innan fasen godkänns.
- **Interface-lista** (fas 2, sidan Godkänd lösning): tabellen `interface` med de fem gränssnitten som startrader, ägare, veckostatus och senast avstämd.
- **Kick-out och slutrapport** (fas 8, sidan Ekonomiskt avslut och lärdomar): fälten `kickout*`, `lardomar`, `slutrapportResultat` och `avslutAta` enligt metoden 6.9.
- **Trafikljus per fas**: projektledarens egen bedömning (grön, gul, röd) med kommentar, satt på sista sidan under Faserna och bara för upplåsta faser. Det sparas i utkastet (`trafikljus`) och visas i PDF-huvudet. Det räknas inte fram, eftersom metoden låter projektledaren bedöma.
- **Projektkortet** i Översikt har knappen Öppna projektstart, som öppnar guiden för just det projektet (`oppnaProjektstart` i UiProvider).
