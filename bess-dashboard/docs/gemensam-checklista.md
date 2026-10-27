# Gemensam checklista – plan

Beslut 2026-10-17 (Christoffer Karlsson): hela appen ska använda **en** checklista. En punkt som bockas av eller uppdateras på ett ställe ska slå igenom i alla vyer.

Den här filen är planen. Utkastet till sammanslagningslista ligger i [`gemensam-checklista-mappning.csv`](gemensam-checklista-mappning.csv).

**Genomfört 2026-10-23** (grenen `gemensam-checklista-grind`):

- Beslut 2 är infört: en passerad grind bockar inte av punkter. `punktlage()` ger källan `ejregistrerad`; sådana punkter räknas som öppna men blir inga uppgifter (`attGora()`), och deras ledtider visas som "Momentet passerat". De kan registreras en och en eller i ett svep i momentets grindruta.
- Grindrutan visar exakt vad som saknas för klartecknet (`grindSaknas()`): öppna punkter med hållpunkter först, egenkontroller som inte är verifierade, avvikelser och grinddatum.
- De 41 kopplingarna egenkontroll → EPC (fältet `epc` i momentmallarna) gäller nu: en verifierad egenkontroll bockar sin EPC-punkt (`styrktaPunkter()`, källa `egenkontroll`). Inte tvärtom (beslut 1).

**Kvar:** kopplingar mellan Projektstart och Bygga batteripark väntar på etapp 0 (beslut 3). Katalogen och den gemensamma statusen (etapp 1–4) görs efter det.

## 1. Läget idag (main 0e7f859)

Tre checklistor över samma arbete, med var sin lagring och utan koppling till varandra.

| Checklista | Katalog (statisk) | Status per projekt | Skrivs av | Läses av |
| --- | --- | --- | --- | --- |
| Projektstart | `data/projektstartKatalog.js`, 216 punkter (91 kritiska) | `utkast.kryss[bucket][id]` – i webbläsaren tills projektet skapas, sedan i `state.projektstart[].utkast` | `kryssa()` i `Projektstart.jsx` | `fasKrav()`, `stegKrav()`, `pdfKvar()` i `lib/projektfas.js` |
| Bygga batteripark | `data/bessChecklistData.ts`, 306 punkter (280 i moment 0–15, 26 löpande; version 1.3 2026-10-27) | `state.epcPunkter` (`status: klar \| ejaktuell`), grindar i `state.epcFaser` | `EPC_PUNKT`, `EPC_FAS` | `punktlage()`, `faslage()`, `nastaUppgifter()` i `lib/epc.js` |
| Egenkontroller | `data/projektkontroll.js` (`PROJEKTMALLAR`), 115 punkter i 16 moment | `state.faltkontroller` (resultat, datum, kontrollant, referens, mallrevision) per omfattning | `FALT_KONTROLL` | `kontrollage()`, `byggFaltmaterial()`, `EgenkontrollLage.jsx` |

Kopplingar som redan finns i koden: 41 egenkontroller har fältet `epc` som pekar på EPC-punkter. Projektstartens punkter är inte kopplade till något.

Följden: en kontroll kan vara klar i Bygga batteripark och öppen i Projektstart samtidigt. Projektets fas räknas ur båda och kan visa olika värden.

## 2. Målbild

En katalog med kontrollpunkter och en statuslista per projekt. Vyerna är filter på samma data.

```
Kontrollkatalog (statisk, versionerad)        Kontrollstatus (per projekt, i portfolj/state)
  KP-0412  "Lyftplan med lastdiagram …"   ←──   ks|36037|KP-0412|Hela anläggningen  lage: klar …
    taggar: fas 5, moment 11, vy: epc,           ks|36037|KP-0412|Container 3        lage: …
            projektstart, egenkontroll
    alias:  11.4, ebop.liftplan
          │
          ├── Projektstart fas 5   (filter: vy=projektstart, onepFas=5)
          ├── Bygga batteripark 11 (filter: vy=epc, moment=11)
          └── Egenkontroll moment 11 / Fältmaterial (filter: typ=kontroll, moment=11)
```

