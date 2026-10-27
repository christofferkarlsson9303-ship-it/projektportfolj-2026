# 04 · Sprintplan — bess-drift

Status: utkast 2026-10-27. Sprintlängd 2 veckor **[A]**. Scrum-light: en planering och en demo per sprint, Kanban-tavla däremellan.

## Milstolpar

| Milstolpe | Sprint | Innehåll | Kan visas för |
| --- | --- | --- | --- |
| **M0 Grund** | S0 | Monorepo, typer, CI, simulator som skriver ramar | Utveckling |
| **M1 MVP-övervakning** | S1–S4 | Realtidsöversikt, containervy, cellmatris, larmlista med kvittering | Drift internt |
| **M2 Styrning** | S5 | Driftläge och börvärden med bekräftelse, spärrar, logg | Drift internt |
| **M3 Historik** | S6–S7 | Tidsserie-DB, trender, degradation, export, månadsrapport | Beställare (viewer) |
| **M4 Riktig data** | S8+ | Edge + MQTT-adapter mot första parken | Produktion |

## S0 · Grund (vecka 1–2)

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S0-1 | npm workspaces: `shared`, `gateway`, `web` | `npm install` i `bess-drift/` bygger alla tre |
| S0-2 | Zod-scheman från [03-datamodell.md](03-datamodell.md) §3 | Typerna importeras i både gateway och web |
| S0-3 | `MockTelemetryProvider` med seed och topologi ur konfig | 10 containrar × 3 328 celler genereras, samma seed ger samma serie |
| S0-4 | Simulatorns fysik: SoC integreras från P, temperatur följer \|P\| med tidskonstant, celler får normalfördelad spridning | SoC går inte under 0 eller över 100. ΔT ökar vid hög C-rate |
| S0-5 | CI-workflow `bess-drift.yml` (lint, typecheck, test) | Grön på PR, triggas bara av `bess-drift/**` |

## S1 · Realtidskedjan (vecka 3–4)

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S1-1 | Gateway: Fastify + ws, senaste-värde-cache, ämnen enligt [02-arkitektur.md](02-arkitektur.md) §4 | Klient får `park/{id}/summary` varje sekund |
| S1-2 | Kvalitetsmarkering: `stale` efter 3 missade intervall | Simulatorns scenario `dataavbrott` ger `stale` inom 6 s |
| S1-3 | Web: WebSocket-klient med prenumerationer, backoff och full ögonblicksbild vid återanslutning | Gatewayn startas om → UI återhämtar sig utan omladdning |
| S1-4 | Designtokens för kontrollrum (mörkt läge, statusfärger med ikon + text) | Kontrast ≥ 4,5:1, status går att läsa i gråskala |
| S1-5 | `parkSoc()` med täckning + enhetstester | Test: 1 av 10 containrar `stale` → SoC visas med "9/10" |

## S2 · Parköversikt (vecka 5–6)

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S2-1 | KPI-rad: P, SoC, energi kvar, tillgänglighet, larmräknare | Enligt wireframe 6.1 i kravspecen |
| S2-2 | Trend 60 min för P och SoC (Recharts, ringbuffer i gateway) | Ritar 3 600 punkter utan märkbar fördröjning |
| S2-3 | Containerrutnät med status, SoC, ΔT, ålder | `stale` visas grått med ålder, aldrig grönt |
| S2-4 | Statusrad: fjärr/lokal, driftläge, frekvens, klocka | Uppdateras utan att resten av sidan ritas om |
| S2-5 | Playwright: översikten mot scenario `normal` och `pcs-fel` | Två tester, gröna i CI |

## S3 · Containervy och cellmatris (vecka 7–8)

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S3-1 | Containervy: racks, PCS, HVAC/brand, min/max/Δ | Nås från översikten, djuplänk fungerar |
| S3-2 | Cellmatris i canvas, V eller T, färg mot modulmedel (σ) | 416 celler ritas om på < 16 ms. Saknade celler visas med ╳ |
| S3-3 | Hover/klick: cell-ID, värde, avvikelse, trend 24 h | Prenumerationen på cellraster avslutas när vyn stängs |
| S3-4 | Rollkontroll: cellnivå kräver `operator` | `viewer` får 403 från gatewayn, inte bara en dold knapp |

