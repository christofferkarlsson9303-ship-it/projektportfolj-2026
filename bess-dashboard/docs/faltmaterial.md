# Fältmaterial för BESS

Öppna **Fältmaterial** i sidhuvudet eller via **Ctrl/Cmd+K → Skapa fältmaterial**.
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
webbläsaren. Enhet och datum anges för varje nytt dokument. Arbetsuppgifternas
nya fält sparas via befintlig portföljlagring. Inga nya Supabase-tabeller eller
behörighetsändringar krävs. Fältmaterialpanelen lagrar inte utförda provresultat.

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
