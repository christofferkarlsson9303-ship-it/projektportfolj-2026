/* Tidplan med beroenden: prognos per fas, kritisk linje och konsekvens på
   betalmilstolparna. Rena funktioner.

   Tre planer hålls isär:
   - Standardplanen   fasernas mall ur bessChecklistData.ts, uträknad ur
                      projektets start, BESS-leverans och färdigställande.
   - Baslinjen        en sparad bild av planen (epcBaslinje). Det man mäter
                      förseningar mot.
   - Prognosen        det som räknas fram här: planen plus det som hänt —
                      passerade grindar, faser som dragit över, bekräftade
                      leveransdatum och egna datum — fört vidare genom
                      beroendenätet (src/data/fasberoenden.js).

   Geometrin (avstånden mellan faserna) tas ur baslinjen, eller ur
   standardplanen när ingen baslinje finns. Då ger en opåverkad plan noll
   förskjutning, och bara det som faktiskt flyttas trycker på efterföljarna.

   Framåtberäkning: tidigaste start = max(egen planerad start, föregångarnas
   krav). Bakåtberäkning från prognosens slutbesiktning ger slack per fas;
   slack 0 = den kritiska linjen, kedjan som styr slutdatumet. */

import { FASER, M7_EFTER_SB_DAGAR, MILSTOLPAR } from "../data/bessChecklistData.ts";
import { FASBEROENDEN, SLUTFAS } from "../data/fasberoenden.js";
import { projekt } from "./berakningar.js";
import { idag } from "./datum.js";
import { ankardatum, dagarMellan, faslage, mallDatum, planAnkare, plusDagar } from "./epc.js";

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);

const FORE = FASER.map((f) => FASBEROENDEN.filter((b) => b.till === f.nr));
const EFTER = FASER.map((f) => FASBEROENDEN.filter((b) => b.fran === f.nr));

/** Sparad baslinje för projektet, eller null. */
export function baslinje(state, pid) {
  return (state.epcBaslinje || []).find((b) => b.projektId === pid) || null;
}

/** Baslinjen som den ska sparas: dagens plan per fas. */
export function baslinjerad(state, pid, datum = idag(), av = "") {
  const faser = faslage(state, pid, datum);
  const p = projekt(state, pid);
  return {
    id: `bl-${pid}`,
    projektId: pid,
    sparad: datum,
    av,
    fardigstallande: p?.fardigstallande || "",
    faser: faser.filter((f) => f.start && f.slut).map((f) => ({ nr: f.fas.nr, start: f.start, slut: f.slut })),
  };
}

/** Standardplanens datum per fas (utan egna datum). */
function standardplan(state, pid) {
  const a = planAnkare(state, pid);
  if (!a) return null;
  return FASER.map((f) => ({ start: mallDatum(f.mall.fran, a), slut: mallDatum(f.mall.till, a) }));
}

/**
 * Prognos och kritisk linje för ett projekt.
 * @returns {null | {
 *   referens: "baslinje"|"standardplan", baslinje: object|null,
 *   kontrakt: string|null, slutPrognos: string, forsening: number|null,
 *   faser: object[], kritiska: number[], milstolpar: object[]
 * }} null när planen saknar start eller slut.
 */
