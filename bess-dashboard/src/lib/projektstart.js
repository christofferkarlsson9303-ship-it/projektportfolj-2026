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
  for (const id of ["beslut", "niva", "offra"]) v[id] = "";
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

/** Underlaget till PDF:en. Samma dokumentform som övriga PDF:er (projekt, datum,
 *  skapadAv) plus `projektstart` med sektioner per steg. Tomma fält och rader
 *  utelämnas, så PDF:en blir lika kort som utkastet är ifyllt. */
export function projektstartDokument(u, { datum, skapadAv = "" }) {
  const v = u.v;
  const sektioner = STEG.filter((s) => s.id !== SISTA_STEG).map((s) => {
    const falt = (s.falt || []).map((f) => [f.etikett, (v[f.id] || "").trim()]).filter(([, val]) => val);
    const tabell = s.tabell
      ? {
          titel: s.tabell.titel,
          kolumner: s.tabell.kolumner.map((k) => k.etikett),
          rader: (u.rader[s.tabell.id] || [])
            .filter((r) => s.tabell.kolumner.some((k) => (r[k.id] || "").trim() && (k.typ === "text" || k.typ === "date")))
            .map((r) => s.tabell.kolumner.map((k) => (r[k.id] || "").trim())),
        }
      : null;
    const punkter = stegPunkter(s);
    const kontroll = punkter.length
      ? { klara: punkter.filter((p) => arAvbockad(u, p)).length, totalt: punkter.length, kritiskaOppna: punkter.filter((p) => p.kritisk && !arAvbockad(u, p)).map((p) => p.text) }
      : null;
    return { id: s.id, fas: s.fas, titel: s.titel, falt, tabell: tabell?.rader.length ? tabell : null, kontroll, besokt: u.besokta.includes(s.id) };
  });
  const l = luckor(u);
  return {
    projekt: { id: (v.nr || "").trim() || "utkast", nr: (v.nr || "").trim(), namn: (v.namn || "").trim(), bestallare: (v.bestallare || "").trim() },
    datum,
    skapadAv,
    projektstart: { sektioner, klara: l.klara, totalt: l.totalt, kritiskaOppna: l.kritiskaOppna.length, kritiskaTotalt: l.kritiskaTotalt },
  };
}

/** Sparad projektstart: guidens svar, knutna till projektet. */
export function projektstartPost(projektId, u, nu = new Date().toISOString()) {
  return { id: `ps-${projektId}`, projektId, utkast: { v: u.v, rader: u.rader, kryss: u.kryss }, skapad: nu, uppdaterad: nu };
}

/** Öppnar en sparad projektstart i guiden. Alla steg räknas som genomgångna. */
export function utkastFranPost(post) {
  const u = lasUtkast(post?.utkast);
  u.besokta = STEG.filter((s) => s.id !== SISTA_STEG).map((s) => s.id);
  u.steg = STEG[0].id;
  return u;
}

const KORTFALT = [["namn", "namn"], ["nr", "nr"], ["plats", "ort"], ["bestallare", "bestallare"], ["startdatum", "startdatum"], ["fardigdatum", "fardigstallande"], ["natagare", "natagare"]];

/** Ändringar i projektkortet som ska föras över till projektet: [fält, nytt värde]. */
export function kortAndringar(u, projekt) {
  return KORTFALT.map(([fran, till]) => [till, (u.v[fran] || "").trim()]).filter(([till, varde]) => varde !== (projekt[till] || "") && (till !== "namn" || varde));
}

export const utkastAndrat = (a, b) => JSON.stringify([a.v, a.rader, a.kryss]) !== JSON.stringify([b.v, b.rader, b.kryss]);

/** Guiden för ett projekt som saknar sparad projektstart: ifylld från projektkortet,
 *  riskregistret och milstolparna. Checklistor och direktiv börjar tomma. */
export function utkastFranProjekt(projekt, state) {
  const u = utkastFranPost(null);
  Object.assign(u.v, {
    namn: projekt.namn || "",
    nr: projekt.nr || "",
    plats: projekt.ort || "",
    bestallare: projekt.bestallare || "",
    startdatum: projekt.startdatum || "",
    fardigdatum: projekt.fardigstallande || "",
    natagare: projekt.natagare || "",
  });
  const risker = (state.risker || []).filter((r) => r.projektId === projekt.id);
  if (risker.length) {
    const t = STEG.find((x) => x.id === "risker").tabell;
    u.rader.risker = risker.map((r) => nyRad(t, { titel: r.titel, sannolikhet: String(r.sannolikhet ?? 3), konsekvens: String(r.konsekvens ?? 3), agare: r.agare, atgard: r.atgard }));
  }
  const milstolpar = (state.milstolpar || []).filter((m) => m.projektId === projekt.id);
  if (milstolpar.length) {
    const t = STEG.find((x) => x.id === "kontrakt").tabell;
    u.rader.milstolpar = milstolpar.map((m) => nyRad(t, { namn: m.titel, datum: m.datum }));
  }
  return u;
}
