/* BESS EPC-checklistan mot ett projekt: fasplan, grindar, milstolpar,
   ledtider och hållpunkter. Rena funktioner som resten av lib/.

   Datan om checklistan ligger i data/bessChecklistData.ts. Här räknas den
   mot projektets egna datum och det som bockats av:

   - state.epcStatus  en rad per avbockad eller UR-kopplad kontrollpunkt
   - state.epcFaser   en rad per fas med egna datum, passerad grind och
                      anteckningar — bara faser som avviker från standard

   Fasplanen är en utgångspunkt, inte en tidplan. Den räknas fram ur start,
   BESS-leverans och slutbesiktning, och varje fas kan få egna datum. */

import {
  ANKARE_NAMN,
  FASER,
  LEDTIDER,
  M7_EFTER_SB_DAGAR,
  MALL_SKALA,
  MILSTOLPAR,
  PUNKT_FOR_ID,
} from "../data/bessChecklistData.ts";
import { BESS_MATCH, betalRad, projekt } from "./berakningar.js";
import { idag, lokaltDatum } from "./datum.js";

/** Status → [ton, text] för faser och ledtider. Tonen är designsystemets
 *  (ok/info/warn/bad); texten står alltid bredvid färgen. */
export const FAS_STATUS = {
  klar: ["ok", "Grind passerad"],
  redo: ["info", "Redo för grind"],
  pagar: ["info", "Pågår"],
  sen: ["bad", "Försenad"],
  kommande: ["", "Kommande"],
  odaterad: ["", "Ej planerad"],
};

export const LEDTID_STATUS = {
  sen: ["bad", "Försenad"],
  snart: ["warn", "Starta nu"],
  "i-tid": ["", "I tid"],
  bevaka: ["info", "Bevaka"],
  odaterad: ["", "Datum saknas"],
  klar: ["ok", "Klar"],
  passerad: ["", "Fasen passerad"],
};

/** Så här många dagar före sista startdatum blir en ledtid gul. */
export const VARNING_DAGAR = 14;

/* ---------- Datum ---------- */

const tillDatum = (iso) => new Date(iso + "T00:00:00");
export const plusDagar = (iso, n) => {
  const d = tillDatum(iso);
  d.setDate(d.getDate() + Math.round(n));
  return lokaltDatum(d);
};
export const dagarMellan = (fran, till) => Math.round((tillDatum(till) - tillDatum(fran)) / 86400000);
const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);

/* ---------- Avbockning ---------- */

export function punktRad(state, pid, punkt) {
  return (state.epcStatus || []).find((r) => r.projektId === pid && r.punkt === punkt) || null;
}

export const arKlar = (state, pid, punkt) => !!punktRad(state, pid, punkt)?.klar;

export function fasRad(state, pid, nr) {
  return (state.epcFaser || []).find((r) => r.projektId === pid && r.fas === nr) || null;
}

/* ---------- Fasplan ---------- */

const BESS_LEVERANS = (state, pid) =>
  state.leveranser
    .filter((l) => l.projektId === pid && giltigt(l.datum) && BESS_MATCH.test(l.benamning))
    .sort((a, b) => a.datum.localeCompare(b.datum))[0] || null;

/** Projektets tre ankare för standardplanen. null om start eller slut saknas. */
export function planAnkare(state, pid) {
  const p = projekt(state, pid);
  if (!p || !giltigt(p.startdatum) || !giltigt(p.fardigstallande)) return null;
  const start = p.startdatum;
  const slut = p.fardigstallande;
  if (dagarMellan(start, slut) <= 0) return null;

  // Leveransen styr mitten av planen när den ligger mellan start och slut.
  const lev = BESS_LEVERANS(state, pid);
  const levOk = lev && lev.datum > start && lev.datum < slut;
  return {
    start,
    slut,
    mitt: levOk ? lev.datum : plusDagar(start, dagarMellan(start, slut) * 0.7),
    mittKalla: levOk ? "leverans" : "mall",
    startAntagande: !!p.startdatumAntagande,
  };
}

/** Ett läge på MALL_SKALA som datum, givet projektets ankare. */
export function mallDatum(pos, a) {
  if (pos < 0) return plusDagar(a.start, pos * MALL_SKALA.foreStartDagar);
  if (pos <= 1) return plusDagar(a.start, pos * dagarMellan(a.start, a.mitt));
  if (pos <= 2) return plusDagar(a.mitt, (pos - 1) * dagarMellan(a.mitt, a.slut));
  return plusDagar(a.slut, (pos - 2) * MALL_SKALA.efterSlutDagar);
}

