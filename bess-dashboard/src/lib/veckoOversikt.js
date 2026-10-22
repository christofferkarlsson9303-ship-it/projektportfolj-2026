/* Siffror och lägen för Veckokoll-översikten. Ren logik utan React, så att den går att testa.

   Allt härleds ur det som redan finns i portföljen — veckokollsraden, UR/ÄTA-posterna, EPC-checklistan
   och objekten på siten. Ingenting hittas på och inget nytt lagras. */

import { VECKOFRAGOR } from "../data/veckofragor.js";
import { allvar } from "./veckotriage.js";
import { ataSummering } from "./berakningar.js";
import { faslage } from "./epc.js";
import { arKopplad } from "./modellKoppling.js";
import { SITE_STATUS, harBessData } from "./site.js";

export const ANTAL_FRAGOR = VECKOFRAGOR.length;

/** Besvarade frågor, andel och fördelning per allvarsgrad för en veckokollsrad (eller null). */
export function veckaSiffror(rad) {
  const r = { besvarade: 0, totalt: ANTAL_FRAGOR, andel: 0, ok: 0, varning: 0, avvikelse: 0 };
  if (!rad) return r;
  for (const f of VECKOFRAGOR) {
    const g = allvar(f, rad["q" + f.n]);
    if (!g) continue;
    r.besvarade += 1;
    r[g] += 1;
  }
  r.andel = Math.round((r.besvarade / r.totalt) * 100);
  return r;
}

/**
 * Projektets läge för veckan, till flikarnas prick: "bad" om någon fråga är en avvikelse, "warn" om någon
 * är en varning, "ok" när allt är besvarat utan anmärkning, annars "ingen" (ännu inte genomgången).
 */
export function projektPrio(state, pid, vecka) {
  const rad = (state.veckokoll || []).find((r) => r.projektId === pid && r.vecka === vecka) || null;
  const s = veckaSiffror(rad);
  const prio = s.avvikelse ? "bad" : s.varning ? "warn" : s.besvarade === s.totalt ? "ok" : "ingen";
  return { ...s, prio, klar: !!rad?.klar };
}

/** ÄTA-påverkan: öppna poster och pengarna som hänger på dem. */
export function ataPaverkan(state, pid) {
  const s = ataSummering(state, pid);
  const rader = (state.ur || []).filter((u) => u.projektId === pid && !["stangd", "utgar", "fakturerad"].includes(u.status));
  return { oppna: s.oppna, ejFakturerat: s.ejFakt, pagaende: s.pending, godkant: s.godkant, utanPris: rader.filter((u) => u.belopp === null || u.belopp === undefined || u.belopp === "").length };
}

/* ---------- BESS-stadier ---------- */

/**
 * De fyra stadierna i ett BESS-bygge och vilka EPC-moment (0–15) var och en bygger på. Det här är en
 * tolkning, inte en egen modell: checklistan har sexton moment och stadierna samlar dem så att man ser
 * läget med en blick. Ordningen följer hur parken tas i drift.
 */
export const BESS_STADIER = [
  { id: "mark", namn: "Mark och fundament", moment: [6, 7, 8] },
  { id: "containrar", namn: "BESS-containrar", moment: [11, 12] },
  { id: "trafo", namn: "Trafo och nät", moment: [9, 10] },
  { id: "sat", namn: "Idrifttagning", moment: [13] },
];

/**
 * Läge per stadium ur EPC-checklistans faslage: "klar" när alla momenten har passerat sin grind,
 * "sen" om något moment är försenat, "pagaende" när något pågår eller några är klara, annars "ej_startat".
 * `andel` är andelen bockade kontrollpunkter i stadiets moment.
 */
export function bessStadier(faser) {
  return BESS_STADIER.map((s) => {
    const m = s.moment.map((nr) => faser?.[nr]).filter(Boolean);
    const klara = m.reduce((a, f) => a + (f.klara || 0), 0);
    const totalt = m.reduce((a, f) => a + Math.max(0, (f.punkter || 0) - (f.ejAktuella || 0)), 0);
    const alla = m.length > 0 && m.every((f) => f.status === "klar");
    const nagon = m.some((f) => f.status === "pagar" || f.status === "sen" || f.status === "klar");
    const status = alla ? "klar" : m.some((f) => f.status === "sen") ? "sen" : nagon ? "pagaende" : "ej_startat";
    return { id: s.id, namn: s.namn, status, klara, totalt, andel: totalt ? Math.round((klara / totalt) * 100) : alla ? 100 : 0, moment: s.moment, kod: m.map((f) => f.fas?.grind?.kod).filter(Boolean) };
  });
}

/** Stadierna för ett projekt direkt ur portföljen. Tom lista om checklistan inte går att räkna. */
export function bessStadierForProjekt(state, pid) {
  try {
    return bessStadier(faslage(state, pid));
  } catch {
    return [];
  }
}

/* ---------- Parkens komponenter ---------- */

const STATUS_TEXT = Object.fromEntries(SITE_STATUS);

/**
 * Läge för en komponent på siten: "varning" om en öppen ÄTA är kopplad till den (objectGuid),
 * annars "ingen". Ingen ÄTA är inte detsamma som fungerande drift, så tonen är neutral och
 * aldrig "ok" (granskning F14). `oppnaArenden` är de öppna ÄTA på objektet.
 */
export function komponentLage(o, ur) {
  const oppna = (ur || []).filter((u) => arKopplad(u) && u.objectGuid === o.id && !["stangd", "utgar", "fakturerad"].includes(u.status));
  return {
    ton: oppna.length ? "varning" : "ingen",
    text: oppna.length ? (oppna.length === 1 ? "1 öppen ÄTA" : `${oppna.length} öppna ÄTA`) : "Ingen öppen ÄTA",
    oppnaArenden: oppna,
    status: o.status || "",
    statusText: STATUS_TEXT[o.status] || "Status ej angiven",
  };
}

/** Komponenterna som visas i översikten: volymer med BESS-data (container, skid, E-House, trafo). */
export const parkKomponenter = (objekt) => (objekt || []).filter((o) => harBessData(o.typ));

/** Park-effekten som text, ur objekten på siten och annars ur projektets egna MW/MWh. */
export function effektText(projekt, summa) {
  if (summa && (summa.mw > 0 || summa.mwh > 0)) {
    const d = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
    return `${d(summa.mw)} MW / ${d(summa.mwh)} MWh`;
  }
  if (projekt?.mw) return `${projekt.mw} MW / ${projekt.mwh ?? "—"} MWh`;
  return "";
}
