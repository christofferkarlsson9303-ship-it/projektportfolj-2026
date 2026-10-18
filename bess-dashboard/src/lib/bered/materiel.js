/* Materiel för BESS-beredningen.

   E-nr ur Prysmian Kabelkatalogen 2024 och Nexans Kabelboken 2026. `kalla` anger prisets ursprung:
   "KLG …" = härlett ur KLG 1:26 materielkostnad per enhet (inte grossistnetto), "Saknas"/"Offert"
   = 0 kr tills pris finns, "BL" = beställarlevererat (ingår inte i beställning). Art.nr utan
   E-prefix är interna platshållare som ersätts med E-nr vid beställning. */

const M = (art, ben, enh, pris, kalla, o = {}) => ({
  art, ben, enh, pris, kalla, lev: o.lev || "Huvudleverantör", bl: !!o.bl,
});

export const MATERIEL = [
  M("E00 079 85", "AXQ 1 kV 1x240 Al (DC-kabel PCS–container)", "m", 49, "KLG 155.18 ÷4"),
  M("E00 079 95", "AXQ 1 kV 1x300 Al (DC-kabel PCS–container)", "m", 61, "KLG 155.18 ÷4 ×1,25"),
  M("DC-KS240", "Kabelsko Al 240 mm² M12 inkl. krympslang (DC)", "st", 0, "Saknas"),
  M("E00 715 65", "AXLJ-TTCL TSLF 1x150/25 24 kV", "m", 107, "KLG 153.19 ÷3"),
  M("E00 715 85", "AXLJ-TTCL TSLF 1x240/35 24 kV", "m", 151, "KLG 153.20 ÷3"),
  M("E00 715 95", "AXLJ-TTCL TSLF 1x400/35 24 kV", "m", 220, "KLG 153.03 ÷3"),
  M("E00 720 55", "AXLJ-TTCL TSLF 1x630/50 24 kV", "m", 258, "KLG 153.05 ÷3"),
  M("E00 806 85", "AXALJ-TT 3x150/35 ALCL 24 kV", "m", 248, "KLG 153.15"),
  M("E00 806 95", "AXALJ-TT 3x240/50 ALCL 24 kV", "m", 303, "KLG 153.16"),
  M("MV-T240", "Skärmad T-kontakt 24 kV 630 A, sats 3 faser ≤240", "sats", 1962, "KLG 140.54"),
  M("MV-T400", "Skärmad T-kontakt 24 kV 630 A, sats 3 faser 300–400", "sats", 3928, "KLG 140.55"),
  M("MV-T630", "Skärmad T-kontakt 24 kV, sats 3 faser 500–630", "sats", 3947, "KLG 140.56"),
  M("MV-S240", "Skarv 1-ledare 24 kV 150–240, per fas", "st", 1635, "KLG 140.34"),
  M("MV-S400", "Skarv 1-ledare 24 kV 300–400, per fas", "st", 2456, "KLG 140.35"),
  M("MV-S630", "Skarv 1-ledare 24 kV 500–630, per fas", "st", 2541, "KLG 140.36"),
  M("KCT-JF", "Kabelströmtransformator jordfelsskydd (kontrollera innerdiameter)", "st", 0, "Saknas"),
  M("E00 046 55", "AXQJ PURE 4x150/41 (hjälpkraft)", "m", 345, "KLG 155.22"),
  M("E00 046 15", "AXQJ PURE 4x50/15 (hjälpkraft)", "m", 115, "KLG 155.20"),
  M("ACEFLEX-5G25", "Aceflex Pure 5G25 (hjälpkraft container)", "m", 0, "Saknas"),
  M("OS2-48", "Optokabel singlemode OS2 48 fiber, mark", "m", 17.27, "KLG 156.53"),
  M("OPTOSLANG", "Optoslang ≤0,3 kg/m", "m", 5.21, "KLG 173.04"),
  M("ODF-24", "Termineringsbox/ODF 24 fiber", "st", 0, "Saknas"),
  M("ELAQBY-2x2x06", "ELAQBY 2x2x0,6 brandlarm (enl. FSS-leverantör)", "m", 0, "Saknas"),
  M("SFTP-CAT7", "Datakabel S/FTP Cat 7", "m", 0, "Saknas"),
  M("E06 228 55", "Cu-lina glödgad 50 mm² (jordlina)", "m", 65.94, "KLG 133.22"),
  M("E06 224 55", "Kopparlina glödgad 95 mm² (jordlina)", "m", 141.54, "KLG 133.23"),
  M("JORDSPETT", "Jordtagsstång", "m", 113, "KLG 133.31"),
  M("CPRESS-50", "C-pressförband Cu 50/50", "st", 0, "Saknas"),
  M("SRS110", "Kabelskyddsrör SRS 110", "m", 60.3, "KLG 140.24"),
  M("ROXTEC", "Kabelgenomföring modulstätning (per genomföring)", "st", 0, "Saknas"),
  M("VARNNAT", "Markeringsnät/varningsband", "m", 0, "Saknas"),
  M("BL-BATT", "Battericontainer enl. hårdvaruprofil", "st", 0, "BL", { bl: 1, lev: "Beställarlevererat (BL)" }),
  M("BL-MVS", "MV-skid/MVS inkl. PCS, transformator och RMU", "st", 0, "BL", { bl: 1, lev: "Beställarlevererat (BL)" }),
  M("BL-EMS", "EMS/PPC-skåp", "st", 0, "BL", { bl: 1, lev: "Beställarlevererat (BL)" }),
  M("SV24-FACK", "Ställverksfack 24 kV", "st", 0, "Offert", { lev: "Ställverksleverantör (UE)" }),
  M("HKC", "Hjälpkraftcentral 400/230 V", "st", 0, "Saknas"),
  M("UPS", "UPS för kontroll och kommunikation", "st", 0, "Saknas"),
  M("HJ-TRAFO", "Hjälpkrafttransformator", "st", 0, "Saknas"),
];

const INDEX = new Map(MATERIEL.map((m) => [m.art, m]));

/** Artikel ur registret, eller undefined. */
export const hittaArtikel = (art) => INDEX.get(art);
