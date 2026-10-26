/* Visning av punkterna i Bygga batteripark (UX-07, UX-08).

   Ett lager ovanpå bessChecklistData.ts som bara styr hur guiden ritar
   punkterna. Checklistdatan ändras inte: id:na är länknycklar och ligger i
   följd per moment (se bessChecklistData.test.js), och utskrift, fältmaterial
   och sökning läser fortfarande den fullständiga texten.

   TIDSGRUPPER  moment → grupper efter när arbetet görs. Varje punkt i momentet
                står i exakt en grupp. Moment som saknas här ritas med
                checklistans egna sektioner.
   RUBRIKER     punkt-id → kort rubrik (vad som ska göras). Hela texten med
                mått och OEM-krav visas under "Detaljer". Punkter utan rubrik
                är redan korta. Rubriken sammanfattar – texten gäller. */

export const TIDSGRUPPER = {
  10: [
    { namn: "Planering och före leverans", punkter: ["10.1", "10.11"] },
    { namn: "Leverans och mottagning", punkter: ["10.2", "10.3", "10.12"] },
    { namn: "Montage", punkter: ["10.4", "10.5", "10.6", "10.7"] },
    { namn: "Provning och före spänningssättning", punkter: ["10.8", "10.9", "10.10", "10.13", "10.14", "10.15"] },
  ],
  11: [
    { namn: "Planering (veckor före)", punkter: ["11.1", "11.2", "11.3", "11.4"] },
    { namn: "Före leverans", punkter: ["11.5", "11.12"] },
    { namn: "Lyftdag", punkter: ["11.6", "11.7", "11.8", "11.9", "11.11", "11.14", "11.15", "11.10"] },
    { namn: "Efter placering", punkter: ["11.13"] },
  ],
  12: [
    { namn: "Före montage", punkter: ["12.1", "12.6", "12.4"] },
    {
      namn: "Montage och anslutning",
      punkter: ["12.2", "12.3", "12.5", "12.7", "12.8", "12.10", "12.11", "12.12", "12.14", "12.16"],
    },
    { namn: "Före spänning", punkter: ["12.9", "12.15"] },
    { namn: "Vid idrifttagning", punkter: ["12.13"] },
  ],
  13: [
    { namn: "Förutsättningar (före start)", punkter: ["13.1", "13.2", "13.3", "13.17", "13.5", "13.4", "13.21"] },
    { namn: "Före cold commissioning", punkter: ["13.14", "13.15", "13.7"] },
    { namn: "Cold commissioning", punkter: ["13.6", "13.19"] },
    { namn: "Hot commissioning och SAT", punkter: ["13.8", "13.16", "13.18", "13.20", "13.22", "13.9", "13.10"] },
    { namn: "Spänningssättning och M5", punkter: ["13.12", "13.11", "13.13"] },
  ],
};

export const RUBRIKER = {
  "10.4": "Kvittens på stationsleverantörens interna montage",
  "10.7": "Skärmåterföring genom nollföljds-CT före jordplint",
  "10.8": "Verifiering av CT-data och reläinställningar mot selektivplan",
  "10.9": "Signerat SAT-protokoll för reläskydd, tripp och ljusbågsvakt",
  "10.10": "Verifiering av stationens RTU-signaler och signalgränssnitt",
  "10.11": "Boka tid och tillträde för stationens SAT",
  "10.12": "Verktygssats kvitterad och vägghängd",
  "10.13": "Fack H3: forcera aldrig jordkopplaren",
  "10.14": "SAT-resultat för ljusbågsskydd och utlösningskedja",
  "10.15": "Verifiering av intern DC-försörjning och batteribackup",
  "11.4": "Lyftplan med kranens lastdiagram och OEM:s lyftredskap",
  "11.5": "Hjälpkraft 400 V klar vid ankomst (CATL-garanti)",
  "11.8": "Förankring: CATL svetsas, PE-skid endast bultas",
  "11.10": "Avvikelse från leveransfönster → skriftligt varsel samma dag",
  "11.15": "PCS dockas mot MV-skid medan den hänger i kranen",
  "12.1": "Fastställ gränsen för PCS-interna DC-säkringar med PE",
  "12.2": "DC-kabelskor, åtdragningsmoment och balans mellan block",
  "12.3": "Kvittens på PE:s interna AC-förbindning PCS–MV-skid",
  "12.4": "Säker provkonfiguration för aerosolsystemet",
  "12.5": "Kommunikation: CAN-bridge och terminering",
  "12.6": "Samordna FACP-SAT och fastställ brandlarmsgränser",
  "12.11": "CATL: skyddsplåtar i busbar-utrymmet av och på igen",
  "12.12": "Momentprotokoll för ONE:s externa kraftanslutningar",
  "12.16": "LSP-kabelfärger enligt bygghandling",
  "13.3": "Kompetens och skydd för ONE:s och OEM:s idrifttagningspersonal",
  "13.5": "Spänningssättningstillstånd från EAA och nätägare",
  "13.6": "ONE:s förkontroller av externa kablar före cold commissioning",
  "13.8": "Hjälpkraft och säkerhetskretsar inför hot commissioning",
  "13.9": "BoP-SAT av ONE; ta emot BESS-, stations- och EMS-SAT",
  "13.10": "Kvittens på aerosolsystemets slutliga driftkonfiguration",
  "13.12": "Spänningssättning: risken övergår – kräv protokoll",
  "13.14": "Bekräfta provberedskap per anläggningsdel med CATL och PE",
  "13.15": "Säkra mätutrustning för ONE:s förkontroller",
  "13.16": "Fastställ utförare och ordning för MSD med CATL",
  "13.17": "Gränsdragning AC2C mellan CATL, PE, FlexGen, station och ONE",
  "13.18": "Samordna brandprov: CATL:s FSS och ONE:s FACP-SAT",
  "13.20": "Bevaka nät- och EMS-prov – bekräfta ansvar före bokning",
  "13.21": "Kopplingsansvar dygnet runt – bemanna",
  "13.22": "Inga andra arbetsbevis under provning; märkning före spänning",
};

/** Sektionerna som guiden ritar för ett moment: tidsgrupperna om momentet har
 *  sådana, annars checklistans egna sektioner. */
export function visadeSektioner(fas) {
  const grupper = TIDSGRUPPER[fas.nr];
  if (!grupper) return fas.sektioner;
  const perId = new Map(fas.sektioner.flatMap((s) => s.punkter).map((p) => [p.id, p]));
  return grupper.map((g) => ({ namn: g.namn, punkter: g.punkter.map((id) => perId.get(id)).filter(Boolean) }));
}
