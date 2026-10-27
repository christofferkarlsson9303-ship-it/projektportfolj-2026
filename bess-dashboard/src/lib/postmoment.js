import { faslage } from "./epc.js";
import { momentIFas } from "./fasmappning.js";

/* Moment på alla poster (docs/rod-trad.md §2 och §7 steg 1, 2026-10-27).

   Varje punkt, ÄTA, risk, dagboksrad, störning, byggmöte, skyddsrond och
   tillbud hör till ett moment 0–15, och därmed till en fas 1–8. Det är
   ryggraden som Projektet-vyn ska samla posterna kring.

   - En ny post utan moment får projektets aktuella moment (`momentKalla: "auto"`).
   - En äldre post utan moment får det vid inläsning (`momentKalla: "antaget"`).
     Det är ett ANTAGANDE: posten kan höra till ett tidigare moment.
   - Ett moment som användaren valt (`momentKalla` saknas eller "vald") rörs aldrig.

   Leveranser ingår inte: där binder ett uttryckligt `moment` tidplanen
   (lib/bestallningar.js) och får aldrig gissas. */

export const MOMENT_LISTOR = ["punkter", "ur", "risker", "dagbok", "storningar", "byggmoten", "hseqRonder", "hseqIncidenter"];

const arMoment = (m) => Number.isInteger(m) && m >= 0 && m <= 15;

/** Projektets aktuella moment: det första vars grind inte är passerad. Är allt passerat, det sista.
 *  null om projektet saknas eller checklistan inte går att räkna. */
export function aktuelltMoment(state, pid) {
  if (!(state.projekt || []).some((p) => p.id === pid)) return null;
  try {
    const fl = faslage(state, pid);
    const i = fl.findIndex((f) => f.status !== "klar");
    return i === -1 ? fl.length - 1 : i;
  } catch {
    return null;
  }
}

/** Moment för en risk utan moment. En risk har redan en fas: ligger den i projektets
 *  aktuella fas får den aktuellt moment, annars fasens första moment. */
function riskensMoment(r, aktuellt, aktuellFas) {
  if (!Number.isInteger(r.fas) || r.fas === aktuellFas) return aktuellt;
  return momentIFas(r.fas)[0] ?? aktuellt;
}

/** Sätter moment på en ny post i en av MOMENT_LISTOR, om det saknas. Övriga poster returneras orörda. */
export function medMomentForNy(state, lista, rad) {
  if (!MOMENT_LISTOR.includes(lista) || !rad || arMoment(rad.moment)) return rad;
  const m = aktuelltMoment(state, rad.projektId);
  if (m === null) return rad;
  const aktuellFas = state.projekt.find((p) => p.id === rad.projektId)?.fas;
  const moment = lista === "risker" ? riskensMoment(rad, m, aktuellFas) : m;
  return { ...rad, moment, momentKalla: "auto" };
}

/** Migrering vid inläsning: äldre poster utan moment får ett antaget moment. Idempotent. */
export function medPostmoment(state) {
  const cache = new Map();
  const aktuellt = (pid) => {
    if (!cache.has(pid)) cache.set(pid, aktuelltMoment(state, pid));
    return cache.get(pid);
  };
  const fasFor = new Map((state.projekt || []).map((p) => [p.id, p.fas]));

  let andrat = false;
  const ut = { ...state };
  for (const lista of MOMENT_LISTOR) {
    const rader = state[lista];
    if (!Array.isArray(rader) || rader.every((r) => arMoment(r?.moment))) continue;
    ut[lista] = rader.map((r) => {
      if (!r || arMoment(r.moment)) return r;
      const m = aktuellt(r.projektId);
      if (m === null) return r;
      andrat = true;
      const moment = lista === "risker" ? riskensMoment(r, m, fasFor.get(r.projektId)) : m;
      return { ...r, moment, momentKalla: "antaget" };
    });
  }
  return andrat ? ut : state;
}

/** Efter varje ändring: poster som tillkommit utan moment i en ändrad lista får projektets
 *  aktuella moment. Täcker alla vägar som skapar poster (LAGG_TILL, mötespunkter, händelser,
 *  arv, import) utan att varje åtgärd behöver känna till moment. */
export function medNyaMoment(fore, efter) {
  let ut = efter;
  for (const lista of MOMENT_LISTOR) {
    const rader = efter[lista];
    if (rader === fore[lista] || !Array.isArray(rader) || rader.every((r) => !r || arMoment(r.moment))) continue;
    const nya = rader.map((r) => (r && !arMoment(r.moment) ? medMomentForNy(efter, lista, r) : r));
    if (nya.some((r, i) => r !== rader[i])) {
      if (ut === efter) ut = { ...efter };
      ut[lista] = nya;
    }
  }
  return ut;
}
