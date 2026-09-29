/* APD-plan och arbetsplatstavla mot ett projekt. Rena funktioner.

   Datan om vad som ska finnas ligger i data/apd.js. Per projekt finns en
   rad i state.hseqApd (sås i efterInlasning, id "apd-<projekt>"):

   - punkter        { "apd.7": true, ... }   avbockade punkter i planen
   - tavla          { "tavla.3": "2026-09-29", ... }  datum då exemplaret sattes upp
   - ritning        ritningsnummer eller länk till APD-ritningen
   - revision       "rev 2"
   - revisionDatum  datum för senaste revision
   - godkandDatum   beställarens godkännande — hållpunkt 5.19
   - godkandAv      vem hos beställaren som godkände

   Tavlan sparar datum i stället för ja/nej för att kunna säga när ett
   anslag blivit inaktuellt: en ny skyddsrond, en reviderad AMP eller en
   reviderad APD-plan gör det uppsatta exemplaret gammalt. */

import { APD_PUNKTER, ARBETSPLATSTAVLA } from "../data/apd.js";
import { ampAktuell } from "./berakningar.js";

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);

/** Tom rad för ett projekt — samma form som efterInlasning sår. */
export function nyApdRad(pid) {
  return {
    id: `apd-${pid}`,
    projektId: pid,
    punkter: {},
    tavla: {},
    ritning: "",
    revision: "",
    revisionDatum: "",
    godkandDatum: "",
    godkandAv: "",
  };
}

export function apdRad(state, pid) {
  return (state.hseqApd || []).find((r) => r.projektId === pid) || null;
}

/** Senaste skyddsrondens datum i projektet, eller null. */
function senasteRond(state, pid) {
  const d = (state.hseqRonder || [])
    .filter((r) => r.projektId === pid && giltigt(r.datum))
    .map((r) => r.datum)
    .sort();
  return d.length ? d[d.length - 1] : null;
}

/** Datumet som ett anslag med `kalla` måste vara uppsatt efter för att vara aktuellt. */
function kallDatum(state, pid, rad, kalla) {
  if (kalla === "amp") return ampAktuell(state, pid)?.datum || null;
  if (kalla === "apd") return giltigt(rad?.revisionDatum) ? rad.revisionDatum : null;
  if (kalla === "rond") return senasteRond(state, pid);
  return null;
}

/** Nästa revisionsbeteckning: "" → "rev 1", "rev 1" → "rev 2". */
export function nastaRevision(revision) {
  const n = Number(String(revision || "").replace(/[^\d]/g, "")) || 0;
  return "rev " + (n + 1);
}

/** Allt vyn behöver om APD-planen och tavlan i ett projekt. */
export function apdLage(state, pid) {
  const rad = apdRad(state, pid) || nyApdRad(pid);
  const punkter = rad.punkter || {};
  const klara = APD_PUNKTER.filter((p) => punkter[p.id]).length;

  const tavla = ARBETSPLATSTAVLA.map((t) => {
    const datum = giltigt(rad.tavla?.[t.id]) ? rad.tavla[t.id] : null;
    const krav = t.kalla ? kallDatum(state, pid, rad, t.kalla) : null;
    let status = "saknas";
    if (datum) status = krav && krav > datum ? "inaktuell" : "uppsatt";
    return { ...t, datum, krav, status };
  });

  const tavlaUppsatta = tavla.filter((t) => t.status === "uppsatt").length;
  const tavlaInaktuella = tavla.filter((t) => t.status === "inaktuell").length;
  const godkand = giltigt(rad.godkandDatum);

  return {
    rad,
    klara,
    totalt: APD_PUNKTER.length,
    godkand,
    tavla,
    tavlaUppsatta,
    tavlaInaktuella,
    tavlaTotalt: tavla.length,
    /** Hållpunkt 5.19 kan godkännas: beställaren har godkänt planen. */
    planRedo: godkand,
    /** 5.20 kan bockas: allt uppsatt och inget inaktuellt. */
    tavlaRedo: tavlaUppsatta === tavla.length,
  };
}
