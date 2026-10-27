# 02 · Teknisk arkitektur — bess-drift

Status: utkast 2026-10-27. **[B]** = beslut, **[A]** = antagande, **[R]** = rekommendation som väntar på beslut.

## 1. Översikt

```
 OT-nät (site)                         Moln                                   Klient
┌───────────────────────┐   MQTT/TLS  ┌─────────────────────────────────┐  WSS  ┌───────────────┐
│ PLC / BMS / PCS / EMS │──┐  utgående │  Gateway (Node + TypeScript)     │◀────▶│ bess-drift UI │
│  Modbus TCP · OPC UA  │  │   endast  │  ├─ DataProvider (adapter)       │ REST  │ Vite + React  │
└───────────────────────┘  ▼           │  ├─ Normalisering + kvalitet     │◀────▶│               │
                  ┌──────────────┐     │  ├─ Larmmotor (ISA-18.2)         │       └───────────────┘
                  │ Edge-gateway │────▶│  ├─ Kommandotjänst + spärrar     │
                  │ (på site)    │     │  └─ WebSocket-fan-out            │
                  └──────────────┘     └───────┬───────────────┬─────────┘
                                               │               │
                                   ┌───────────▼───┐   ┌───────▼────────────────┐
                                   │ Tidsserie-DB  │   │ Supabase (Postgres)    │
                                   │ telemetri     │   │ auth, RBAC, larm,      │
                                   └───────────────┘   │ kommandon, händelselogg│
                                                       └────────────────────────┘
 Fas 1 (MVP): Edge och OT-nät ersätts av MockTelemetryProvider i gatewayn.
```

## 2. Stack

| Del | Val | Motiv |
| --- | --- | --- |
| UI | **Vite + React 19 + TypeScript + Tailwind** **[R]** | Samma byggverktyg och kunskap som `bess-dashboard`. Ingen SSR behövs för en inloggad realtidsvy |
| Grafer | **Recharts** för trender, **Canvas** för cellmatris | Recharts finns redan i repot. 3 328 celler som SVG-noder blir trögt; canvas ritar om på < 5 ms |
| Realtid | **WebSocket** (`ws`) med prenumeration per ämne | Push, inte polling. Klienten prenumererar bara på det som syns |
| Gateway | **Node 22 + TypeScript + Fastify + ws** **[R]** | Samma språk som UI → delade typer. Fastify har schemavalidering inbyggd |
| Validering | **Zod** för typer som delas mellan gateway och UI | En källa för typer och körtidskontroll |
| Telemetri | **TimescaleDB** (hypertables + continuous aggregates) **[R]** | Postgres-SQL, komprimering, automatiska minut/timme/dygn-aggregat |
| Relationsdata | **Supabase** (auth, RLS, larm, kommandon, logg) **[R]** | Används redan i `bess-dashboard`. Magisk länk och allowlist finns |
| Edge | Node-tjänst eller industriell gateway (t.ex. Node-RED/Ignition Edge) **[A]** | Väljs när EMS-leverantören är känd |

### Två saker som måste lösas innan drift

1. **Vercel kan inte köra gatewayn.** Vercel-funktioner håller inte långlivade WebSocket-anslutningar. UI kan ligga på Vercel som i dag, men gatewayn behöver en server med beständig process (t.ex. Fly.io, Railway eller egen VM). **[R]** Fly.io i region `arn` (Stockholm).
2. **TimescaleDB i Supabase är osäkert.** Supabase har fasat ut tillägget `timescaledb` för nyare Postgres-versioner. Det måste verifieras för vårt projekt. Alternativ: (a) Timescale Cloud separat, (b) vanlig Postgres med deklarativ partitionering per dygn plus egna aggregattabeller. Fas 1 behöver inget av dem — se §6.

## 3. Adapterlagret

Gatewayn känner bara till ett gränssnitt. Byte av datakälla = ny klass, ingen ändring i UI eller larmmotor.

```ts
// gateway/src/providers/DataProvider.ts
import type { TelemetryFrame, CommandRequest, CommandResult, ProviderHealth } from "@bess-drift/shared";

export interface DataProvider {
  readonly id: string;                     // "mock", "modbus-vxj", "mqtt-avl"
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Anropas för varje normaliserad ram, oavsett källa. */
  onFrame(cb: (frame: TelemetryFrame) => void): () => void;
  /** Skickar ett kommando. Ska resolva först när källan svarat eller timeout. */
  sendCommand(req: CommandRequest): Promise<CommandResult>;
  health(): ProviderHealth;                // senaste ram, felräknare, anslutningsstatus
}
```

| Adapter | Fas | Anteckning |
| --- | --- | --- |
| `MockTelemetryProvider` | 1 | Deterministisk simulator med seed. Scenarier: normal, FCR-N-svängning, varm modul, PCS-fel, dataavbrott |
| `MqttProvider` | 3+ | Edge publicerar normaliserade ramar. Rekommenderad väg för produktion |
| `ModbusTcpProvider` | vid behov | Endast via edge, aldrig direkt från molnet. Registerkarta i JSON per leverantör |
| `RestPollProvider` | vid behov | Om EMS-leverantören bara erbjuder ett moln-API |

