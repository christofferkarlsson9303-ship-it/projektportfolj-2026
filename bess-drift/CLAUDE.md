# Claude — läs detta innan du skriver kod i bess-drift

Du är i **bess-drift**: driftövervakning (EMS/SCADA-överbyggnad) för batteriparker efter överlämning. Inte `bess-dashboard`. Läs `docs/01`–`04` innan du bygger.

## Regler

- **Ingen data är inte OK.** Ett värde med `q ≠ "good"` visas grått med ålder, aldrig grönt.
- **Aggregat visar täckning.** Park-SoC och andra summor redovisar hur många delar som ingår (`parkSoc()`).
- **Styrning är server-först.** Roll, spärrar och gränser kontrolleras i gatewayn. Klienten döljer bara knappar. Ingen optimistisk uppdatering av kommandon.
- **Kommandon** har `request_id` (idempotens) och går genom tillståndsmaskinen i `docs/02-arkitektur.md` §5.
- **Kvittering** sker bara via RPC `kvittera_larm()`, så att tid och användare sätts av servern.
- **Datakällor** byts genom `DataProvider`. Rör inte UI eller larmmotor för att lägga till en källa. Signalkartor är data (JSON), inte kod.
- **Molnet ansluter aldrig in mot OT-nätet.** Edge ansluter utåt.
- **Typer** definieras en gång i `shared/` med Zod.
- **Cellmatrisen** ritas i canvas, inte som SVG/DOM-noder.

## Gör inte

- Importera inte kod från `bess-dashboard` eller skriv till `portfolj/state`. Kopplingen är ett läs-API från gatewayn.
- Lägg inte gatewayn på Vercel (ingen beständig WebSocket).
- Skicka inte kommandon mot riktig anläggning förrän säkerhetsgenomgång och ägarens skriftliga godkännande finns.
