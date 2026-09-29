/* PROJEKTDIREKTIV OCH UPPSTARTSAVSTÄMNING — ren data.

   Källa: docs/projektmetod.md avsnitt 6.1 (projektdirektiv), 6.2
   (projekttriangeln) och 6.3 (uppstartsavstämning), ursprungligen ONE P
   (CK Projektmodell). Hör till fas 1 / grind G1 i EPC-checklistan:
   1.22 (direktivet signerat, hållpunkt) och 1.23 (uppstartsavstämningen
   godkänd, hållpunkt) är grindpunkterna. 1.7 är den befintliga punkten om
   direktiv och kontraktsöverlämning.

   Fält-id:n och fråge-id:n ("us.4") är nycklar i sparad data och får aldrig
   döpas om eller numreras om. Nya frågor läggs sist med nästa lediga nummer.

   Markeringar som i EPC-checklistan: HP = hållpunkt, K = kontrakts- eller
   lagkrav, L = lärdom från Batch C. */

/** EPC-punkterna i fas 1 som vyn är underlag för. */
export const PROJEKTSTART_EPC = { direktiv: "1.22", uppstart: "1.23", overlamning: "1.7" };

/** Projektdirektivets textfält, i dokumentets ordning. `krav` = måste vara
 *  ifyllt innan direktivet kan signeras. */
export const DIREKTIV_FALT = [
  { id: "bakgrund", rubrik: "Bakgrund", krav: true,
    hjalp: "Varför projektet finns: avrop, kund, anläggning, kontraktsform." },
  { id: "syfte", rubrik: "Syfte", krav: true,
    hjalp: "Vad projektet ska åstadkomma för kunden och för ONE Nordic." },
  { id: "mal", rubrik: "Mål och förväntningar (SMART)", krav: true,
    hjalp: "Specifika, mätbara, accepterade, realistiska och tidsatta mål — t.ex. 0 allvarliga HSE-händelser, M1–M7 enligt plan." },
  { id: "avgransningar", rubrik: "Avgränsningar", krav: true,
    hjalp: "Vad som inte ingår. Det som ligger utanför är en ÄTA-trigger." },
  { id: "risker", rubrik: "Identifierade risker", krav: true,
    hjalp: "De största riskerna från anbud och kontraktsgenomgång. Detaljerna i riskregistret." },
  { id: "tidplan", rubrik: "Tidplan", krav: true,
    hjalp: "Tidplan enligt kontraktet: start, deltidsmilstolpar med vite, färdigställande." },
  { id: "konflikt", rubrik: "Vid konflikt mellan styrparametrarna", krav: true,
    hjalp: "Vad får offras om tid, kostnad och kvalitet krockar — och vem beslutar." },
  { id: "intressenter", rubrik: "Nulägesanalys och intressenter", krav: false,
    hjalp: "Beställare, nätägare, myndigheter, UE — vilka påverkar och påverkas." },
  { id: "hseq", rubrik: "HSEQ — arbetsmiljö, BAS-U", krav: false,
    hjalp: "Vem är BAS-P och BAS-U, särskilda risker, krav från beställaren." },
  { id: "organisation", rubrik: "Organisation", krav: false,
    hjalp: "Projektledare, platschef, BAS-P/BAS-U, elsäkerhetsledare, kvalitet, miljö. Detaljer i Kontakter." },
  { id: "rapportering", rubrik: "Rapportering och överlämning", krav: false,
    hjalp: "Månadsvis skriftligen till kund. Månadsvis internt på avstämning; PL kallar styrgrupp vid behov." },
];

/** Projekttriangelns styrparametrar. Prioriteringen anges i procent och
 *  ska summera till 100. */
export const TRIANGEL = [
  { id: "prioKostnad", namn: "Kostnad" },
  { id: "prioKvalitet", namn: "Kvalitet" },
  { id: "prioTid", namn: "Tid" },
];

/** Uppstartsavstämningen: PL går igenom projektet med intern beställare
 *  innan teamet kallas till startmöte. */
export const UPPSTART_OMRADEN = [
  {
    namn: "Kontrakt och leverans",
    fragor: [
      { id: "us.1", text: "Kontraktet är läst och förstått — vad ska levereras, hur, när och av vem?", badges: [] },
      { id: "us.2", text: "Vad ingår och vad ingår inte är klarlagt", badges: [] },
      { id: "us.3", text: "Arbetsflödet är beskrivet (flödesprocess)", badges: [] },
      { id: "us.4", text: "Milstolpsdatum kontrollerade mot kontraktet, inklusive årtal", badges: ["L"] },
    ],
  },
  {
    namn: "Plan och risker",
    fragor: [
      { id: "us.5", text: "Planen är realistisk med de identifierade riskerna, och den kritiska linjen är känd", badges: [] },
      { id: "us.6", text: "Riskerna är genomgångna: vilka är undvikta, minimerade och accepterade?", badges: [] },
      { id: "us.7", text: "Teamet känner till riskerna och arbetar aktivt med dem", badges: [] },
    ],
  },
  {
    namn: "Kalkyl och lönsamhet",
    fragor: [
      { id: "us.8", text: "Kalkylen är genomgången: var gick vi in med förlust, var planerade vi att tjäna pengar?", badges: [] },
      { id: "us.9", text: "Lönsamma och olönsamma delar listade — hur maximeras de lönsamma?", badges: [] },
      { id: "us.10", text: "Slöserier och synergier med andra avtal identifierade", badges: [] },
      { id: "us.11", text: "Mall för fakturaunderlag klar", badges: [] },
      { id: "us.12", text: "Kassaflödet genomgånget — produktionen följer betalningsplanen", badges: [] },
    ],
  },
  {
    namn: "Kommunikation och möten",
    fragor: [
      { id: "us.13", text: "Kommunikationsplan och intern kommunikation klar", badges: [] },
      { id: "us.14", text: "Byggmöten bokade med periodicitet och protokollföring", badges: [] },
      { id: "us.15", text: "Startmötet är förberett (intern och extern agenda)", badges: [] },
      { id: "us.16", text: "Dokumentation sker skriftligt — dagbok, underrättelser, protokoll", badges: [] },
    ],
  },
  {
    namn: "Nästa steg",
    fragor: [
      { id: "us.17", text: "Planen för de närmaste dagarna och veckorna är konkret", badges: [] },
      { id: "us.18", text: "Inköp inför start är identifierade", badges: [] },
    ],
  },
];

export const UPPSTART_FRAGOR = UPPSTART_OMRADEN.flatMap((o) => o.fragor);