## S4 · Larm (vecka 9–10) → M1

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S4-1 | Supabase-migration: `park`, `container`, `park_roll`, `larm_definition`, `larm`, `handelse` | Applicerad i dev, RLS-prov passerar |
| S4-2 | Larmmotor i gateway: gränser med hysteres och fördröjning, ISA-18.2-tillstånd | Enhetstester för alla övergångar, inklusive `atergatt_okvitterad` |
| S4-3 | Larmlista: filter på prio/tillstånd/container, sortering, ljud för Kritisk | Nytt kritiskt larm syns inom 2 s |
| S4-4 | Kvittering via `kvittera_larm()` med kommentar | Användare och servertid loggas i `handelse` |
| S4-5 | Översvämningsskydd (>10 larm/min per container) | Scenario `larmstorm` ger ett sammanfattningslarm |
| S4-6 | Notifiering för Kritisk (e-post först, SMS när leverantör är vald) | Testlarm når mottagaren |

**Demo M1:** simulatorn kör scenariot *varm modul → kritiskt larm → kvittering → återgång*, från översikt via cellmatris till larmlogg.

## S5 · Styrning (vecka 11–12) → M2

| ID | Uppgift | Klart när |
| --- | --- | --- |
| S5-1 | Tabell `kommando`, `POST /api/commands` med idempotens | Samma `request_id` två gånger ger ett kommando |
| S5-2 | Spärrar: lokalt läge, kritiskt larm, stale data, gränser | Varje spärr har ett test och ett tydligt felmeddelande i UI |
| S5-3 | Bekräftelsedialog enligt wireframe 6.3 | Kritiska kommandon kräver att parknamnet skrivs |
| S5-4 | Tillståndsvisning `skickad → kvitterad/avvisad/timeout` | Simulatorn kan svara avvisat och timeout; UI visar båda |
| S5-5 | Simulatorn följer kommandon (läge ändrar P-profil) | Byte till `fcr_n` ger frekvensföljande P |

## S6–S7 · Historik → M3

- Tidsserie-DB (beslut om TimescaleDB eller partitionering först).
- Trender 1 h–12 mån med automatisk upplösning.
- Degradation: SoH mot EFC per container, garantilinje.
- Export CSV/XLSX, månadsrapport PDF.
- Viewer-åtkomst för beställare.

## S8+ · Riktig data → M4

- Edge-gateway på site, MQTT/TLS utåt, signalkarta för vald leverantör.
- Parallellkörning mot leverantörens HMI i 2 veckor: avvikelser loggas, inga kommandon skickas.
- Driftsättning av styrning först efter skriftligt godkännande av anläggningsägaren.

## Definition of Done (alla sprintar)

- Lint, typecheck och tester gröna i CI.
- Ny logik för aggregering, larm eller kommandon har enhetstester.
- UI-ändring har minst ett Playwright-test mot ett simulatorscenario.
- Inget värde med `q ≠ good` visas grönt.
- Docs i `bess-drift/docs/` uppdaterade om beteende eller schema ändrats.

## Risker

| Risk | Konsekvens | Åtgärd |
| --- | --- | --- |
| EMS-leverantörens gränssnitt är okänt | Adapter och signalkarta kan behöva göras om | Adapterlager och signalkarta som data; ta in leverantörens dokumentation före S8 |
| TimescaleDB saknas i Supabase | Historik försenas | Fas 1 utan tidsserie-DB; beslut senast S5 |
| Fjärrstyrning utan godkänd säkerhetsanalys | Avtals- och säkerhetsrisk | Kommandon bara mot simulatorn tills IEC 62443-genomgång och ägarens godkännande |
| Gatewayn är en enskild felpunkt | Ingen övervakning vid avbrott | Hälsokontroll + extern övervakning; leverantörens HMI är alltid primär i drift |
| Scope-glidning mot `bess-dashboard` | Två appar som gör samma sak | Endast läs-API mellan apparna, inga delade vyer |
