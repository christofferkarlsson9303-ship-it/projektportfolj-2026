# ONE Bered BESS – materiel, kalkylkoder och konstruktioner

Underlag för BESS-anpassningen av ONE Bered (beredning/kalkyl/fakturering). Datum 2026-10-18.
Källor: NKT Kraftkabelhandboken, Prysmian Kabelkatalogen 2024, Nexans Kabelboken 2026, EBR KLG 1:26, Kompletteringsbehov Konstruktionshandbok EL – BESS (2026-09-07).

## Viktigast först
- **E-nr** för kabel och jordlina är hämtade ur Prysmian/Nexans-katalogerna. Art.nr utan E-prefix (t.ex. MV-T240, ROXTEC) är interna platshållare – ersätt med E-nr vid beställning.
- **Priser** är *inte* grossistnetto. "KLG …" = härlett ur KLG 1:26 materielkostnad per enhet (t.ex. AXLJ-TTCL 1x240 = KLG 153.20 PEX 3x1x240 ÷ 3). "Saknas" = 0 kr tills pris läggs in.
- **BESS-schablontimmar (B-koder)** är erfarenhetsvärden (antagande) och ska kalibreras mot utfall i 36037/36038. UE-poster (B160) har 0 kr tills offert matas in.
- **MV-dimensionering:** I = P/(√3·U) jämförs med Prysmians belastningsförmåga (mark 15 °C, 1,0 K·m/W, 0,65 m, treklöver) × korrektionsfaktorer enligt NKT Kraftkabelhandboken tabell 25–28 (marktemperatur, värmeresistivitet, djup, anhopning) och ×0,8 i rör (EBR KJ41). Generatorn räknar radialerna som delar schakt vid ställverket som kabelgrupper och lägger parallella system om ingen enkel kabel räcker. Ersätter inte slutlig beräkning enligt SS 424 14 16 / IEC 60287.
- **DC-kabel 0,6/1 kV:** tål 0,9 kV DC mot jord och 1,8 kV DC ledare–ledare (Kabelboken 2026). 1500 V DC är OK vid mittpunktsjordat system; vid ojordat (IT) eller enpolsjordat system ligger 1,5 kV mot jord → välj högre DC-märkning eller kräv skriftligt godkännande från leverantören.
- **Hjälpkraft:** spänningsfall kontrolleras mot NKT tabell 42 (Al, 380 V-bas), gräns 3 %.
- **Kabelnummerserier** enligt Konstruktionshandbok EL 2.4.3; DC-serie 201–500 är förslag (saknas i handboken).

## A. Materielregister BESS

