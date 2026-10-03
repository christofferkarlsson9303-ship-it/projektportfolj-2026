/* Ekonomiprognos per projekt — det ledning och controller frågar efter:
   vad blir slutkostnaden, vad blir täckningsbidraget, och ligger faktureringen
   före eller efter det som är upparbetat?

   Begrepp (svensk entreprenadpraxis, EVM-termer inom parentes):
   - Budget (BAC)            summan av aktiviteternas budget
   - Utfall (AC)             rapporterad tid × á-pris + registrerade kostnader
   - Kvar (ETC)              projektledarens bedömning per aktivitet om den är
                             satt (prognosKvar), annars budget minus utfall,
                             aldrig under noll
   - Prognos slutkostnad (EAC) utfall + kvar
   - Intäkt                  kontraktsvärde + godkända ÄTA. Väntande ÄTA visas
                             separat — de är inte intjänade förrän de är godkända.
   - Färdigställandegrad     utfall / prognos slutkostnad (kostnadsbaserad)
   - Upparbetad intäkt       intäkt × färdigställandegrad
   - Över-/underfakturerat   fakturerat − upparbetad intäkt. Negativt betyder
                             att arbete är utfört men inte fakturerat.

   Allt räknas ur det som redan finns i appen; inget hämtas utifrån. */

import { ataSummering, ekonomi } from "./berakningar.js";
import { aktiviteterFor, budgetAktivitet, timkostnad, utfallAktivitet } from "./planering.js";
import { veckaNu } from "./datum.js";

const tal = (v) => Number(v) || 0;
const harTal = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/** Kvar per aktivitet: egen bedömning om den finns, annars budget − utfall (≥ 0). */
export function kvarAktivitet(a, budgetKr, utfallKr) {
  if (harTal(a.prognosKvar)) return { kr: Math.max(0, Number(a.prognosKvar)), kalla: "bedomning" };
  return { kr: Math.max(0, budgetKr - utfallKr), kalla: "budget" };
}

/** ÄTA-belopp som fakturerats: status fakturerad, eller stängd med fakturadatum. */
function ataFakturerat(state, pid) {
  return state.ur
    .filter((u) => u.projektId === pid && (u.status === "fakturerad" || (u.status === "stangd" && u.fakturaDatum)))
    .reduce((s, u) => s + tal(u.belopp), 0);
}

/** Utfall som inte är knutet till någon av projektets aktiviteter (saknar
 *  aktivitet, eller pekar på en som inte finns) — ska ändå med i slutkostnaden. */
function utfallUtanAktivitet(state, pid) {
  const aktiva = new Set(aktiviteterFor(state, pid).map((a) => a.id));
  const los = (r) => r.projektId === pid && !aktiva.has(r.aktivitetId);
  const tid = state.tidrader.filter(los).reduce((s, t) => s + timkostnad(state, t), 0);
  const kost = state.kostnader.filter(los).reduce((s, k) => s + tal(k.belopp), 0);
  return tid + kost;
}

/**
 * Prognosen för ett projekt.
 * @returns {object} se begreppen ovan; belopp i kronor, andelar i procent (0–100)
 */
