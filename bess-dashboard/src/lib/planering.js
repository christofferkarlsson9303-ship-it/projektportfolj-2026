/* Planering och tid — resurser, tidrapport, aktivitetsbudget och
   fakturaunderlag. Rena funktioner över state, porterade ur originalets
   ritaResurser/ritaTid/ritaBudget/ritaFaktura så att vyerna bara ritar.

   Kapacitet och á-priser är ANTAGANDEN (á-pris enligt Bilaga 06.1). Utfallet
   räknas alltid med respektive persons á-pris och tidslag; arbetsbudgeten
   räknas om till kronor med snittet av á-priserna. */

import { idag, veckansDagar } from "./datum.js";

/** Entreprenadarvode på självkostnad, ABT 06 kap. 6 § 9. */
export const ARVODE_PROCENT = 10;

export const FAKTURASTATUS = [
  ["utkast", "Utkast"],
  ["skickad", "Skickad till beställaren"],
  ["fakturerad", "Fakturerad"],
];

const tal = (v) => Number(v) || 0;

export const person = (state, id) => state.medarbetare.find((m) => m.id === id) || null;
export const aktivaPersoner = (state) => state.medarbetare.filter((m) => m.aktiv !== false);
export const aktivitet = (state, id) => state.aktiviteter.find((a) => a.id === id) || null;
export const aktiviteterFor = (state, pid) => state.aktiviteter.filter((a) => a.projektId === pid);

/** Kostnaden för en tidrad: timmar × personens á-pris × tidslag (övertid). */
export function timkostnad(state, rad) {
  const m = person(state, rad.personId);
  return tal(rad.timmar) * (m ? tal(m.apris) : 0) * (Number(rad.ot) || 1);
}

/* ---------- Resurser ---------- */

export function planeratPerson(state, personId, vecka) {
  return state.bemanning
    .filter((b) => b.personId === personId && b.vecka === vecka)
    .reduce((s, b) => s + tal(b.timmar), 0);
}

export function planeratProjekt(state, projektId, vecka) {
  return state.bemanning
    .filter((b) => b.projektId === projektId && b.vecka === vecka)
    .reduce((s, b) => s + tal(b.timmar), 0);
}

export function bemanningsrad(state, personId, projektId, vecka) {
  return (
    state.bemanning.find((b) => b.personId === personId && b.projektId === projektId && b.vecka === vecka) || null
  );
}

/** Beläggningsnivå för en procentsats: tom, del (utrymme kvar), full (85–100 %), over. */
export function belaggningsniva(proc) {
  if (proc > 100) return "over";
  if (proc >= 85) return "full";
  if (proc > 0) return "del";
  return "tom";
}

export const procent = (del, hel) => (hel ? Math.round((del / hel) * 100) : 0);

/** Nyckeltal för Resurser över en följd av veckor. */
export function resurslage(state, veckor) {
  const pers = aktivaPersoner(state);
  const kapVecka = pers.reduce((s, m) => s + tal(m.kapacitet), 0);
  const kapTot = kapVecka * veckor.length;
  const planTot = veckor.reduce((s, vk) => s + pers.reduce((a, m) => a + planeratPerson(state, m.id, vk), 0), 0);
  const overbelastningar = [];
  pers.forEach((m) =>
    veckor.forEach((vk) => {
      const p = planeratPerson(state, m.id, vk);
      const k = tal(m.kapacitet);
      if (k && p > k) overbelastningar.push({ person: m, vecka: vk, planerat: p, kapacitet: k });
    })
  );
  return {
    personer: pers,
    kapVecka,
    kapTot,
    planTot,
    belaggning: procent(planTot, kapTot),
    ledigt: Math.max(0, kapTot - planTot),
    overbelastningar,
  };
}

/* ---------- Tidrapport ---------- */

export function tidraderVecka(state, personId, vecka) {
  const dagar = veckansDagar(vecka);
  return state.tidrader.filter((t) => t.personId === personId && dagar.includes(t.datum));
}

export function nyTidrad({ datum, personId, projektId }) {
  return {
    id: "td" + Date.now() + Math.floor(Math.random() * 1000),
    datum: datum || idag(),
    personId,
    projektId,
    aktivitetId: "",
    timmar: 8,
    ot: 1,
    ataRef: "",
    debiterbar: false,
    fakturerad: false,
    notering: "",
  };
}

/* ---------- Budget och utfall ---------- */

export function snittpris(state) {
  const m = state.medarbetare;
  return m.length ? m.reduce((s, x) => s + tal(x.apris), 0) / m.length : 0;
}

export function budgetAktivitet(state, a) {
  const pris = snittpris(state);
  const arb = tal(a.budgetTim) * pris;
  return {
    tim: tal(a.budgetTim),
    arb,
    mtrl: tal(a.budgetMtrl),
    ue: tal(a.budgetUE),
    kr: arb + tal(a.budgetMtrl) + tal(a.budgetUE),
  };
}

export function utfallAktivitet(state, aid) {
  const tr = state.tidrader.filter((t) => t.aktivitetId === aid);
  const timmar = tr.reduce((s, t) => s + tal(t.timmar), 0);
  const arbKr = tr.reduce((s, t) => s + timkostnad(state, t), 0);
  const kost = state.kostnader.filter((k) => k.aktivitetId === aid);
  const summa = (f) => kost.filter(f).reduce((s, k) => s + tal(k.belopp), 0);
  const mtrl = summa((k) => k.typ === "material");
  const ue = summa((k) => k.typ === "ue");
  const ovr = summa((k) => k.typ !== "material" && k.typ !== "ue");
  return { timmar, arbKr, mtrl, ue, ovr, kr: arbKr + mtrl + ue + ovr };
}