| E-nr/Art | Benämning | Enh | Pris kr | Priskälla | Leverans |
|---|---|---|---:|---|---|
| E00 079 85 | AXQ 1 kV 1x240 Al (DC-kabel PCS–container) | m | 49 | KLG 155.18 ÷4 | Huvudleverantör |
| E00 079 95 | AXQ 1 kV 1x300 Al (DC-kabel PCS–container) | m | 61 | KLG 155.18 ÷4 ×1,25 | Huvudleverantör |
| DC-KS240 | Kabelsko Al 240 mm² M12 inkl. krympslang (DC) | st | 0 | Saknas | Huvudleverantör |
| E00 715 65 | AXLJ-TTCL TSLF 1x150/25 24 kV | m | 107 | KLG 153.19 ÷3 | Huvudleverantör |
| E00 715 85 | AXLJ-TTCL TSLF 1x240/35 24 kV | m | 151 | KLG 153.20 ÷3 | Huvudleverantör |
| E00 715 95 | AXLJ-TTCL TSLF 1x400/35 24 kV | m | 220 | KLG 153.03 ÷3 | Huvudleverantör |
| E00 720 55 | AXLJ-TTCL TSLF 1x630/50 24 kV | m | 258 | KLG 153.05 ÷3 | Huvudleverantör |
| E00 806 85 | AXALJ-TT 3x150/35 ALCL 24 kV | m | 248 | KLG 153.15 | Huvudleverantör |
| E00 806 95 | AXALJ-TT 3x240/50 ALCL 24 kV | m | 303 | KLG 153.16 | Huvudleverantör |
| MV-T240 | Skärmad T-kontakt 24 kV 630 A, sats 3 faser ≤240 | sats | 1 962 | KLG 140.54 | Huvudleverantör |
| MV-T400 | Skärmad T-kontakt 24 kV 630 A, sats 3 faser 300–400 | sats | 3 928 | KLG 140.55 | Huvudleverantör |
| MV-T630 | Skärmad T-kontakt 24 kV, sats 3 faser 500–630 | sats | 3 947 | KLG 140.56 | Huvudleverantör |
| MV-S240 | Skarv 1-ledare 24 kV 150–240, per fas | st | 1 635 | KLG 140.34 | Huvudleverantör |
| MV-S400 | Skarv 1-ledare 24 kV 300–400, per fas | st | 2 456 | KLG 140.35 | Huvudleverantör |
| MV-S630 | Skarv 1-ledare 24 kV 500–630, per fas | st | 2 541 | KLG 140.36 | Huvudleverantör |
| KCT-JF | Kabelströmtransformator jordfelsskydd (kontrollera innerdiameter) | st | 0 | Saknas | Huvudleverantör |
| E00 046 55 | AXQJ PURE 4x150/41 (hjälpkraft) | m | 345 | KLG 155.22 | Huvudleverantör |
| E00 046 15 | AXQJ PURE 4x50/15 (hjälpkraft) | m | 115 | KLG 155.20 | Huvudleverantör |
| ACEFLEX-5G25 | Aceflex Pure 5G25 (hjälpkraft container) | m | 0 | Saknas | Huvudleverantör |
| OS2-48 | Optokabel singlemode OS2 48 fiber, mark | m | 17,27 | KLG 156.53 | Huvudleverantör |
| OPTOSLANG | Optoslang ≤0,3 kg/m | m | 5,21 | KLG 173.04 | Huvudleverantör |
| ODF-24 | Termineringsbox/ODF 24 fiber | st | 0 | Saknas | Huvudleverantör |
| ELAQBY-2x2x06 | ELAQBY 2x2x0,6 brandlarm (enl. FSS-leverantör) | m | 0 | Saknas | Huvudleverantör |
| SFTP-CAT7 | Datakabel S/FTP Cat 7 | m | 0 | Saknas | Huvudleverantör |
| E06 228 55 | Cu-lina glödgad 50 mm² (jordlina) | m | 65,94 | KLG 133.22 | Huvudleverantör |
| E06 224 55 | Kopparlina glödgad 95 mm² (jordlina) | m | 141,54 | KLG 133.23 | Huvudleverantör |
| JORDSPETT | Jordtagsstång | m | 113 | KLG 133.31 | Huvudleverantör |
| CPRESS-50 | C-pressförband Cu 50/50 | st | 0 | Saknas | Huvudleverantör |
| SRS110 | Kabelskyddsrör SRS 110 | m | 60,3 | KLG 140.24 | Huvudleverantör |
| SRS160 | Kabelskyddsrör SRS 160 | m | 164,44 | KLG 140.25 | Huvudleverantör |
| ROXTEC | Kabelgenomföring modulstätning (per genomföring) | st | 0 | Saknas | Huvudleverantör |
| VARNNAT | Markeringsnät/varningsband | m | 0 | Saknas | Huvudleverantör |
| BL-BATT | Battericontainer enl. hårdvaruprofil | st | – | BL | Beställarlevererat (BL) |
| BL-MVS | MV-skid/MVS inkl. PCS, transformator och RMU | st | – | BL | Beställarlevererat (BL) |
| BL-EMS | EMS/PPC-skåp | st | – | BL | Beställarlevererat (BL) |
| SV24-FACK | Ställverksfack 24 kV | st | 0 | Offert | Ställverksleverantör (UE) |
| HKC | Hjälpkraftcentral 400/230 V | st | 0 | Saknas | Huvudleverantör |
| UPS | UPS för kontroll och kommunikation | st | 0 | Saknas | Huvudleverantör |
| HJ-TRAFO | Hjälpkrafttransformator | st | 0 | Saknas | Huvudleverantör |

## B. BESS-schablonkoder (timmar per enhet)

