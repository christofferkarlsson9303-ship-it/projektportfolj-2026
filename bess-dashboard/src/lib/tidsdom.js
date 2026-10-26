import { gallerFor } from "./berakningar.js";
import { dagarMellan } from "./epc.js";
import { kritiskLinje } from "./kritiskLinje.js";
import { idag } from "./datum.js";

/* Domen "Blir vi klara i tid" — en plats för texten, så att Idag, portföljen
   och Översikt säger samma sak.

   Kritisk linje (kritiskLinje()) är motorn och räknas inte om här. Men den
   låter bara leveranser med uttryckligt moment styra tidplanen. En leverans
   vars datum har passerat utan att den är markerad som levererad får därför
   aldrig ge "I tid": domen blir "Risk" med leveransen som orsak. Den flyttar
   inte slutdatumet — det gör bara en koppling till ett moment. */

const LEVERERAD = new Set(["klar", "levererad"]);
const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const dagText = (n) => `${n} ${n === 1 ? "dag" : "dagar"}`;

/** Leveranser för projektet vars datum passerat utan att de markerats som
 *  levererade, äldst först. */
export function senaLeveranser(state, pid, nu = idag()) {
  return (state.leveranser || [])
    .filter((l) => gallerFor(l, pid) && giltigt(l.datum) && l.datum < nu && !LEVERERAD.has(l.status))
    .map((l) => ({
      id: l.id,
      benamning: l.benamning || "Leverans",
      leverantor: l.leverantor && l.leverantor !== "—" ? l.leverantor : "",
      datum: l.datum,
      dagar: dagarMellan(l.datum, nu),
    }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Dom för ett projekt: ton, kort text till märket och en mening som förklarar. */
export function tidsdom(state, pid, nu = idag(), k = kritiskLinje(state, pid, nu)) {
  const sena = senaLeveranser(state, pid, nu);
  if (!k || k.forsening === null) {
    return { k, sena, ton: "warn", text: "Uppgifter saknas", mening: "Ange start och slut på projektet under Översikt, så räknas planen fram." };
  }
  if (k.forsening > 0) {
    return { k, sena, ton: "bad", text: `${dagText(k.forsening)} sent`, mening: null };
  }
  if (sena.length) {
    const f = sena[0];
    const vem = f.leverantor ? ` (${f.leverantor})` : "";
    const fler = sena.length > 1 ? ` och ${sena.length - 1} till` : "";
    return {
      k,
      sena,
      ton: "warn",
      text: `Risk · ${sena.length} ${sena.length === 1 ? "leverans" : "leveranser"} sen`,
      mening: `Planen håller, men ${f.benamning}${vem}${fler} skulle ha kommit för ${dagText(f.dagar)} sedan och är inte markerad som levererad.`,
    };
  }
  return { k, sena, ton: "ok", text: "I tid", mening: null };
}
