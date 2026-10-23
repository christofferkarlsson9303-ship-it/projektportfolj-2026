import { dagarMellan, erfarenheter, plusDagar } from "./epc.js";

/* Ett tidigare projekt som mall för ett nytt (tips 5, Batch C → Vaggeryd).

   Ett nytt projekt startar tomt (SKAPA_PROJEKT kopierar inga resultat). Arvet
   är ett eget, uttryckligt steg där projektledaren väljer vad som följer med:

     risker       — riskerna, öppna igen, utan ägare
     leveranser   — long lead-listan: materiel, leverantör, moment och ledtid,
                    utan datum, beställning eller status
     ejaktuella   — EPC-punkter som var Ej aktuella (samma utrustning)
     momentplan   — egna momentdatum, flyttade med skillnaden i startdatum
     lardomar     — avvikelser och lärdomar med "Gör så här nästa gång" blir
                    öppna punkter i det nya projektet. Det är vägen tillbaka:
                    det som gick fel förra gången blir en uppgift den här gången.

   Inget resultat, inga ekonomivärden och inga signaturer följer med. Varje
   ärvd rad får ett id som bygger på källradens id, så att samma arv två gånger
   inte ger dubbletter. */

export const ARVSDELAR = [
  ["risker", "Risker", "öppna igen, utan ägare"],
  ["leveranser", "Long lead-leveranser", "materiel, leverantör, moment och ledtid — utan datum"],
  ["ejaktuella", "Ej aktuella punkter", "i Bygga batteripark"],
  ["momentplan", "Momentplan", "egna datum flyttade till det nya startdatumet"],
  ["lardomar", "Lärdomar som uppgifter", "avvikelser och lärdomar med Gör så här nästa gång"],
];

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const projektFor = (state, id) => (state.projekt || []).find((p) => p.id === id) || null;

/** Förskjutning i dagar mellan källans och målets startdatum, eller null. */
function forskjutning(state, fran, till) {
  const a = projektFor(state, fran)?.startdatum;
  const b = projektFor(state, till)?.startdatum;
  return giltigt(a) && giltigt(b) ? dagarMellan(a, b) : null;
}

/** Raderna som skulle ärvas, per del — utan att ändra något.
 *  @param {any} state
 *  @param {string} fran
 *  @param {string} till
 *  @param {{ datum?: string, namn?: string }} [opts] */
export function arvsrader(state, fran, till, { datum = "", namn = "" } = {}) {
  const kalla = projektFor(state, fran);
  const etikett = kalla ? (kalla.nr || kalla.namn) : fran;
  const finns = (lista, id) => (state[lista] || []).some((r) => r.id === id);

  const risker = (state.risker || [])
    .filter((r) => r.projektId === fran)
    .map((r) => ({ ...r, id: `r-arv-${till}-${r.id}`, projektId: till, agare: "", status: "oppen", arvdFran: etikett }))
    .filter((r) => !finns("risker", r.id));

  const leveranser = (state.leveranser || [])
    .filter((l) => l.projektId === fran)
    .map((l) => ({ ...l, id: `l-arv-${till}-${l.id}`, projektId: till, datum: "", start: "", bestalld: "", status: "preliminar", arvdFran: etikett }))
    .filter((l) => !finns("leveranser", l.id));

  const harPunkt = new Set((state.epcPunkter || []).filter((r) => r.projektId === till && r.status).map((r) => r.punkt));
  const ejaktuella = (state.epcPunkter || [])
    .filter((r) => r.projektId === fran && r.status === "ejaktuell" && !harPunkt.has(r.punkt))
    .map((r) => ({ id: `ep-${till}-${r.punkt}`, projektId: till, punkt: r.punkt, status: "ejaktuell", datum: datum || "", av: namn || "", arvdFran: etikett }));

  const d = forskjutning(state, fran, till);
  const harPlan = new Set((state.epcFaser || []).filter((r) => r.projektId === till && (r.start || r.slut)).map((r) => r.fas));
  const momentplan =
    d === null
      ? []
      : (state.epcFaser || [])
          .filter((r) => r.projektId === fran && giltigt(r.start) && giltigt(r.slut) && !harPlan.has(r.fas))
          .map((r) => ({ fas: r.fas, start: plusDagar(r.start, d), slut: plusDagar(r.slut, d) }));

  const lardomar = erfarenheter(state, fran)
    .filter((k) => (k.gorSa || "").trim())
    .map((k) => ({
      id: `p-arv-${till}-${k.id}`,
      projektId: till,
      titel: `Lärdom från ${etikett}, punkt ${k.punkt}: ${k.gorSa.trim()}`,
      agare: "",
      forfaller: "",
      status: "oppen",
      arvdFran: etikett,
      epcPunkt: k.punkt,
    }))
    .filter((p) => !finns("punkter", p.id));

  return { risker, leveranser, ejaktuella, momentplan, lardomar, forskjutning: d };
}

/** Lägger in valda delar i state. Ren funktion; reducern loggar. */
export function arv(state, fran, till, delar, opts) {
  const r = arvsrader(state, fran, till, opts);
  const med = new Set(delar);
  let s = state;
  if (med.has("risker") && r.risker.length) s = { ...s, risker: [...s.risker, ...r.risker] };
  if (med.has("leveranser") && r.leveranser.length) s = { ...s, leveranser: [...s.leveranser, ...r.leveranser] };
  if (med.has("ejaktuella") && r.ejaktuella.length) {
    const bort = new Set(r.ejaktuella.map((x) => x.id));
    s = { ...s, epcPunkter: [...(s.epcPunkter || []).filter((x) => !bort.has(x.id)), ...r.ejaktuella] };
  }
  if (med.has("momentplan") && r.momentplan.length) {
    const rader = [...(s.epcFaser || [])];
    for (const m of r.momentplan) {
      const id = `ef-${till}-${m.fas}`;
      const i = rader.findIndex((x) => x.projektId === till && x.fas === m.fas);
      if (i >= 0) rader[i] = { ...rader[i], start: m.start, slut: m.slut };
      else rader.push({ id, projektId: till, fas: m.fas, start: m.start, slut: m.slut });
    }
    s = { ...s, epcFaser: rader };
  }
  if (med.has("lardomar") && r.lardomar.length) s = { ...s, punkter: [...s.punkter, ...r.lardomar] };
  const antal = Object.fromEntries([...med].map((k) => [k, r[k]?.length || 0]));
  return { state: s, antal };
}