| Kod | Grupp | Benämning | Enh | Bered h | Mont h | Not |
|---|---|---|---|---:|---:|---|
| B101.01 | Battericontainer | Mottagning, lossning och lyft battericontainer (exkl. kran) | st | 0.2 | 4 |  |
| B101.02 | Battericontainer | Uppställning, inriktning och förankring battericontainer | st | 0.1 | 3 |  |
| B101.03 | Battericontainer | Mekanisk komplettering enl. leverantör (kylning, ventilation, tätning) | st |  | 4 |  |
| B101.10 | Battericontainer | DC-kabel, förläggning i kanalisation/rör | m |  | 0.03 |  |
| B101.11 | Battericontainer | DC-terminering 1500 V, per kabelände (press, krymp, moment) | st |  | 0.6 |  |
| B101.12 | Battericontainer | Märkning kabel enl. kabellista | st |  | 0.15 |  |
| B110.01 | MV-skid / PCS | Mottagning och lyft MV-skid (exkl. kran) | st | 0.3 | 6 |  |
| B110.02 | MV-skid / PCS | Uppställning, inriktning och förankring MV-skid | st | 0.2 | 5 |  |
| B110.03 | MV-skid / PCS | Oljeuppsamling: montage nivåvakt och kontroll | st |  | 3 |  |
| B110.04 | MV-skid / PCS | Intern kontroll LV/AC PCS–transformator enl. leverantör | st |  | 4 |  |
| B110.05 | MV-skid / PCS | Jordanslutning MV-skid (4 punkter) | st |  | 2 |  |
| B110.06 | MV-skid / PCS | Kabelströmtransformator för jordfelsskydd, montage | st |  | 1.5 |  |
| B120.01 | Ställverk, kontroll & hjälpkraft | Ställverksfack 24 kV: uppställning, skena, kontroll | fack | 0.5 | 10 |  |
| B120.02 | Ställverk, kontroll & hjälpkraft | EMS/PPC-skåp: montage och anslutning | st | 1 | 12 |  |
| B120.03 | Ställverk, kontroll & hjälpkraft | Hjälpkraftcentral: montage och anslutning | st | 1 | 16 |  |
| B120.04 | Ställverk, kontroll & hjälpkraft | UPS: montage och anslutning | st |  | 6 |  |
| B120.05 | Ställverk, kontroll & hjälpkraft | Hjälpkrafttransformator: uppställning och anslutning | st | 0.5 | 8 |  |
| B130.01 | Installation LSP | LSP-kabel, förläggning i rör/kanal | m |  | 0.04 |  |
| B130.02 | Installation LSP | LSP-kabelanslutning ≤4x150, per ände | st |  | 1 |  |
| B130.03 | Installation LSP | Belysnings-/CCTV-stolpe inkl. armatur (exkl. fundament) | st |  | 3 |  |
| B140.01 | Kommunikation, brand & nödstopp | Signal-/brandlarmkabel, förläggning | m |  | 0.03 |  |
| B140.02 | Kommunikation, brand & nödstopp | Anslutning brandlarm/FSS per battericontainer | st |  | 2 |  |
| B140.03 | Kommunikation, brand & nödstopp | Nödstopp-slinga, anslutning per objekt | st |  | 1 |  |
| B140.04 | Kommunikation, brand & nödstopp | Datakabel S/FTP: dra och terminera per länk | st |  | 1.2 |  |
| B150.02 | Jordning & åskskydd | Pressförband jordlina (C-press) | st |  | 0.4 |  |
| B150.03 | Jordning & åskskydd | Potentialutjämning staket/grind, per anslutning | st |  | 0.5 |  |
| B150.04 | Jordning & åskskydd | Åskskydd: uppfångare/nedledare per objekt (SS-EN 62305) | st |  | 3 |  |
| B160.01 | Mark & bygg (UE-pris) | Fundament battericontainer (UE) | st |  |  | UE-pris läggs in |
| B160.02 | Mark & bygg (UE-pris) | Fundament MV-skid inkl. oljeuppsamling (UE) | st |  |  | UE-pris läggs in |
| B160.03 | Mark & bygg (UE-pris) | Fundament ställverk/kontrollbyggnad (UE) | st |  |  | UE-pris läggs in |
| B160.04 | Mark & bygg (UE-pris) | Hårdgjord yta, bärlager/makadam (UE) | m² |  |  | UE-pris läggs in |
| B160.05 | Mark & bygg (UE-pris) | Kranuppställningsyta, förstärkt (UE) | m² |  |  | UE-pris läggs in |
| B160.06 | Mark & bygg (UE-pris) | Stängsel inkl. stolpar (UE) | m |  |  | UE-pris läggs in |
| B160.07 | Mark & bygg (UE-pris) | Grind (UE) | st |  |  | UE-pris läggs in |
| B160.08 | Mark & bygg (UE-pris) | Mobilkran inkl. förare (UE) | tim |  |  | UE-pris läggs in |
| B160.09 | Mark & bygg (UE-pris) | Etablering bodar/UC/belysning (hyra per vecka) | v |  |  | UE-pris läggs in |
| B170.01 | Provning & idrifttagning | VLF/Tan δ-provning MV-kabel per system (3 faser) | st | 0.5 | 4 |  |
| B170.02 | Provning & idrifttagning | Isolationsmätning DC-kabel, per kabel | st |  | 0.2 |  |
| B170.03 | Provning & idrifttagning | Cold commissioning, stöd per battericontainer | st | 0.5 | 2 |  |
| B170.04 | Provning & idrifttagning | Hot commissioning/provdrift | MW | 1 | 2 |  |
| B170.05 | Provning & idrifttagning | Egenkontroll enl. kontroll- och provningsprogram, per objekt | st | 0.5 | 0.5 |  |
| B180.01 | Projektgemensamt BESS | Elsäkerhetsledare/BAS-U på plats | v | 8 |  |  |
| B180.02 | Projektgemensamt BESS | Slutdokumentation och relationshandlingar | MW | 3 |  |  |

