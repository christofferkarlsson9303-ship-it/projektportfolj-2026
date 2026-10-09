# Projektstart: sex faser, låsning och PDF

Gäller fliken Projektstart (`src/sections/Projektstart/`). Skrivet 2026-10-09.

## Faserna

`src/data/projektfaser.ts` (typkontrollerad av `npm run typecheck`):

| Fas | Namn | Status i portföljen | Guidesidor |
|---|---|---|---|
| 1 | Anbudsfasen | Anbud | Projektkort, Avropsacceptans, Projektdirektiv |
| 2 | Projektering och planering | Planering | Intressenter, Organisation, Kontrakt, Riskregister, Tidplan, Godkänd lösning, Tillstånd |
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

Riskvärdet i guiden och donuten delar nivåerna vid 7 och 15 (`RISKGRANSER` i `projektstart.js`). Sidan Risker använder ONE Nordics matris (`riskMatrisFarg`) och `RiskScore` har gränserna 8 och 15. De tre är inte samma sak ännu.

## PDF

`projektstartDokument` är ackumulerande: sidor och risker för fas 1 till aktuell fas, och inget mer. Huvudet visar fas, status och de sex faserna. Risker med `fas` högre än aktuell fas utelämnas.

PDF för inlämning är spärrad (`pdfSparr`) tills obligatoriska fält och tabeller i den aktuella fasen är ifyllda. Kontrollpunkterna spärrar inte. Det gäller knappen i guiden, knappen på sista sidan och den PDF som laddas ned när projektet skapas.
