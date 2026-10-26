# Strykningslista – från 30 vyer till 3 ingångar

Datum: 2026-10-26 · Status: **förslag, ej beslutat** · Bygger på [rod-trad.md](rod-trad.md) §3.

Mål: en ny projektledare ska förstå appen på 15 minuter utan utbildning. Det är kravet för att någon ska betala för den.

## 1. Utgångsläge (fakta ur koden)

- 30 vyer i `GRUPPER` (`src/data/vyer.js`) + 1 dold (`storning`).
- Det finns redan en förenklad meny, `ENKEL_MENY`, med 7 flikar (`idag`, `oversikt`, `epc`, `tidplan`, `punkter`, `ata`, `hseq`). Den kortar listan men löser inte problemet: flikarna är fortfarande parallella ingångar till samma data.
- Endast `Projektstart`, `Tidplan` och `Milstolpar` använder fasmodellen.
- Största vyerna: Site 2 778 rader, ÄTA 1 926, Projektstart 1 403, Data 760.

## 2. Beslut per vy

**Behåll** = blir ingång eller flik i en ingång. **Slå ihop** = innehållet flyttar, vyn försvinner. **Verktyg** = finns kvar, nås via Ctrl/Cmd+K och länkar inifrån ett moment, inte i menyn. **Frys** = ingen vidareutveckling. **Ta bort** = ur menyn och ur adresslistan; koden kan ligga kvar tills vidare.

### Ingång 1 – Idag *(Vad gör jag nu?)*

| Vy | Beslut | Vart | Skäl |
|---|---|---|---|
| Idag | **Behåll** | Startsida | Kärnan: förfallet, frister, nästa grind. |
| Översikt | **Slå ihop** | Idag, ruta "Portföljen" | Samma fråga som Idag, för flera projekt. |
| Veckokoll | **Slå ihop** | Idag, knapp "Veckans genomgång" | Samma lista som Idag, i veckoperspektiv. |
| Punkter | **Behåll** | Lista i Idag + per moment i Projektet | En lista, två filter (min dag / momentet). |
| Tavla | **Ta bort** | Visningsläge "kort" i Punkter | Samma punkter och ÄTA som kort. Inte en egen vy. |
| Handlingsplan | **Slå ihop** | Punkter (åtgärd = punkt med mål-fält) | Åtgärder med ansvarig och datum är punkter. |
| Dagbok | **Verktyg** | Snabbknapp "+ Dagbok" i Idag | Skrivs i farten; behöver ingen menyplats. |

### Ingång 2 – Projektet *(Var är vi och vad krävs för nästa grind?)*

| Vy | Beslut | Vart | Skäl |
|---|---|---|---|
| Projektstart | **Slå ihop** | Projektet, fas 1 i fasbandet | Fas 1 är en del av resan, inte en egen app. |
| Bygga batteripark (epc) | **Slå ihop** | Projektet, momentpanelen | Momenten 0–15 är ryggraden. |
| Tidplan | **Slå ihop** | Projektet, flik "Tidslinje" | Samma moment på en tidsaxel. |
| Risker | **Behåll** | Per moment i Projektet | Risk hör till ett moment. |
| HSEQ | **Behåll** | Per moment i Projektet + förfallet i Idag | Skyddsronder och tillbud är momentarbete. |
| Byggmöten | **Verktyg** | Länk från moment; beslut blir punkter | Protokollet är ett dokument, besluten är punkter. |
| Slutdokumentation | **Slå ihop** | Projektet, moment 14–15 | Hör till sista grindarna. |
| Siten i 3D | **Frys** | Lägesbild under moment 6–14 (rod-trad §5) | 2 778 rader CAD som inte svarar på en PL-fråga. |

### Ingång 3 – Pengar *(Får vi betalt för det vi gör?)*

| Vy | Beslut | Vart | Skäl |
|---|---|---|---|
| Ekonomi | **Behåll** | Startsida i Pengar | Sammanfattningen: kontrakt, betalt, ÄTA, prognos. |
| ÄTA | **Behåll** | Flik i Pengar | Kärnflöde. Störning ligger redan inuti. |
| ÄTA-kalkyl | **Slå ihop** | Inuti ÄTA (finns redan "Öppna i kalkyl") | Ingen egen menyplats behövs. |
| Budget | **Behåll** | Flik i Pengar | Budget mot utfall. |
| Milstolpar | **Behåll** | Flik i Pengar, kopplad till grind | Betalning = godkänd grind. |
| Fakturaunderlag | **Behåll** | Flik i Pengar | Sista steget i pengaflödet. |
| Tidrapport | **Slå ihop** | Budget, kolumn "utfall timmar" | Ensam användare idag; egen vy först när montörer loggar in. |

### Verktyg (Ctrl/Cmd+K, inte i menyn)

| Vy | Beslut | Kommentar |
|---|---|---|
| Kontraktet | **Verktyg** | Länkas från frister i Idag och från moment. |
| Min projektmetod | **Verktyg** | Länkas från sidhjälpen. |
| Rutiner | **Verktyg** | Uppslag. |
| Kontakter | **Verktyg** | Uppslag. |
| Resurser | **Verktyg** | Värde först med flera användare. |
| Rapport | **Verktyg** | Utskrift; nås från Projektet. |
| Data | **Verktyg** | Säkerhetskopia och import. Admin. |
| ONE Bered | **Verktyg → bryt ut** | Egen produktkandidat (beredning/kalkyl), se §5. |

