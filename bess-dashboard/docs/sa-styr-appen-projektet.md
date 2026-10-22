# Så styr appen projektet

_Från projektstart till avslut med ONE-P — beslutsunderlag, uppföljning, lagring och export. Version 2026-10-22._

<!-- Genererad ur src/data/styrningsrapport.js med `npm run docs:styrning`. Redigera inte här. -->

## Sammanfattning

Appen är projektledarens arbetsverktyg för BESS-entreprenader. Den följer ONE-P: anbud och initiering, planering, genomförande och avslut, uppdelat i åtta faser med grindar. Varje fas har obligatoriska punkter, och nästa fas låses upp först när de är godkända.

- Ledningen får ett beslutsunderlag ur Projektstart: anbudsfrågornas trafikljus, riskmatrisen, ekonomin och PL:s rekommendation, som PDF.
- Under genomförandet styr Idag, tidplanen med kritisk linje, ÄTA-flödet och betalningsmilstolparna M1–M7 det dagliga arbetet.
- Beställaren får en statusrapport ur samma data. Inget skrivs in två gånger.
- Allt sparas i portföljen (Supabase eller webbläsaren) och kan tas ut som PDF, CSV och säkerhetskopia.

## 1. Från projektstart till avslut, steg för steg

Projektstart är en guide i 19 steg fördelade på åtta faser. Utkastet sparas i webbläsaren medan det skrivs. När fas 1 är genomgången skapas projektet i portföljen med sina risker och milstolpar, och sedan styrs det i de vanliga vyerna.

| Fas (ONE-P) | Vad appen styr | Grind innan nästa fas |
| --- | --- | --- |
| 1 · Anbud, kontrakt och uppstart (Initiering) | Projektkort, avropsacceptans, anbudsfrågor, kontrakt och kassaflöde, projektdirektiv, intressenter. | Obligatoriska fält, PL:s rekommendation Gå vidare, direktivet signerat av intern beställare och PL, styrparametrarna summerar till 100 %. Fas 2 öppnas först vid Vunnet anbud. |
| 2 · Projektering och planering | Organisation och startmöte, riskregister, tidplan och kritisk linje, godkänd lösning med interface-lista, tillstånd och nätägare. | Namngiven PL, risker med ägare, kritisk linje beskriven, nätägare angiven och fasens kontrollpunkter godkända. |
| 3 · Etablering | APD, arbetsplatstavla, HSEQ och fysisk etablering. | Fasens kontrollpunkter godkända. |
| 4 · Mark och betong (cBoP) | Markarbeten, fundament, kabelkanalisation och jordning. | Fasens kontrollpunkter godkända. En egenkontroll räknas först när varje registrerad omfattning är komplett. |
| 5 · Leveranser, lyft och montage (eBoP) | Leveranser, lyft, montage och elektrisk installation. | Fasens kontrollpunkter godkända. |
| 6 · Provning och driftsättning | Anläggningsprov, elsäkerhet och driftsättning. | Fasens kontrollpunkter godkända. |
| 7 · Slutbesiktning och överlämning (Avslut) | Slutbesiktning, punchlista och slutdokumentation mot M6 och M7. | Fasens kontrollpunkter godkända. |
| 8 · Ekonomiskt avslut, lärdomar och garanti | Slutreglering, internt avslut, erfarenhetsåterföring, kick-out och slutrapport. | Fasens kontrollpunkter godkända. |

### Under genomförandet

- Idag: frister, förfallna punkter och det som är närmast i tiden, för ett projekt eller hela portföljen.
- Bygga batteripark: 16 moment med grind G0–G15, egenkontroller och snabbutskrift av arbetslista och fasblankett.
- Tidplan: Blir vi klara i tid? Kritisk linje, försening och marginal per fas mot milstolparna M1–M7.
- ÄTA: Identifierad, ÄTA-granskning, Godkänd, Fakturerad. Underrättelse inom 24 timmar enligt egen rutin, kontraktets gräns i texten, ÄTA-kalkyl och avi.
- Dagbok, byggmöten, veckokoll, HSEQ och risker: dokumentationen som bevisar vad som har hänt.
- Milstolpar och faktura: sju betalningar kopplade till grindarna, med förhandsavisering innan faktura i IFS.
- Siten i 3D: tomten med enheter, ritningar (PDF, DXF, bild) och IFC-modell, där ÄTA kan kopplas till objekt.

