import { ataSummering, gallerFor, oppnaRondavvikelser, slutdokIndex, underrattelseLage } from "./berakningar.js";
import { faslage, kontrollage, milstolpslage } from "./epc.js";
import { berakFlaggor } from "./flaggor.js";
import { kritiskLinje } from "./kritiskLinje.js";
import { budgetlage, ofakturerat, planeratProjekt, aktivaPersoner, planeratPerson } from "./planering.js";
import { riskNivaFranVarde } from "./risknivaer.js";
import { idag, veckaForskjut, veckaNu } from "./datum.js";
import { fmtSEK } from "./format.js";

/* Status per område för statusrapporterna, enligt ONE Nordics mallar (intern och kund).

   Varje område ger ett FÖRSLAG: { ton, text, regel }. ton är designsystemets
   ok / warn / bad / neutral = Grön / Gul / Röd / Inget underlag. Projektledaren sätter det
   slutliga ljuset i den interna rapporten; förslaget visas bredvid.

   Regler som gäller alla områden:
   - Inget underlag är aldrig grönt (samma regel som komponentLage och anbudsBedomning).
   - Automatiken går upp till gul eller röd bara på något som går att peka på (en försening,
     en passerad frist, en avvikelse). `regel` säger vad, så att färgen aldrig står ensam.
   - `kund: true` tar bara med det beställaren ska se: inga internkalkyler, tidrapporter,
     timpriser eller namn. Budget mot utfall och ofakturerad tid finns bara internt. */

export const OMRADEN = {
  tid: "Tid",
  leverabler: "Leverabler",
  kvalitet: "Kvalitet",
  resurser: "Resurser",
  ekonomi: "Ekonomi",
  ata: "ÄTA",
  risker: "Risker",
  fakturering: "Fakturering",
  eskalerat: "Eskalerade frågor",
};

/** Områdena i kundmallens ordning och i den interna mallens ordning. */
export const KUNDOMRADEN = ["tid", "leverabler", "kvalitet", "resurser", "ekonomi", "fakturering"];
export const INTERNA_OMRADEN = ["tid", "ekonomi", "resurser", "ata", "risker", "eskalerat", "kvalitet", "fakturering"];

export const TONNAMN = { ok: "Grön", warn: "Gul", bad: "Röd", neutral: "Inget underlag" };
const LJUS_TON = { gron: "ok", gul: "warn", rod: "bad" };
const TON_LJUS = { ok: "gron", warn: "gul", bad: "rod" };
export const ljusTillTon = (l) => LJUS_TON[l] || "neutral";
export const tonTillLjus = (t) => TON_LJUS[t] || "";

const r = (ton, text, regel) => ({ ton, text, regel });

/* ---------- Områdena ---------- */

/** Tid: kritiska linjens prognos mot kontraktets färdigdatum. 1–14 dagar sent är gult. */
export function tidStatus(state, pid, nu = idag()) {
  const k = kritiskLinje(state, pid, nu);
  if (!k || k.forsening === null) return r("neutral", "Prognos saknas: start- eller färdigdatum saknas.", "Kräver startdatum och färdigdatum.");
  const regel = "Kritisk linje mot kontraktets färdigdatum: i tid grön, 1–14 dagar sent gul, mer röd.";
  if (k.forsening <= 0) return r("ok", `Beräknad slutbesiktning ${k.slutPrognos}${k.forsening < 0 ? `, ${-k.forsening} dagar före` : ", i tid"}.`, regel);
  return r(k.forsening <= 14 ? "warn" : "bad", `Beräknad slutbesiktning ${k.slutPrognos}, ${k.forsening} dagar efter kontraktet ${k.kontrakt}.`, regel);
}

/** Leverabler: grindar och betalningsmilstolpar. En försenad grind är röd. */
export function leverablerStatus(state, pid, nu = idag()) {
  const fl = faslage(state, pid, nu);
  const klara = fl.filter((f) => f.status === "klar").length;
  const sena = fl.filter((f) => f.status === "sen");
  const slutdok = slutdokIndex(state, pid);
  const delar = [`${klara} av ${fl.length} moment med grind passerad`];
  if (slutdok.av) delar.push(`slutdokumentation ${slutdok.godkanda} av ${slutdok.av}`);
  const regel = "Moment med passerat slutdatum utan passerad grind ger röd.";
  if (sena.length) return r("bad", `${delar.join(", ")}. Försenat: ${sena.map((f) => f.fas.kort).join(", ")}.`, regel);
  if (!klara && !fl.some((f) => f.status === "pagar")) return r("neutral", `${delar.join(", ")}. Inget moment påbörjat.`, regel);
  return r("ok", `${delar.join(", ")}.`, regel);
}