### 2.1 Kontrollpunkt (katalog)

En post per unik kontroll. Dubbletter slås ihop till en post med flera alias.

```js
{
  id: "KP-0412",                 // stabilt, ändras aldrig
  alias: ["11.4", "ebop.liftplan"], // gamla id:n – används vid migrering och djuplänkar
  text: "Lyftplan med kranens lastdiagram …",
  instruktion: "",               // från egenkontrollerna där det finns
  verifiering: "",
  typ: "uppgift",                // uppgift | kontroll | krav
  taggar: {
    onepFas: [5],                // 1–8, kan vara flera
    moment: [11],                // 0–15, tom för Projektstart-punkter utan moment
    lopande: false,              // gäller hela projektet (dagens lop.*)
    vyer: ["projektstart", "epc", "egenkontroll"],
    avsnitt: "Förberedelse",
    omrade: ["lyft"],            // fritt: lyft, el, mark, hseq, kontrakt, ekonomi …
    markering: ["HP"],           // kritisk | HP | K | L | STOPP
    profiler: [],                // tom = alla; annars t.ex. ["catl-pe"] (förbereder F09)
  },
  roll: "Kranförare",
  nar: "Före lyft",
  verifierar: [],                // för typ kontroll: KP-id:n som kontrollen styrker
  revision: "2026-10-17",
}
```

- **typ** styr vad som krävs för "klar": `uppgift` räcker med bock, `kontroll` kräver resultat, datum, kontrollant och bevis (samma som `kontrollBrister()`), `krav` är ett obligatoriskt fält i Projektstart och får inget statusfält.
- **taggar** är det som gör att samma punkt syns i flera vyer utan kopia. En vy ställer en fråga till katalogen, till exempel "alla punkter med vy=epc och moment=11".
- **verifierar** ersätter dagens `epc`-fält i egenkontrollerna. En egenkontroll är inte samma punkt som arbetsuppgiften den styrker. De länkas.

### 2.2 Kontrollstatus (projektdata)

En rad per projekt, punkt och omfattning. Bara rader som har ett värde sparas.

```js
{
  id: "ks|36037|KP-0412|Hela anläggningen",
  projektId: "36037",
  punkt: "KP-0412",
  omfattning: "Hela anläggningen",   // eller "Container 3" osv.
  lage: "klar",                      // "" | klar | ejaktuell | avvikelse
  motivering: "",                    // krävs vid ejaktuell
  resultat: "", datum: "", kontrollant: "", referens: "", notering: "", mallrevision: "", // typ kontroll
  andrad: "2026-10-17", av: "C. Karlsson", kalla: "epc", // vilken vy som senast ändrade
}
```

En samling i `portfolj/state`: `state.kontrollstatus`. Ingen schemaändring i databasen i första steget. Raderna har id, så `sammanfoga()` slår ihop två användares ändringar rad för rad och fält för fält som idag.

### 2.3 Regler som gäller i alla vyer

