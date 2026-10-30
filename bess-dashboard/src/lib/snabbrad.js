/* Snabbrad i Idag: en punkt skrivs som en mening, ett datum i slutet läses ut.

   "Ring Alex om servis fre" → titel "Ring Alex om servis", frist närmaste fredag.

   Datumord i slutet av raden (ett eller två ord):
     idag · imorgon / i morgon · mån tis ons tor fre lör sön (närmaste, idag räknas)
     +3 (dagar) · 5/11 (dag/månad; passerat i år → nästa år) · 2026-11-05

   Utan datum blir uppföljningen idag, så att punkten syns i Idag direkt — samma
   regel som siterundan (lib/siterunda.js). Ett utläst datum blir fristen, som när
   en punkt läggs till under Öppna punkter. Rena funktioner, inget state. */

import { arGiltigtDatum, lokaltDatum } from "./datum.js";

const VECKODAG = { son: 0, sön: 0, man: 1, mån: 1, tis: 2, ons: 3, tor: 4, fre: 5, lor: 6, lör: 6 };

function franIso(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function plusDagar(iso, n) {
  const d = franIso(iso);
  d.setDate(d.getDate() + n);
  return lokaltDatum(d);
}

/** Ett datumord → YYYY-MM-DD, eller null om ordet inte är ett datum. */
export function tolkaDatumord(ord, idagIso) {
  const o = String(ord || "").trim().toLowerCase().replace(/\.$/, "");
  if (!o) return null;
  if (o === "idag") return idagIso;
  if (o === "imorgon") return plusDagar(idagIso, 1);
  if (/^\+\d{1,3}$/.test(o)) return plusDagar(idagIso, Number(o.slice(1)));
  if (Object.prototype.hasOwnProperty.call(VECKODAG, o)) {
    const nu = franIso(idagIso).getDay();
    return plusDagar(idagIso, (VECKODAG[o] - nu + 7) % 7);
  }
  if (arGiltigtDatum(o)) return o;
  const dm = /^(\d{1,2})\/(\d{1,2})$/.exec(o);
  if (dm) {
    const ar = Number(idagIso.slice(0, 4));
    const kandidat = `${ar}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    if (!arGiltigtDatum(kandidat)) return null;
    return kandidat < idagIso ? `${ar + 1}${kandidat.slice(4)}` : kandidat;
  }
  return null;
}

/**
 * Delar en snabbrad i titel och datum.
 * @param {string} text
 * @param {string} idagIso YYYY-MM-DD
 * @returns {{titel: string, forfaller: string, uppfoljning: string} | null} null när titeln blir tom
 */
export function tolkaSnabbrad(text, idagIso) {
  const ord = String(text || "").trim().split(/\s+/).filter(Boolean);
  let datum = "";
  if (ord.length >= 3 && `${ord.at(-2)} ${ord.at(-1)}`.toLowerCase() === "i morgon") {
    datum = plusDagar(idagIso, 1);
    ord.splice(-2, 2);
  } else if (ord.length >= 2) {
    const d = tolkaDatumord(ord.at(-1), idagIso);
    if (d) {
      datum = d;
      ord.pop();
    }
  }
  const titel = ord.join(" ").trim();
  if (!titel) return null;
  return datum ? { titel, forfaller: datum, uppfoljning: "" } : { titel, forfaller: "", uppfoljning: idagIso };
}

/** Index för nästa rad vid j/k. Stannar vid kanterna; utan fokus börjar j på första och k på sista. */
export function nastaIndex(antal, nu, steg) {
  if (antal <= 0) return -1;
  if (nu < 0 || nu >= antal) return steg > 0 ? 0 : antal - 1;
  return Math.min(antal - 1, Math.max(0, nu + steg));
}
