/* Fast frågelista inför anbudsbeslut (Projektstart, fas 1, del Anbud).

   UTKAST 2026-10-17: listan är sammanställd ur ONE-P-materialet i
   docs/projektmetod.md (avropsacceptans 4, uppstartsavstämning 6.3, projektdirektiv 6.1)
   och ska ersättas med ONE Nordics fastställda lista när den finns.

   Varje fråga blir ett obligatoriskt fält `af_<id>` i utkastet. Byt inte id på en fråga som
   redan besvarats i ett projekt: svaret ligger under id:t. Lägg till nya frågor med nya id.

   Trafikljus (2026-10-19): varje fråga får också en bedömning `af_ljus_<id>` enligt
   ONE-P:s trafikljusmetod (Grön = enligt plan, Gul = avvikelse vi hanterar, Röd = kräver
   hjälp eller beslut). `kort` är frågan på ren svenska och står som rubrik; `fraga` är den
   fullständiga frågan och står kvar som etikett och i PDF:en. `hjalp` säger vad ett bra svar
   innehåller. Projektspecifika val (t.ex. kabelmaterial, leverantörsgodkännanden) skrivs i
   svaret, inte i listan: listan är gemensam för alla projekt. */

export const ANBUDSFRAGOR_STATUS = "Utkast 2026-10-17 – ersätts med ONE Nordics fastställda frågelista";

export const ANBUDSFRAGOR = [
  { id: "omfattning", kort: "Vad bygger vi – och vad bygger vi inte?", fraga: "Vad ingår i uppdraget och vad ingår inte? Var går gränsdragningen mot beställaren och andra entreprenörer?", hjalp: "Ingår, ingår inte, gränssnitt mot beställare och andra entreprenörer. Hänvisa till FFU-dokument." },
  { id: "villkor", kort: "Är avtalet tuffare än vanligt?", fraga: "Vilka administrativa föreskrifter (AF) och avtalsvillkor avviker från standard (ABT 06 / AB 04)?", hjalp: "Lista avvikelser mot ABT 06/AB 04 med AF-punkt. Vilka accepterar vi och vilka reserverar vi oss mot?" },
  { id: "tider", kort: "Hinner vi i tid?", fraga: "Vilka datum gäller: anbudsdag, start, deltidsmilstolpar och färdigställande? Är de realistiska?", hjalp: "Anbudsdag, byggstart, deltider och färdigställande. Märk vilka datum som är antagna." },
  { id: "viten", kort: "Vad kostar det om något går fel?", fraga: "Vilka viten, garantier och säkerheter krävs, och vad kostar de?", hjalp: "Vitesnivå och tak, garantitid, bankgaranti/moderbolagsborgen och kostnad i kalkylen." },
  { id: "betalning", kort: "Får vi betalt i takt med att vi bygger?", fraga: "Hur ser betalningsplanen och kassaflödet ut? Finns en period där vi ligger ute med pengar?", hjalp: "Betalplan mot milstolpar. Längsta period och största belopp vi ligger ute med." },
  { id: "risker", kort: "Vad kan bli dyrt eller farligt?", fraga: "Vilka är de största tekniska och kommersiella riskerna, och hur är de prissatta eller reserverade?", hjalp: "De 3–5 största riskerna och för var och en: prissatt, reserverad i anbudet eller öppen." },
  { id: "antaganden", kort: "Vad har vi gissat i kalkylen?", fraga: "Vilka förutsättningar är antagna i kalkylen (mark, geoteknik, nätanslutning, leveranstider)?", hjalp: "Mark, geoteknik, nätanslutning, leveranstider, materialval. Märk antagande eller fakta och källa." },
  { id: "resurser", kort: "Har vi folk till jobbet?", fraga: "Har vi projektledning, nyckelroller, egen personal och underentreprenörer under perioden?", hjalp: "PL, CM, BAS-U, elansvarig, egen personal och UE. Namn eller lucka." },
  { id: "fragor", kort: "Vad har beställaren svarat?", fraga: "Vilka frågor har ställts till beställaren under anbudstiden, och vilka svar påverkar anbudet?", hjalp: "Frågor och svar (Q&A) som ändrar pris, tid eller omfattning." },
  { id: "lonsamhet", kort: "Tjänar vi pengar?", fraga: "Var tjänar vi pengar och var finns risk för förlust?", hjalp: "Var marginalen finns och var vi kan förlora. Täckningsbidrag om det är känt." },
  { id: "hseq", kort: "Kan vi bygga säkert?", fraga: "Vilka krav gäller för HSEQ, arbetsmiljö och BAS-P/BAS-U?", hjalp: "Beställarens HSEQ-krav, BAS-P/BAS-U-ansvar, särskilda arbetsmiljörisker." },
  { id: "rekommendation", kort: "Ska vi lämna anbud?", fraga: "Rekommendation till ledningen: ska anbud lämnas, och på vilka villkor?", hjalp: "Ja/nej och villkoren: förbehåll, reservationer och vad ledningen måste besluta." },
];

