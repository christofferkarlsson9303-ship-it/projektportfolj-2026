# Projektmetod – granskning och förenkling

Granskad 2026-10-03. Omfattning: alla 25 befintliga sidor, navigation,
projektlagring, import/export, byggfaser och den nya projektchecklistan.
Bedömningen bygger på koden och lokala tester, inte på en granskning av
projektens signerade avtal eller en kontroll av alla produktionsdata.

## Vad som redan är bra

Sidan har stöd för hela projektledarens arbetscykel. Den största nyttan är
att ansvar, datum, ändringar och underlag kan följas i samma projekt, och att
arbetslistor/protokoll kan skrivas ut direkt. Det finns både en vy över alla
projekt och vyer för ett valt projekt. Direkta länkar, snabbsökning och
redigering i tabellerna sparar tid.

| Funktion | Praktisk nytta | När den används |
| --- | --- | --- |
| Idag | Samlar brådskande datum, svar och arbete | Varje morgon |
| Översikt | Visar projektens läge, nästa uppgift, leveranser och aktivitet | Prioritering mellan projekt |
| Bygga batteripark | Återanvändbara byggfaser, hållpunkter, ansvar och erfarenheter | Inför och under varje arbetssteg |
| Tidplan | Samlad tidsaxel med byggfaser, milstolpar och leveranser | Planering och omplanering |
| Handlingsplan | Kopplar mål till konkreta åtgärder | Projektstart och uppföljning |
| Resurser | Visar bokade timmar och kapacitetsproblem | Veckoplanering |
| Kontakter | Samlar projektets ansvariga och kontaktvägar | Start och löpande samordning |
| Öppna punkter | Ger varje uppgift ansvarig, datum, instruktion och referens | Daglig arbetsledning |
| Tavla | Visar arbetsläget som flyttbara kort | Snabb avstämning |
| Byggmöten | Samlar beslut, ÄTA/hinder och uppföljning i utskrivbart protokoll | Före, under och efter möte |
| Veckokoll | Påminner om kontrakt, förändringar, tid och dokumentation | Fast genomgång varje vecka |
| Dagbok | Sparar vad som faktiskt hände och resurserna som användes | Varje arbetsdag, särskilt vid avvikelse |
| HSEQ / BAS-U | Samlar ronder, arbetsmiljöplan, arbetsplatsplan och tillbud | Arbetsplatsstart och löpande säkerhetsarbete |
| Risker | Kopplar riskbedömning till åtgärd och ansvar | Före arbete och vid förändring |
| Störning | Ger ett underlag för hinder och påverkan | När planerat arbete inte kan utföras |
| ÄTA och hinder | Följer ärenden från upptäckt till beslut och fakturering | När omfattning eller förutsättningar ändras |
| Budget och utfall | Jämför aktivitetsbudget med rapporterad tid och kostnad | Ekonomiavstämning |
| Tidrapport | Ger timmar per person, dag och aktivitet | Dagligen/veckovis |
| Ekonomi | Samlar kontraktsvärde, betalningsläge och ÄTA-ekonomi | Ekonomiavstämning |
| Milstolpar M1–M7 | Påminner om nästa betalningsunderlag | Inför avisering/fakturering |
| Fakturaunderlag | Samlar debiterbar tid och kostnad | Före fakturering i ekonomisystemet |
| Slutdokumentation | Visar dokumentkrav, granskning och öppna handlingar | Från projektstart till överlämning |
| Beställarrapport | Ger en utskrivbar lägesrapport från projektdata | Inför rapportering |
| Projektledarens handbok | Samlar interna arbetssätt och checklistor | När en situation behöver hanteras |
| Data och backup | Ger synkstatus, granskad import och säkerhetskopia | Före import och större ändringar |
| Fältmaterial | Ger arbetslistor, lagplan, blanketter och egenkontrollrapport | Före fältarbete och vid slutdokumentation |

Gemensamt stöd: mörkt läge, mobilmeny, tangentbordsnavigation,
Ctrl/Cmd+K, direktlänkar med projekt i adressen, sortering/filter och
CSV/Excel i återanvändbara tabeller, samt loggning och befintlig lagringssynk.

## Vad som förenklats

1. **Min projektmetod** binder ihop funktionerna: daglig rutin, veckorutin,
   sex huvudsteg, val av rätt verktyg och en sökbar ordlista.
2. **Enkel meny** visar nio vanliga sidor. Visa alla funktioner öppnar hela
   menyn. Valet sparas i webbläsaren. En sida som öppnas via sökning visas
   även om den inte hör till de nio grundvalen.
