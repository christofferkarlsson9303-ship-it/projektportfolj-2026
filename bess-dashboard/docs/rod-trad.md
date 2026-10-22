# Röd tråd – informationsarkitektur för bess-dashboard

Datum: 2026-10-22 · Status: **förslag, ej beslutat** · Gäller före varje ny vy eller funktion.

## 1. Diagnos (fakta ur koden)

| Fynd | Underlag |
|---|---|
| 30 vyer i menyn, grupperade efter *typ av aktivitet* (Planera / Gör / Pengar / Lämna över), inte efter var projektet är. | `src/data/vyer.js`, `GRUPPER` |
| Fasmodellen finns som data (`fasmappning.js`: moment → fas, milstolpe → fas) men används i 5 av 30 vyer. Idag, ÄTA, Punkter, HSEQ, Risker-listan, Dagbok, Budget och Site vet inte vilken fas projektet är i. | `grep projektfasFor` |
| Tre parallella strukturer konkurrerar: ONE-P **fas 1–8**, EPC **moment 0–15 / G0–G15**, och **rytm** (dag/vecka/månad). Ingen av dem är ryggrad i UI:t. | `projektfaser.ts`, `bessChecklistData.ts`, `idag`/`vecka` |
| Metoden och appen motsäger varandra: `projektmetod.md` §2.2 och §4 har **4 faser**, appen har **8**. | `docs/projektmetod.md` rad 84–195 |
| 3D-siten (1 250 + 1 100 rader, WASD-gång, placering, IFC, BCF, modelldiff) svarar inte på någon projektledarfråga. Den är ett CAD-verktyg i en PL-app. | `sections/Site/` |

**Orsak.** Appen är byggd prompt för prompt. Varje prompt ger en bra vy, men ingen regel tvingar vyn att hänga ihop med de andra. Att be Claude "agera erfaren webbutvecklare" ger bättre kod, inte en gemensam struktur. Strukturen måste stå i en spec som varje ändring prövas mot. Det här dokumentet är den specen.

## 2. Ryggraden

**Ett projekt = en resa genom fas 1–8. Varje fas består av moment med grindar. Allt annat hänger på den resan.**

```
Fas (1–8)  →  Moment (0–15)  →  Grind (G0–G15)  →  Punkter / ÄTA / risker / dokument
```

Varje post i appen (punkt, ÄTA, risk, dagboksnotis, HSEQ-ronder, faktura) ska ha ett `moment` (och därmed en fas via `projektfasForMoment`). Saknas det sätts det till projektets aktuella moment när posten skapas.

## 3. Tre ingångar, inte trettio

| Ingång | Fråga den besvarar | Innehåll |
|---|---|---|
| **Idag** | Vad gör jag nu? | Domen från `kritiskLinje()`, förfallet, nästa grind och vad som blockerar den. Portföljläge. |
| **Projektet** | Var är vi och vad krävs för nästa grind? | Fasbandet 1–8 överst. Klick på fas → dess moment → grindkrav, öppna punkter, ÄTA, risker och dokument *för det momentet*. Ersätter Projektstart + Bygga batteripark + Tidplan som separata ingångar. |
| **Pengar** | Får vi betalt för det vi gör? | Milstolpar M1–M7 (kopplade till grind), ÄTA-flödet, budget/EAC, faktura. |

Övriga vyer (Kontakter, Rutiner, Data, Bered, Kontrakt, Metod) blir **verktyg**, nås via Ctrl/Cmd+K och via länkar inifrån ett moment. De ligger inte i huvudmenyn.

## 4. Regler för varje ny eller ändrad vy

1. Vyn ska svara på en av de tre frågorna i §3. Annars är den ett verktyg.
2. Vyn ska visa projektets aktuella fas och moment (komponent `FasMatare`/`FasIndikator`).
3. Listor filtreras på aktuellt moment som förval, med "alla moment" ett klick bort.
4. Varje rad länkar tillbaka till sitt moment. Inga återvändsgränder.
5. Samma begrepp har samma namn överallt (fas/moment enligt `CLAUDE.md`, "ÄTA").
6. Ny vy kräver att en befintlig tas bort eller slås ihop. Taket är 3 ingångar + verktyg.

## 5. 3D-siten

**Förslag:** frys gång/placering/IFC-utveckling. Gör siten till en **lägesbild** i stället:

- Ovanifrån (ortografisk), ingen WASD.
- Varje objekt färgas efter momentstatus (ej påbörjat / pågår / grind godkänd).
- Nålar för öppna punkter och ÄTA med koppling till `siteObjekt`; klick öppnar posten.
- Nås från Projektet → moment 6–14, inte som egen menyrad.

Befintlig kod raderas inte; gåläget kan ligga kvar bakom en knapp.

## 6. Beslut som krävs av Christoffer

| # | Beslut | Förslag |
|---|---|---|
| B1 | 4 eller 8 faser? Metoden och appen måste säga samma sak. | 8 i appen; uppdatera metoden §2.2/§4 så att de 4 ONE-P-huvudfaserna blir grupper av de 8. |
| B2 | Godkänn ryggraden i §2 och ingångarna i §3. | Ja |
| B3 | 3D: lägesbild (§5) eller frysa helt? | Lägesbild |
| B4 | Ordning för genomförande | Se §7 |

## 7. Genomförande, en PR i taget

1. **Moment på alla poster** – fält + migrering som sätter aktuellt moment; ingen UI-ändring. Testbart.
2. **Projektet-vyn** – fasband + momentpanel som samlar punkter/ÄTA/risker/dokument per moment.
3. **Meny till 3 ingångar** – flytta övriga vyer till verktyg; gamla hash-adresser fortsätter fungera.
4. **Idag** – lägg till "nästa grind och vad som blockerar".
5. **Site som lägesbild** – ny vy ovanpå befintlig scen.

Varje steg: `npm run lint`, `typecheck`, `test`, berörd `e2e`.
