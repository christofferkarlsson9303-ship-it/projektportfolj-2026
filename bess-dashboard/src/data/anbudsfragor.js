/* Fast frågelista inför anbudsbeslut (Projektstart, fas 1, del Anbud).

   UTKAST 2026-10-17: listan är sammanställd ur ONE-P-materialet i
   docs/projektmetod.md (avropsacceptans 4, uppstartsavstämning 6.3, projektdirektiv 6.1)
   och ska ersättas med ONE Nordics fastställda lista när den finns.

   Varje fråga blir ett obligatoriskt fält `af_<id>` i utkastet. Byt inte id på en fråga som
   redan besvarats i ett projekt: svaret ligger under id:t. Lägg till nya frågor med nya id. */

export const ANBUDSFRAGOR_STATUS = "Utkast 2026-10-17 – ersätts med ONE Nordics fastställda frågelista";

export const ANBUDSFRAGOR = [
  { id: "omfattning", fraga: "Vad ingår i uppdraget och vad ingår inte? Var går gränsdragningen mot beställaren och andra entreprenörer?" },
  { id: "villkor", fraga: "Vilka administrativa föreskrifter (AF) och avtalsvillkor avviker från standard (ABT 06 / AB 04)?" },
  { id: "tider", fraga: "Vilka datum gäller: anbudsdag, start, deltidsmilstolpar och färdigställande? Är de realistiska?" },
  { id: "viten", fraga: "Vilka viten, garantier och säkerheter krävs, och vad kostar de?" },
  { id: "betalning", fraga: "Hur ser betalningsplanen och kassaflödet ut? Finns en period där vi ligger ute med pengar?" },
  { id: "risker", fraga: "Vilka är de största tekniska och kommersiella riskerna, och hur är de prissatta eller reserverade?" },
  { id: "antaganden", fraga: "Vilka förutsättningar är antagna i kalkylen (mark, geoteknik, nätanslutning, leveranstider)?" },
  { id: "resurser", fraga: "Har vi projektledning, nyckelroller, egen personal och underentreprenörer under perioden?" },
  { id: "fragor", fraga: "Vilka frågor har ställts till beställaren under anbudstiden, och vilka svar påverkar anbudet?" },
  { id: "lonsamhet", fraga: "Var tjänar vi pengar och var finns risk för förlust?" },
  { id: "hseq", fraga: "Vilka krav gäller för HSEQ, arbetsmiljö och BAS-P/BAS-U?" },
  { id: "rekommendation", fraga: "Rekommendation till ledningen: ska anbud lämnas, och på vilka villkor?" },
];

export const anbudsfragaId = (f) => `af_${f.id}`;