/** Kvalitet: egenkontroller med avvikelse och öppna avvikelser från skyddsronder. */
export function kvalitetStatus(state, pid) {
  const kl = kontrollage(state, pid);
  const verifierade = kl.reduce((s, f) => s + f.verifierade, 0);
  const avvikelser = kl.reduce((s, f) => s + f.avvikelser, 0);
  const rond = oppnaRondavvikelser(state, pid).length;
  const regel = "Egenkontroll med resultat Ej OK eller öppen avvikelse från skyddsrond ger gul.";
  const delar = [`${verifierade} egenkontrollpunkter verifierade`];
  if (avvikelser) delar.push(`${avvikelser} med avvikelse`);
  if (rond) delar.push(`${rond} öppna avvikelser från skyddsrond`);
  if (avvikelser || rond) return r("warn", `${delar.join(", ")}.`, regel);
  if (!verifierade) return r("neutral", "Inga egenkontroller registrerade än.", regel);
  return r("ok", `${delar.join(", ")}, inga avvikelser.`, regel);
}

/** Resurser: bemanning på projektet kommande fyra veckor och överbelastade personer. */
export function resurserStatus(state, pid, { kund = false, vecka = veckaNu() } = {}) {
  const veckor = [0, 1, 2, 3].map((i) => veckaForskjut(vecka, i));
  const timmar = veckor.reduce((s, v) => s + planeratProjekt(state, pid, v), 0);
  const pa = new Set((state.bemanning || []).filter((b) => b.projektId === pid && veckor.includes(b.vecka)).map((b) => b.personId));
  const over = aktivaPersoner(state).filter((m) => pa.has(m.id) && veckor.some((v) => Number(m.kapacitet) && planeratPerson(state, m.id, v) > Number(m.kapacitet)));
  const regel = "Ingen planerad bemanning kommande fyra veckor saknar underlag; överbelastad person på projektet ger gul.";
  if (!timmar) return r("neutral", "Ingen bemanning planerad kommande fyra veckor.", regel);
  const bas = `${Math.round(timmar)} timmar planerade kommande fyra veckor${kund ? "" : `, ${pa.size} personer`}`;
  if (over.length) return r("warn", kund ? `${bas}. Bemanningen ses över.` : `${bas}. Överbelastade: ${over.map((m) => m.namn).join(", ")}.`, regel);
  return r("ok", `${bas}.`, regel);
}

/** Ekonomi. Internt: utfall mot budget. Till kunden: kontrakt och ÄTA, inga internkalkyler. */
export function ekonomiStatus(state, pid, { kund = false } = {}) {
  const ata = ataSummering(state, pid);
  if (kund) {
    const p = (state.projekt || []).find((x) => x.id === pid);
    const regel = "ÄTA som väntar på beslut ger gul.";
    const delar = [p?.kontraktsvarde ? `Kontrakt ${fmtSEK(p.kontraktsvarde)}` : "Kontraktsvärde ej angivet", `godkänd ÄTA ${fmtSEK(ata.godkant)}`];
    if (ata.pending) return r("warn", `${delar.join(", ")}. ÄTA för ${fmtSEK(ata.pending)} väntar på beslut.`, regel);
    return r(p?.kontraktsvarde ? "ok" : "neutral", `${delar.join(", ")}.`, regel);
  }
  const b = budgetlage(state, pid);
  const regel = "Utfall över budget ger röd, 90 % förbrukat gul. Bedöm mot färdiggrad i kommentaren.";
  if (!b.bud.kr) return r("neutral", "Ingen budget per aktivitet inlagd.", regel);
  const text = `Utfall ${fmtSEK(b.utf.kr)} av budget ${fmtSEK(b.bud.kr)} (${b.forbrukat} %).`;
  if (b.utf.kr > b.bud.kr) return r("bad", text, regel);
  if (b.forbrukat >= 90) return r("warn", text, regel);
  return r("ok", text, regel);
}