/** Start och slut per fas: egna datum där de finns, annars standardplanen. */
export function fasplan(state, pid) {
  const a = planAnkare(state, pid);
  return FASER.map((f) => {
    const r = fasRad(state, pid, f.nr);
    const egenStart = giltigt(r?.start) ? r.start : null;
    const egetSlut = giltigt(r?.slut) ? r.slut : null;
    const start = egenStart || (a ? mallDatum(f.mall.fran, a) : null);
    const slut = egetSlut || (a ? mallDatum(f.mall.till, a) : null);
    return { nr: f.nr, start, slut, egen: !!(egenStart || egetSlut) };
  });
}

/* ---------- Grindar ---------- */

/** Passerad grind per fas. Källan redovisas: angiven i checklistan,
 *  härledd ur en fakturerad milstolpe, eller följd av att en senare grind
 *  är passerad — nästa fas startar inte förrän grinden är passerad. */
export function grindar(state, pid) {
  const ut = FASER.map((f) => {
    const r = fasRad(state, pid, f.nr);
    if (giltigt(r?.grindDatum)) return { nr: f.nr, passerad: true, kalla: "angiven", datum: r.grindDatum };
    const koder = MILSTOLPAR.filter((m) => m.grind === f.grind.kod).map((m) => m.kod);
    const fakt = koder.some((k) => betalRad(state, pid, k)?.status === "fakturerad");
    if (fakt) return { nr: f.nr, passerad: true, kalla: "betalplan", datum: null };
    return { nr: f.nr, passerad: false, kalla: null, datum: null };
  });
  const hogsta = Math.max(-1, ...ut.filter((g) => g.passerad).map((g) => g.nr));
  return ut.map((g) => (g.passerad || g.nr > hogsta ? g : { ...g, passerad: true, kalla: "följd" }));
}

/* ---------- Faser ---------- */

const PUNKTER_I_FAS = FASER.map((f) => f.sektioner.flatMap((s) => s.punkter));

/** Allt om projektets faser i ett svep — det Gantt-schemat och kapitlet ritar. */
export function faslage(state, pid, nu = idag()) {
  const plan = fasplan(state, pid);
  const g = grindar(state, pid);
  const klara = new Set((state.epcStatus || []).filter((r) => r.projektId === pid && r.klar).map((r) => r.punkt));

  return FASER.map((f, i) => {
    const punkter = PUNKTER_I_FAS[i];
    const hp = punkter.filter((p) => p.badges.includes("HP"));
    const antalKlara = punkter.filter((p) => klara.has(p.id)).length;
    const { start, slut, egen } = plan[i];

    let status;
    if (g[i].passerad) status = "klar";
    else if (antalKlara === punkter.length) status = "redo";
    else if (!start || !slut) status = "odaterad";
    else if (nu > slut) status = "sen";
    else if (nu >= start) status = "pagar";
    else status = "kommande";

    return {
      fas: f,
      start,
      slut,
      egenPlan: egen,
      grind: g[i],
      status,
      klara: antalKlara,
      totalt: punkter.length,
      hp: hp.length,
      hpKlara: hp.filter((p) => klara.has(p.id)).length,
    };
  });
}

/* ---------- Milstolpar på tidslinjen ---------- */

export function milstolpslage(state, pid, faser = faslage(state, pid)) {
  return MILSTOLPAR.map((m) => {
    const f = faser.find((x) => x.fas.grind.kod === m.grind);
    const b = betalRad(state, pid, m.kod);
    const bas = f?.grind.datum || f?.slut || null;
    const datum = bas && m.kod === "M7" ? plusDagar(bas, M7_EFTER_SB_DAGAR) : bas;
    return {
      ...m,
      datum,
      status: b?.status === "fakturerad" ? "fakturerad" : b?.status === "pagaende" ? "pagaende" : "kvar",
    };
  });
}

/* ---------- Ledtider ---------- */

const MV_LEVERANS = /mv[- ]?(station|ställverk|skid)/i;
const IDRIFTTAGNING = /cold comm\w*\.? start|idrifttag/i;

/** Datum som ledtiderna räknas mot, med källa. Kända datum i portföljen går
 *  före fasplanen — en bekräftad leverans är bättre än en mall. */