## 2. Anbudshjulet, riskmatrisen och frågorna: ett beslutsunderlag

Steg 3 i Projektstart är tolv frågor inför anbudsbeslutet. Elva bedöms med ONE-P:s trafikljus: grön är klart och prissatt, gul är en avvikelse som hanteras med reservation eller påslag, röd kräver beslut av ledningen eller svar från beställaren. Den tolfte är PL:s rekommendation.

### Varje fråga har den inmatning som passar

| Fråga | Inmatning | Föreslår ljuset |
| --- | --- | --- |
| 1. Vad bygger vi – och vad bygger vi inte? | Gränsdragningslista: del, Ingår / Ingår ej / Oklart, ansvar | Något oklart ger gul |
| 2. Är avtalet tuffare än vanligt? | Standard / Avvikelse – reservation / Avvikelse – kräver beslut | Grön / gul / röd |
| 3. Hinner vi i tid? | Anbudsdag, start, färdigställande och risk för försening i matrisen | Matrisen |
| 4, 6, 7, 10, 11. Viten, risker, antaganden, lönsamhet, HSEQ | Sannolikhet × konsekvens | Matrisen |
| 5. Får vi betalt i takt med att vi bygger? | Största belopp vi ligger ute med, längsta negativa period | Sätts av PL |
| 8. Har vi folk till jobbet? | Nyckelroller: Säkrad / Pågår / Saknas | Saknas ger röd, pågår gul |
| 9. Vad har beställaren svarat? | Logg med datum, fråga, svar och Väntar svar / Besvarad | Väntar ger gul |
| 12. Ska vi lämna anbud? | Lämna anbud / Kräver ledningens beslut / Lämna inte anbud | Inget ljus, räknas inte |

### Så hänger delarna ihop

1. Riskmatrisen (3 × 3) tar bara de frågor som är osäkra händelser. Frågan dras till en ruta, eller klickas och placeras. Rutan ger ljuset: produkten av sannolikhet och konsekvens 1–2 är grön, 3–4 gul och 6–9 röd.
2. Fakta- och statusfrågorna har egna val i stället för matrisen. Valen föreslår ljuset på samma sätt.
3. PL kan alltid ändra ljuset för hand. Kortet visar då att bedömningen avviker från matrisen eller valen, så att ledningen ser var PL har gjort en egen bedömning.
4. Anbudshjulet räknar gröna, gula, röda och ej bedömda i realtid och ger domen: en röd betyder att ledningen måste ta ställning, obedömda frågor gör aldrig domen grön. En klickad färg filtrerar matrisen och listan.
5. Varje fråga har ett obligatoriskt svar: en eller två meningar om vad bedömningen bygger på, med antaganden märkta.

Beslutsunderlaget är PDF:en ur Projektstart. Del 1 Anbud innehåller den samlade bedömningen (antal per färg och domen), varje fråga med sin bedömning före motiveringen, PL:s rekommendation, ekonomin (anbudssumma, kalkyl, riskreserv, kassaflödets lägsta punkt) och kontraktsvillkoren. Obesvarade frågor står kvar som Ej besvarad. Ledningen beslutar i PDF:en; appen registrerar inget ledningsbeslut åt någon.

## 3. Hur data sparas

