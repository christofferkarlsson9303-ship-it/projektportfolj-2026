# 01 · Kravspec och KPI:er — bess-drift

Status: utkast 2026-10-27. Beslut från Christoffer 2026-10-27 är markerade **[B]**. Antaganden är markerade **[A]** och ska bekräftas innan de byggs in.

## 1. Syfte och avgränsning

`bess-drift` är ett drift- och övervakningsgränssnitt (EMS/SCADA-överbyggnad) för batteriparker i driftskedet, efter överlämning.

| Ingår | Ingår inte |
| --- | --- |
| Realtidsstatus park → container → PCS → modul → cell | Styrslingor och skyddsfunktioner (ligger i PLC/BMS/PCS) |
| Larm med kvittering och notifiering | Ersättning för leverantörens lokala HMI |
| Driftlägen och börvärden med bekräftelse | Budgivning mot Svenska kraftnät/aggregator |
| Historik, degradation, export | EPC-uppföljning, ÄTA, ekonomi (ligger i `bess-dashboard`) |

- **[B]** Egen app bredvid `bess-dashboard/` och `one-bered/`.
- **[B]** Startar mot simulerad data. Adapterlager förbereds för Modbus TCP, MQTT och REST.
- **[B]** UI-uppdatering 1–2 s. Allt under 1 s hanteras i PLC/BMS.
- **[B]** Läsning och styrning. Kritiska kommandon kräver explicit bekräftelse.

## 2. Användarroller (RBAC)

| Roll | Läsa KPI/effekt/SoC | Cellnivå | Kvittera larm | Byta driftläge | Börvärden/kalibrering | Användaradmin |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `viewer` (beställare, t.ex. Ingrid Capacity) | ✓ | – | – | – | – | – |
| `operator` (drift) | ✓ | ✓ | ✓ | ✓ | – | – |
| `admin` (tekniker) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

- Roll sätts **per park**, inte globalt. En beställare ser bara sina parker.
- Behörighet kontrolleras på **servern** (gateway + RLS). Klienten döljer knappar men är aldrig spärren.
- **[A]** Fas 1 är bara utvecklingsläge med en användare (`admin`). RBAC finns ändå i datamodellen och i API-kontrollerna från början.

## 3. KPI:er

Alla värden bär `ts` (mättid i källan) och `q` (kvalitet: `good`, `stale`, `bad`, `sim`). Se [03-datamodell.md](03-datamodell.md).

### 3.1 Realtid (1–2 s)

| KPI | Nivå | Definition | Enhet |
| --- | --- | --- | --- |
| Aktiv effekt P | Park, PCS | + = urladdning, − = laddning (generatorkonvention) | MW |
| Reaktiv effekt Q | Park, PCS | Vid anslutningspunkten | Mvar |
| SoC | Park, container, rack | Park: `Σ E_kvar / Σ E_användbar` över containrar **med giltigt värde** | % |
| Tillgänglig energi | Park | `Σ (SoC × E_användbar × SoH)` | MWh |
| C-rate | Container | `|P_container| / E_nominell` | C |
| Cellspänning min/max/Δ | Modul, container | `ΔV = Vmax − Vmin` | mV |
| Celltemperatur min/max/Δ | Modul, container | `ΔT = Tmax − Tmin` | °C |
| Frekvens | Park | Vid anslutningspunkten | Hz |
| Driftläge | Park | Aktivt läge + källa (fjärr/lokal) | – |
| Datafärskhet | Alla | Ålder på senaste giltiga värde | s |

**Regel (från `bess-dashboard`, F-granskning 2026-10-16):** en aggregerad siffra som saknar delar av underlaget visas med täckning, t.ex. *SoC 64 % (9 av 10 containrar)*. Tappade containrar räknas aldrig tyst bort.

**Regel:** ingen data är inte OK. Ett värde med `q ≠ good` visas grått med ålder, aldrig grönt.

### 3.2 Periodiska (timme/dygn/månad)

| KPI | Definition |
| --- | --- |
| SoH | Från BMS (primärt). Egen skattning = uppmätt kapacitet vid referenscykel / nominell kapacitet |
| Ekvivalenta fulla cykler (EFC) | `Σ |E_urladdad| / E_nominell` per period |
| Verkningsgrad RTE | `E_ut / E_in` vid anslutningspunkten, per dygn och månad |
| Tidsbaserad tillgänglighet | `(T_period − T_otillgänglig) / T_period` per container och park |
| Energibaserad tillgänglighet | `Σ tillgänglig effekt × tid / (P_nominell × T_period)` |
| Degradationstakt | ΔSoH per 100 EFC och per månad |
| Larmfrekvens | Antal larm per prioritet per dygn och container (för larmsanering) |