export function prognos(state, pid) {
  const p = state.projekt.find((x) => x.id === pid) || null;
  const kontrakt = p && harTal(p.kontraktsvarde) ? Number(p.kontraktsvarde) : null;
  const ata = ataSummering(state, pid);
  const ataUtanBelopp = state.ur.filter(
    (u) =>
      u.projektId === pid &&
      !["stangd", "utgar"].includes(u.status) &&
      u.klass !== "hinder" &&
      u.klass !== "utgar" &&
      !harTal(u.belopp)
  ).length;

  const aktiviteter = aktiviteterFor(state, pid).map((a) => {
    const b = budgetAktivitet(state, a);
    const u = utfallAktivitet(state, a.id);
    const kvar = kvarAktivitet(a, b.kr, u.kr);
    return {
      id: a.id,
      namn: a.namn,
      budget: b.kr,
      utfall: u.kr,
      kvar: kvar.kr,
      kvarKalla: kvar.kalla,
      slutkostnad: u.kr + kvar.kr,
      avvikelse: b.kr - (u.kr + kvar.kr),
    };
  });

  const ovrigtUtfall = utfallUtanAktivitet(state, pid);
  const budget = aktiviteter.reduce((s, a) => s + a.budget, 0);
  const utfall = aktiviteter.reduce((s, a) => s + a.utfall, 0) + ovrigtUtfall;
  const kvar = aktiviteter.reduce((s, a) => s + a.kvar, 0);
  const slutkostnad = utfall + kvar;

  const intakt = kontrakt === null ? null : kontrakt + ata.godkant;
  /* Utan budget finns ingen slutkostnad att tala om — bara utfallet hittills.
     TB och fakturering mot upparbetat blir då missvisande (TG 100 %), så de
     redovisas inte alls förrän budgeten är satt. */
  const kostnadKand = budget > 0;
  const tb = intakt === null || !kostnadKand ? null : intakt - slutkostnad;
  const tg = intakt && tb !== null ? (tb / intakt) * 100 : null;
  const kalkylTb = intakt === null || !budget ? null : intakt - budget;

  const grad = slutkostnad > 0 ? Math.min(100, (utfall / slutkostnad) * 100) : 0;
  const upparbetat = intakt === null || !kostnadKand ? null : (intakt * grad) / 100;
  const e = ekonomi(state, pid);
  const fakturerat = (e.faktSEK ?? 0) + ataFakturerat(state, pid);
  const overUnder = upparbetat === null ? null : fakturerat - upparbetat;

  const brister = [];
  if (kontrakt === null) brister.push("Kontraktssumma saknas. Intäkt och vinst kan inte räknas.");
  if (!budget) brister.push("Budget per aktivitet saknas. Total kostnad, vinst och utfört arbete kan inte räknas.");
  if (ataUtanBelopp)
    brister.push(`${ataUtanBelopp} öppna ÄTA saknar belopp och ingår inte i intäkten.`);
  if (ovrigtUtfall) brister.push("Det finns kostnader som inte är kopplade till någon aktivitet.");

  return {
    pid,
    kontrakt,
    ataGodkant: ata.godkant,
    ataVantande: ata.pending,
    ataUtanBelopp,
    intakt,
    intaktMedVantande: intakt === null ? null : intakt + ata.pending,
    budget,
    utfall,
    ovrigtUtfall,
    kvar,
    slutkostnad,
    kostnadsavvikelse: budget ? budget - slutkostnad : null,
    tb,
    tg,
    kalkylTb,
    grad,
    upparbetat,
    fakturerat,
    overUnder,
    aktiviteter,
    brister,
  };
}

/** Trafikljus för prognosen: rött vid negativt TB eller slutkostnad över budget
 *  med mer än 5 %, gult vid TG under 5 % eller underfakturering, annars grönt. */
export function prognosLage(pr) {
  if (pr.tb !== null && pr.tb < 0) return { ton: "bad", text: "Beräknad förlust" };
  if (pr.kostnadsavvikelse !== null && pr.budget && pr.kostnadsavvikelse < -0.05 * pr.budget)
    return { ton: "bad", text: "Kostar mer än budget" };
  if (pr.tg !== null && pr.tg < 5) return { ton: "warn", text: "Låg vinst" };
  if (pr.overUnder !== null && pr.overUnder < 0 && pr.intakt && -pr.overUnder > 0.02 * pr.intakt)
    return { ton: "warn", text: "Fakturera mer" };
  if (pr.kontrakt === null || !pr.budget) return { ton: "neutral", text: "Uppgifter saknas" };
  return { ton: "ok", text: "Enligt plan" };
}

/** Veckans prognos som sparad rad — för trenden vecka för vecka. */
export function prognosrad(state, pid, vecka = veckaNu()) {
  const pr = prognos(state, pid);
  return {
    id: `pg-${pid}-${vecka}`,
    projektId: pid,
    vecka,
    intakt: pr.intakt === null ? null : Math.round(pr.intakt),
    slutkostnad: Math.round(pr.slutkostnad),
    tb: pr.tb === null ? null : Math.round(pr.tb),
    utfall: Math.round(pr.utfall),
    fakturerat: Math.round(pr.fakturerat),
  };
}

/** Sparade veckoprognoser för ett projekt, äldst först, med förändring mot föregående. */
export function prognostrend(state, pid) {
  const rader = (state.prognoser || []).filter((r) => r.projektId === pid).sort((a, b) => (a.vecka < b.vecka ? -1 : 1));
  return rader.map((r, i) => {
    const f = rader[i - 1];
    return {
      ...r,
      tbAndring: f && r.tb !== null && f.tb !== null ? r.tb - f.tb : null,
      slutkostnadAndring: f ? r.slutkostnad - f.slutkostnad : null,
    };
  });
}
