/* Beroenden mellan byggfaserna i Bygga batteripark (FASER i
   bessChecklistData.ts). Standardnätet för en BESS-EPC — ren data, logiken
   ligger i src/lib/kritiskLinje.js.

   typ FS = efterföljaren börjar när föregångaren är klar (finish–start)
   typ SS = efterföljaren börjar en viss tid efter att föregångaren börjat

   Avståndet (lag) står inte här. Det räknas ur referensplanen — baslinjen om
   den är sparad, annars standardplanen — så att en plan utan förseningar ger
   noll förskjutning, och bara det som faktiskt flyttas trycker på.

   Alla kanter går från lägre till högre fasnummer; ordningen är topologisk.
   Källor: projektmetoden (§ 1 "Fundament + härdning styr den kritiska
   linjen", § 13 "Ingen gjutning utan verifierad hålbild") och grindarna. */

export const FASBEROENDEN = [
  { fran: 0, till: 1, typ: "FS", varfor: "Anbud antaget före kontrakt" },
  { fran: 1, till: 2, typ: "SS", varfor: "Tillstånd söks när kontraktet är signerat" },
  { fran: 1, till: 3, typ: "SS", varfor: "Projektering startar vid kontrakt" },
  { fran: 1, till: 4, typ: "SS", varfor: "Långa ledtider beställs direkt" },
  { fran: 3, till: 4, typ: "SS", varfor: "Inköp följer projekteringen" },
  { fran: 2, till: 5, typ: "FS", varfor: "G2: alla tillstånd klara före byggstart" },
  { fran: 5, till: 6, typ: "FS", varfor: "Etablering och AMP före schakt" },
  { fran: 3, till: 7, typ: "FS", varfor: "Godkända bygghandlingar och hålbild före gjutning" },
  { fran: 6, till: 7, typ: "FS", varfor: "G6: schaktbotten godkänd före fundament" },
  { fran: 6, till: 8, typ: "SS", varfor: "Jordning läggs i schakten" },
  { fran: 7, till: 8, typ: "SS", varfor: "Jordning samordnas med fundamenten" },
  { fran: 6, till: 9, typ: "SS", varfor: "Kanalisation i samma schakt" },
  { fran: 4, till: 10, typ: "FS", varfor: "MV-ställverk och stationshus beställda" },
  { fran: 9, till: 10, typ: "FS", varfor: "Kanalisation klar före stationshus" },
  { fran: 4, till: 11, typ: "FS", varfor: "Kritiska ordrar bekräftade före leverans" },
  { fran: 7, till: 11, typ: "FS", varfor: "G7: fundament godkända = klart för leverans (M4)" },
  { fran: 9, till: 12, typ: "FS", varfor: "G9: kabeltest signerade före anslutning" },
  { fran: 10, till: 12, typ: "SS", varfor: "Anslutning mot ställverket" },
  { fran: 11, till: 12, typ: "SS", varfor: "Anslutning börjar under montaget" },
  { fran: 8, till: 13, typ: "FS", varfor: "G8: jordtagsmätning godkänd före spänningssättning" },
  { fran: 10, till: 13, typ: "FS", varfor: "Ställverket klart före spänningssättning" },
  { fran: 12, till: 13, typ: "FS", varfor: "Anslutning klar före idrifttagning" },
  { fran: 13, till: 14, typ: "FS", varfor: "G13: idrifttagen före besiktning (M5)" },
  { fran: 14, till: 15, typ: "SS", varfor: "Slutdokumentation löper med besiktningen" },
];

/** Fasen vars slut är kontraktets färdigställande (slutbesiktning). */
export const SLUTFAS = 14;
