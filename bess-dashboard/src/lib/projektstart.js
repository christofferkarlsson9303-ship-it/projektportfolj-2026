import { STEG } from "../data/projektstartSteg.js";
import { KATALOG } from "../data/projektstartKatalog.js";

export function projektstartFel(state, v) {
  if (!v.namn?.trim()) return "Skriv ett projektnamn.";
  if (v.nr?.trim() && state.projekt.some((p) => (p.nr || "").trim().toLocaleLowerCase("sv") === v.nr.trim().toLocaleLowerCase("sv"))) return "Projektnumret finns redan. Öppna det befintliga projektet.";
  if (v.startdatum && v.fardigstallande && v.startdatum >= v.fardigstallande) return "Färdigdatum ska ligga efter startdatum.";
  return "";
}

export function nyttProjekt(v, id) {
  return { id, nr: (v.nr || "").trim(), namn: v.namn.trim(), ort: (v.ort || "").trim(), bestallare: (v.bestallare || "").trim(),
    startdatum: v.startdatum || "", fardigstallande: v.fardigstallande || "", startdatumAntagande: false,
    kontraktsvarde: null, mw: null, mwh: null, natagare: "", natkontakt: "", fiber: "", mapp: "", anteckning: "", status: "Planering",
    underlag: { kalla: "", datum: "", infort: "", av: "" } };
}

/* ---------- Projektstart-guiden ----------
   Utkastet är en vanlig JSON-post i webbläsaren tills projektet skapas. Det
   ligger inte i portfolj/state. Först när man går igenom guiden och trycker
   Skapa projekt blir det ett projekt med risker och milstolpar. */


export const UTKAST_NYCKEL = "bess-projektstart-utkast-v1";
export const SISTA_STEG = STEG.at(-1).id;

const nyttRadId = () => `rad-${Math.random().toString(36).slice(2, 9)}`;

function nyRad(tabell, grund = {}) {
  const rad = { id: nyttRadId() };
  for (const k of tabell.kolumner) rad[k.id] = grund[k.id] ?? k.standard ?? "";
  return rad;
}
export const nyTabellrad = nyRad;

export function tomtUtkast() {
  const v = {};
  for (const s of STEG) for (const f of s.falt || []) v[f.id] = f.standard ?? f.alternativ?.[0] ?? "";
  v.bolag = "ONE Nordic AB";
  for (const id of ["beslut", "niva"]) v[id] = "";
  const rader = {};
  for (const s of STEG) if (s.tabell) rader[s.tabell.id] = (s.tabell.start?.length ? s.tabell.start : [{}]).map((g) => nyRad(s.tabell, g));
  return { steg: STEG[0].id, besokta: [], v, rader, kryss: {} };
}

/** Läser ett sparat utkast och släpper bara in kända fält, så att en gammal eller
 *  trasig post aldrig kan välta guiden. */
export function lasUtkast(raw) {
  const bas = tomtUtkast();
  let sparat;
  try {
    sparat = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return bas;
  }
  if (!sparat || typeof sparat !== "object") return bas;
  const ids = new Set(STEG.map((s) => s.id));
  for (const k of Object.keys(bas.v)) if (typeof sparat.v?.[k] === "string") bas.v[k] = sparat.v[k];
  for (const k of Object.keys(bas.rader)) if (Array.isArray(sparat.rader?.[k]) && sparat.rader[k].length) bas.rader[k] = sparat.rader[k].filter((r) => r && typeof r === "object" && typeof r.id === "string");
  for (const [bucket, poster] of Object.entries(sparat.kryss || {})) if (KATALOG[bucket] && poster && typeof poster === "object") bas.kryss[bucket] = { ...poster };
  if (ids.has(sparat.steg)) bas.steg = sparat.steg;
  if (Array.isArray(sparat.besokta)) bas.besokta = sparat.besokta.filter((id) => ids.has(id));
  return bas;
}

/** Kontrollpunkter för ett steg, med avbockning ur utkastet. */
export const stegPunkter = (steg) => (steg.katalog || []).flatMap((b) => KATALOG[b].map((p) => ({ ...p, bucket: b })));
export const arAvbockad = (u, p) => !!u.kryss?.[p.bucket]?.[p.id];

export function luckor(u) {
  const alla = STEG.flatMap(stegPunkter);
  const kritiska = alla.filter((p) => p.kritisk);
  return {
    totalt: alla.length,
    klara: alla.filter((p) => arAvbockad(u, p)).length,
    kritiskaTotalt: kritiska.length,
    kritiskaOppna: kritiska.filter((p) => !arAvbockad(u, p)),
    stegKvar: STEG.filter((s) => s.id !== SISTA_STEG && !u.besokta.includes(s.id)),
  };
}

/** Raderna som blir poster i portföljen. Tomma rader hoppas över. */
export function projektFranUtkast(u, id) {
  const v = u.v;
  const rad = nyttProjekt({ namn: v.namn, nr: v.nr, ort: v.plats, bestallare: v.bestallare, startdatum: v.startdatum, fardigstallande: v.fardigdatum }, id);
  const rader = [
    v.kontraktsform && `Kontraktsform: ${v.kontraktsform}${v.niva ? `, ${v.niva.toLowerCase()}` : ""}`,
    v.nulage && `Nuläge vid start: ${v.nulage.trim()}`,
    v.kritiskLinje && `Kritisk linje: ${v.kritiskLinje.trim()}`,
    v.beslut && `Avropsbeslut: ${v.beslut}`,
  ].filter(Boolean);
  const projekt = { ...rad, natagare: (v.natagare || "").trim(), anteckning: rader.join("\n") };
  const risker = (u.rader.risker || [])
    .filter((r) => r.titel?.trim())
    .map((r, i) => ({ id: `r-${id}-${i + 1}`, projektId: id, titel: r.titel.trim(), sannolikhet: Number(r.sannolikhet) || 3, konsekvens: Number(r.konsekvens) || 3, atgard: (r.atgard || "").trim(), agare: (r.agare || "").trim(), status: "oppen" }));
  const milstolpar = (u.rader.milstolpar || [])
    .filter((m) => m.namn?.trim() && m.datum)
    .map((m, i) => ({ id: `m-${id}-${i + 1}`, projektId: id, titel: m.namn.trim(), datum: m.datum, status: "planerad" }));
  return { projekt, risker, milstolpar };
}
