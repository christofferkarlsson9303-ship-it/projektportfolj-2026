# ONE P Enkel — projektmodellen på en sida

Skrivet 2026-10-21. Bygger på [`../projektmetod.md`](../projektmetod.md) (full metod) och [`../projektfaser.md`](../projektfaser.md) (åtta faser). Det här är den dagliga vyn ovanpå dem. Ingenting i den fulla metoden tas bort; här står bara vad man arbetar med varje dag.

> **Status:** punkt 1–3 under *Vad som är gjort i appen* är byggda (2026-10-21). Ordbytet "Ärenden" → "Arbetspost" är inte gjort. Resten är förslag och visuellt underlag.

## 1. Modellen: tre saker

| Nivå | Vad | Antal |
|---|---|---|
| **Fas** | ONE-P fas 1–8: Anbud, Planering, Etablering, Mark och betong, Montage, Provning, Slutbesiktning, Avslut och garanti | 8 |
| **Arbetspost** | En sak som ska göras: vad, ansvarig, nästa datum, ev. underlag | en typ |
| **ÄTA** | Allt som ändrar omfattning, tid eller pris mot kontraktet | en typ |

Dagligt arbete är fyra kolumner: **Backlog → Pågående → ÄTA-granskning → Klart**. Hållpunkter (HP) mellan faserna behålls som ett uttryckligt beslut av en ansvarig, inte som en kedja.

Veckorytmen är den befintliga (Veckokoll): titta på tavlan, ta bort hinder, kolla ÄTA, kolla betalning.

## 2. Vad som blir kvar och vad som försvinner ur dagsvyn

| Idag | I ONE P Enkel | Kommentar |
|---|---|---|
| Punkt, uppgift, "ärende" | **Arbetspost** | Ett begrepp. "Ärenden" som eget ord försvinner. |
| ÄTA/UR, hinder, avvikelse, störning | **ÄTA** med fälten *art* (ändring, tillägg, avgående) och *orsak* (bl.a. hinder och störning) | Orsakerna finns redan i appen (`ORSAKER`). Störning är borta ur menyn men nås från ÄTA och Veckokoll. Ett register, inte tre. |
| Godkännandekedja (flera steg) | **Ett beslut**: beställarens skriftliga beslut på ÄTA, ansvarigs beslut på HP | Beslutet förblir uttryckligt. Appen godkänner aldrig något åt någon. |
| Risker, HSEQ-incidenter, tidrapport, dagbok, ekonomi | Ligger kvar i sina vyer, **utanför tavlan** | De är inte "ärenden". Se punkt 3. |

Data tas inte bort. Det som går ihop i dagsvyn behåller sina id:n och sin historik.

## 3. ÄTA: ett enkelt flöde, med två gränser

**Regel:** är det en avvikelse som påverkar omfattning, tid eller pris → skapa en ÄTA. Annars är det en vanlig arbetspost.

Fyra steg i kolumnen *ÄTA-granskning*:

1. **Underrätta inom 24 timmar** efter att omständigheten blev känd. Händelsedatum är det datum den inträffade, inte dagens (appen räknar fristen från det).
2. **Ange art:** Ändring, Tillägg eller Avgående.
3. **Pris och påverkan på tid.** Samma underlag som fakturan sedan bygger på.
4. **Beställarens skriftliga beslut.** Först därefter får arbetet utföras.

Sedan flyttas kortet tillbaka till *Pågående* (godkänd), eller till *Utgår* (avslagen). När arbetet är *Klart* faktureras ÄTA:n med sitt nummer som referens.

ÄTA-tavlan i appen (`src/sections/Ata/flode.js`) har nu fyra kolumner: **Identifierad → ÄTA-granskning → Godkänd → Fakturerad**. Tidigare *Underrättad* och *Underlag & pris skickat* är slagna ihop till *ÄTA-granskning*. Statusarna (`prissattning`, `skickad_best` …) är oförändrade; bara kolumnerna är färre. På varje kort visas art och en checklista med fyra prickar (underrättad, art vald, pris och tid, beslut), härledd ur fälten.

**Två gränser jag inte tar bort:**

- **24-timmarsfristen och skriftligheten.** Fristen för underrättelse och kravet på skriftligt beslut kommer från ABT 06 (appen och metoddokumentet hänvisar till kap. 2 § 7 och kap. 5 § 4). Jag har inte läst avtalstexten på nytt här. En förenkling som tar bort dem skulle ta bort ersättningsrätten, så de är steg 1 och steg 4.
- **Allt är inte en ÄTA.** Det går inte att låta ÄTA ersätta *allt*: en HSEQ-incident har egen rapporteringsfrist, risker styr man före de inträffar, och en anmärkning vid besiktning är ingen ändring av kontraktet. De ligger kvar i sina vyer. Hamnar en avvikelse däremot i tid, pris eller omfattning ska den bli en ÄTA.

## 4. Metod: Vattenfall, Agilt eller Hybrid

Strukturen är densamma i alla tre. Det som skiljer är **vad som är fast** och **hur ofta man planerar om**.

