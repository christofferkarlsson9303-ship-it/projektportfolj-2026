/* Kalkylkatalog för ONE Bered: urval ur EBR KLG 1:26 P2 (schakt, kabel, fiber, jordning,
   etablering, beredning) och BESS-schablonkoder för det KLG saknar.

   KLG-raderna ligger i data/klgUrvalP2.json: [katalog, kod, grupp, benämning, enhet, bered_h,
   mont_h, maskin_h, arbete_kr, material_kr, maskin_kr, övrigt_kr, summa_kr]. Hela KLG checkas
   inte in (EBR-licens).

   BESS-koderna (B101–B180) är schablon: timmarna är erfarenhetsvärden som ska kalibreras mot
   utfall i 36037/36038. UE-posterna (B160) har övrigt = 0 tills offert finns — gränssnittet
   visar dem som "UE-pris saknas", aldrig som en gissad kostnad. */

import KLG_RADER from "../../data/klgUrvalP2.json";

/** Timkostnad enligt KLG 1:26 (självkostnad inkl. omkostnadspålägg). */
export const KLG_TIMPRIS = { bered: 1077, mont: 982, maskin: 1190 };

const BESS_KODER = [
  ["B101", "Battericontainer", [
    ["01", "Mottagning, lossning och lyft battericontainer (exkl. kran)", "st", 0.2, 4],
    ["02", "Uppställning, inriktning och förankring battericontainer", "st", 0.1, 3],
    ["03", "Mekanisk komplettering enl. leverantör (kylning, ventilation, tätning)", "st", 0, 4],
    ["10", "DC-kabel, förläggning i kanalisation/rör", "m", 0, 0.03],
    ["11", "DC-terminering 1500 V, per kabelände (press, krymp, moment)", "st", 0, 0.6],
    ["12", "Märkning kabel enl. kabellista", "st", 0, 0.15],
  ]],
  ["B110", "MV-skid / PCS", [
    ["01", "Mottagning och lyft MV-skid (exkl. kran)", "st", 0.3, 6],
    ["02", "Uppställning, inriktning och förankring MV-skid", "st", 0.2, 5],
    ["03", "Oljeuppsamling: montage nivåvakt och kontroll", "st", 0, 3],
    ["04", "Intern kontroll LV/AC PCS–transformator enl. leverantör", "st", 0, 4],
    ["05", "Jordanslutning MV-skid (4 punkter)", "st", 0, 2],
    ["06", "Kabelströmtransformator för jordfelsskydd, montage", "st", 0, 1.5],
  ]],
  ["B120", "Ställverk, kontroll & hjälpkraft", [
    ["01", "Ställverksfack 24 kV: uppställning, skena, kontroll", "fack", 0.5, 10],
    ["02", "EMS/PPC-skåp: montage och anslutning", "st", 1, 12],
    ["03", "Hjälpkraftcentral: montage och anslutning", "st", 1, 16],
    ["04", "UPS: montage och anslutning", "st", 0, 6],
    ["05", "Hjälpkrafttransformator: uppställning och anslutning", "st", 0.5, 8],
  ]],
  ["B130", "Installation LSP", [
    ["01", "LSP-kabel, förläggning i rör/kanal", "m", 0, 0.04],
    ["02", "LSP-kabelanslutning ≤4x150, per ände", "st", 0, 1],
    ["03", "Belysnings-/CCTV-stolpe inkl. armatur (exkl. fundament)", "st", 0, 3],
  ]],
  ["B140", "Kommunikation, brand & nödstopp", [
    ["01", "Signal-/brandlarmkabel, förläggning", "m", 0, 0.03],
    ["02", "Anslutning brandlarm/FSS per battericontainer", "st", 0, 2],
    ["03", "Nödstopp-slinga, anslutning per objekt", "st", 0, 1],
    ["04", "Datakabel S/FTP: dra och terminera per länk", "st", 0, 1.2],
  ]],
  ["B150", "Jordning & åskskydd", [
    ["02", "Pressförband jordlina (C-press)", "st", 0, 0.4],
    ["03", "Potentialutjämning staket/grind, per anslutning", "st", 0, 0.5],
    ["04", "Åskskydd: uppfångare/nedledare per objekt (SS-EN 62305)", "st", 0, 3],
  ]],
  ["B160", "Mark & bygg (UE-pris)", [
    ["01", "Fundament battericontainer (UE)", "st", 0, 0, 0],
    ["02", "Fundament MV-skid inkl. oljeuppsamling (UE)", "st", 0, 0, 0],
    ["03", "Fundament ställverk/kontrollbyggnad (UE)", "st", 0, 0, 0],
    ["04", "Hårdgjord yta, bärlager/makadam (UE)", "m²", 0, 0, 0],
    ["05", "Kranuppställningsyta, förstärkt (UE)", "m²", 0, 0, 0],
    ["06", "Stängsel inkl. stolpar (UE)", "m", 0, 0, 0],
    ["07", "Grind (UE)", "st", 0, 0, 0],
    ["08", "Mobilkran inkl. förare (UE)", "tim", 0, 0, 0],
    ["09", "Etablering bodar/UC/belysning (hyra per vecka)", "v", 0, 0, 0],
  ]],
  ["B170", "Provning & idrifttagning", [
    ["01", "VLF/Tan δ-provning MV-kabel per system (3 faser)", "st", 0.5, 4],
    ["02", "Isolationsmätning DC-kabel, per kabel", "st", 0, 0.2],
    ["03", "Cold commissioning, stöd per battericontainer", "st", 0.5, 2],
    ["04", "Hot commissioning/provdrift", "MW", 1, 2],
    ["05", "Egenkontroll enl. kontroll- och provningsprogram, per objekt", "st", 0.5, 0.5],
  ]],
  ["B180", "Projektgemensamt BESS", [
    ["01", "Elsäkerhetsledare/BAS-U på plats", "v", 8, 0],
    ["02", "Slutdokumentation och relationshandlingar", "MW", 3, 0],
  ]],
];

const nollTillNull = (x) => (x ? x : null);

/** Hela katalogen som lista av koder. `ue` = UE-post vars pris sätts av offert. */
export const KATALOG = [
  ...KLG_RADER.map((r) => ({
    kat: r[0], kod: r[1], grupp: r[2], ben: r[3], enh: r[4],
    b: r[5], m: r[6], x: r[7], arb: r[8], mat: r[9], mk: r[10], ov: r[11], sum: r[12], ue: false,
  })),
  ...BESS_KODER.flatMap(([ak, grupp, rader]) =>
    rader.map(([lop, ben, enh, b, m, ov]) => ({
      kat: "BESS", kod: `${ak}.${lop}`, grupp, ben, enh,
      b: nollTillNull(b), m: nollTillNull(m), x: null, arb: null, mat: null, mk: null,
      ov: ov === undefined ? null : ov, sum: null, ue: ov !== undefined,
    }))
  ),
];

const INDEX = new Map(KATALOG.map((k) => [k.kod, k]));

/** Kod ur katalogen, eller undefined. */
export const hittaKod = (kod) => INDEX.get(kod);
