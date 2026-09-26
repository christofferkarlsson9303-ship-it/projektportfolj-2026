/* BESS EPC-checklistan mot ett projekt: lägesbild, fasplan, grindar,
   milstolpar, ledtider, hållpunkter, nästa uppgift och erfarenheter. Rena
   funktioner som resten av lib/.

   Datan om checklistan ligger i data/bessChecklistData.ts. Varje punkt
   bockas av för sig, och en passerad grind gör dessutom alla fasens punkter
   genomförda — grinden är det formella beskedet att fasen är klar. Per
   projekt sparas bara det som avviker:

   - state.epcFaser        en rad per fas med egna datum, passerad grind och
                           anteckningar
   - state.epcLedtider     en rad per ledtid som markerats klar i förväg
   - state.epcPunkter      en rad per punkt som är klar eller ej aktuell
   - state.epcKommentarer  kommentarer, avvikelser och lärdomar per punkt

   Fasplanen är en utgångspunkt, inte en tidplan. Den räknas fram ur start,
   BESS-leverans och slutbesiktning, och varje fas kan få egna datum. */

import {
  ALLA_PUNKTER,
  ANKARE_NAMN,
  FASER,
  LEDTIDER,
  M7_EFTER_SB_DAGAR,
  MALL_SKALA,
  MILSTOLPAR,
  PUNKT_FOR_ID,
} from "../data/bessChecklistData.ts";
import { BESS_MATCH, betalRad, projekt } from "./berakningar.js";
import { datumKort, idag, lokaltDatum } from "./datum.js";

/** Status → [ton, text] för faser och ledtider. Tonen är designsystemets
 *  (ok/info/warn/bad); texten står alltid bredvid färgen. */
export const FAS_STATUS = {
  klar: ["ok", "Grind passerad"],
  pagar: ["info", "Pågår"],
  sen: ["bad", "Försenad"],
  kommande: ["", "Kommande"],
  odaterad: ["", "Ej planerad"],
};

export const LEDTID_STATUS = {
  ejaktuell: ["", "Ej aktuell"],
  sen: ["bad", "Försenad"],
  snart: ["warn", "Starta nu"],
  "i-tid": ["", "I tid"],
  bevaka: ["info", "Bevaka"],
  odaterad: ["", "Datum saknas"],
  klar: ["ok", "Klar"],
  passerad: ["", "Fasen passerad"],
};

/** Kommentarstyper på en punkt. Avvikelser och lärdomar blir erfarenheter. */
export const KOMMENTARTYP = {
  notering: { namn: "Notering", ton: "" },
  avvikelse: { namn: "Avvikelse", ton: "bad" },
  lardom: { namn: "Lärdom", ton: "info" },
};

export const PAVERKAN = { 1: "Låg", 2: "Medel", 3: "Hög" };

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

/* ---------- Sparade rader ---------- */

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

/* ---------- Kontrollpunkter ---------- */

const PUNKTER_I_FAS = FASER.map((f) => f.sektioner.flatMap((s) => s.punkter));

/** Status per punkt: "klar", "ejaktuell" eller "oppen", med källa. En
 *  passerad grind gör fasens öppna punkter klara (källa "grind"); det som
 *  satts som ej aktuellt förblir det. Löpande punkter har ingen grind. */
export function punktlage(state, pid, g = grindar(state, pid)) {
  const rader = new Map(
    (state.epcPunkter || []).filter((r) => r.projektId === pid && r.status).map((r) => [r.punkt, r])
  );
  const ut = new Map();
  for (const kp of ALLA_PUNKTER) {
    const r = rader.get(kp.id);
    if (r) ut.set(kp.id, { status: r.status, kalla: "markerad", datum: r.datum || null, av: r.av || "" });
    else if (kp.fas !== null && g[kp.fas].passerad)
      ut.set(kp.id, { status: "klar", kalla: "grind", datum: g[kp.fas].datum, av: "" });
    else ut.set(kp.id, { status: "oppen", kalla: null, datum: null, av: "" });
  }
  return ut;
}

/** Räknar klara, ej aktuella och öppna punkter och hållpunkter i en lista. */
function rakna(punkter, pl) {
  const r = { punkter: punkter.length, klara: 0, ejAktuella: 0, kvar: 0, hp: 0, hpKlara: 0, hpKvar: 0 };
  for (const p of punkter) {
    const st = pl.get(p.id).status;
    const hp = p.badges.includes("HP");
    if (st === "klar") r.klara++;
    else if (st === "ejaktuell") r.ejAktuella++;
    else r.kvar++;
    if (hp) {
      r.hp++;
      if (st === "klar") r.hpKlara++;
      else if (st === "oppen") r.hpKvar++;
    }
  }
  return r;
}

/* ---------- Faser ---------- */

