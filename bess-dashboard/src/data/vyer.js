/* Vylistan som gränssnittet faktiskt använder.

   VYER i konstanter.js är extraherad ur standalone-filen och hålls oförändrad —
   den speglar originalet. Vyer som tillkommit i React-versionen läggs till här
   i stället, så att extraktionen kan köras om utan att tappa dem. */

import { NAVIKON, VYER as VYER_ORIGINAL } from "./konstanter.js";

const TILLAGDA = [
  ["start", "Projektstart", "Gå igenom ONE-P-startens åtta faser. Projektet startar i fas 1, och nästa fas låses upp när allt obligatoriskt är godkänt."],
  ["kontrakt", "Kontraktet", "Det viktigaste i projektets avtal: frister, betalningar, viten, säkerheter och priser."],
  ["metod", "Min projektmetod", "Så leder du projektet: vad du gör varje dag, varje vecka och inför nästa steg."],
  [
    "idag",
    "Idag",
    "Allt som kräver din åtgärd — frister som löper, förfallet och det närmaste i tiden.",
  ],
  [
    "atakalkyl",
    "ÄTA-kalkyl",
    "Räkna fram ett ÄTA-belopp rad för rad — arbete, maskin, fordon och material — och spara det på ärendet.",
  ],
  [
    "site",
    "Siten i 3D",
    "Projektets tomt med skid, containrar, E-House, trafo och nålar på öppna punkter. Gå runt i den.",
  ],
];

/* Tillagda vyer som ska ligga på en bestämd plats i listan i stället för
   först: [efter vy-id, vy]. */
const INSKJUTNA = [
  [
    "oversikt",
    [
      "epc",
      "Bygga batteripark",
      "16 faser med grind från anbud till garantitid — steg för steg, och var varje projekt står just nu.",
    ],
  ],
  [
    "tidplan",
    [
      "handlingsplan",
      "Handlingsplan",
      "Från projektets mål via drivkraft och strategi till åtgärder med resurser, status och datum.",
    ],
  ],
];

const IKONER_TILLAGDA = {
  // Bock i ruta: dagens arbetslista.
  idag: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M8.5 14.5l2.5 2.5 4.5-5"/>',
  // Anslagstavla med lista: checklistan.
  epc: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2.5h6v3H9z"/><path d="M8.5 11l1.5 1.5 2.5-2.5M14 11.5h2M8.5 16.5l1.5 1.5 2.5-2.5M14 17h2"/>',
  // Dokument med sigill: kontraktet.
  kontrakt: '<path d="M6 3h9l4 4v8"/><path d="M15 3v4h4"/><path d="M6 3v18h7"/><path d="M9 9h5M9 13h4"/><circle cx="17.5" cy="18" r="2.5"/><path d="M16.5 20.3 16 23l1.5-.8 1.5.8-.5-2.7"/>',
  // Miniräknare: ÄTA-kalkylen.
  atakalkyl: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8v3H8z"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
  // Kub: volymerna på tomten.
  site: '<path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/>',
  // Flagga på stolpe: start.
  start: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  // Måltavla: mål → åtgärder.
  handlingsplan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
};

function medInskjutna(lista) {
  const ut = [...lista];
  for (const [efter, vy] of INSKJUTNA) {
    const i = ut.findIndex((v) => v[0] === efter);
    ut.splice(i < 0 ? ut.length : i + 1, 0, vy);
  }
  return ut;
}