1. **En sanning.** Alla vyer läser `kontrollStatus(state, pid, punkt, omfattning)` och skriver med en action, `KONTROLL_SATT`. Inga vyer har egna kopior.
2. **Klar betyder samma sak överallt.** För `uppgift`: lage = klar. För `kontroll`: lage = klar och `kontrollBrister()` tom. En bock i Projektstart på en `kontroll`-punkt öppnar egenkontrollen i stället för att bocka direkt.
3. **Avvikelse vinner.** Har någon omfattning `avvikelse` är punkten öppen i alla vyer (samma som F12-regeln i PR #76).
4. **Grind är ett beslut, inte en punkt.** `epcFaser.grindDatum` ligger kvar. En passerad grind får inte längre bocka fasens punkter (dagens `kalla: "grind"`). Punkter som bara är klara via grinden visas som "ej registrerade".
5. **Ej aktuell kräver motivering** i alla vyer (i dag bara i egenkontrollerna).
6. **Allt loggas** med punktens text och vilken vy ändringen kom från.

### 2.4 Vad varje vy visar

| Vy | Filter på katalogen | Kan ändra |
| --- | --- | --- |
| Projektstart, sida i fas N | `vyer` innehåller projektstart, `onepFas` = N, avsnitt = sidans katalog | Bock / ej aktuell. Kontroll-punkter öppnar egenkontrollen. |
| Bygga batteripark, moment M | `vyer` innehåller epc, `moment` = M, plus `lopande` | Bock / ej aktuell / kommentar. |
| Egenkontroll och Fältmaterial | `typ` = kontroll, `moment` = M, per omfattning | Resultat, datum, kontrollant, bevis. |
| Idag, Översikt (nästa uppgift) | Öppna punkter i projektets aktuella moment | Bock. |
| Tidplan (byggfaser) | Räknare per moment | – |
| PDF, utskrift, beställarrapport | Samma filter som vyn de skrivs från | – |

## 3. Etapper

Varje etapp är en egen PR med tester. Ingen etapp ändrar vad användaren ser förrän etapp 3.

### Etapp 0 – Beslut och sammanslagningslista (PL + el/OEM)

- Gå igenom [`gemensam-checklista-mappning.csv`](gemensam-checklista-mappning.csv). Den har alla 641 punkter (inklusive de fyra anbudspunkterna i fas 1 från PR #79 och de 18 punkterna ur EBR-E och Montörspärmen 2026-10-27). Förslag i kolumnen `foreslagen_relation`: 41 `verifierar` (från koden) och 11 `möjlig sammanslagning` (automatisk textlikhet, ska granskas).
- Fyll i `beslut`: `egen` (ny KP), `slå ihop med <id>` eller `verifierar <id>`. Det som inte beslutas blir en egen punkt.
- Fyll i `beslutad_av`.

**Klart när:** varje rad har ett beslut och listan är godkänd av projektledare/lyftansvarig och el/OEM-ansvarig.

### Etapp 1 – Katalogen i kod (ingen beteendeändring)

- Ny fil `src/data/kontrollkatalog.js` byggd från de tre källorna och beslutslistan. De gamla filerna exporterar sina listor ur katalogen, så befintliga vyer fungerar som förut.
- Uppslag: `PUNKT_FOR_ALIAS`, `punkterFor({ vy, onepFas, moment, typ, profil })`.
- Tester: varje gammalt id har exakt ett KP-id, inga punkter försvinner, alla taggar är giltiga, inga två KP har samma alias.

**Klart när:** alla befintliga tester går igenom oförändrade och katalogtesterna är gröna.

### Etapp 2 – Gemensam status och migrering

- `state.kontrollstatus` och action `KONTROLL_SATT` i reducern, med logg.
- Migrering i `efterInlasning()`, idempotent: `epcPunkter`, `faltkontroller` och sparade Projektstart-`kryss` blir rader i `kontrollstatus` via alias.
  - Samma punkt från flera källor: rad med bevis (resultat, kontrollant, referens) vinner över en enkel bock. Vid två enkla bockar vinner senaste datum. `ej-ok` vinner alltid.
  - De gamla samlingarna ligger kvar orörda en version, så att en äldre klient inte tappar data (samma mönster som `aldreklient.test.js`).
- De gamla actions (`EPC_PUNKT`, `FALT_KONTROLL`, Projektstartens `kryssa`) skickas vidare till `KONTROLL_SATT`.
- Projektstart för ett **nytt** projekt: bockarna ligger i utkastet tills projektet skapas och flyttas då till `kontrollstatus` i samma `SKAPA_PROJEKT`. För ett **befintligt** projekt skriver guiden direkt i `kontrollstatus`.

**Klart när:** tester visar att en bock i Bygga batteripark syns i Projektstart och tvärtom, att en komplett egenkontroll gör den länkade punkten verifierad, och att migreringen ger samma räknare som före för 36037 och 36038 i exempeldata.

### Etapp 3 – Vyerna läser den gemensamma källan

- `lib/projektfas.js`, `lib/epc.js` (`punktlage`, `kontrollage`, `faslage`, `nastaUppgifter`), `lib/faltmaterial.js`, `EgenkontrollLage.jsx`, `snabbutskrift` och Projektstartens kontrollpunkter använder `punkterFor()` och `kontrollStatus()`.
- Varje punkt visar var den mer finns ("Finns även i Projektstart fas 5").
- e2e: bocka i en vy, kontrollera i de andra två.

**Klart när:** e2e för bockning över vyer, snabbutskrift och fältmaterial är gröna på desktop och mobil.

### Etapp 4 – Städa

- Sluta läsa `epcPunkter`, `faltkontroller` och Projektstart-`kryss` efter en version utan problem. Ta bort dem ur seed och migrering.
- Uppdatera `CLAUDE.md`: en katalog, en status, inga nya checklistor vid sidan av.

### Etapp 5 – Senare (hör ihop med F01, F05, F15)

- Flytta `kontrollstatus` till en egen tabell med RLS per projekt och serverkvittens (`auth.uid()`, servertid) för `kontroll` och hållpunkter.

## 4. Risker

| Risk | Följd | Åtgärd |
| --- | --- | --- |
| Fel sammanslagning av två punkter som bara liknar varandra | En kontroll försvinner ur en vy | Etapp 0 granskas av PL och el/OEM. Automatiska förslag är bara förslag. |
| Räknare ändras när "klar via grind" tas bort | Faser ser mindre klara ut efter etapp 3 | Visa skillnaden i release-texten. Avsiktligt, samma linje som F12. |
| Äldre klient skriver i gamla samlingar | Bock syns inte i nya vyer | Migreringen körs vid varje inläsning en version framåt. |
| Större JSONB-rad | Långsammare synk (F15) | Spara bara rader med värde. Uppskattat ca 100–300 kB per aktivt projekt (antagande, ska mätas). |
| Samtidig ändring av samma punkt | Lokalt värde vinner tyst | Konfliktvyn (issue #70) prioriteras före etapp 3. |

## 5. Beslut (fattade 2026-10-17, Christoffer Karlsson)

1. **Kontroll kräver alltid bevis, i alla vyer.** En `kontroll`-punkt har samma krav på verifiering oavsett var den bockas. Från Projektstart öppnas en uppmaning med länk till egenkontrollen eller bilagan. Regel 2 i avsnitt 2.3 gäller.
2. **En passerad grind bockar inte längre av punkter.** Varje punkt bockas manuellt eller verifieras via kopplad egenkontroll. Regel 4 i avsnitt 2.3 gäller.
3. **Mappningen godkänns gemensamt** av projektledare/lyftansvarig och el/OEM-ansvarig (etapp 0).
4. **Fas- och projektstatus räknas på samma status i alla vyer.** Projektstartens fasgodkännande, Bygga batteripark, Tidplan, projektkort och nyckeltal läser samma data (etapp 3).

Ordning: PR #76 → #78 → #79 → #77. Etapp 0 (mappningsfilen) startar när #77 är mergad och avslutas innan etapp 1.

## 6. Ordning mot annat arbete

- PR #76 mergas först. Den ändrar `kontrollage()` (F12) och krantexterna, som katalogen ska bygga på.
- Terminologin "moment" i Bygga batteripark (egen PR) görs före etapp 3, så att vyerna får rätt ord från början.
- Etapp 2 ersätter inte F03 (synkkön), men samma testmiljö för avbrott används.
