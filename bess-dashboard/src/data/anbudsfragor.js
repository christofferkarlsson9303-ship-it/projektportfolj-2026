/* Fast frågelista inför anbudsbeslut (Projektstart, fas 1, del Anbud).

   UTKAST 2026-10-17: listan är sammanställd ur ONE-P-materialet i
   docs/projektmetod.md (avropsacceptans 4, uppstartsavstämning 6.3, projektdirektiv 6.1)
   och ska ersättas med ONE Nordics fastställda lista när den finns.

   Varje fråga blir ett obligatoriskt fält `af_<id>` i utkastet. Byt inte id på en fråga som
   redan besvarats i ett projekt: svaret ligger under id:t. Lägg till nya frågor med nya id. */

export const ANBUDSFRAGOR_STATUS = "Utkast 2026-10-17 – ersätts med ONE Nordics fastställda frågelista";

/* Varje fråga besvaras med ett klick på en av cirklarna (`val`, tonen styr färgen),
   ett drag på linjen för hur säker bedömningen är, och en valfri kommentar.
   Svaret sparas som en läsbar sträng i `af_<id>` (se lib/anbudssvar.js), så PDF,
   fullständighet och äldre fritextsvar fungerar som förut. */
export const ANBUDSFRAGOR = [
  { id: "omfattning", fraga: "Vad ingår i uppdraget och vad ingår inte? Var går gränsdragningen mot beställaren och andra entreprenörer?",
    val: [["Tydlig", "ok"], ["Delvis oklar", "warn"], ["Oklar", "bad"]] },
  { id: "villkor", fraga: "Vilka administrativa föreskrifter (AF) och avtalsvillkor avviker från standard (ABT 06 / AB 04)?",
    val: [["Inga avvikelser", "ok"], ["Mindre avvikelser", "warn"], ["Väsentliga avvikelser", "bad"]] },
  { id: "tider", fraga: "Vilka datum gäller: anbudsdag, start, deltidsmilstolpar och färdigställande? Är de realistiska?",
    val: [["Realistiska", "ok"], ["Pressade", "warn"], ["Orealistiska", "bad"]] },
  { id: "viten", fraga: "Vilka viten, garantier och säkerheter krävs, och vad kostar de?",
    val: [["Normala", "ok"], ["Höga men hanterbara", "warn"], ["Betungande", "bad"]] },
  { id: "betalning", fraga: "Hur ser betalningsplanen och kassaflödet ut? Finns en period där vi ligger ute med pengar?",
    val: [["Positivt kassaflöde", "ok"], ["Kort period ute", "warn"], ["Länge ute med pengar", "bad"]] },
  { id: "risker", fraga: "Vilka är de största tekniska och kommersiella riskerna, och hur är de prissatta eller reserverade?",
    val: [["Prissatta", "ok"], ["Delvis prissatta", "warn"], ["Ej prissatta", "bad"]] },
  { id: "antaganden", fraga: "Vilka förutsättningar är antagna i kalkylen (mark, geoteknik, nätanslutning, leveranstider)?",
    val: [["Verifierade", "ok"], ["Delvis verifierade", "warn"], ["Endast antagna", "bad"]] },
  { id: "resurser", fraga: "Har vi projektledning, nyckelroller, egen personal och underentreprenörer under perioden?",
    val: [["Säkrade", "ok"], ["Delvis säkrade", "warn"], ["Saknas", "bad"]] },
  { id: "fragor", fraga: "Vilka frågor har ställts till beställaren under anbudstiden, och vilka svar påverkar anbudet?",
    val: [["Inga som påverkar", "ok"], ["Svar påverkar anbudet", "warn"], ["Obesvarade frågor", "bad"]] },
  { id: "lonsamhet", fraga: "Var tjänar vi pengar och var finns risk för förlust?",
    val: [["God marginal", "ok"], ["Tunn marginal", "warn"], ["Förlustrisk", "bad"]] },
  { id: "hseq", fraga: "Vilka krav gäller för HSEQ, arbetsmiljö och BAS-P/BAS-U?",
    val: [["Standardkrav", "ok"], ["Utökade krav", "warn"], ["Särskilda krav", "bad"]] },
  { id: "rekommendation", fraga: "Rekommendation till ledningen: ska anbud lämnas, och på vilka villkor?",
    val: [["Lämna anbud", "ok"], ["Lämna med villkor", "warn"], ["Avstå", "bad"]] },
];

export const anbudsfragaId = (f) => `af_${f.id}`;