## 3. Resultat

| | Före | Efter |
|---|---|---|
| Menyrader | 30 (7 i enkel meny) | **3** |
| Egna vyer | 31 | 16 (3 ingångar med flikar + 8 verktyg) |
| Borttagna/sammanslagna | – | 15 |
| Frysta | – | 1 (Site, gångläget) |

## 4. Skiss

### Idag

```
┌─────────────────────────────────────────────┐
│ ● Idag     ○ Projektet     ○ Pengar   [⌘K]  │
├─────────────────────────────────────────────┤
│ 36037 Växjö · Fas 5 · Moment 8 Montage      │
│ Nästa grind G8 – 3 av 5 krav klara  [Öppna] │
├─────────────────────────────────────────────┤
│ GÖR NU                                      │
│ ! ÄTA-17 svar till beställare  förfallen 2d │
│ ! Skyddsrond v44               idag         │
│ · Kabeldragning MV-skid 2       fre         │
│ · Prov ISO, container 4–6       nästa vecka │
│                     [+ Punkt] [+ Dagbok]    │
├─────────────────────────────────────────────┤
│ PORTFÖLJEN                                  │
│ 36037 Växjö    Moment 8  ● i fas            │
│ 36038 Alvesta  Moment 7  ● 1 grind sen      │
├─────────────────────────────────────────────┤
│ [Veckans genomgång]                         │
└─────────────────────────────────────────────┘
```

### Projektet

```
┌─────────────────────────────────────────────┐
│ ○ Idag     ● Projektet     ○ Pengar   [⌘K]  │
├─────────────────────────────────────────────┤
│ Fas  [1✓][2✓][3✓][4✓][■5][6][7][8]          │
│ Moment 6✓  7✓  ■8 Montage  9  10  11 …      │
├─────────────────────────────────────────────┤
│ MOMENT 8 – MONTAGE         Grind G8: 3/5    │
│ Grindkrav                                   │
│  ✓ Egenkontroll mekaniskt                   │
│  ✓ Kabellista godkänd                       │
│  ✓ Lyftplan                                 │
│  ☐ ISO-prov containrar          → Punkt 42  │
│  ☐ Skyddsrond utan avvikelse    → HSEQ      │
├─────────────────────────────────────────────┤
│ Punkter 6 · ÄTA 2 · Risker 3 · Dokument 11  │
│ [Lägesbild] [Tidslinje] [Möten] [Rapport]   │
└─────────────────────────────────────────────┘
```

### Pengar

```
┌─────────────────────────────────────────────┐
│ ○ Idag     ○ Projektet     ● Pengar   [⌘K]  │
├─────────────────────────────────────────────┤
│ Kontrakt     Fakturerat   ÄTA godk.  Prognos│
│ 100 %        42 %         +3,1 %     ±0     │
├─────────────────────────────────────────────┤
│ [Översikt] [ÄTA] [Budget] [Milstolpar] [Fakt]│
├─────────────────────────────────────────────┤
│ Milstolpar                                  │
│ M3  G6 godkänd    Fakturerad      ✓         │
│ M4  G8 3/5 krav   Väntar på grind           │
│ M5  G11           –                         │
│ ÄTA som väntar på beslut: 2   [Öppna]       │
└─────────────────────────────────────────────┘
```

*Siffror och punkter i skissen är exempel, inte projektdata.*

## 5. Utanför menyn men viktigt för en betald produkt

- **ONE Bered bör brytas ut.** Beredning och kalkyl på KLG/E-nr har sannolikt fler köpare (alla elentreprenörer) än en BESS-projektledarapp. *Antagande – inte marknadsundersökt.*
- **Flera användare saknas.** Tidrapport, Resurser och Möten får först sitt värde när fler loggar in. Bygg inte ut dem innan dess.
- **Publik åtkomst.** Byggfilerna på Vercel nås med länk. Måste lösas före första extern användare.

## 6. Acceptanstest – 15-minutersprovet

En person som inte sett appen ska, utan hjälp:

1. Skapa ett projekt och hamna i fas 1.
2. Se vad som ska göras idag.
3. Hitta vad som krävs för nästa grind.
4. Registrera en ÄTA och se den i Pengar.
5. Se hur mycket som är fakturerat.

Klarar hen 4 av 5 på 15 minuter är strukturen godkänd.

## 7. Beslut som krävs

| # | Beslut | Förslag |
|---|---|---|
| S1 | Godkänn tabellerna i §2 | Ja |
| S2 | Bryt ut ONE Bered som egen app | Ja, efter S1 |
| S3 | Tidrapport: slå ihop nu eller vänta på fler användare | Slå ihop nu |

Genomförande följer [rod-trad.md](rod-trad.md) §7. Steg 3 (meny till 3 ingångar) genomför den här listan. Gamla hash-adresser ska fortsätta fungera och peka till rätt ingång och flik.