**[A]** Definitionen av tillgänglighet ska stämmas av mot kontraktets (EPC/O&M) tillgänglighetsgaranti. Den kan undanta planerat underhåll och nätfel.

## 4. Funktionella krav

### 4.1 Realtidsvisualisering

- **K-RT-1** Parköversikt: P, Q, SoC, tillgänglig energi, driftläge, frekvens, aktiva larm per prioritet, status per container.
- **K-RT-2** Containervy: racks, PCS-status, HVAC/brand-status, min/max/Δ för V och T.
- **K-RT-3** Cellmatris: värmekarta för spänning eller temperatur. Hover visar cell-ID, värde och avvikelse mot modulens medel. Klick öppnar en trend för cellen.
- **K-RT-4** PCS/omriktare: status (av, standby, drift, fel), P/Q, DC-spänning och -ström, brytarstatus mot nät.
- **K-RT-5** Hierarkisk navigering park → container → rack → modul → cell, med brödsmulor och djuplänkar.

### 4.2 Larm och händelser

- **K-LA-1** Tre prioriteter: **Kritisk** (åtgärd inom minuter, effekt eller säkerhet påverkas), **Varning** (åtgärd samma skift), **Info** (loggas, kräver ingen kvittering).
- **K-LA-2** Livscykel enligt ISA-18.2: `aktiv_okvitterad` → `aktiv_kvitterad` → `återgått`. `återgått_okvitterad` är ett eget tillstånd.
- **K-LA-3** Kvittering kräver rollen `operator` eller högre och loggar användare, servertid och valfri kommentar.
- **K-LA-4** Shelving (tillfällig avstängning) med obligatorisk orsak och sluttid, max 24 h. Endast `admin`.
- **K-LA-5** Notifiering: Kritisk → push + SMS/e-post direkt. Varning → e-post om den är okvitterad efter 15 min **[A]**. Info → ingen notifiering.
- **K-LA-6** Översvämningsskydd: över 10 nya larm per minut från samma container grupperas till ett sammanfattningslarm.
- **K-LA-7** Händelselogg (append-only): larm, kommandon, lägesbyten och inloggningar. Exporterbar som CSV.

### 4.3 Styrning

- **K-ST-1** Driftlägen: `standby`, `fcr_n`, `fcr_d_upp`, `fcr_d_ned`, `arbitrage`, `peak_shaving`, `underhall`. **[A]** Listan stäms av mot EMS-leverantörens faktiska lägen.
- **K-ST-2** Börvärden: P-börvärde, SoC-mål, effektgränser. Endast inom konfigurerade min/max.
- **K-ST-3** Bekräftelsedialog visar nuvarande värde → nytt värde, påverkan (t.ex. "Lämnar FCR-N-åtagande") och kräver att parknamnet skrivs in vid kritiska kommandon.
- **K-ST-4** Kommandon följer tillståndsmaskinen `begärd → bekräftad → skickad → kvitterad | avvisad | timeout`. UI visar tillståndet tills det är slutligt. Optimistisk uppdatering är förbjuden.
- **K-ST-5** Spärrar på servern: inga kommandon om parken är i lokalt läge, om kritiskt larm är aktivt (utom `standby`), eller om datan är `stale`.
- **K-ST-6** Varje kommando loggas med användare, roll, servertid, före/efter-värde och svar från källan.

### 4.4 Historik och rapportering

- **K-HI-1** Trender med valbart intervall (1 h–12 mån) och automatisk upplösning (rådata → minut → timme → dygn).
- **K-HI-2** Degradationskurva: SoH mot EFC och mot tid per container, med garantilinje från leverantörens garantivillkor.
- **K-HI-3** Export till CSV och XLSX för valda signaler och intervall.
- **K-HI-4** Månadsrapport (PDF): tillgänglighet, energi in/ut, RTE, EFC, larmstatistik.

## 5. Icke-funktionella krav