3. **Vanliga ord** i sidornas ingress. Alla sidor har kort hjälp:
   Gör så här, följt av tre konkreta steg. Tekniska acceptanskrav och
   kontraktstexter har inte förenklats genom att viktiga villkor tas bort.
4. **Synlig sökknapp** gör sökningen användbar även utan tangentbord.
   Sidornas beskrivningar ingår i sökningen.
5. **Nytt projekt** skapar tomma projektuppgifter och tomma mallar. Inga
   tidigare prov, ÄTA-ärenden, betalningar eller resultat kopieras. Dubbelt
   projektnummer och fel datumordning stoppas. Valideringsfel lämnar
   formuläret öppet med uppgifterna kvar.
6. **Egenkontroller i byggfasen** visar verklig status per projekt och
   kontrollomfattning. Fasgenvägen öppnar samma sparade resultat i
   fältmaterialet och skriver inte över det vanliga mallurvalet.
7. **Säker textredigering** sparar det fokuserade kontrollfältet även vid
   Escape. Ändringsloggen visar vilket kontrollfält som ändrats och
   gammalt/nytt värde. Lokala loggvisningen behåller de senaste 150 posterna;
   befintlig molnlogg använder separat append-only-lagring.

## Så använder du sidan som metod

- **Vid start:** skapa/välj projekt, kontrollera grunduppgifter, kontrakt,
  gränsdragning, mål, kontrollplan och dokumentkrav. Lägg in verkliga datum
  och projektets betalningsplan/priser.
- **Varje dag:** börja i Idag. Ge uppgifter en ägare och ett datum. Skriv
  dagbok och dokumentera ändringar/hinder med referenser till bevis.
- **Varje vecka:** Veckokoll, tidplan, resurser, budget, ÄTA och byggmöte.
  Kontrollera samtidigt vilka slutdokument som saknas.
- **Inför nästa byggsteg:** granska rätt ritning och arbetsberedning,
  kontrollera förutsättningar och dokumentera utsedd ansvarigs klartecken.
- **Under utförandet:** registrera verkliga egenkontroller per enhet eller
  avtalad provomfattning. Fel kräver åtgärd och dokumenterad ny kontroll.
- **Vid avslut:** granska resultat och handlingar, redovisa öppna punkter,
  skapa rapport/index och dokumentera mottagande och underskrifter.

## Viktiga gränser för återanvändning

Det är en projektmetod för BESS-totalentreprenader med användbara allmänna
projektverktyg. Den är inte en färdig kontraktsmall för varje entreprenadtyp.
Byggguiden, tekniska modeller, M1–M7, dokumentkrav, priser och vissa frister
bygger på Batch C eller interna underlag. Dessa måste kontrolleras mot varje
projekts egna avtal och aktuella krav. Ett nytt projekt får standardmallar,
inte ett påstående om att kraven redan är godkända. Ingen gammal faktisk
betalningsplan eller kontraktssumma kopieras.

Byggchecklistans bockar, fasgrindar, egenkontrollresultat och godkända
slutdokument är skilda uppgifter. Byggvyn kan härleda passerade grindar från
fakturerade milstolpar eller senare grindar. Det är arbetsuppföljning och
fyller inte i ett provresultat. Namn i rapporten är inte elektroniska
underskrifter. En rapport redo för granskning är inte slutacceptans.

Budgetens kvarvarande belopp är inte en full EAC-prognos. Verklig fakturering,
myndighetsanmälningar och distribution av protokoll behöver utföras i rätt
kanal. Referenser till SharePoint, ENIA och IFS innebär ingen automatisk
integration. Portföljens synkstatus avgör om ändringar sparas lokalt eller
delat. Ändringar i denna version gör ingen databasmigrering och ändrar inga
behörigheter.

OEM-manualerna och signerade avtal har inte tillhandahållits i detta uppdrag.
Juridiska frister, skyddsnivåer och modellberoende tekniska värden är därför
inte nyverifierade i denna granskning. Vid motstridiga tekniska underlag
krävs ett skriftligt besked från ansvarig projektör/tillverkare; man kan inte
alltid välja ett värde enbart för att det verkar strängare.

## Verifiering

Lint, typkontroll och produktionsbygge godkända. 297 enhetstester och
344 webbläsartester godkända; 10 villkorade webbläsartester hoppades över.
Webbläsartester täcker
nya projekt, återladdning, enkel/hel meny, sökning, ordlista, samtliga sidors
hjälp, gemensamma kontrollresultat och Escape. Befintliga arbetsflöden
regressionstestas på dator och mobil. Bilder granskas för överflödande
innehåll, textstorlek och mörkt läge.