export function ankardatum(state, pid, faser = faslage(state, pid)) {
  const p = projekt(state, pid);
  const fas = (nr) => faser[nr];
  const franPlan = (nr, falt) => ({ datum: fas(nr)[falt], kalla: "fasplan", fas: nr });

  const bess = BESS_LEVERANS(state, pid);
  const mv = state.leveranser
    .filter((l) => l.projektId === pid && giltigt(l.datum) && MV_LEVERANS.test(l.benamning))
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];
  const idrift = state.milstolpar
    .filter((m) => m.projektId === pid && giltigt(m.datum) && IDRIFTTAGNING.test(m.titel))
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  return {
    byggstart: franPlan(5, "start"),
    schaktstart: franPlan(6, "start"),
    bessLeverans: bess ? { datum: bess.datum, kalla: "leveranslistan", fas: 11 } : franPlan(11, "start"),
    mvLeverans: mv ? { datum: mv.datum, kalla: "leveranslistan", fas: 10 } : franPlan(10, "start"),
    satStallverk: franPlan(10, "slut"),
    idrifttagning: idrift ? { datum: idrift.datum, kalla: "tidplanen", fas: 13 } : franPlan(13, "start"),
    slutbesiktning: giltigt(p?.fardigstallande)
      ? { datum: p.fardigstallande, kalla: "färdigställande", fas: 14 }
      : franPlan(14, "slut"),
  };
}

const ORDNING = { sen: 0, snart: 1, "i-tid": 2, bevaka: 3, odaterad: 4, klar: 5, passerad: 6 };

/** Varje ledtid mot projektet: sista startdatum, dagar kvar och läge.
 *  Röd när datumet passerat, gul inom VARNING_DAGAR. En ledtid vars ankare
 *  ligger i en fas med passerad grind räknas som passerad, inte försenad —
 *  arbetet den skulle förbereda är redan gjort. */
export function ledtidslage(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const ank = ankardatum(state, pid, faser);

  return LEDTIDER.map((l) => {
    const bas = { ...l, projektId: pid, klar: arKlar(state, pid, l.punkt) };
    if (!l.ankare) return { ...bas, status: bas.klar ? "klar" : "bevaka", senast: null, dagarKvar: null, ank: null };

    const a = ank[l.ankare];
    const senast = a.datum ? plusDagar(a.datum, l.riktning === "fore" ? -l.dagar : l.dagar) : null;
    const dagarKvar = senast ? dagarMellan(nu, senast) : null;
    const ankInfo = { ...a, namn: ANKARE_NAMN[l.ankare] };

    let status;
    if (bas.klar) status = "klar";
    else if (l.riktning === "fore" && faser[a.fas].grind.passerad) status = "passerad";
    else if (!senast) status = "odaterad";
    else if (dagarKvar < 0) status = "sen";
    else if (dagarKvar <= VARNING_DAGAR) status = "snart";
    else status = "i-tid";

    return { ...bas, status, senast, dagarKvar, ank: ankInfo };
  }).sort((a, b) => ORDNING[a.status] - ORDNING[b.status] || (a.dagarKvar ?? 1e9) - (b.dagarKvar ?? 1e9));
}

/** Ledtider över alla projekt som har en plan, mest brådskande först. */
export function ledtiderPortfolj(state, nu = idag()) {
  return state.projekt
    .filter((p) => planAnkare(state, p.id))
    .flatMap((p) => ledtidslage(state, p.id, nu))
    .sort((a, b) => ORDNING[a.status] - ORDNING[b.status] || (a.dagarKvar ?? 1e9) - (b.dagarKvar ?? 1e9));
}

/* ---------- Hållpunkter ---------- */

/** Hållpunkter som inte är godkända i faser som pågår, är sena eller startar
 *  inom `inom` dagar. Sorterade på fasens start. */
export function kommandeHallpunkter(state, pid, inom = 30, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const grans = plusDagar(nu, inom);
  return faser
    .filter((f) => ["pagar", "sen", "redo"].includes(f.status) || (f.status === "kommande" && f.start <= grans))
    .flatMap((f) =>
      PUNKTER_I_FAS[f.fas.nr]
        .filter((p) => p.badges.includes("HP") && !arKlar(state, pid, p.id))
        .map((p) => ({ punkt: p, fas: f, projektId: pid }))
    )
    .sort((a, b) => (a.fas.start || "9999").localeCompare(b.fas.start || "9999"));
}

/* ---------- Sammanfattning ---------- */

export function checklistlage(state, pid) {
  const klara = new Set((state.epcStatus || []).filter((r) => r.projektId === pid && r.klar).map((r) => r.punkt));
  let antal = 0;
  let hp = 0;
  let hpKlara = 0;
  // Räknar bara id:n som finns i checklistan — en sparad rad för en punkt som
  // senare tagits bort ska inte blåsa upp procenten.
  for (const [id, p] of PUNKT_FOR_ID) {
    const klar = klara.has(id);
    if (klar) antal++;
    if (!p.badges.includes("HP")) continue;
    hp++;
    if (klar) hpKlara++;
  }
  return { klara: antal, totalt: PUNKT_FOR_ID.size, hp, hpKlara };
}
