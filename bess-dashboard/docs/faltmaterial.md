# Fältmaterial för BESS

Öppna **Fältmaterial** i sidhuvudet eller via **Ctrl/Cmd+K → Skapa fältmaterial**.
I **Bygga batteripark** visar varje fas samma sparade egenkontrollresultat
per kontrollomfattning. Välj **Registrera egenkontroller – fas N** för att
öppna just den fasen. Fasgenvägen ändrar inte projektets vanliga mallurval.
Projektet är förvalt. Välj moment, fyll i enhet/serienummer och utförare och välj
**Skriv ut** eller **Ladda ned PDF**. Dokumenttypen kan vara egenkontroller,
arbetslista eller fältpaket med båda. PDF har återkommande projekthuvud och
sidnummer; svenska tecken och mätbeteckningar fungerar med lokala typsnitt.

| Moment | Antal | EPC-faser |
| --- | ---: | --- |
| 1. Förkontroller och mekanisk/visuell montagekontroll | 7 | 11–12 |
| 2. Elektriskt kablage, momentdragning och isolationsprovning | 14 | 12–13 |
| 3. Styr, kommunikation och säkerhetssystem | 12 | 8, 12–13 |
| 4. Cold och hot commissioning | 16 | 13 |
| Totalt | 49 | |

Punkt-ID:n `M1.01`–`M4.16` följer dokumenten. Befintliga EPC-punktnummer
anges per detalj där det finns en motsvarighet. Flera detaljer kan höra till
samma EPC-punkt. Detta är spårbarhet; utskrift eller PDF ändrar ingen EPC-status.

## Källor och kontrollomfattning

Mallrevision **2026-10-01.1** bygger på projektledarens sammanställning från
2026-10-01. CATL/Power Electronics-manualerna har inte bifogats eller granskats
i denna ändring. Ange därför faktisk manual/provplan, revision och sida per
moment och verifiera modellberoende värden innan användning.

Källskillnader för infästning, kontaktpasta, resistans-/isolationsprovning,
CAN-terminering och MSD-ordning visas vid berörda punkter. Kontrollnummer är
inte en kopplingsordning. 1331,2 VDC behandlas som uppgivet exempel, inte en
generell acceptansgräns. Aerosolprov följer godkänd FSS-provplan.

En egenkontroll skrivs för en enhet/provomfattning. Resultat (OK/Ej OK/Ej
tillämplig), datum, mätvärde/avvikelse/notering och signatur lämnas tomma.
Ej tillämplig ska motiveras. Delurval av moment märks tydligt i dokumentet.

## Arbetsuppgifter till montörer

I **Öppna punkter** kan titel, utförare, instruktion och ritningsreferens
redigeras direkt. Markera rader och välj **Fältmaterial av markerade** för
en arbetslista med just dessa uppgifter. Panelen kan också filtrera öppna
uppgifter per utförare och datum. Odaterade uppgifter tas med för att inte
tappas bort. Kontrollmoment följer momenturvalet även om projektuppgifterna
filtreras på utförare; kompetensroll anges alltid vid varje kontrollpunkt.

Val av moment, dokumenttyp, utförare och referenser koms ihåg per projekt i
webbläsaren. Enhet/kontrollomfattning sparas per projekt; kontrollera den inför varje nytt dokument. Datum anges för dokumentet. Arbetsuppgifternas
nya fält sparas via befintlig portföljlagring. Inga nya Supabase-tabeller eller
behörighetsändringar krävs. Projektchecklistans resultat sparas i portföljens `faltkontroller` (se nedan).

## Tabeller och export

CSV och Excel använder samma filtrerade/sorterade rader som tabellen. `.xlsx`
har numeriska belopp, fryst rubrikrad, filter och summeringsformler. ÄTA-belopp
och riskkostnad kan redigeras direkt. Svensk decimalinmatning stöds;
Enter sparar, Escape avbryter. ÄTA-panelen kan också ladda ned enskilda
underrättelser, prisgodkännanden och fakturaunderlag som PDF.

PDF-renderaren och ExcelJS är versionslåsta i package.json/lockfilen.
Singlefile-bygget behålls; exportmodulerna körs först vid behov men ingår i
den levererade HTML-filens storlek. Kontrollera starttid vid ändring av dessa
beroenden. Typsnittens licens följer med i `src/assets/fonts/LICENSE.txt`.

## Verifiering

