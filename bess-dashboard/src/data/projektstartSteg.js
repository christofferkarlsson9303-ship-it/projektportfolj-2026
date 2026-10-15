/* Stegen i Projektstart. Varje steg är data: fält, en valfri tabell och vilka
   kontrollpunkter ur projektstartKatalog.js som hör till steget.

   fas: 1–8, vilken av de åtta projektfaserna sidan hör till (se projektfaser.ts).
   del: valfri undergrupp inom en fas. Fas 1 delas i Anbud och beslut, och Intressenter och kontrakt.
        Sista sidan, Granska och skapa, hör inte till någon fas (null).
   falt: { id, etikett, typ: text | textarea | select | date, alternativ?, placeholder?, bred?,
           obligatoriskt?, kravVarde?, visaNar? }
        visaNar: { id, varde }. Fältet visas, och räknas som obligatoriskt, bara när fältet `id` har `varde`.
        obligatoriskt: fältet måste vara ifyllt för att fasen ska kunna godkännas.
        kravVarde: det enda värdet som räknas som godkänt (till exempel "Gå vidare").
   tabell: { id, titel, kolumner: [{ id, etikett, typ, alternativ?, bredd? }], obligatorisk? }
        alternativ är strängar eller [värde, etikett]-par.
        obligatorisk: lista med kolumn-id. Minst en rad där alla dessa är ifyllda krävs.
   katalog / grupper: kontrollpunkter ur projektstartKatalog.js. `grupper` begränsar en
        katalog till vissa grupper, så att en katalog kan delas mellan två sidor.
        Kritiska punkter är obligatoriska för fasen.
   Fält-id:n är platta nycklar i utkastets `v`, tabellerna ligger i `rader`. */

import { ROLLER } from "./projektstartKatalog.js";
import { EJ_VUNNET_ORSAKER, FASER } from "./projektfaser.ts";
import { RISKKATEGORI_KORT, RISKKATEGORIER } from "./riskTyper.ts";

const FORM = ["ABT 06", "ABT-U 07", "AB 04", "ABT 06 med särskilda villkor", "Annan"];
const NIVA = ["Ej klassad", "Nivå 1", "Nivå 2", "Nivå 3", "Nivå 4"];
const BESLUT = ["Gå vidare", "Skjut upp", "Tacka nej"];
const TAL = ["1", "2", "3", "4", "5"];