**Mappning från källa till signal** ligger som data (`signalmap.<leverantör>.json`), inte som kod. En rad: källadress → `signal_id`, skala, offset, enhet, larmgränser.

## 4. Realtidsflödet

1. Providern levererar en `TelemetryFrame` (ett eller flera värden med `ts` och `q`).
2. Gatewayn validerar med Zod, sätter `q = stale` på signaler som saknat uppdatering i 3 intervall och uppdaterar **senaste-värde-cachen** i minnet.
3. Larmmotorn utvärderar gränser med hysteres och fördröjning (t.ex. ΔT > 5 °C i 30 s) och skapar eller återställer larm.
4. Fan-out: varje WebSocket-klient får bara ämnen den prenumererar på, i batch var 1 s.
5. Skrivning till tidsserie-DB i batch var 5 s (fas 2+).

**Ämnen (topics):**

| Ämne | Takt | Innehåll |
| --- | --- | --- |
| `park/{parkId}/summary` | 1 s | P, Q, SoC, frekvens, läge, larmräknare |
| `park/{parkId}/containers` | 2 s | Sammanfattning per container |
| `container/{id}/detail` | 2 s | Racks, PCS, HVAC, min/max/Δ |
| `container/{id}/cells/{rack}` | 5 s, bara vid öppen vy | Fullt cellraster för ett rack |
| `alarms/{parkId}` | händelsestyrt | Nya larm och tillståndsbyten |
| `commands/{parkId}` | händelsestyrt | Kommandots tillstånd |

**Dimensionering [A]:** 10 containrar × 3 328 celler × (V, T) = 66 560 värden. Allt i 1 s blir onödigt mycket. Därför: cellnivå bara för öppet rack (416 celler), resten som min/max/medel per modul. Det ger under 5 000 värden/s för hela parken.

**WebSocket-meddelanden (förenklat):**

```ts
// klient → gateway
{ "t": "sub",   "topics": ["park/vxj/summary", "alarms/vxj"] }
{ "t": "unsub", "topics": ["container/vxj-c06/cells/3"] }

// gateway → klient
{ "t": "data", "topic": "park/vxj/summary", "ts": "2026-10-27T11:04:31.200Z",
  "v": { "p_mw": -8.4, "soc_pct": 64.1, "soc_cov": [9, 10], "f_hz": 49.98, "mode": "fcr_n", "src": "remote" },
  "q": "good" }
```

Återanslutning med exponentiell backoff (1 s → 30 s). Efter återanslutning skickar gatewayn en full ögonblicksbild per ämne innan deltan.

## 5. Kommandon och säkerhet

```
UI: knapp → bekräftelsedialog → POST /api/commands  (JWT)
Gateway:
  1. Roll mot park (RLS-läsning i Supabase)          → 403 annars
  2. Spärrar: lokalt läge? kritiskt larm? stale data? börvärde inom gränser?  → 409 + orsak
  3. Skriv command (tillstånd "skickad") med servertid och användare
  4. provider.sendCommand() med timeout 10 s
  5. Uppdatera till kvitterad | avvisad | timeout, logga svar
  6. Publicera på commands/{parkId}
UI: visar tillståndet, aldrig ett optimistiskt resultat.
```

- **Idempotens:** varje kommando har ett klientgenererat `request_id`. Samma id två gånger ger samma svar, aldrig två kommandon.
- **OT-säkerhet:** molnet öppnar aldrig en anslutning in mot site. Edge prenumererar på kommandon via MQTT, och edge har en egen lokal vitlista över tillåtna skrivregister.
- **Lokalt läge vinner:** om site-HMI är i lokalt läge avvisas alla fjärrkommandon, både i gatewayn och i edge.

## 6. Fas 1 utan databas för telemetri

För MVP räcker:

- en ringbuffer i gatewayns minne per signal (senaste 24 h i 10 s-upplösning ≈ 8 640 punkter per signal) för trendgrafer,
- Supabase för larm och händelselogg (låg volym, behöver vara beständig).

Tidsserie-DB tas in i sprint 6 när historik och degradation byggs. Då är TimescaleDB-frågan i §2 avgjord.

## 7. Repostruktur

```
bess-drift/
├── CLAUDE.md
├── README.md
├── docs/
├── shared/        # Zod-scheman och TS-typer (signaler, ramar, larm, kommandon)
├── gateway/       # Fastify + ws, providers/, alarms/, commands/
│   └── src/providers/mock/   # simulator + scenarier
├── web/           # Vite + React UI
│   └── src/{views,components,ws,state}
└── supabase/migrations/
```

npm workspaces i `bess-drift/` (inte i repots rot, så att `bess-dashboard` inte påverkas).

## 8. Kvalitet och CI

- Eget workflow `.github/workflows/bess-drift.yml` med `paths: bess-drift/**`.
- Vitest för larmmotor, aggregering (SoC med täckning) och kommandospärrar. Det är logiken som inte får vara fel.
- Playwright mot UI med simulatorns scenarier (`?scenario=pcs-fel`).
- Simulatorn är deterministisk med seed, så att e2e-testerna inte blinkar.