`npm run lint`, `npm run typecheck`, `npm test` och Playwright-sviterna för
fältmaterial, datatabeller, ÄTA, tidplan och tidslinje verifierar ändringen.
I miljöer med förinstallerad Chromium kan
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/sökväg/till/chromium` användas.
PDF/utskrift granskas även visuellt för sidbrytningar, huvud och skrivfält.

## Samma nummer som Bygga batteripark (2026-10-27)

Varje kontrollrad i fältmaterialet visas med numret på den checklistpunkt den
bevisar plus en bokstav: `12.20a`, `12.20b`. Kopplingen står i
`data/kontrollnummer.js` (`KONTROLL_FORALDER`) och bokstäverna delas ut i
projektchecklistans ordning. Det interna id:t (P12.01, M2.05, B.02 …) är
oförändrat, så registrerade resultat och `epc`-kopplingen påverkas inte. Numret
bockar inte av checklistpunkten. Sju rader (`SVAG_KOPPLING`) saknar bra
motsvarighet och ligger under närmaste punkt i samma moment.

## Lagplan (borttagen 2026-10-27)

Lagplanen (Lag A/B/C med två namn per lag) är borttagen. Arbetsledaren fördelar
jobben själv. De sju arbetssteg som projektchecklistan använde (A.03, A.04, B.02,
B.03, C.03–C.05) ligger kvar i `data/projektkontroll.js` med samma id. Ett sparat
fältval med mallpaket `lagplan` öppnas som projektchecklistan.

## Projektchecklista och egenkontrollrapport (revision 2026-10-01.3)

Standardvalet är **Projektchecklista – hela projektet**: 115 punkter i 16 faser,
från förstudie, avtal, tillstånd och projektering via mark, montage och
idrifttagning till besiktning, slutdokumentation och garantiuppföljning.
Alla tidigare 49 tekniska kontrollpunkter ingår med oförändrade punkt-ID:n.
De fyra tekniska mallarna finns kvar som separat val.

Öppna en punkt och registrera resultat, faktiskt kontrolldatum, kontrollant,
bevis/protokoll med revision samt mätvärde, avvikelse eller åtgärd.
**Ej OK** ska ha avvikelse/åtgärd. **Ej tillämplig** ska ha motivering och
referens. Ett namn är inte en elektronisk underskrift. Datum får inte ligga
framåt i tiden. Ändrad mallrevision kräver en uttrycklig ny kontrollbekräftelse.

Textfält sparas när du lämnar fältet, även när Escape stänger panelen.
Ändringsloggen visar vilket fält som ändrats och dess tidigare/nya värde.

Resultat sparas per projekt, kontrollomfattning och stabilt punkt-ID i den
befintliga portföljlagringen, med ändringslogg och samma lokal-/molnsynk som
övriga projektdata. Inga nya Supabase-tabeller eller behörigheter införs.
Ändringar i modalen skyddas av befintlig mekanism som skjuter upp inkommande
realtidsdata medan användaren redigerar.

Välj dokumentnummer/rapportrevision och godkänd kontrollplan/revision.
**Ta med registrerade resultat** ger en rapport med fasindex, faktisk status,
resultat och referenser samt separata signatur- och mottagningsfält.
Avmarkera för en blank papperschecklista. Rapportstatus är:
- Blank projektchecklista om registrerade resultat inte tas med.
- Delurval – arbetsunderlag om bara några faser valts.
- Öppna kontroller/avvikelser om underlag eller resultat saknas.
- Redo för granskning när hela urvalet har kompletta godkända eller motiverade
  ej tillämpliga resultat och kontrollplan angivits.

Rapporten avser bara den angivna kontrollomfattningen. Flera containrar eller
provomfattningar behöver egna dokumenterade kontroller; en sammanställning
med rubriken Hela anläggningen bevisar inte automatiskt att alla enheter provats.
Bilägg refererade protokoll, ritningar, avvikelsestängning och dokumentindex.
Granskning, underskrift och beställarens mottagande sker separat. Rapporten
ändrar inte EPC-grindar eller slutdokumentationens godkännanden automatiskt.

I **Slutdokumentation → Projektets egenkontrollrapport** öppnas huvudmallen
direkt. Samma genväg finns i Ctrl/Cmd+K. Tidigare mallval
behålls för vanligt fältarbete. Engångslistor från markerade arbetsuppgifter
skriver inte över projektets sparade mallval.

De nya livscykelpunkterna är ett projektunderlag, inte en verifiering av
kontrakt eller OEM-krav. Ange projektets godkända kontrollplan och handlingar.
STOPP kräver dokumenterad manuell frisläppning av behörig ansvarig.