| | Vattenfall | Agilt (Scrum/Kanban) | Hybrid |
|---|---|---|---|
| Passar | Fasta krav, tydliga slutleveranser, hög förutsägbarhet i budget och tid | Korta cykler, löpande leveranser, snabb anpassning | Fast ram för budget och tid, agilt arbete i teamet |
| Fast | Omfattning, budget, slutdatum | Takt (cykel/flöde), prioritetsordning | Kontrakt, budget, milstolpar och HP |
| Rörligt | Inget utan ÄTA | Innehållet i varje cykel | Innehållet inom varje fas |
| Planering | Hela faserna i förväg | Backlog, ny prioritering varje cykel | Faser och milstolpar i förväg, tavla per vecka |
| ÄTA | Alla ändringar | Ändring av **omfattning mot kontrakt**; omprioritering inom ramen är ingen ÄTA | Som agilt, men ramen är kontraktet |
| Tavla | Kolumn per fas, eller samma fyra kolumner | Fyra kolumner, max 3 kort per person | Fyra kolumner per fas |
| Uppföljning | Kritisk linje, avvikelse mot baslinje | Genomströmning, kortens ålder | Båda: kritisk linje + tavlan |

**Rekommendation (antagande, inte beslut):** BESS-entreprenader enligt ABT 06 (fastpris, nivå A i metoden) körs som **Hybrid**: faser, milstolpar, betalplan och HP är fasta; arbetet i fas 3–6 styrs på tavlan. Rent agilt passar uppdrag utan fast pris, till exempel eftermarknad, felavhjälpning och intern utveckling. Rent vattenfall passar korta uppdrag med tydlig leverans.

**Fält som behövs i ett projektverktyg (till exempel Blikk).** Jag har inte sett er Blikk-uppsättning, så det här är en generell lista att stämma av mot den:

| Fält | Värden |
|---|---|
| Metod (projekt) | Vattenfall, Agilt, Hybrid |
| Fas (projekt) | 1–8 |
| Status (post) | Backlog, Pågående, ÄTA-granskning, Klart, Utgår |
| Typ (post) | Arbetspost, ÄTA |
| Art (ÄTA) | Ändring, Tillägg, Avgående |
| Orsak (ÄTA) | Beställarens begäran, Hinder, Felaktigt underlag, Annat |
| Ansvarig, Nästa datum, Frist | namn, datum, datum |
| Underlag | länk eller referens |
| Belopp, Beslutsdatum (ÄTA) | kr, datum |

Allt är enkla listor och datum, så det går att bygga som egna fält eller etiketter i vilket verktyg som helst.

## 5. Visualisering

| Fil | Vad | Så används den |
|---|---|---|
| [`agilt-flode.mmd`](agilt-flode.mmd) | Mermaid: Backlog → Pågående → ÄTA-granskning → Klart, med utgång och fakturering | Klistra in i FigJams Mermaid-stöd (menynamnet har jag inte kunnat kontrollera; sök efter Mermaid bland FigJams verktyg eller tillägg) eller öppna i mermaid.live och exportera som bild/SVG. Renderad och kontrollerad lokalt. |
| [`figma-kanban/code.ts`](figma-kanban/code.ts) + `code.js` + `manifest.json` | Figma-plugin som ritar en Kanbantavla med kort som instanser av två komponenter (*Kort / Uppgift*, *Kort / ÄTA*) | Figma: *Plugins → Development → Import plugin from manifest…* och välj `manifest.json`. |
| [`figma-kanban/kanban.svg`](figma-kanban/kanban.svg) | Samma tavla som SVG | Dra in på canvasen i Figma eller FigJam. Inga instanser, bara former. |

Verifierat: Mermaid-koden renderas, TypeScript-koden går igenom strikt typkontroll mot `@figma/plugin-typings`, och pluginet kördes mot en attrapp av Figma-API:t (4 kolumner, 8 kort som instanser, 3 av ÄTA-komponenten). **Inte verifierat:** körning i riktiga Figma. Exempelkorten är påhittade.

Ändra `KORT` och `KOLUMNER` överst i `code.ts` för att rita en annan tavla. Efter ändring: `npx tsc code.ts --ignoreConfig --target ES2017 --lib ES2017 --noCheck`.

## 6. Vad som är gjort i appen

1. **Art på ÄTA** (Ändring, Tillägg, Avgående): nytt fält `art` på UR-posten, val i ÄTA-panelen, kolumn i tabellen och med på utskrifterna.
2. **Orsak bär hinder och störning.** Orsaken väljs först i ÄTA-panelen. "Behandlas som" (`klass`, som styr pris- och fristgrindar) föreslås ur orsaken när posten är oklassificerad, och skrivs aldrig över om någon redan satt den. Registrera händelse har inte längre en egen Hinder-knapp; i stället väljs orsak till ÄTA:n.
3. **Fyra kolumner och checklista** på ÄTA-tavlan (se punkt 3).
4. **Metod per projekt** (Vattenfall, Agilt, Hybrid): fältet `metod` på projektet, valt under *Min projektmetod*. Det är en etikett som visar vad som är fast och rörligt. Det styr inga beräkningar och byter inte tavla.
5. **Störning** ligger inte längre i menyn.

**Inte gjort:** ordbytet "Ärenden" → "Arbetspost". I appen betyder "ärende" nästan alltid en ÄTA/UR-post, och ordet ingår i bl.a. "Ärenden på siten" och ÄTA-panelens rubrik. Ett generellt ordbyte skulle ändra mer än det förenklar. Vyn heter fortfarande "ÄTA och hinder".