/** Allt om projektets faser i ett svep — det Gantt-schemat och kapitlet ritar. */
export function faslage(state, pid, nu = idag()) {
  const plan = fasplan(state, pid);
  const g = grindar(state, pid);
  const pl = punktlage(state, pid, g);

  return FASER.map((f, i) => {
    const punkter = PUNKTER_I_FAS[i];
    const { start, slut, egen } = plan[i];

    let status;
    if (g[i].passerad) status = "klar";
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
      ...rakna(punkter, pl),
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

const ORDNING = { sen: 0, snart: 1, "i-tid": 2, bevaka: 3, odaterad: 4, klar: 5, passerad: 6, ejaktuell: 7 };

/** Varje ledtid mot projektet: sista startdatum, dagar kvar och läge.
 *  Röd när datumet passerat, gul inom VARNING_DAGAR. En ledtid vars ankare
 *  ligger i en fas med passerad grind räknas som passerad, inte försenad —
 *  arbetet den skulle förbereda är redan gjort. */
export function ledtidslage(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const ank = ankardatum(state, pid, faser);
  const pl = punktlage(state, pid, faser.map((f) => f.grind));
  const markerade = new Set(
    (state.epcLedtider || []).filter((r) => r.projektId === pid && r.klar).map((r) => r.ledtid)
  );

  return LEDTIDER.map((l) => {
    // Klar när den markerats i förväg, eller när dess punkt är klar (bockad
    // eller via passerad grind). En punkt som inte är aktuell har ingen ledtid.
    const markerad = markerade.has(l.id);
    const punkt = pl.get(l.punkt).status;
    const bas = { ...l, projektId: pid, markerad, klar: markerad || punkt === "klar" };
    if (punkt === "ejaktuell" && !markerad)
      return { ...bas, status: "ejaktuell", senast: null, dagarKvar: null, ank: null };
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

/** Hållpunkter i faser som pågår, är sena eller startar inom `inom` dagar —
 *  det som ska godkännas härnäst. Sorterade på fasens start. */
export function kommandeHallpunkter(state, pid, inom = 30, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const pl = punktlage(state, pid, faser.map((f) => f.grind));
  const grans = plusDagar(nu, inom);
  return faser
    .filter((f) => ["pagar", "sen"].includes(f.status) || (f.status === "kommande" && f.start <= grans))
    .flatMap((f) =>
      PUNKTER_I_FAS[f.fas.nr]
        .filter((p) => p.badges.includes("HP") && pl.get(p.id).status === "oppen")
        .map((p) => ({ punkt: p, fas: f, projektId: pid }))
    )
    .sort((a, b) => (a.fas.start || "9999").localeCompare(b.fas.start || "9999"));
}

/* ---------- Lägesbild ---------- */

/** Var projektet står: pågående faser, nästa grind och betalning, passerade
 *  grindar, klara hållpunkter, dagar till slutbesiktning. */
export function lagesbild(state, pid, nu = idag()) {
  const p = projekt(state, pid);
  const faser = faslage(state, pid, nu);
  const ms = milstolpslage(state, pid, faser);
  const passerade = faser.filter((f) => f.grind.passerad);
  const sb = giltigt(p?.fardigstallande) ? dagarMellan(nu, p.fardigstallande) : null;

  return {
    harPlan: !!planAnkare(state, pid),
    faser,
    aktuella: faser.filter((f) => f.status === "pagar" || f.status === "sen"),
    sena: faser.filter((f) => f.status === "sen"),
    nastaGrind: faser.find((f) => !f.grind.passerad) || null,
    nastaBetalning:
      ms
        .filter((m) => m.status !== "fakturerad")
        .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))[0] || null,
    grindarPasserade: passerade.length,
    hp: faser.reduce((n, f) => n + f.hp, 0),
    hpKlara: faser.reduce((n, f) => n + f.hpKlara, 0),
    dagarTillSlutbesiktning: sb,
  };
}

/* ---------- Summering ---------- */

const LOPANDE_PUNKTER = ALLA_PUNKTER.filter((p) => p.fas === null);

/** Exakt status för hela checklistan: per fas och totalt, löpande punkter
 *  som en egen rad. Andel klart räknas på det som är aktuellt. */
export function checklistsummering(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const pl = punktlage(state, pid, faser.map((f) => f.grind));
  const lopande = rakna(LOPANDE_PUNKTER, pl);
  const falt = ["punkter", "klara", "ejAktuella", "kvar", "hp", "hpKlara", "hpKvar"];
  const totalt = Object.fromEntries(falt.map((k) => [k, faser.reduce((n, f) => n + f[k], 0) + lopande[k]]));
  const aktuella = totalt.punkter - totalt.ejAktuella;
  return {
    faser,
    lopande,
    totalt: {
      ...totalt,
      grindar: faser.filter((f) => f.grind.passerad).length,
      andel: aktuella ? Math.round((totalt.klara / aktuella) * 100) : 100,
    },
  };
}

/* ---------- Nästa uppgift ---------- */

/** Kön av det som ska göras härnäst i projektet, viktigast först:
 *  1. punkter med en ledtid som är försenad eller ska startas nu
 *  2. öppna punkter i försenade och pågående faser, i checklistans ordning —
 *     och grinden när alla fasens punkter är klara
 *  3. om inget pågår: första fasen vars grind inte är passerad
 *  4. förberedelse: nästa fas som startar
 *  Varje post har en orsak i klartext och en ton (bad/warn/ok/""). */
export function nastaUppgifter(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  const pl = punktlage(state, pid, faser.map((f) => f.grind));
  const oppen = (id) => pl.get(id).status === "oppen";
  const ut = [];
  const sedda = new Set();
  const lagg = (post) => {
    const nyckel = post.typ === "grind" ? "G" + post.fas.fas.nr : post.punkt.id;
    if (sedda.has(nyckel)) return;
    sedda.add(nyckel);
    ut.push(post);
  };

  for (const l of ledtidslage(state, pid, nu)) {
    if ((l.status !== "sen" && l.status !== "snart") || !oppen(l.punkt)) continue;
    const kp = PUNKT_FOR_ID.get(l.punkt);
    lagg({
      typ: "punkt",
      punkt: kp,
      fas: faser[kp.fas],
      ton: l.status === "sen" ? "bad" : "warn",
      orsak:
        l.status === "sen"
          ? `Ledtid försenad — skulle ha startat ${datumKort(l.senast)}`
          : `Ledtid — starta senast ${datumKort(l.senast)}`,
    });
  }

  const fasPoster = (f, orsak, ton) => {
    const oppna = PUNKTER_I_FAS[f.fas.nr].filter((p) => oppen(p.id));
    for (const p of oppna) lagg({ typ: "punkt", punkt: p, fas: f, ton, orsak });
    if (!oppna.length && !f.grind.passerad)
      lagg({ typ: "grind", fas: f, ton: "ok", orsak: `Alla punkter i fas ${f.fas.nr} är klara — dags för ${f.fas.grind.kod}` });
  };

  const sena = faser.filter((f) => f.status === "sen");
  const pagar = faser.filter((f) => f.status === "pagar");
  for (const f of sena) fasPoster(f, `Fas ${f.fas.nr} är försenad`, "bad");
  for (const f of pagar) fasPoster(f, `Fas ${f.fas.nr} pågår`, "");

  const ejPasserade = faser.filter((f) => !f.grind.passerad && f.status !== "sen" && f.status !== "pagar");
  if (!sena.length && !pagar.length && ejPasserade.length) {
    const f = ejPasserade[0];
    fasPoster(f, f.start ? `Fas ${f.fas.nr} startar ${datumKort(f.start)}` : `Nästa fas: ${f.fas.nr}`, "");
  } else if (ejPasserade.length) {
    const f = ejPasserade[0];
    fasPoster(f, f.start ? `Förbered fas ${f.fas.nr} — startar ${datumKort(f.start)}` : `Förbered fas ${f.fas.nr}`, "");
  }
  return ut;
}

/* ---------- Erfarenheter ---------- */

const TYPVIKT = { avvikelse: 1, lardom: 0 };
const kronor = (v) => Number(String(v ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;

/** Avvikelser och lärdomar som erfarenhetslista, vassast först: påverkan,
 *  hur många projekt samma punkt gett problem i, kostnad, typ och datum.
 *  Utan pid gäller den hela portföljen. */
export function erfarenheter(state, pid = null) {
  const alla = (state.epcKommentarer || []).filter((k) => k.typ === "avvikelse" || k.typ === "lardom");
  const projektPerPunkt = new Map();
  for (const k of alla) {
    if (!projektPerPunkt.has(k.punkt)) projektPerPunkt.set(k.punkt, new Set());
    projektPerPunkt.get(k.punkt).add(k.projektId);
  }
  return alla
    .filter((k) => !pid || k.projektId === pid)
    .map((k) => ({
      ...k,
      kp: PUNKT_FOR_ID.get(k.punkt) || null,
      kostnadKr: kronor(k.kostnad),
      aterkommer: projektPerPunkt.get(k.punkt).size,
    }))
    .sort(
      (a, b) =>
        (b.paverkan || 0) - (a.paverkan || 0) ||
        b.aterkommer - a.aterkommer ||
        b.kostnadKr - a.kostnadKr ||
        TYPVIKT[b.typ] - TYPVIKT[a.typ] ||
        (b.datum || "").localeCompare(a.datum || "")
    );
}

/** Avvikelser och lärdomar på samma punkt från andra projekt — det som
 *  ska göra nästa projekt bättre, visat där det behövs. */
export function tidigareErfarenheter(state, punktId, pid) {
  return erfarenheter(state).filter((k) => k.punkt === punktId && k.projektId !== pid);
}

/** Kommentarer på en punkt i projektet, äldst först. */
export function kommentarerFor(state, pid, punktId) {
  return (state.epcKommentarer || []).filter((k) => k.projektId === pid && k.punkt === punktId);
}
