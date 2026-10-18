# ONE Bered – beredning, kalkyl och fakturering för BESS

Förenklad, molnbaserad ersättare för Guru (Elpool), anpassad för batteriparker.

| Mapp | Innehåll |
|---|---|
| `app/index.html` | Byggd prototyp, en fil. Öppna i webbläsare. Data sparas i webbläsarens localStorage. |
| `src/app_bess_src.html` | Källa (utan inbäddad katalog). Bygg med `python3 tools/build.py`. |
| `src/klg_urval_p2.json` | Urval KLG 1:26 P2 (schakt, kabel, fiber, jordning, etablering). |
| `docs/` | Systemarkitektur och BESS-register (materiel med E-nr, B-koder, korrektionsfaktorer). |
| `db/schema.sql` | PostgreSQL-schema för målarkitekturen (RLS per org). |
| `tools/parse_klg.py` | Läser ut KLG 1:26 ur PDF → CSV/JSON (`pdftotext -layout KLG1.pdf klg.txt && python3 tools/parse_klg.py klg.txt klg.json klg.csv`). |

## Funktioner
- BESS-generator: MW/MWh → containrar (+B), MV-skids (+MV), radialer, ställverk, hjälpkraft, fiber, jordnät, mark.
- MV-dimensionering: Prysmian AXLJ-TTCL × korrektionsfaktorer NKT tabell 25–28 (+ rör 0,8, EBR KJ41). Parallella system vid behov.
- DC-kontroll (Kabelboken 2026) och spänningsfall hjälpkraft (NKT tabell 42).
- Kabellista med nummerserier enligt Konstruktionshandbok EL 2.4.3 (DC 201–500 förslag).
- Kalkyl: KLG P2 + BESS-schablon, faktorer, risk/vinst. Inköp, tid, ÄTA, fakturaplan M1–M7, uppföljning.

## Viktigt
- Hela KLG-katalogen checkas inte in (EBR-licens). Generera lokalt och importera CSV i appen (Register → Kalkylkatalog).
- BESS-timmar är schablon – kalibrera mot utfall 36037/36038. UE-poster (B160) är 0 kr tills offert läggs in.
- Materielpriser är härledda ur KLG, inte grossistnetto.