/** ÄTA: öppna, väntande belopp och underrättelser vars 24-timmarsfrist passerat. */
export function ataStatus(state, pid) {
  const rader = (state.ur || []).filter((u) => u.projektId === pid && !["stangd", "utgar"].includes(u.status));
  const sena = rader.filter((u) => underrattelseLage(u)?.varning);
  const s = ataSummering(state, pid);
  const regel = "Passerad underrättelsefrist ger röd, ÄTA som väntar på beslut gul.";
  const text = `${s.oppna} öppna ÄTA, godkänt ${fmtSEK(s.godkant)}${s.pending ? `, väntar beslut ${fmtSEK(s.pending)}` : ""}.`;
  if (sena.length) return r("bad", `${text} ${sena.length} saknar underrättelse efter 24 timmar.`, regel);
  if (s.pending) return r("warn", text, regel);
  return r("ok", s.antal ? text : "Inga ÄTA registrerade.", regel);
}

/** Risker: högsta öppna risknivå. Saknas riskregister är det inget underlag, inte grönt. */
export function riskerStatus(state, pid) {
  const alla = (state.risker || []).filter((x) => gallerFor(x, pid));
  const oppna = alla.filter((x) => x.status !== "stangd");
  const niva = (x) => riskNivaFranVarde((Number(x.sannolikhet) || 0) * (Number(x.konsekvens) || 0));
  const hoga = oppna.filter((x) => niva(x) === "hog").length;
  const medel = oppna.filter((x) => niva(x) === "medel").length;
  const regel = "Öppen hög risk (15–25) ger röd, medel (7–14) gul.";
  if (!alla.length) return r("neutral", "Riskanalys ej framtagen: inga risker i registret.", regel);
  const text = `${oppna.length} öppna risker${hoga ? `, ${hoga} höga` : ""}${medel ? `, ${medel} medel` : ""}.`;
  return r(hoga ? "bad" : medel ? "warn" : "ok", text, regel);
}

/** Fakturering. Milstolpe med passerad grind som inte aviserats, och godkänd ÄTA ej fakturerad. */
export function faktureringStatus(state, pid, { kund = false, nu = idag() } = {}) {
  const fl = faslage(state, pid, nu);
  const ms = milstolpslage(state, pid, fl);
  const grindKlar = (m) => fl.find((f) => f.fas.grind.kod === m.grind)?.status === "klar";
  const ejAviserade = ms.filter((m) => m.status === "kvar" && grindKlar(m));
  const ata = ataSummering(state, pid);
  const fakt = ms.filter((m) => m.status === "fakturerad").length;
  const regel = "Milstolpe med passerad grind som inte aviserats, eller godkänd ÄTA som inte fakturerats, ger gul.";
  const delar = [`${fakt} av ${ms.length} milstolpar fakturerade`];
  if (ejAviserade.length) delar.push(`att avisera: ${ejAviserade.map((m) => m.kod).join(", ")}`);
  if (ata.ejFakt) delar.push(`godkänd ÄTA ej fakturerad ${fmtSEK(ata.ejFakt)}`);
  if (!kund) {
    const o = ofakturerat(state, pid);
    if (o.summa) delar.push(`ofakturerad tid och kostnad ${fmtSEK(o.summa)}`);
  }
  return r(ejAviserade.length || ata.ejFakt ? "warn" : "ok", `${delar.join(", ")}.`, regel);
}

/** Eskalerade frågor: appens höga flaggor plus de PL har skrivit in i rapporten. */
export function eskaleratStatus(state, pid, egna = []) {
  const hoga = berakFlaggor(state).filter((f) => f.niva === "hog" && f.projektId === pid);
  const oppna = egna.filter((e) => String(e.beskrivning || "").trim() && e.status !== "Beslutad");
  const regel = "Öppen fråga som kräver beslut eller åtgärd över projektnivå ger gul.";
  if (!hoga.length && !oppna.length) return r("ok", "Inga frågor kräver beslut över projektnivå.", regel);
  const delar = [];
  if (oppna.length) delar.push(`${oppna.length} öppna eskalerade ${oppna.length === 1 ? "fråga" : "frågor"}`);
  if (hoga.length) delar.push(`${hoga.length} ${hoga.length === 1 ? "hög varning" : "höga varningar"} i appen att ta ställning till`);
  const text = delar.join(", ");
  return r("warn", `${text[0].toUpperCase()}${text.slice(1)}.`, regel);
}