export function kritiskLinje(state, pid, nu = idag()) {
  const lage = faslage(state, pid, nu);
  if (lage.some((f) => !f.start || !f.slut)) return null;

  const bl = baslinje(state, pid);
  const blFas = (nr) => bl?.faser?.find((x) => x.nr === nr) || null;
  const std = standardplan(state, pid);

  // Geometri för avstånden: baslinjen fas för fas, annars standardplanen.
  const geo = FASER.map((f, i) => blFas(f.nr) || std?.[i] || { start: lage[i].start, slut: lage[i].slut });

  const origo = geo[0].start < lage[0].start ? geo[0].start : lage[0].start;
  const dag = (iso) => dagarMellan(origo, iso);
  const iso = (n) => plusDagar(origo, n);
  const idagN = dag(nu);

  // Längd och tidigaste start: egna datum går före referensen.
  const langd = lage.map((f, i) => Math.max(0, f.egenPlan ? dag(f.slut) - dag(f.start) : dag(geo[i].slut) - dag(geo[i].start)));
  const tidigast = lage.map((f, i) => (f.egenPlan ? dag(f.start) : dag(geo[i].start)));

  /* Avstånd i beroendet. SS: efterföljarens startförskjutning i referensen.
     FS: överlapp i referensen behålls (negativt avstånd), men ett glapp är
     buffert — inte ett krav — och blir slack i stället. */
  const lag = (b) =>
    b.typ === "SS"
      ? dag(geo[b.till].start) - dag(geo[b.fran].start)
      : Math.min(0, dag(geo[b.till].start) - dag(geo[b.fran].slut));

  /* Bekräftad BESS-leverans i leveranslistan binder starten på fas 11
     (Leverans, lyft & montage). MV-leveransen binder INTE fas 10 — fasen
     rymmer även stationshuset, som byggs före leveransen, och var i fasen
     leveransen ligger vet vi inte. Den följs i stället som ledtid. */
  const ank = ankardatum(state, pid, lage);
  const yttre = new Map();
  if (ank.bessLeverans?.kalla === "leveranslistan" && giltigt(ank.bessLeverans.datum))
    yttre.set(11, { dag: dag(ank.bessLeverans.datum), text: `BESS-leverans ${ank.bessLeverans.datum}` });

  /* ---------- Framåt ---------- */
  const ES = [];
  const EF = [];
  const driv = [];
  for (let i = 0; i < FASER.length; i++) {
    const f = lage[i];
    if (f.grind.passerad) {
      // Klar fas ligger fast där den blev klar.
      const slut = giltigt(f.grind.datum) ? dag(f.grind.datum) : dag(f.slut);
      EF[i] = slut;
      ES[i] = Math.min(dag(f.start), slut - langd[i]);
      driv[i] = { typ: "klar" };
      continue;
    }
    let es = tidigast[i];
    let orsak = { typ: "plan" };
    for (const b of FORE[i]) {
      const krav = (b.typ === "SS" ? ES[b.fran] : EF[b.fran]) + lag(b);
      if (krav > es) {
        es = krav;
        orsak = { typ: "fas", nr: b.fran, beroende: b };
      }
    }
    const y = yttre.get(i);
    if (y && y.dag > es) {
      es = y.dag;
      orsak = { typ: "leverans", text: y.text };
    }
    let ef = es + langd[i];
    // En fas som inte är klar kan inte bli klar i det förflutna.
    if (ef < idagN) {
      ef = idagN;
      orsak = { typ: "sen", forra: orsak };
    }
    ES[i] = es;
    EF[i] = ef;
    driv[i] = orsak;
  }

  /* ---------- Bakåt ---------- */
  const slutN = EF[SLUTFAS];
  const LF = new Array(FASER.length).fill(Infinity);
  for (let i = FASER.length - 1; i >= 0; i--) {
    if (i > SLUTFAS) {
      LF[i] = EF[i];
      continue;
    }
    if (i === SLUTFAS) {
      LF[i] = slutN;
      continue;
    }
    let lf = slutN;
    for (const b of EFTER[i]) {
      if (b.till > SLUTFAS) continue;
      const ls = LF[b.till] - (EF[b.till] - ES[b.till]);
      const krav = b.typ === "SS" ? ls - lag(b) + (EF[i] - ES[i]) : ls - lag(b);
      if (krav < lf) lf = krav;
    }
    LF[i] = lf;
  }

  const p = projekt(state, pid);
  const kontrakt = giltigt(p?.fardigstallande) ? p.fardigstallande : null;

  const faser = FASER.map((f, i) => {
    const klar = lage[i].grind.passerad;
    const slack = klar || i > SLUTFAS ? null : LF[i] - EF[i];
    const b = blFas(f.nr);
    return {
      nr: f.nr,
      titel: f.titel,
      kort: f.kort,
      status: lage[i].status,
      klar,
      planStart: lage[i].start,
      planSlut: lage[i].slut,
      egenPlan: lage[i].egenPlan,
      referensSlut: geo[i].slut,
      prognosStart: iso(ES[i]),
      prognosSlut: iso(EF[i]),
      // Mot referensen (baslinje eller standardplan) — egna datum räknas som förskjutning.
      forskjutning: EF[i] - dag(geo[i].slut),
      baslinjeSlut: b?.slut || null,
      motBaslinje: b ? EF[i] - dag(b.slut) : null,
      slack,
      kritisk: slack !== null && slack <= 0,
      drivs: driv[i],
    };
  });

  const milstolpar = MILSTOLPAR.map((m) => {
    const i = FASER.findIndex((f) => f.grind.kod === m.grind);
    const extra = m.kod === "M7" ? M7_EFTER_SB_DAGAR : 0;
    const b = blFas(FASER[i].nr);
    return {
      kod: m.kod,
      grind: m.grind,
      fas: FASER[i].nr,
      plan: plusDagar(geo[i].slut, extra),
      prognos: iso(EF[i] + extra),
      forskjutning: EF[i] - dag(geo[i].slut),
      baslinje: b ? plusDagar(b.slut, extra) : null,
      motBaslinje: b ? EF[i] - dag(b.slut) : null,
      klar: lage[i].grind.passerad,
    };
  });

  return {
    referens: bl ? "baslinje" : "standardplan",
    baslinje: bl,
    kontrakt,
    slutPrognos: iso(slutN),
    forsening: kontrakt ? slutN - dag(kontrakt) : null,
    motBaslinje: blFas(SLUTFAS) ? slutN - dag(blFas(SLUTFAS).slut) : null,
    faser,
    kritiska: faser.filter((f) => f.kritisk).map((f) => f.nr),
    milstolpar,
  };
}

/** Kort förklaring av varför en fas ligger där den ligger. */
export function drivtext(f, faser) {
  const d = f.drivs;
  if (!d) return "";
  if (d.typ === "klar") return "Grinden passerad";
  if (d.typ === "sen") return "Drar över — prognosen kan inte ligga före i dag";
  if (d.typ === "leverans") return d.text;
  if (d.typ === "fas") {
    const fore = faser.find((x) => x.nr === d.nr);
    return `Styrs av fas ${d.nr} ${fore?.kort || ""} (${d.beroende.typ === "SS" ? "start" : "slut"})`.trim();
  }
  return f.egenPlan ? "Egna datum" : "Enligt plan";
}
