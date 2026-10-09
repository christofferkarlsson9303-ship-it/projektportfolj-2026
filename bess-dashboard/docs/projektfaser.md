# Projektstart: sex faser, låsning och PDF

Gäller fliken Projektstart (`src/sections/Projektstart/`). Skrivet 2026-10-09.

## Faserna

`src/data/projektfaser.ts` (typkontrollerad av `npm run typecheck`):

| Fas | Namn | Status i portföljen | Guidesidor |
|---|---|---|---|
| 1 | Anbudsfasen | Anbud | Projektkort, Avropsacceptans, Projektdirektiv |
| 2 | Projektering och planering | Uppstart | Intressenter, Organisation, Kontrakt, Riskregister, Tidplan, Godkänd lösning, Tillstånd |
| 3 | Etablering | Produktion | HSEQ och etablering |
| 4 | Genomförande | Produktion | cBoP/eBoP/montage, Provning och driftsättning |
| 5 | Avslut och överlämning | Slutbesiktning | Slutbesiktning och överlämning |
| 6 | Eftermarknad och garanti | Avslutat | Eftermarknad och garanti |

Guidens sidor (`STEG` i `projektstartSteg.js`) har `fas: 1–6`. Sista sidan, Granska och skapa, har `fas: null` och är alltid öppen. En sida kan dela katalog med en annan via `grupper` (avslutskatalogen är delad mellan fas 5 och 6).

## Vad som är obligatoriskt

Allt detta ska vara klart för att en fas ska vara godkänd (`fasKrav` i `src/lib/projektfas.js`):

- fält med `obligatoriskt: true` (med `kravVarde` räknas bara det värdet, till exempel avropsbeslutet Gå vidare)
- tabeller med `obligatorisk: [kolumn-id]`: minst en rad där alla de kolumnerna är ifyllda (mallens startrader räknas alltså inte för riskerna, där ägare krävs)
- alla kontrollpunkter med `kritisk: true`

## Låsning

- Projektet startar i fas 1. `aktuellFas(utkast)` är första fas som inte är godkänd, men aldrig lägre än `utkast.fasGolv`.
- Sidor i en fas som är högre än aktuell fas är låsta (`stegLast`). Man kan inte hoppa över en fas.
- Avbockar man något i en tidigare fas låses senare faser igen.
- `fasGolv` används för projekt som redan är igång: de börjar i fasen som deras status motsvarar (`fasFranStatus`), och tidigare faser räknas som öppna. Golvet sparas i den sparade projektstarten.
- Projektets `fas` och `status` skrivs till projektet bara när fasen ändras (`kortAndringar`). En status som någon satt för hand på projektkortet skrivs inte över av en vanlig sparning.

## Risker

Typen finns i `src/data/riskTyper.ts`: `fas` (1–6), `kategori`, `titel`, `sannolikhet`, `konsekvens`, `atgard` (åtgärdsplan), `agare`, `status`. Kategorierna KMA, Ekonomi, Tid och Övrigt är tillagda efter de fem ursprungliga, som inte får döpas om.

`efterInlasning` ger äldre risker och projekt en fas: projektets fas, eller fas 4 för en risk som gäller flera projekt.

## Riskens nivåer

En enda definition i `src/lib/risknivaer.js`: låg 1–6 (grön), medel 7–14 (gul), hög 15–25 (röd). Den används av riskmatrisen, `RiskScore`, `riskKlass`, larmen i `flaggor.js`, översiktens "röda risker", metodtabellen på Risker-sidan och Projektstart (märket och donuten).

ONE Nordics extra regel finns kvar: ett extremvärde (5) på en axel är aldrig grönt, så S5 × K1 och S1 × K5 är gula. I övrigt avgör produkten. Det betyder att till exempel S3 × K4 = 12 och S2 × K5 = 10 är gula, inte röda som i den tidigare matrisen.

## PDF

`projektstartDokument` är ackumulerande och omfattar de godkända faserna: fas 1 till `rapportFas` (`projektfas.js`). För ett projekt som redan är igång räknas även faserna före golvet. Risker med `fas` högre än det som omfattas utelämnas. Huvudet visar projektets aktuella fas och status, och vilka faser rapporten omfattar.

PDF för inlämning är spärrad (`pdfSparr`) bara när ingen fas är godkänd än. Då listas det som återstår i fas 1. Att nästa fas har tomma fält spärrar alltså inte PDF:en. Regeln gäller knappen i guiden, knappen på sista sidan och den PDF som laddas ned när projektet skapas.

## Metodens delar i guiden

- **Signering av projektdirektivet** (fas 1): projektledare, intern beställare och datum är obligatoriska fält. Fas 2 låses inte upp utan dem.
- **Uppstartsavstämning** (fas 2, sidan Organisation och möten): katalogen `kickoff` med punkterna ur metoden 6.3. Den genomförda avstämningen är kritisk, alltså en grind innan fasen godkänns.
- **Interface-lista** (fas 2, sidan Godkänd lösning): tabellen `interface` med de fem gränssnitten som startrader, ägare, veckostatus och senast avstämd.
- **Kick-out och slutrapport** (fas 5, sidan Slutbesiktning och överlämning): fälten `kickout*`, `lardomar` och `slutrapportResultat` enligt metoden 6.9.
- **Trafikljus per fas**: projektledarens egen bedömning (grön, gul, röd) med kommentar, satt på sista sidan under Faserna och bara för upplåsta faser. Det sparas i utkastet (`trafikljus`) och visas i PDF-huvudet. Det räknas inte fram, eftersom metoden låter projektledaren bedöma.
- **Projektkortet** i Översikt har knappen Öppna projektstart, som öppnar guiden för just det projektet (`oppnaProjektstart` i UiProvider).

Projektstatusarna är Anbud, Uppstart, Planering, Produktion, Slutbesiktning och Avslutat. Uppstart är andra statusen och hör till fas 2. Planering finns kvar för äldre projekt och räknas också som fas 2.