/** Budget och utfall för ett projekt, summerat över dess aktiviteter. */
export function budgetlage(state, pid) {
  const akt = aktiviteterFor(state, pid);
  const bud = akt.reduce(
    (s, a) => {
      const b = budgetAktivitet(state, a);
      return { tim: s.tim + b.tim, kr: s.kr + b.kr };
    },
    { tim: 0, kr: 0 }
  );
  const utf = akt.reduce(
    (s, a) => {
      const u = utfallAktivitet(state, a.id);
      return { tim: s.tim + u.timmar, kr: s.kr + u.kr };
    },
    { tim: 0, kr: 0 }
  );
  return { aktiviteter: akt, bud, utf, kvar: bud.kr - utf.kr, forbrukat: procent(utf.kr, bud.kr) };
}

export function nyAktivitet(pid) {
  return {
    id: "ak" + Date.now(),
    projektId: pid,
    namn: "Ny aktivitet",
    budgetTim: 0,
    budgetMtrl: 0,
    budgetUE: 0,
    ansvarig: "",
  };
}

export function nyKostnad(pid) {
  return {
    id: "ko" + Date.now(),
    projektId: pid,
    aktivitetId: "",
    datum: idag(),
    typ: "material",
    benamning: "",
    belopp: 0,
    debiterbar: false,
    fakturerad: false,
  };
}

/** En aktivitet med rapporterad tid eller kostnad får inte tas bort. */
export const aktivitetAnvands = (state, id) =>
  state.tidrader.some((t) => t.aktivitetId === id) || state.kostnader.some((k) => k.aktivitetId === id);

/* ---------- Fakturaunderlag ---------- */

export const ofaktureradTid = (state, pid) =>
  state.tidrader.filter((t) => t.projektId === pid && t.debiterbar && !t.fakturerad);

export const ofaktureradKostnad = (state, pid) =>
  state.kostnader.filter((k) => k.projektId === pid && k.debiterbar && !k.fakturerad);

/** Summering av det som ännu inte ligger i något underlag. */
export function ofakturerat(state, pid) {
  const tid = ofaktureradTid(state, pid);
  const kost = ofaktureradKostnad(state, pid);
  const arbete = tid.reduce((s, t) => s + timkostnad(state, t), 0);
  const netto = kost.reduce((s, k) => s + tal(k.belopp), 0);
  const arvode = (netto * ARVODE_PROCENT) / 100;
  return {
    tid,
    kost,
    timmar: tid.reduce((s, t) => s + tal(t.timmar), 0),
    arbete,
    netto,
    arvode,
    summa: arbete + netto + arvode,
  };
}

/** Skapar ett fakturaunderlag av allt ofakturerat i projektet och låser raderna.
 *  Returnerar state oförändrat när det inte finns något att sammanställa. */
export function skapaFakturaunderlag(state, pid, datum = idag()) {
  const o = ofakturerat(state, pid);
  if (!o.tid.length && !o.kost.length) return state;
  const nr = "FU" + String(state.fakturor.filter((f) => f.projektId === pid).length + 1).padStart(3, "0");
  const datumlista = [...o.tid.map((t) => t.datum), ...o.kost.map((k) => k.datum)].sort();
  const tidIds = new Set(o.tid.map((t) => t.id));
  const kostIds = new Set(o.kost.map((k) => k.id));
  const underlag = {
    id: "fu" + Date.now(),
    projektId: pid,
    nr,
    skapad: datum,
    status: "utkast",
    period: datumlista.length ? `${datumlista[0]} – ${datumlista[datumlista.length - 1]}` : datum,
    timmar: o.timmar,
    arbete: Math.round(o.arbete),
    kostnadNetto: Math.round(o.netto),
    arvode: Math.round(o.arvode),
    summa: Math.round(o.summa),
    tidIds: [...tidIds],
    kostIds: [...kostIds],
    atan: [...new Set(o.tid.map((t) => t.ataRef).filter(Boolean))].join(", "),
  };
  return {
    ...state,
    fakturor: [...state.fakturor, underlag],
    tidrader: state.tidrader.map((t) => (tidIds.has(t.id) ? { ...t, fakturerad: true } : t)),
    kostnader: state.kostnader.map((k) => (kostIds.has(k.id) ? { ...k, fakturerad: true } : k)),
  };
}

/** Ångrar ett underlag som inte är fakturerat: raderna låses upp igen. */
export function angraFakturaunderlag(state, id) {
  const f = state.fakturor.find((x) => x.id === id);
  if (!f || f.status === "fakturerad") return state;
  const tidIds = new Set(f.tidIds || []);
  const kostIds = new Set(f.kostIds || []);
  return {
    ...state,
    fakturor: state.fakturor.filter((x) => x.id !== id),
    tidrader: state.tidrader.map((t) => (tidIds.has(t.id) ? { ...t, fakturerad: false } : t)),
    kostnader: state.kostnader.map((k) => (kostIds.has(k.id) ? { ...k, fakturerad: false } : k)),
  };
}