## C. MV-kabel 24 kV – dimensioneringsunderlag

| Kabel | E-nr | Bel.förmåga A (Prysmian, mark, treklöver) | Ytterdiameter mm |
|---|---|---:|---:|
| AXLJ-TTCL 1x150/25 | E00 715 65 | 300 | 32 |
| AXLJ-TTCL 1x240/35 | E00 715 85 | 385 | 39 |
| AXLJ-TTCL 1x400/35 | E00 715 95 | 510 | 44 |
| AXLJ-TTCL 1x630/50 | E00 720 55 | 635 | 52 |
| AXALJ-TT 3x150/35 | E00 806 85 | saknas i underlaget | 68 |
| AXALJ-TT 3x240/50 | E00 806 95 | saknas i underlaget | 76 |

## D. Konstruktionsbibliotek – genererade KLG/BESS-koder (standardval)

| Konstruktion | Post | Koder |
|---|---|---|
| Battericontainer | +B | B101.01, B101.02, B101.03, B101.10, B101.11, B101.12, B140.01, B140.02, B140.03, B170.02, B170.03, B170.05, B160.01, 133.22 |
| MV-skid / PCS | +MV | B110.01, B110.02, B110.03, B110.04, B110.05, B110.06, B160.02, B170.05, 133.22 |
| MV-kabelsystem (radial) | +W | 140.92, 140.80, 140.83, 140.18, B170.01, 140.54, 140.16, 137.13 |
| Ställverk 24 kV / kontrollbyggnad | +SV | B120.01, B160.03, B170.05, 133.23, 133.41 |
| Anslutningskabel till nätägare (POC) | +W | 140.92, 140.80, 140.83, 140.18, B170.01, 140.56, 140.16, 137.13 |
| Hjälpkraft, UPS och EMS/PPC | +HK | B120.02, B120.03, B120.04, B130.01, B130.02, B120.05 |
| Fiberring OS2 och data | +F | 173.04, 173.74, 174.26, 174.28, 175.30, 175.31, B140.04 |
| Jordnät, åskskydd och staketjordning | +J | 133.22, 133.31, B150.02, B150.03, 133.41 |
| Yta, stängsel och kranplats | +M | B160.04, B160.05, B160.06, B160.07, B130.03, 137.33, B160.08 |
| Etablering, provning och dokumentation |  | 510.01, 510.15, 510.13, 411.20, 411.22, 411.23, B160.09, B180.01, B170.04, B180.02 |

## E. Korrektionsfaktorer MV 12–24 kV (NKT Kraftkabelhandboken)

| Parameter | Värden |
|---|---|
| Marktemperatur (tab 26) | 10 °C 1,03 · 15 °C 1,00 · 17 °C 0,984 (interpolerat, södra Sverige) · 20 °C 0,96 · 25 °C 0,93 |
| Värmeresistivitet (tab 25) | 0,7 → 1,10 · 1,0 → 1,00 · 1,2 → 0,92 · 1,5 → 0,85 · 2,0 → 0,75 · 2,5 → 0,69 |
| Djup (tab 27) | 0,25–0,70 m 1,00 · 0,71–0,90 m 0,97 · 0,91–1,10 m 0,95 · 1,11–1,30 m 0,93 |
| Anhopning, 250 mm (tab 28) | 2 grp 0,89 · 3 grp 0,79 · 4 grp 0,75 · 5 grp 0,72 · 6 grp 0,69 · 8 grp 0,66 · 10 grp 0,64 |
| I rör | ×0,8 för MV (EBR KJ41 6.2) |