export const anbudsfragaId = (f) => `af_${f.id}`;
export const anbudsljusId = (f) => `af_ljus_${f.id}`;

/** Trafikljusen: [ton i designsystemet, namn, vad det betyder för en anbudsfråga]. */
export const ANBUDSLJUS = {
  gron: ["ok", "Grön", "Klart och prissatt. Inget ledningen behöver ta ställning till."],
  gul: ["warn", "Gul", "Avvikelse eller antagande som hanteras med reservation eller påslag."],
  rod: ["bad", "Röd", "Kräver ledningsbeslut eller svar från beställaren innan anbud."],
};

/** Samlad bedömning av frågelistan. Röd vinner över gul, gul över grön.
 *  Obedömda frågor gör aldrig domen grön: tomt är inte "enligt plan". */
export function anbudsBedomning(v = {}) {
  const per = ANBUDSFRAGOR.map((f) => ({ fraga: f, ljus: ANBUDSLJUS[v[anbudsljusId(f)]] ? v[anbudsljusId(f)] : "" }));
  const antal = { gron: 0, gul: 0, rod: 0, obedomd: 0 };
  for (const p of per) antal[p.ljus || "obedomd"] += 1;
  let dom;
  if (antal.rod) dom = { ton: "bad", text: `${antal.rod} röd${antal.rod > 1 ? "a" : ""}: ledningen måste ta ställning innan anbudet lämnas.` };
  else if (antal.obedomd) dom = { ton: "neutral", text: `${antal.obedomd} av ${per.length} frågor är inte bedömda.` };
  else if (antal.gul) dom = { ton: "warn", text: `Inga röda. ${antal.gul} gul${antal.gul > 1 ? "a" : ""}: lämna anbud med reservationer.` };
  else dom = { ton: "ok", text: "Alla gröna: klart för anbud." };
  return { per, antal, dom };
}

/* ---------- Riskmatris (2026-10-22) ----------
   Varje fråga kan placeras i en 3 × 3-matris: sannolikhet (`af_sann_<id>`) och konsekvens
   (`af_kons_<id>`), 1–3. Placeringen föreslår trafikljuset och skriver det; ljuset går
   fortfarande att ändra för hand, och då visas att det avviker från matrisen.
   Gränserna: produkten 1–2 grön, 3–4 gul, 6–9 röd — tre rutor av varje färg. */

export const MATRISNIVAER = [
  { varde: 1, namn: "Låg" },
  { varde: 2, namn: "Medel" },
  { varde: 3, namn: "Hög" },
];

export const anbudsSannId = (f) => `af_sann_${f.id}`;
export const anbudsKonsId = (f) => `af_kons_${f.id}`;

const niva = (x) => (Number.isInteger(Number(x)) && Number(x) >= 1 && Number(x) <= 3 ? Number(x) : null);

/** Trafikljuset för en ruta i matrisen. */
export function matrisLjus(sannolikhet, konsekvens) {
  const s = niva(sannolikhet);
  const k = niva(konsekvens);
  if (!s || !k) return "";
  const p = s * k;
  return p <= 2 ? "gron" : p <= 4 ? "gul" : "rod";
}

/** Frågans plats i matrisen, eller null om den inte är placerad. */
export function matrisPlats(v = {}, f) {
  const s = niva(v[anbudsSannId(f)]);
  const k = niva(v[anbudsKonsId(f)]);
  return s && k ? { sannolikhet: s, konsekvens: k, ljus: matrisLjus(s, k) } : null;
}

/** Fälten som skrivs när en fråga placeras (eller tas bort med null). */
export function matrisFalt(f, plats) {
  if (!plats) return { [anbudsSannId(f)]: "", [anbudsKonsId(f)]: "" };
  return {
    [anbudsSannId(f)]: plats.sannolikhet,
    [anbudsKonsId(f)]: plats.konsekvens,
    [anbudsljusId(f)]: matrisLjus(plats.sannolikhet, plats.konsekvens),
  };
}
