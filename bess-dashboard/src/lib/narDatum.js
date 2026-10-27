/* "Senast"-datum ur punkternas När-text (UX-09).

   När-fältet i checklistan är fritext ("≥ 4 v före", "≥ 2 v före SB",
   "2–3 v före"). Här tolkas bara de formuleringar som entydigt räknas bakåt
   från ett känt datum. Allt annat ("Före gjutning", "NTP + 2 v", "≤ 24 h")
   visas som text, utan datum.

   Ankaret är momentets planerade start, eller ett av projektets ankardatum
   (ankardatum() i epc.js) när texten namnger händelsen. Ett intervall
   ("2–3 v före") ger det sista godtagbara datumet, alltså det kortare måttet.

   Det tolkade datumet är ett stöd för planeringen. Fristen på en punkt
   (forfaller) och grinden påverkas inte. */

import { datumKort } from "./datum.js";
import { ankardatum, faslage, plusDagar } from "./epc.js";

const ENHET_DAGAR = { v: 7, mån: 30, d: 1 };

const MONSTER = /^(?:≥\s*)?(\d+)(?:\s*[–-]\s*(\d+))?\s*(v|mån|d)\s+före(?:\s+(.+))?$/i;

/** Händelse i texten → ankare i ankardatum(). "moment" = momentets start. */
const HANDELSE = {
  "": "moment",
  arbete: "moment",
  byggstart: "byggstart",
  schakt: "schaktstart",
  leverans: "bessLeverans",
  lyft: "bessLeverans",
  provning: "satStallverk",
  sb: "slutbesiktning",
  slutbesiktning: "slutbesiktning",
};

const ANKARE_NAMN = {
  byggstart: "byggstart",
  schaktstart: "schaktstart",
  bessLeverans: "BESS-leverans",
  satStallverk: "SAT ställverk",
  slutbesiktning: "slutbesiktning",
};

/** Punkter där texten syftar på en händelse som saknar datum i appen. */
const UNDANTAG = new Set([
  "2.14", // "≥ 2 v före" sprängning – sprängningen har inget datum i appen
]);

/** Tolkar När-texten. { dagar, handelse } eller null. Ren funktion. */
export function tolkaNar(nar) {
  const m = MONSTER.exec(String(nar || "").trim());
  if (!m) return null;
  const [, a, b, enhet, rest = ""] = m;
  const handelse = HANDELSE[rest.trim().toLowerCase()];
  if (!handelse) return null;
  const antal = b ? Math.min(Number(a), Number(b)) : Number(a);
  return { dagar: antal * ENHET_DAGAR[enhet.toLowerCase()], handelse };
}

/** Senast-datum per punkt för ett projekt: Map id → { datum, text, grund }.
 *  Punkter vars ankare saknar datum utelämnas. */
export function senastDatum(state, pid, nu, faser = faslage(state, pid, nu)) {
  const ank = ankardatum(state, pid, faser);
  const ut = new Map();
  for (const f of faser) {
    for (const p of f.fas.sektioner.flatMap((s) => s.punkter)) {
      if (UNDANTAG.has(p.id)) continue;
      const t = tolkaNar(p.nar);
      if (!t) continue;
      const bas = t.handelse === "moment" ? f.start : ank[t.handelse]?.datum;
      if (!bas) continue;
      const namn = t.handelse === "moment" ? `start av moment ${f.fas.nr}` : ANKARE_NAMN[t.handelse];
      const datum = plusDagar(bas, -t.dagar);
      ut.set(p.id, {
        datum,
        text: `senast ${datumKort(datum)}`,
        grund: `${p.nar} = ${t.dagar} dagar före ${namn} (${datumKort(bas)})`,
      });
    }
  }
  return ut;
}