export const STEG = [
  {
    id: "projekt",
    fas: 1,
    del: "Anbud och beslut",
    titel: "Projektkort",
    sammanfattning: "Identitet, klassning och nuläge. Det här blir projektet i portföljen.",
    grund: ["Tid som läggs tidigt är billig tid.", "Det som inte är skriftligt finns inte.", "Dagbok och underrättelser är det ekonomiska skyddet."],
    falt: [
      { id: "bolag", etikett: "Bolag", typ: "text" },
      { id: "namn", etikett: "Projektnamn", typ: "text", placeholder: "Batteripark …", obligatoriskt: true },
      { id: "nr", etikett: "Projektnummer", typ: "text" },
      { id: "bestallare", etikett: "Beställare", typ: "text", obligatoriskt: true },
      { id: "plats", etikett: "Plats / anläggning", typ: "text" },
      { id: "kontraktsform", etikett: "Kontraktsform", typ: "select", alternativ: FORM, obligatoriskt: true },
      { id: "niva", etikett: "Projektnivå", typ: "select", alternativ: NIVA, obligatoriskt: true },
      { id: "startdatum", etikett: "Start", typ: "date" },
      { id: "fardigdatum", etikett: "Slut", typ: "date" },
      { id: "rapporteringsskede", etikett: "Aktuellt projektskede i ledningsrapporten", typ: "select", standard: "", alternativ: [["", "Ej angivet"], "Inför anbudsinlämning", "Anbud inlämnat - inväntar tilldelning", "Kontraktsförhandling", "Uppstart", "Genomförande", "Provning och driftsättning", "Överlämning och avslut", "Garanti", "Pausat", "Ej vunnet / avbrutet"], tips: "Välj verkligt affärs- och produktionsläge. Detta visas tydligt i PDF:en och ändrar inte ONE-P-fasen." },
      { id: "nastaStegLedning", etikett: "Nästa steg och ansvarig", typ: "textarea", bred: true, tips: "Beskriv nästa aktivitet och vem som ansvarar." },
      { id: "beslutSenast", etikett: "Ledningsbeslut behövs senast", typ: "date" },
      { id: "nulage", etikett: "Nuläge till ledningen", typ: "textarea", bred: true, tips: "Skriv om inför varje rapport. Det här står först i PDF:en." },
      { id: "beslutLedning", etikett: "Beslut som behövs från ledningen", typ: "textarea", bred: true, tips: "Vad, och senast när. Lämna tomt om inget behövs." },
    ],
  },
  {
    id: "avrop",
    fas: 1,
    del: "Anbud och beslut",
    titel: "Avropsacceptans",
    sammanfattning: "Ska vi ta uppdraget? Lönsamhet, risk och resurser innan start.",
    falt: [
      { id: "beslut", etikett: "Beslut", typ: "select", alternativ: BESLUT, obligatoriskt: true, kravVarde: "Gå vidare", tips: "Fasen godkänns bara vid Gå vidare." },
      { id: "motivering", etikett: "Motivering", typ: "textarea", bred: true },
      { id: "oppnaFragor", etikett: "Öppna frågor till intern beställare", typ: "textarea", bred: true },
      /* Tacka nej gör anbudet till ett förlorat anbud: bara fas 1 gäller, och orsaken sparas i arkivet. */
      { id: "orsakEjVunnet", etikett: "Orsak till ej vunnet anbud", typ: "select", alternativ: EJ_VUNNET_ORSAKER, obligatoriskt: true, visaNar: { id: "beslut", varde: "Tacka nej" }, tips: "Anbudet flyttas till arkivet och döljs i planering, resurser och kassaflöde." },
      { id: "orsakEjVunnetText", etikett: "Kommentar till orsaken", typ: "textarea", bred: true, visaNar: { id: "beslut", varde: "Tacka nej" } },
    ],
    katalog: ["calloff"],
  },
  {
    id: "direktiv",
    fas: 1,
    del: "Anbud och beslut",
    titel: "Projektdirektiv",
    sammanfattning: "Bakgrund, mål, avgränsning och vad som får ge vika om det blir trångt.",
    falt: [
      { id: "bakgrund", etikett: "Bakgrund", typ: "textarea", bred: true },
      { id: "syfte", etikett: "Syfte", typ: "textarea", bred: true },
      { id: "mal", etikett: "Mål", typ: "textarea", bred: true, obligatoriskt: true },
      { id: "ingar", etikett: "Ingår", typ: "textarea" },
      { id: "ingarEj", etikett: "Ingår inte", typ: "textarea" },
      { id: "offra", etikett: "Vad får ge vika först?", typ: "select", alternativ: ["Kostnad", "Kvalitet", "Tid"], obligatoriskt: true },
      /* Direktivet signeras av intern beställare och projektledare (metoden 6.1). Signeringen är en
         grind: fas 2 låses inte upp förrän båda har signerat. */
      { id: "signPL", etikett: "Signerat av projektledare", typ: "text", placeholder: "Namn", obligatoriskt: true },
      { id: "signBestallare", etikett: "Signerat av intern beställare", typ: "text", placeholder: "Namn", obligatoriskt: true },
      { id: "signDatum", etikett: "Signeringsdatum", typ: "date", obligatoriskt: true, tips: "Projektdirektivet signeras av båda innan fasen godkänns." },
    ],
  },
  {
    id: "intressenter",
    fas: 1,
    del: "Intressenter och kontrakt",
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
    id: "kontrakt",
    fas: 1,
    del: "Intressenter och kontrakt",
    titel: "Kontrakt och kassaflöde",
    sammanfattning: "Viten, milstolpar, bankgaranti, ÄTA och fakturering.",
    falt: [
      { id: "viten", etikett: "Viten och deltidsmilstolpar", typ: "textarea" },
      { id: "havning", etikett: "Hävningsgrunder", typ: "textarea" },
      { id: "index", etikett: "Indexregel", typ: "text" },
      { id: "betalvillkor", etikett: "Betalvillkor", typ: "text", obligatoriskt: true },
      { id: "bankgaranti", etikett: "Bankgaranti", typ: "text", obligatoriskt: true },
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
      obligatorisk: ["namn", "datum"],
    },
    katalog: ["contract"],
  },
  {
    id: "organisation",
    fas: 2,
    titel: "Organisation och uppstart",
    sammanfattning: "Namngivna roller, behörighet och startmöte enligt ONE-P.",
    falt: [
      ...ROLLER.map((r) => ({ id: `roll_${r.id}`, etikett: r.namn, typ: "text", tips: r.tips, obligatoriskt: r.id === "pl" })),
      { id: "ataBefogenhet", etikett: "Vem underrättar om ÄTA och hinder, och vem tar emot?", typ: "textarea", bred: true },
      { id: "motesdeltagare", etikett: "Vem deltar i byggmöten?", typ: "text" },
      { id: "motesKallare", etikett: "Vem kallar till byggmöten?", typ: "text" },
      { id: "rapporteringKund", etikett: "Rapportering till kund", typ: "textarea", standard: "Skriftlig månadsrapport: progress och status till kund." },
      { id: "rapporteringIntern", etikett: "Intern rapportering", typ: "textarea", standard: "Månadsavstämning internt. Styrgrupp kallas vid avvikelse." },
    ],
    katalog: ["org", "kickoff"],
  },
  {
    id: "risker",
    fas: 2,
    titel: "Riskregister",
    sammanfattning: "Identifiera, värdera, äg och följ upp. Raderna läggs in på sidan Risker.",
    tabell: {
      id: "risker",
      titel: "Risker",
      /* Mallens startrader räknas inte: minst en risk måste ha en ägare. */
      obligatorisk: ["titel", "agare"],
      kolumner: [
        { id: "titel", etikett: "Risk", typ: "text", bredd: "wide" },
        { id: "sannolikhet", etikett: "Sannolikhet 1–5", typ: "select", alternativ: TAL, standard: "3" },
        { id: "konsekvens", etikett: "Konsekvens 1–5", typ: "select", alternativ: TAL, standard: "3" },
        /* Värdet (S × K) ritas av guiden direkt efter Konsekvens. Fas och kategori ligger efter det
           så att värdet syns utan att tabellen behöver rullas i sidled. */
        { id: "fas", etikett: "Fas", typ: "select", alternativ: FASER.map((f) => [String(f.nr), `${f.nr}. ${f.kort}`]), standard: "2", bredd: "mid" },
        { id: "kategori", etikett: "Kategori", typ: "select", alternativ: [["", "Välj …"], ...RISKKATEGORIER.map(([id]) => [id, RISKKATEGORI_KORT[id]])], bredd: "mid" },
        { id: "agare", etikett: "Ägare", typ: "text" },
        { id: "atgard", etikett: "Åtgärdsplan", typ: "text", bredd: "wide" },
      ],
      start: [
        { titel: "Fundament och härdning försenar kritisk linje", fas: "4", kategori: "tid" },
        { titel: "Leveranstid för batteri och ställverk", fas: "5", kategori: "leverans" },
        { titel: "Geotekniskt avvikande förhållanden (ÄTA)", fas: "4", kategori: "mark" },
      ],
    },
  },
  {
    id: "tidplan",
    fas: 2,
    titel: "Tidplan och kritisk linje",
    sammanfattning: "Fundament och härdning styr batteriparken. Synka med betalning.",
    falt: [
      { id: "kritiskLinje", etikett: "Kritisk linje", typ: "textarea", bred: true, obligatoriskt: true },
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
    fas: 2,
    titel: "Godkänd lösning",
    sammanfattning: "Inga inköp innan tekniken, kassaflödet och riskerna är låsta.",
    falt: [
      { id: "sld", etikett: "SLD", typ: "text" },
      { id: "kabel", etikett: "Kabel och rör", typ: "text" },
      { id: "leverantorer", etikett: "Leverantörer", typ: "text" },
      { id: "granssnitt", etikett: "Gränssnitt", typ: "textarea", bred: true },
    ],
    tabell: {
      id: "interface",
      titel: "Interface-lista",
      anmarkning: "Projektledaren äger listan och stämmer av den varje vecka. Ett oklart gränssnitt är en risk och en ÄTA-möjlighet.",
      kolumner: [
        { id: "granssnitt", etikett: "Gränssnitt", typ: "select", bredd: "mid", alternativ: ["Mark/betong ↔ el", "Leverantör ↔ site", "El/MV ↔ nätägare", "Kommunikation", "Brand ↔ drift"] },
        { id: "innehall", etikett: "Innehåll och krav", typ: "text", bredd: "wide" },
        { id: "agare", etikett: "Ägare", typ: "text" },
        { id: "status", etikett: "Veckostatus", typ: "select", alternativ: ["Ej bedömd", "Klart", "Pågår", "Oklart"], standard: "Ej bedömd" },
        { id: "avstamd", etikett: "Senast avstämd", typ: "date" },
      ],
      start: [
        { granssnitt: "Mark/betong ↔ el", innehall: "Fundamentkrav, planhet, jordning, brandzoner, hålbild" },
        { granssnitt: "Leverantör ↔ site", innehall: "Leveransfönster, lyftplan, montageordning, emballage och retur" },
        { granssnitt: "El/MV ↔ nätägare", innehall: "Ställverk, reläskydd, provning, spänningssättning" },
        { granssnitt: "Kommunikation", innehall: "Fiber/SCADA, driftsignal, larmkedjor, EMS" },
        { granssnitt: "Brand ↔ drift", innehall: "Zoner, släcksystem, rutiner, myndighetskrav" },
      ],
    },
    katalog: ["solution"],
  },
  {
    id: "tillstand",
    fas: 2,
    titel: "Tillstånd och nätägare",
    sammanfattning: "Bygglov, arbetsmiljö, nätanslutning och provningsplan.",
    falt: [
      { id: "natagare", etikett: "Nätägare", typ: "text", obligatoriskt: true },
      { id: "tillstandAnm", etikett: "Anteckning", typ: "textarea", bred: true },
    ],
    katalog: ["permits"],
  },
  {
    id: "hseq",
    fas: 3,
    titel: "HSEQ och etablering",
    sammanfattning: "APD, arbetsplatstavla och stopp som annars försenar allt.",
    falt: [{ id: "hseqAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["hseq"],
  },
  {
    id: "cbop",
    fas: 4,
    titel: "Mark och betong (cBoP)",
    sammanfattning: "Markarbeten, fundament, kabelkanalisation och jordning.",
    falt: [{ id: "cbopAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["cbop"],
  },
  {
    id: "ebop",
    fas: 5,
    titel: "Leveranser, lyft och montage (eBoP)",
    sammanfattning: "Leveranser, lyft, montage och elektrisk installation.",
    falt: [{ id: "ebopAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["ebop"],
  },
  {
    id: "provning",
    fas: 6,
    titel: "Provning och driftsättning",
    sammanfattning: "Anläggningsprov, elsäkerhet och driftsättning innan slutbesiktning.",
    falt: [{ id: "provningAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["commission"],
  },
  {
    id: "avslut",
    fas: 7,
    titel: "Slutbesiktning och överlämning",
    sammanfattning: "Slutbesiktning, punchlista och slutdokumentation.",
    falt: [{ id: "avslutAnm", etikett: "Anteckning", typ: "textarea", bred: true }],
    katalog: ["closeout"],
    grupper: { closeout: ["Slutbesiktning", "Punchlista", "Slutdokumentation"] },
  },
  {
    id: "ekonomi",
    fas: 8,
    titel: "Ekonomiskt avslut och lärdomar",
    sammanfattning: "Slutreglering, internt avslut, erfarenhetsåterföring, kick-out och slutrapport.",
    falt: [
      { id: "avslutAta", etikett: "ÄTA vid avslut", typ: "textarea", obligatoriskt: true },
      { id: "lardomar", etikett: "De tre viktigaste erfarenheterna och varför", typ: "textarea", bred: true, tips: "Går in i slutrapporten och i projektmetoden." },
      /* Kick-out och slutrapport (metoden 6.9). */
      { id: "kickoutDatum", etikett: "Kick-out genomförd", typ: "date" },
      { id: "kickoutBra", etikett: "Vad gick bra?", typ: "textarea" },
      { id: "kickoutKostade", etikett: "Vad kostade pengar?", typ: "textarea" },
      { id: "kickoutAldrigIgen", etikett: "Vad ska aldrig göras igen?", typ: "textarea" },
      { id: "kickoutOverraskade", etikett: "Vad överraskade?", typ: "textarea" },
      { id: "slutrapportResultat", etikett: "Slutrapport: resultat mot mål och projekttriangel", typ: "textarea", bred: true, tips: "Avvikelseanalys, beslut som påverkade resultatet, bakgrund, konsekvens och förbättringsförslag." },
    ],
    katalog: ["closeout"],
    grupper: { closeout: ["Ekonomi", "Internt avslut", "Erfarenhet"] },
  },
  {
    id: "garanti",
    fas: 8,
    titel: "Eftermarknad och garanti",
    sammanfattning: "Garantivillkor, kontaktperson för garantiärenden och rutin under garantitiden.",
    falt: [{ id: "garanti", etikett: "Garanti", typ: "textarea", bred: true, obligatoriskt: true }],
    katalog: ["closeout"],
    grupper: { closeout: ["Garanti"] },
  },
  {
    id: "sammanfattning",
    fas: null,
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
  kickoff: "Uppstartsavstämning",
};