/** Hela vylistan, med de tillagda vyerna först och de inskjutna på sin plats. */
const URSPRUNG = Object.fromEntries(medInskjutna([...TILLAGDA, ...VYER_ORIGINAL]).filter(([id]) => id !== "_sek").map((v) => [v[0], v]));
const GRUPPER = [
  ["Börja här", ["metod", "start", "idag", "oversikt"]],
  ["Planera jobbet", ["kontrakt", "epc", "site", "tidplan", "handlingsplan", "resurser", "kontakter"]],
  ["Gör och följ upp", ["punkter", "tavla", "moten", "vecka", "dagbok", "hseq", "risker", "storning"]],
  ["Följ pengarna", ["ata", "atakalkyl", "budget", "tid", "ekonomi", "milstolpar", "faktura"]],
  ["Lämna över och spara", ["slutdok", "rapport", "rutiner", "data"]],
];
const ENKLA_LEADS = {
  start: "Gå igenom startens steg. När du är klar skapas projektet.",
  kontrakt: "Frister, betalningar och viten ur avtalet, med paragraf att slå upp.",
  idag: "Vad behöver du ta hand om först? Öppna en rad för att komma till rätt ärende.",
  oversikt: "Se läget i dina projekt, nästa arbete och frågor som behöver hjälp.",
  epc: "Följ batteriparken genom 16 faser. En grind är ett klartecken för nästa steg.",
  site: "Placera skid, containrar och E-House på tomten och gå runt bland dem. Nålar visar öppna punkter.",
  tavla: "Se uppgifter och ärenden som kort. Flytta dem när arbetsläget ändras.",
  tidplan: "Se när arbeten och leveranser ska ske. Öppna en rad för detaljer.",
  handlingsplan: "Skriv målet och vad som behöver göras, av vem och när.",
  resurser: "Boka rätt personer och se om någon har för mycket arbete.",
  tid: "Spara vem som arbetat, med vad och hur många timmar.",
  budget: "Jämför vad arbetet får kosta med vad ni har använt hittills.",
  faktura: "Samla tid och kostnader till ett granskat fakturaunderlag.",
  milstolpar: "Kontrollera underlag och status för projektets betalningar.",
  atakalkyl: "Välj ärende, klicka på resurser och se beloppet. Spara det på ärendet, skriv ut avin eller ta CSV.",
  ata: "Följ ändrat arbete och hinder från upptäckt till beslut och faktura.",
  ekonomi: "Se kontraktssumma, betalningsläge och ekonomi för ändrat arbete.",
  moten: "Spara mötets beslut, ansvariga och datum i ett protokoll.",
  vecka: "Gå igenom projektet varje vecka och ta hand om det som avviker.",
  dagbok: "Spara vad som hände, vad ni gjorde och vilket underlag som finns.",
  storning: "Beskriv vad som hindrade arbetet och hur det påverkar tid och kostnad.",
  hseq: "Arbetsmiljö och säkerhet: arbetsplatsplan, skyddsronder, tillbud och uppföljning.",
  risker: "Skriv vad som kan gå fel och vem som ska förebygga det.",
  punkter: "En uppgift, en ansvarig och ett datum. Skapa arbetslistor till fältet.",
  slutdok: "Samla, granska och lämna ritningar, provresultat och manualer till beställaren.",
  rapport: "Granska och skriv ut projektets läge till beställaren.",
  rutiner: "Slå upp rätt arbetssätt när du behöver hjälp med en projektsituation.",
  kontakter: "Hitta ansvariga, leverantörer och rätt kontaktuppgifter.",
  data: "Kontrollera lagringen, granska importer och ta en säkerhetskopia.",
};
export const VYER = GRUPPER.flatMap(([namn, ids]) => [["_sek", namn], ...ids.map((id) => [id, URSPRUNG[id][1], ENKLA_LEADS[id] || URSPRUNG[id][2]])]);
/* Den enkla menyn: det som används varje dag. Sju flikar, utan grupprubriker.
   Allt annat finns under "Visa alla funktioner" och i Ctrl/Cmd+K. ÄTA-kalkylen
   nås från ÄTA-vyn ("Öppna i kalkyl"), projektmetoden från sidhjälpen. */
export const ENKEL_MENY = new Set(["idag", "oversikt", "epc", "tidplan", "punkter", "ata", "hseq"]);

export const NAVIKONER = { ...NAVIKON, ...IKONER_TILLAGDA, metod: '<path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4"/>' };

/** Uppslagstabell id → {namn, lead}. */
export const VYMETA = Object.fromEntries(
  VYER.filter((v) => v[0] !== "_sek").map(([id, namn, lead]) => [id, { namn, lead }])
);

/** Giltiga vy-id, för adressfältet. */
export const GILTIGA_VYER = new Set(Object.keys(VYMETA));
