import { isoVecka, veckaEtikett, veckaForskjut, veckansDagar } from "./datum.js";

/* Klickmenyn och fasnivån i Översiktens Gantt-schema (components/oversikt/Gantt.jsx).

   Ett moment planeras i hela veckor: start = veckans måndag, slut = veckans fredag. Inget dras
   med musen (repo-regel: ingen drag-and-drop i Gantt) — menyn flyttar start, slut eller hela
   momentet en vecka i taget. Status är härledd ur grinden och datumen (lib/epc.js faslage):
   det enda som sätts för hand är att grinden är passerad (klar) eller öppnas igen. */

/** "2026-v37" för ett ISO-datum, eller null. */
export function veckaFor(iso) {
  if (!iso) return null;
  return isoVecka(new Date(iso + "T12:00:00"));
}

/** "v. 37 2026" för ett ISO-datum, eller "–". */
export function veckaText(iso) {
  const v = veckaFor(iso);
  return v ? veckaEtikett(v) : "–";
}

export const veckansMandag = (v) => veckansDagar(v)[0];
export const veckansFredag = (v) => veckansDagar(v)[4];

/** Nya start/slut när start, slut eller hela momentet flyttas `steg` veckor.
 *  Slut hamnar aldrig före start: flyttas start förbi slutet följer slutet med. */
export function flyttaVeckor({ start, slut }, vad, steg) {
  const vs = veckaFor(start);
  const ve = veckaFor(slut);
  if (!vs || !ve) return null;
  let nyStart = vs;
  let nySlut = ve;
  if (vad === "start" || vad === "hela") nyStart = veckaForskjut(vs, steg);
  if (vad === "slut" || vad === "hela") nySlut = veckaForskjut(ve, steg);
  if (veckansMandag(nySlut) < veckansMandag(nyStart)) nySlut = nyStart;
  return { start: veckansMandag(nyStart), slut: veckansFredag(nySlut) };
}

/** Antal veckor ett moment spänner över (start- och slutvecka inräknade). */
export function antalVeckor(start, slut) {
  if (!start || !slut) return 0;
  const a = new Date(veckansMandag(veckaFor(start)) + "T00:00:00Z");
  const b = new Date(veckansMandag(veckaFor(slut)) + "T00:00:00Z");
  return Math.round((b - a) / (7 * 86400000)) + 1;
}

/** En fas ihopfälld: en stapel från första momentets start till sista momentets slut, med ett
 *  samlat läge. Försenad om något moment är sent, klar om alla är klara, pågår om något pågår
 *  eller är klart, annars kommande. */
export function fasSammanfattning(rader) {
  const daterade = rader.filter((f) => f.start && f.slut);
  const start = daterade.length ? daterade.map((f) => f.start).sort()[0] : null;
  const slut = daterade.length ? daterade.map((f) => f.slut).sort().at(-1) : null;
  const klara = rader.filter((f) => f.status === "klar").length;
  let status = "kommande";
  if (rader.some((f) => f.status === "sen")) status = "sen";
  else if (rader.length && klara === rader.length) status = "klar";
  else if (klara || rader.some((f) => f.status === "pagar")) status = "pagar";
  const punkter = rader.reduce((s, f) => s + (f.punkter || 0), 0);
  const klaraPunkter = rader.reduce((s, f) => s + (f.klara || 0), 0);
  return { start, slut, status, klara, antal: rader.length, punkter, klaraPunkter };
}

/** Vilka faser som är utfällda för en nivå: "moment" fäller ut alla, "fas" fäller ihop alla. */
export function utfalldaFor(niva, fasNummer) {
  return niva === "fas" ? new Set() : new Set(fasNummer);
}
