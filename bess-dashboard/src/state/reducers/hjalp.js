/* Gemensamma hjälpfunktioner för portföljens reducers (namn, ändringslogg, radbyten).
   Flyttade oförändrade ur portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { PILL } from "../../data/konstanter.js";
import { MALLAR, arNal } from "../../lib/site.js";
import { statusEtikett } from "../../data/projektfaser.ts";

/** Namnet används i ändringsloggen och sparas per webbläsare, inte i delad data. */
export const NAMN_KEY = "batchc-portfolj-namn";

export function hamtaNamn() {
  try {
    return (localStorage.getItem(NAMN_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function sparaNamn(v) {
  try {
    localStorage.setItem(NAMN_KEY, (v || "").trim());
  } catch {
    /* privat läge eller blockerad lagring — namnet blir bara tomt */
  }
}

export const etikettFor = (state, lista, id) => {
  const rad = (state[lista] || []).find((r) => r.id === id);
  if (!rad) return null;
  const kort = (s) => (String(s).length > 60 ? String(s).slice(0, 57) + "…" : String(s));
  switch (lista) {
    case "projekt":
      return { etikett: (rad.nr ? rad.nr + " " : "") + rad.namn, projektId: rad.id };
    case "milstolpar":
      return { etikett: rad.titel, projektId: rad.projektId };
    case "leveranser":
      return { etikett: rad.benamning, projektId: rad.projektId };
    case "ur":
      return { etikett: (rad.nr ? rad.nr + " " : "") + rad.benamning, projektId: rad.projektId };
    case "risker":
    case "punkter":
      return { etikett: kort(rad.titel), projektId: rad.projektId };
    case "storningar":
      return { etikett: rad.rubrik || "Störning", projektId: rad.projektId };
    case "betalplan":
      return { etikett: `Betalplan ${rad.kod} — ${rad.benamning}`, projektId: rad.projektId };
    case "slutdok":
      return { etikett: `Slutdok: ${kort(rad.krav)}`, projektId: rad.projektId };
    case "hpAtgarder":
      return { etikett: `Handlingsplan: ${kort(rad.titel || "Namnlös åtgärd")}`, projektId: rad.projektId };
    case "fakturor":
      return { etikett: `Fakturaunderlag ${rad.nr}`, projektId: rad.projektId };
    default:
      return { etikett: String(id), projektId: rad.projektId || null };
  }
};

export function medLogg(state, lista, id, gammalt, nytt) {
  const info = etikettFor(state, lista, id);
  if (!info) return state.andringslogg || [];
  const etikett = (x) => (lista === "projekt" ? statusEtikett(x) : (PILL[x] || [undefined, x || "—"])[1]);
  const g = etikett(gammalt);
  const n = etikett(nytt);
  const post = {
    ts: new Date().toISOString(),
    anvandare: hamtaNamn() || "Okänd",
    projektId: info.projektId || null,
    text: `${info.etikett}: status ändrad ${g} → ${n}`,
  };
  return [post, ...(state.andringslogg || [])].slice(0, 150);
}

export const byt = (lista, id, andra) => lista.map((r) => (r.id === id ? andra(r) : r));

/** Uppdaterar raden som matchar, eller lägger till ny = {...ny, ...andring}. */
export function uppsatt(lista, matchar, ny, andring) {
  const rader = lista || [];
  return rader.some(matchar)
    ? rader.map((r) => (matchar(r) ? { ...r, ...andring } : r))
    : [...rader, { ...ny, ...andring }];
}

/** "Skid 3" för en volym, "Nål på p2 Vågkvitto …" för en nål. */
export function siteEtikett(state, o) {
  if (!arNal(o)) return o.namn || MALLAR[o.typ]?.namn || "Objekt";
  const p = (state.punkter || []).find((x) => x.id === o.punktId);
  const titel = p ? String(p.titel) : o.punktId;
  return `Nål på ${titel.length > 50 ? titel.slice(0, 47) + "…" : titel}`;
}

export function loggat(state, projektId, text) {
  const post = { ts: new Date().toISOString(), anvandare: hamtaNamn() || "Okänd", projektId: projektId || null, text };
  return { ...state, andringslogg: [post, ...(state.andringslogg || [])].slice(0, 150) };
}