| Vad | Var | Kommentar |
| --- | --- | --- |
| Portföljen: projekt, ÄTA, punkter, risker, milstolpar, dagbok m.m. | Supabase, raden portfolj/state (JSONB) | Skyddas av inloggning och RLS. Utan Supabase: webbläsarens lagring (lokalt läge). |
| Ekonomi | Supabase, raden portfolj/ekonomi | Kontraktssumman ändras bara av administratören. |
| Projektstartens utkast | Webbläsaren tills projektet skapas | Sparas sedan med projektet i portföljen, med historik. |
| Ändringslogg | Egen tabell i Supabase | Varje post har en klientnyckel, så att ett återförsök inte ger dubbletter. |
| Formella godkännanden | Egen tabell, registreras via RPC | Inloggad användare och servertid, inte webbläsarens klocka. |
| Ritningar och modeller | Supabase Storage (ritningar) eller webbläsarens IndexedDB | I portföljen ligger bara metadata och placering, aldrig själva filen. |

Arbetar man utan nät flaggas ändringarna som osparade och skickas när nätet är tillbaka. Har två personer ändrat samma post slås ändringarna ihop vid uppstart och konflikter visas.

## 4. Hur data exporteras

| Export | Innehåll | Mottagare |
| --- | --- | --- |
| Beslutsunderlag (PDF, Projektstart) | Försättsblad, läge till ledningen, anbudsfrågor med trafikljus, ekonomi, projektdirektiv, kontrollpunkter, logg och signaturfält. | Ledningen, intern beställare |
| Beställarrapport (utskrift till PDF) | Faser, betalningsmilstolpar M1–M7, anläggning, ekonomi och ÄTA, tidplan, passerade punkter, kräver beslut. | Beställaren |
| ÄTA (PDF och avi) | ÄTA-underlag och avisering med belopp och underrättelse. | Beställaren |
| Arbetslista och fasblankett (PDF) | Snabbutskrift med ett klick, eller fler val i Fältmaterial. | Lagen på plats |
| Säkerhetskopia (zip/JSON) | Hela portföljen med bilagor. Kan läsas tillbaka under Data och backup. | Arkiv |
| Tabeller (CSV för Excel) | Varje lista för sig. Redigerad fil kan läsas in igen. | Uppföljning, ekonomi |
| BCF | ÄTA kopplade till objekt i IFC-modellen, med kameravy. | Projektör, BIM-verktyg |
| Den här sammanfattningen | PDF och Markdown ur Projektledarens handbok. | Ledningen, nya PL |

## 5. Jämfört med ONE Nordics mallar för statusrapport

| Mallens rubrik | I appen | Läge |
| --- | --- | --- |
| Tid / tidplan | Tidplan med kritisk linje; beställarrapportens tidplan | Finns |
| Ekonomi (budget, prognos, EAC) | Budget och utfall, Ekonomi; beställarrapportens prognos mot kontraktet | Finns |
| ÄTA / change requests | ÄTA-tavlan och beställarrapportens ÄTA-läge | Finns |
| Risker (topp 3) | Riskregistret; topprisker i beslutsunderlaget | Finns |
| Eskalerade frågor och beslut | Kräver beslut eller åtgärd i beställarrapporten; Beslut som behövs från ledningen i Projektkort | Finns |
| Resurser (FTE, status OK/NOK) | Resurser per vecka; inte som egen ruta i rapporterna | Lucka |
| Kvalitet och leverabler | Egenkontroller och slutdokumentation; inget samlat statusfält | Lucka |
| Fakturering (släpande UE-fakturor) | Milstolpar och faktura; inte i beställarrapporten | Lucka |
| Intern statusrapport (månadsavstämning) | Ledningsrapporten i beslutsunderlaget täcker anbud och start, inte månadsrapporten under genomförandet | Lucka |

## 6. Rekommenderade nästa steg

1. Bygg en intern statusrapport per månad ur samma data som beställarrapporten: trafikljus per område (tid, ekonomi, resurser, ÄTA, risker), prognos mot föregående rapport och eskalerade frågor.
2. Lägg till resurser, kvalitet och fakturering som statusrader i beställarrapporten, så att den täcker kundmallen.
3. Fastställ ONE Nordics frågelista och färggränser för riskmatrisen; listan är ett utkast från 2026-10-17.
4. Lägg in en betalplan per månad i steg 4, så att fråga 5 kan visa en kassaflödeskurva och föreslå ljus mot en gräns.
