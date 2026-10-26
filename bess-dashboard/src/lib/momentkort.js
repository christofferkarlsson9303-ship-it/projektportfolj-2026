/* Momentkortets rubrik i Bygga batteripark (UX-01, UX-02, UX-05).

   Rena funktioner ovanpå faslage(), bestallningar och grindSaknas() — ingen
   egen datalogik och inget som skrivs till state.

   - tidslage(lage, nu)              datum, tidsläge i ord och planens källa
   - styrandeLeveranser(state, pid)  leveranser med uttryckligt moment, per moment
   - saknasSammanfattning(saknas)    det som saknas för grinden, räknat per typ */

import { gallerFor } from "./berakningar.js";
import { behovsmoment } from "./bestallningar.js";
import { arGiltigtDatum, datumKort, idag } from "./datum.js";
import { dagarMellan, faslage } from "./epc.js";

/** "9–15 nov" eller "28 sep – 2 nov" när månaderna skiljer sig. */
export function datumSpann(start, slut) {
  if (!start || !slut) return "";
  const a = datumKort(start).split(" ");
  const b = datumKort(slut).split(" ");
  return a[1] === b[1] ? `${a[0]}–${b[0]} ${b[1]}` : `${a.join(" ")} – ${b.join(" ")}`;
}

/** Momentets tidsläge för rubrikraden.
 *  { datum, lage, plan, ton } — ton följer StatusBadge (ok/warn/bad/info/neutral). */
export function tidslage(lage, nu = idag()) {
  const kod = lage.fas.grind.kod;
  if (lage.grind.passerad) {
    return {
      datum: datumSpann(lage.start, lage.slut),
      lage: lage.grind.datum ? `${kod} passerad ${datumKort(lage.grind.datum)}` : `${kod} passerad`,
      plan: null,
      ton: "ok",
    };
  }
  if (!lage.start || !lage.slut) {
    return { datum: "", lage: "Datum saknas – sätt projektets datum", plan: null, ton: "neutral" };
  }
  const plan = lage.egenPlan ? "egna datum" : "standardplan";
  const datum = datumSpann(lage.start, lage.slut);
  if (nu < lage.start) {
    const d = dagarMellan(nu, lage.start);
    return { datum, lage: d === 0 ? "startar idag" : `start om ${d} d`, plan, ton: "info" };
  }
  if (nu <= lage.slut) {
    const d = dagarMellan(nu, lage.slut);
    return { datum, lage: d === 0 ? "pågår, slut idag" : `pågår, ${d} d kvar`, plan, ton: "warn" };
  }
  return { datum, lage: `${dagarMellan(lage.slut, nu)} d sen`, plan, ton: "bad" };
}

const LEV_TEXT = {
  klar: ["ok", "levererad"],
  bekraftad: ["info", "bekräftad"],
  preliminar: ["warn", "preliminär"],
  avvikelse: ["bad", "avvikelse"],
};

/** Leveranser som uttryckligen är kopplade till ett moment, per momentnummer.
 *  Ett moment gissat ur benämningen visas aldrig (samma regel som kritisk
 *  linje). `forsenarDagar` > 0 när en ej levererad leverans kommer efter
 *  momentets planerade start. */
export function styrandeLeveranser(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const ut = new Map();
  for (const l of state.leveranser || []) {
    if (!gallerFor(l, pid)) continue;
    const m = behovsmoment(l);
    if (!m || m.gissat) continue;
    const start = faser[m.nr]?.start || null;
    const datum = arGiltigtDatum(l.datum) ? l.datum : null;
    const levererad = l.status === "klar";
    const forsenarDagar = !levererad && start && datum ? Math.max(0, dagarMellan(start, datum)) : 0;
    const [ton, text] = LEV_TEXT[l.status] || ["neutral", l.status || "okänd status"];
    const rad = {
      id: l.id,
      benamning: l.benamning || "Leverans",
      datum,
      status: l.status || "",
      statusText: text,
      ton: forsenarDagar ? "bad" : ton,
      forsenarDagar,
    };
    if (!ut.has(m.nr)) ut.set(m.nr, []);
    ut.get(m.nr).push(rad);
  }
  for (const lista of ut.values()) lista.sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"));
  return ut;
}

/** Det som saknas för grinden, räknat per typ. Varje del har id:t på den
 *  första raden att hoppa till (punkter) eller null (kontroller, klartecken).
 *  { delar, ejRegistrerade } — delar är tom när grinden kan passeras. */
export function saknasSammanfattning(saknas) {
  if (!saknas || saknas.klart) return { delar: [], ejRegistrerade: 0 };
  const hp = saknas.punkter.filter((p) => p.hp);
  const ovriga = saknas.punkter.filter((p) => !p.hp);
  const ejReg = saknas.punkter.filter((p) => p.ejRegistrerad).length;
  const ut = [];
  if (hp.length) ut.push({ typ: "hp", etikett: hp.length === 1 ? "hållpunkt" : "hållpunkter", antal: hp.length, forsta: hp[0].id });
  if (ovriga.length)
    ut.push({ typ: "punkter", etikett: ovriga.length === 1 ? "punkt" : "punkter", antal: ovriga.length, forsta: ovriga[0].id });
  if (saknas.kontroller.length)
    ut.push({
      typ: "kontroller",
      etikett: saknas.kontroller.length === 1 ? "egenkontroll ej verifierad" : "egenkontroller ej verifierade",
      antal: saknas.kontroller.length,
      forsta: null,
    });
  if (saknas.avvikelser)
    ut.push({
      typ: "avvikelser",
      etikett: saknas.avvikelser === 1 ? "öppen avvikelse" : "öppna avvikelser",
      antal: saknas.avvikelser,
      forsta: null,
    });
  if (saknas.grinddatum) ut.push({ typ: "klartecken", etikett: "klartecken (grinddatum)", antal: 1, forsta: null });
  return { delar: ut, ejRegistrerade: ejReg };
}