/** Alla förslag för ett projekt. */
export function statusOmraden(state, pid, { kund = false, nu = idag(), egnaFragor = [] } = {}) {
  return {
    tid: tidStatus(state, pid, nu),
    leverabler: leverablerStatus(state, pid, nu),
    kvalitet: kvalitetStatus(state, pid),
    resurser: resurserStatus(state, pid, { kund }),
    ekonomi: ekonomiStatus(state, pid, { kund }),
    ata: ataStatus(state, pid),
    risker: riskerStatus(state, pid),
    fakturering: faktureringStatus(state, pid, { kund, nu }),
    eskalerat: eskaleratStatus(state, pid, egnaFragor),
  };
}

/* ---------- Intern statusrapport per månad ---------- */

/** Månaden en rapport gäller: "2026-10". */
export const periodFor = (datum = idag()) => String(datum).slice(0, 7);

/** Nyckeltal som fryses när rapporten låses, för jämförelse nästa månad. Bara det som finns
 *  i portfolj/state: kontraktsvärde och betalplan ligger i ekonomidokumentet och tas inte med. */
export function nyckeltalFor(state, pid, nu = idag()) {
  const k = kritiskLinje(state, pid, nu);
  const b = budgetlage(state, pid);
  const a = ataSummering(state, pid);
  const oppnaRisker = (state.risker || []).filter((x) => gallerFor(x, pid) && x.status !== "stangd").length;
  return {
    slutPrognos: k?.slutPrognos || null,
    forsening: k?.forsening ?? null,
    budget: Math.round(b.bud.kr) || 0,
    utfall: Math.round(b.utf.kr) || 0,
    ataGodkant: a.godkant,
    ataVantar: a.pending,
    ataOppna: a.oppna,
    oppnaRisker,
  };
}

/** Topp tre öppna risker efter riskvärde. */
export function toppRisker(state, pid, antal = 3) {
  return (state.risker || [])
    .filter((x) => gallerFor(x, pid) && x.status !== "stangd")
    .map((x) => ({ ...x, varde: (Number(x.sannolikhet) || 0) * (Number(x.konsekvens) || 0) }))
    .sort((a, b) => b.varde - a.varde)
    .slice(0, antal);
}

/** Rapporten för perioden och den senaste före den. */
export function rapporterFor(state, pid, period = periodFor()) {
  const egna = (state.statusrapporter || []).filter((x) => x.projektId === pid).sort((a, b) => b.period.localeCompare(a.period));
  return { aktuell: egna.find((x) => x.period === period) || null, foregaende: egna.find((x) => x.period < period) || null, alla: egna };
}

/** En tom rapport för perioden, med förslagen som ljus. */
export function nyStatusrapport(state, pid, period = periodFor(), id = `sr-${pid}-${period}`) {
  const f = statusOmraden(state, pid);
  return {
    id,
    projektId: pid,
    period,
    status: "utkast",
    omraden: Object.fromEntries(INTERNA_OMRADEN.map((o) => [o, { ljus: tonTillLjus(f[o].ton), kommentar: "" }])),
    sammanfattning: "",
    eac: "",
    eskalerade: [],
    nyckeltal: null,
    last: null,
  };
}

export const MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
export const periodNamn = (p) => (p ? `${MANADER[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : "");

/** Nyckeltalsraderna: [namn, nu, föregående] med formatering. */
export function nyckeltalRader(nu, fore) {
  const kr = (v) => (v === null || v === undefined ? "—" : fmtSEK(v));
  const dagar = (v) => (v === null || v === undefined ? "—" : v > 0 ? `${v} dagar sent` : v < 0 ? `${-v} dagar före` : "I tid");
  const st = (v) => (v === null || v === undefined ? "—" : String(v));
  return [
    ["Beräknad slutbesiktning", st(nu.slutPrognos), st(fore?.slutPrognos)],
    ["Mot kontraktets färdigdatum", dagar(nu.forsening), dagar(fore?.forsening)],
    ["Budget (aktiviteter)", kr(nu.budget), kr(fore?.budget)],
    ["Utfall", kr(nu.utfall), kr(fore?.utfall)],
    ["Godkänd ÄTA", kr(nu.ataGodkant), kr(fore?.ataGodkant)],
    ["ÄTA som väntar beslut", kr(nu.ataVantar), kr(fore?.ataVantar)],
    ["Öppna ÄTA", st(nu.ataOppna), st(fore?.ataOppna)],
    ["Öppna risker", st(nu.oppnaRisker), st(fore?.oppnaRisker)],
  ];
}