| Krav | Mål |
| --- | --- |
| Uppdatering i UI | ≤ 2 s från källa till skärm (p95) |
| Gatewayns tillgänglighet | 99,5 % per månad **[A]** |
| Avbrott i data | UI markerar `stale` efter 3 missade intervall (6 s) |
| Kontrollrum | Mörkt läge som standard, läsbart på 2 m avstånd, färg är aldrig enda bärare av status |
| Säkerhet | Ingen inkommande trafik till OT-nätet. Edge-gatewayn ansluter utåt (MQTT/TLS). Zon/kanal-tänk enligt IEC 62443 |
| Spårbarhet | Kommandon och kvitteringar loggas oföränderligt i minst 5 år **[A]** |
| Webbläsare | Senaste Chrome/Edge. Surfplatta för fältbruk |

## 6. Wireframes

### 6.1 Parköversikt

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ONE Drift ▸ Växjö Batteripark        ● FJÄRR   Läge: FCR-N    49,98 Hz  12:04:31 │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┤
│ P  −8,4 MW   │ SoC  64 %    │ Energi 12,1  │ Tillgängl.   │ LARM  ▲2  ●5  i3 │
│ ▼ laddar     │ 9/10 cont.   │ MWh kvar     │ 99,2 % (30d) │ [Öppna larmlista]│
├──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┤
│ Effekt och SoC, senaste 60 min                                                │
│  MW ┤      ╭─╮        ╭──                          ── P   ·· SoC              │
│     ┤ ────╯  ╰──────╯                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Containrar                                                                    │
│ ┌C01───┐ ┌C02───┐ ┌C03───┐ ┌C04───┐ ┌C05───┐ ┌C06───┐ ┌C07───┐ ┌C08───┐ ...   │
│ │SoC 63│ │SoC 65│ │ ▲ FEL│ │SoC 64│ │ ? 34s│ │SoC 62│ │SoC 64│ │SoC 63│       │
│ │ΔT 2,1│ │ΔT 1,8│ │PCS   │ │ΔT 2,4│ │stale │ │ΔT 3,9│ │ΔT 2,0│ │ΔT 1,9│       │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Byt driftläge]  [Sätt SoC-mål]                     (endast operator/admin)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Cellmatris (container)

```
┌ C06 ▸ Rack 3 ─────────── Visa: (●) Temperatur ( ) Spänning ─ Skala: auto ─┐
│        c01 c02 c03 c04 c05 c06 c07 c08 c09 c10 c11 c12 c13 ...  max  Δ     │
│ M01    ░░  ░░  ░░  ▒▒  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░       28,1 1,9   │
│ M02    ░░  ░░  ▒▒  ▓▓  ▓▓  ▒▒  ░░  ░░  ░░  ░░  ░░  ░░  ░░       31,8 3,9 ◀ │
│ M03    ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░       27,9 1,4   │
│ ...                                                                        │
│ ░ ≤ medel+1σ  ▒ +1–2σ  ▓ > +2σ  ╳ saknas                                  │
│ Vald: M02-c05  31,8 °C  (+3,6 mot modulmedel)  [Trend 24 h]                │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Bekräftelse av kritiskt kommando

```
┌ Bekräfta kommando ───────────────────────────────────────┐
│ Park:     Växjö Batteripark                              │
│ Ändring:  Driftläge  FCR-N  →  Standby                   │
│ Påverkan: Lämnar FCR-N-åtagande. Avräkning kan påverkas. │
│                                                          │
│ Skriv parkens namn för att bekräfta: [______________]    │
│ Kommentar (valfri):                  [______________]    │
│                                                          │
│                 [Avbryt]   [Skicka kommando] (inaktiv)   │
└──────────────────────────────────────────────────────────┘
```

## 7. Öppna frågor

1. Vilken EMS/SCADA-leverantör och vilket gränssnitt får Växjö och Alvesta? Svaret avgör adapter nummer ett.
2. Exakt cellkonfiguration per container (racks, moduler, celler i serie/parallell). **[A]** Simulatorn använder 8 racks × 8 moduler × 52 celler = 3 328 celler per container tills vidare.
3. Kontraktets definition av tillgänglighet och garantins SoH-kurva.
4. Vem ska ta emot notifieringar, och via vilken kanal (SMS-leverantör)?
5. Ska `bess-drift` och `bess-dashboard` dela Supabase-projekt (inloggning) eller ha separata?
