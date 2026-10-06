/* Stegen i Projektstart. Varje steg är data: fält, en valfri tabell och vilka
   kontrollpunkter ur projektstartKatalog.js som hör till steget.

   falt: { id, etikett, typ: text | textarea | select | date, alternativ?, placeholder?, bred? }
   tabell: { id, titel, kolumner: [{ id, etikett, typ, alternativ?, bredd? }] }
   Fält-id:n är platta nycklar i utkastets `v`, tabellerna ligger i `rader`. */

import { ROLLER } from "./projektstartKatalog.js";
import { PROJEKTSTATUS } from "./konstanter.js";

const FORM = ["ABT 06", "ABT-U 07", "AB 04", "ABT 06 med särskilda villkor", "Annan"];
const NIVA = ["Ej klassad", "Nivå 1", "Nivå 2", "Nivå 3", "Nivå 4"];
const BESLUT = ["Gå vidare", "Skjut upp", "Tacka nej"];
const TAL = ["1", "2", "3", "4", "5"];

export const STEG = [
  {
    id: "projekt",
    fas: "Initiering",
    titel: "Projektkort",
    sammanfattning: "Identitet, klassning och nuläge. Det här blir projektet i portföljen.",
    grund: ["Tid som läggs tidigt är billig tid.", "Det som inte är skriftligt finns inte.", "Dagbok och underrättelser är det ekonomiska skyddet."],
    falt: [
      { id: "bolag", etikett: "Bolag", typ: "text" },
      { id: "namn", etikett: "Projektnamn", typ: "text", placeholder: "Batteripark …", obligatoriskt: true },
      { id: "nr", etikett: "Projektnummer", typ: "text" },
      { id: "bestallare", etikett: "Beställare", typ: "text" },
      { id: "plats", etikett: "Plats / anläggning", typ: "text" },
      { id: "kontraktsform", etikett: "Kontraktsform", typ: "select", alternativ: FORM },
      { id: "niva", etikett: "Projektnivå", typ: "select", alternativ: NIVA },
      { id: "startdatum", etikett: "Start", typ: "date" },
      { id: "fardigdatum", etikett: "Slut", typ: "date" },
      { id: "skede", etikett: "Skede", typ: "select", alternativ: PROJEKTSTATUS, standard: "Planering", tips: "Styr projektets status i portföljen. Anbud betyder att projektet inte är tilldelat än." },
      { id: "nulage", etikett: "Nuläge till ledningen", typ: "textarea", bred: true, tips: "Skriv om inför varje rapport. Det här står först i PDF:en." },
      { id: "beslutLedning", etikett: "Beslut som behövs från ledningen", typ: "textarea", bred: true, tips: "Vad, och senast när. Lämna tomt om inget behövs." },
    ],
  },
  {
    id: "avrop",
    fas: "Initiering",
    titel: "Avropsacceptans",
    sammanfattning: "Ska vi ta uppdraget? Lönsamhet, risk och resurser innan start.",
    falt: [
      { id: "beslut", etikett: "Beslut", typ: "select", alternativ: BESLUT },
      { id: "motivering", etikett: "Motivering", typ: "textarea", bred: true },
      { id: "oppnaFragor", etikett: "Öppna frågor till intern beställare", typ: "textarea", bred: true },
    ],
    katalog: ["calloff"],
  },
  {
    id: "direktiv",
    fas: "Initiering",
    titel: "Projektdirektiv",
    sammanfattning: "Bakgrund, mål, avgränsning och vad som får ge vika om det blir trångt.",
    falt: [
      { id: "bakgrund", etikett: "Bakgrund", typ: "textarea", bred: true },
      { id: "syfte", etikett: "Syfte", typ: "textarea", bred: true },
      { id: "mal", etikett: "Mål", typ: "textarea", bred: true },
      { id: "ingar", etikett: "Ingår", typ: "textarea" },
      { id: "ingarEj", etikett: "Ingår inte", typ: "textarea" },
      { id: "offra", etikett: "Vad får ge vika först?", typ: "select", alternativ: ["Kostnad", "Kvalitet", "Tid"] },
    ],
  },
  {
    id: "intressenter",
    fas: "Planering",
    titel: "Intressenter",
    sammanfattning: "Vem påverkar projektet och hur ni kommunicerar.",
    tabell: {
      id: "intressenter",
      titel: "Intressenter",
      kolumner: [
        { id: "namn", etikett: "Namn", typ: "text" },
        { id: "roll", etikett: "Roll", typ: "text" },
        { id: "organisation", etikett: "Organisation", typ: "text" },
        { id: "intresse", etikett: "Intresse", typ: "text" },
        { id: "kommunikation", etikett: "Hur vi kommunicerar", typ: "text" },
      ],
    },
  },
  {
    id: "organisation",
    fas: "Planering",
    titel: "Organisation och möten",
    sammanfattning: "Namngivna roller, behörighet och startmöte enligt ONE-P.",
    falt: [
      ...ROLLER.map((r) => ({ id: `roll_${r.id}`, etikett: r.namn, typ: "text", tips: r.tips })),
      { id: "ataBefogenhet", etikett: "Vem underrättar om ÄTA och hinder, och vem tar emot?", typ: "textarea", bred: true },
      { id: "motesdeltagare", etikett: "Vem deltar i byggmöten?", typ: "text" },
      { id: "motesKallare", etikett: "Vem kallar till byggmöten?", typ: "text" },
      { id: "rapporteringKund", etikett: "Rapportering till kund", typ: "textarea", standard: "Skriftlig månadsrapport: progress och status till kund." },
      { id: "rapporteringIntern", etikett: "Intern rapportering", typ: "textarea", standard: "Månadsavstämning internt. Styrgrupp kallas vid avvikelse." },
    ],
    katalog: ["org"],
  },
  {
    id: "kontrakt",
    fas: "Planering",
    titel: "Kontrakt och kassaflöde",
    sammanfattning: "Viten, milstolpar, bankgaranti, ÄTA och fakturering.",
    falt: [
      { id: "viten", etikett: "Viten och deltidsmilstolpar", typ: "textarea" },
      { id: "havning", etikett: "Hävningsgrunder", typ: "textarea" },
      { id: "index", etikett: "Indexregel", typ: "text" },
      { id: "betalvillkor", etikett: "Betalvillkor", typ: "text" },
      { id: "bankgaranti", etikett: "Bankgaranti", typ: "text" },
      { id: "kassaflode", etikett: "Kassaflöde: längsta negativa period", typ: "text" },
      { id: "fakturarutin", etikett: "Fakturarutin", typ: "textarea", bred: true },
    ],
    tabell: {
      id: "milstolpar",
      titel: "Milstolpar",
      anmarkning: "Rader med datum läggs in som milstolpar i projektet. Belopp och betalplan läggs in på sidan Milstolpar.",
      kolumner: [
        { id: "namn", etikett: "Milstolpe", typ: "text" },
        { id: "utlosare", etikett: "Utlösare", typ: "text" },
        { id: "datum", etikett: "Datum", typ: "date" },
      ],
      start: [{ namn: "M1 Uppstart" }, { namn: "Färdigställande" }],
    },
    katalog: ["contract"],
  },
  {
    id: "risker",
    fas: "Planering",
    titel: "Riskregister",
    sammanfattning: "Identifiera, värdera, äg och följ upp. Raderna läggs in på sidan Risker.",
    tabell: {
      id: "risker",
      titel: "Risker",
      kolumner: [
        { id: "titel", etikett: "Risk", typ: "text", bredd: "wide" },
        { id: "sannolikhet", etikett: "Sannolikhet 1–5", typ: "select", alternativ: TAL, standard: "3" },
        { id: "konsekvens", etikett: "Konsekvens 1–5", typ: "select", alternativ: TAL, standard: "3" },
        { id: "agare", etikett: "Ägare", typ: "text" },
        { id: "atgard", etikett: "Åtgärd", typ: "text", bredd: "wide" },
      ],
      start: [
        { titel: "Fundament och härdning försenar kritisk linje" },
        { titel: "Leveranstid för batteri och ställverk" },
        { titel: "Geotekniskt avvikande förhållanden (ÄTA)" },
      ],
    },
  },
  {
    id: "tidplan",
    fas: "Planering",
    titel: "Tidplan och kritisk linje",
    sammanfattning: "Fundament och härdning styr batteriparken. Synka med betalning.",
    falt: [
      { id: "kritiskLinje", etikett: "Kritisk linje", typ: "textarea", bred: true },
      { id: "buffert", etikett: "Buffert", typ: "text" },
      { id: "betalsynk", etikett: "Synk mot betalning", typ: "text" },
    ],
    tabell: {
      id: "faser",
      titel: "Faser",
      kolumner: [
        { id: "namn", etikett: "Fas", typ: "text" },
        { id: "start", etikett: "Start", typ: "date" },
        { id: "slut", etikett: "Slut", typ: "date" },
        { id: "kritisk", etikett: "Kritisk", typ: "select", alternativ: ["Nej", "Ja"], standard: "Nej" },
      ],
      start: [{ namn: "Mark och fundament", kritisk: "Ja" }, { namn: "Leverans och lyft" }, { namn: "Elinstallation" }, { namn: "Provning och driftsättning" }],
    },
  },
  {
    id: "losning",
    fas: "Planering",
    titel: "Godkänd lösning",
    sammanfattning: "Inga inköp innan tekniken, kassaflödet och riskerna är låsta.",
    falt: [
      { id: "sld", etikett: "SLD", typ: "text" },
      { id: "kabel", etikett: "Kabel och rör", typ: "text" },
      { id: "leverantorer", etikett: "Leverantörer", typ: "text" },
      { id: "granssnitt", etikett: "Gränssnitt", typ: "textarea", bred: true },
    ],
    katalog: ["solution"],
  },
  {
    id: "tillstand",
    fas: "Planering",
    titel: "Tillstånd och nätägare",
    sammanfattning: "Bygglov, arbetsmiljö, nätanslutning och provningsplan.",
    falt: [
      { id: "natagare", etikett: "Nätägare", typ: "text" },
      { id: "tillstandAnm", etikett: "Anteckning", typ: "textarea", bred: true },
    ],
    katalog: ["permits"],
  },
  {
    id: "hseq",
    fas: "Etablering",
    titel: "HSEQ och etablering",
    sammanfattning: "APD, arbetsplatstavla och stopp som annars försenar allt.",
    falt: [{ id: "hseqAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["hseq"],
  },
  {
    id: "produktion",
    fas: "Genomförande",
    titel: "cBoP, eBoP och montage",
    sammanfattning: "Mark, betong, leveranser, lyft och elektrisk installation.",
    falt: [{ id: "produktionAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["cbop", "ebop"],
  },
  {
    id: "avslut",
    fas: "Avslut",
    titel: "Provning, besiktning och garanti",
    sammanfattning: "Driftsättning, slutbetalning, ÄTA och erfarenhetsåterföring.",
    falt: [
      { id: "avslutAta", etikett: "ÄTA vid avslut", typ: "textarea" },
      { id: "lardomar", etikett: "Lärdomar", typ: "textarea" },
      { id: "garanti", etikett: "Garanti", typ: "textarea" },
    ],
    katalog: ["commission", "closeout"],
  },
  {
    id: "sammanfattning",
    fas: "Klart",
    titel: "Granska och skapa",
    sammanfattning: "Det här läggs in i portföljen när du skapar projektet.",
  },
];

export const KATALOG_RUBRIK = {
  calloff: "Avrop",
  org: "Organisation",
  contract: "Kontrakt",
  solution: "Lösning",
  permits: "Tillstånd",
  hseq: "HSEQ",
  cbop: "cBoP",
  ebop: "eBoP",
  commission: "Driftsättning",
  closeout: "Avslut",
};
