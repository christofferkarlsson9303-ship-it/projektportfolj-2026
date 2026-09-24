/* Härledda värden ur portföljens state.
   Alla funktioner tar state som första argument — inget globalt STATE, vilket
   gör dem testbara och användbara i useMemo utan dolda beroenden. */

import { dagarTill, idag, timmarSedan } from "./datum.js";
import { VECKOFRAGOR } from "../data/veckofragor.js";
import { MILSTOLPE_MODELL, SLUTDOK_MALL, ATA_STATUS } from "../data/konstanter.js";

/* ---------- Projekt ---------- */

export function projekt(state, id) {
  return state.projekt.find((p) => p.id === id) || null;
}

/** Rader märkta "bada" gäller båda batteriparkerna. */
export function gallerFor(rad, pid) {
  return rad.projektId === pid || (rad.projektId === "bada" && (pid === "36037" || pid === "36038"));
}

const PROJEKT_KLASS = ["", "b", "c", "d"];

/** Färgklass per projekt — ger varje site en egen accentfärg i hela gränssnittet. */
export function projektKlass(state, pid) {
  const i = state.projekt.findIndex((p) => p.id === pid);
  return i < 0 ? "" : PROJEKT_KLASS[i % PROJEKT_KLASS.length];
}

/* ---------- Ekonomi ---------- */

export function ekonomi(state, pid) {
  const rader = state.betalplan.filter((b) => b.projektId === pid);
  const p = projekt(state, pid);
  const kv = p ? p.kontraktsvarde : null;
  const fakt = rader.filter((b) => b.status === "fakturerad").reduce((s, b) => s + b.andel, 0);
  const pag = rader.filter((b) => b.status === "pagaende").reduce((s, b) => s + b.andel, 0);
  return {
    rader,
    kv,
    faktProc: fakt,
    pagProc: pag,
    faktSEK: kv === null || kv === undefined ? null : Math.round((kv * fakt) / 100),
    kvarSEK: kv === null || kv === undefined ? null : Math.round((kv * (100 - fakt)) / 100),
  };
}

export function betalRad(state, pid, kod) {
  return state.betalplan.find((b) => b.projektId === pid && b.kod === kod) || null;
}

/* ---------- Risk ---------- */

/* ONE Nordics riskmatris är inte symmetrisk: S1×K5 är Gul (inte Röd) och
   S5×K1 är Gul (inte Grön). Färgen slås därför upp i tabellen i stället för
   att räknas fram ur produkten. */
const RISKMATRIS_TABELL = [
  ["gron", "gron", "gron", "gul", "gul"], // sannolikhet 1
  ["gron", "gron", "gron", "gul", "rod"], // sannolikhet 2
  ["gron", "gron", "gul", "rod", "rod"], // sannolikhet 3
  ["gron", "gul", "gul", "rod", "rod"], // sannolikhet 4
  ["gul", "gul", "rod", "rod", "rod"], // sannolikhet 5
];

export function riskMatrisFarg(s, k) {
  const sa = Math.max(1, Math.min(5, Number(s) || 1));
  const ko = Math.max(1, Math.min(5, Number(k) || 1));
  return RISKMATRIS_TABELL[sa - 1][ko - 1];
}

export const riskvarde = (r) => r.sannolikhet * r.konsekvens;
export const riskKlass = (v) => (v >= 15 ? "h" : v >= 8 ? "m" : "l");
export const riskNiva = (r) => riskMatrisFarg(r.sannolikhet, r.konsekvens);

/** Exponentiellt riskvärde i kronor — (S × K) × estimerad finansiell påverkan. */
export const riskExponering = (r) => riskvarde(r) * (Number(r.estimeradKostnadSEK) || 0);

export const oppnaRisker = (state) => state.risker.filter((r) => r.status !== "stangd");
export const oppnaPunkter = (state) => state.punkter.filter((p) => p.status === "oppen");
export const oppnaUR = (state, pid) =>
  state.ur.filter((u) => u.projektId === pid && u.status !== "stangd");

/* ---------- ÄTA: fristerna i ABT 06 ---------- */

/** Underrättelse ska vara skickad inom 24 h från händelsen (ABT 06 kap. 2 § 7, kap. 5 § 4). */
export function underrattelseLage(u) {
  if (u.klass === "utgar" || u.status === "utgar") return null;
  if (u.underrattelseDatum) return { ok: true, txt: "Underrättelse skickad " + u.underrattelseDatum };
  if (!u.handelseDatum)
    return { ok: false, varning: false, txt: "Händelsedatum saknas — 24-timmarsfristen kan inte räknas" };
  const h = timmarSedan(u.handelseDatum);
  if (h === null) return null;
  if (h > 24)
    return { ok: false, varning: true, txt: `Underrättelse saknas — ${Math.floor(h / 24)} dygn sedan händelsen` };
  return { ok: false, varning: false, txt: `Underrättelse ska skickas inom ${24 - h} h` };
}

/** Prissättning ska vara skriftligt godkänd innan arbetet startar. */
export function prisGrind(u) {
  if (u.klass === "hinder" || u.klass === "utgar" || u.status === "utgar") return null;
  if (u.godkantDatum) return { ok: true, txt: "Pris skriftligt godkänt " + u.godkantDatum };
  if (u.arbeteStartat)
    return { ok: false, varning: true, txt: "Arbetet är startat utan skriftligt godkänt pris" };
  return { ok: false, varning: false, txt: "Pris ej godkänt — arbetet ska inte starta" };
}

export function ataSummering(state, pid) {
  const rader = state.ur.filter((u) => u.projektId === pid);
  const summa = (lista) => lista.reduce((s, u) => s + (Number(u.belopp) || 0), 0);
  const godkant = summa(rader.filter((u) => ["godkand", "fakturerad", "stangd"].includes(u.status)));
  return {
    antal: rader.length,
    oppna: rader.filter((u) => !["stangd", "utgar"].includes(u.status)).length,
    belopp: godkant,
    godkant,
    ejFakt: summa(rader.filter((u) => u.status === "godkand")),
    pending: summa(rader.filter((u) => ["prissattning", "skickad_best", "godkand_dok"].includes(u.status))),
  };
}

/** Äldre UR-statusar mappas till ÄTA-loggens åtta lägen. Returnerar ny lista. */
export function migreraUr(ur) {
  const karta = { pagaende: "oppen", komplettering: "oppen", ejpaborjad: "oppen" };
  return (ur || []).map((u) => {
    const status = karta[u.status] || (ATA_STATUS.includes(u.status) ? u.status : "oppen");
    return status === u.status && u.klass ? u : { ...u, status, klass: u.klass || "oklar" };
  });
}

/* ---------- Veckokoll ---------- */

export function veckorad(state, pid, vecka) {
  return state.veckokoll.find((r) => r.projektId === pid && r.vecka === vecka) || null;
}

export function veckaFlaggor(rad) {
  if (!rad) return [];
  return VECKOFRAGOR.filter((f) => rad["q" + f.n] && f.flagga.includes(rad["q" + f.n]));
}

export function veckaBesvarade(rad) {
  if (!rad) return 0;
  return VECKOFRAGOR.filter((f) => rad["q" + f.n]).length;
}

/* ---------- Rutiner (projektledarens handbok) ---------- */

export const rutinNyckel = (rid, gi, pn) => `${rid}|${gi}|${pn}`;

export function rutinKlar(state, pid, nyckel) {
  return state.rutinstatus.some((r) => r.projektId === pid && r.punkt === nyckel && r.klar);
}

export function rutinAntal(state, pid, rutin) {
  let tot = 0;
  let klar = 0;
  rutin.grupper.forEach((g, gi) =>
    (g.punkter || []).forEach((p) => {
      tot++;
      if (rutinKlar(state, pid, rutinNyckel(rutin.id, gi, p.n))) klar++;
    })
  );
  return { tot, klar };
}

/* ---------- Milstolpar ---------- */

export function mstatusRad(state, pid, kod) {
  const r = (state.mstatus || []).find((x) => x.projektId === pid && x.kod === kod);
  return r || { id: `ms-${pid}-${kod}`, projektId: pid, kod, underlag: {}, avisering: "", faktura: "" };
}

export function mUnderlagKlart(state, pid, m) {
  const r = mstatusRad(state, pid, m.kod);
  const underlag = r.underlag || {};
  const klara = m.underlag.filter(([n]) => underlag[n]).length;
  return { klara, av: m.underlag.length, allt: klara === m.underlag.length };
}

/** Första milstolpen som ännu inte är fakturerad. */
export function nastaMilstolpe(state, pid) {
  return MILSTOLPE_MODELL.find((m) => {
    const b = betalRad(state, pid, m.kod);
    return !b || b.status !== "fakturerad";
  });
}

/* ---------- Byggmöten ---------- */

/** Punkter under §4/§5 med text men utan kopplat ärende.
 *  ÄTA och hinder som bara behandlas muntligt kan preskriberas enligt
 *  ABT 06 kap. 2 § 7 — det här är hela modulens existensberättigande. */
export function motesFlagga(m) {
  return (m.punkter || []).filter((pt) => (pt.para === "4" || pt.para === "5") && !pt.urId && pt.text);
}

/* ---------- HSEQ ---------- */

export function senasteRond(state, pid) {
  return (
    state.hseqRonder
      .filter((r) => r.projektId === pid)
      .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0] || null
  );
}

export function dagarSedanRond(state, pid) {
  const r = senasteRond(state, pid);
  if (!r || !r.datum) return null;
  const d = dagarTill(r.datum);
  return d === null ? null : Math.abs(Math.min(d, 0));
}

export function ampAktuell(state, pid) {
  /* En arbetsmiljöplan kan revideras två gånger samma dag. Sorteringen är
     stabil, så utan vändningen nedan vinner den först tillagda vid lika datum
     och den andra revideringen syns aldrig. Senast tillagda ska gälla. */
  return (
    state.hseqAmp
      .filter((a) => a.projektId === pid)
      .reverse()
      .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))[0] || null
  );
}

export function oppnaRondavvikelser(state, pid) {
  const ut = [];
  state.hseqRonder
    .filter((r) => r.projektId === pid)
    .forEach((r) =>
      (r.avvikelser || [])
        .filter((a) => a.status !== "atgardad")
        .forEach((a) => ut.push({ ...a, rondId: r.id, rondDatum: r.datum }))
    );
  return ut;
}

/** En incident ska vara rapporterad inom 24 timmar. */
export function incidentLage(i) {
  if (i.rapporterad) return { ok: true, txt: "Rapporterad " + (i.rapportDatum || "") };
  const h = timmarSedan(i.datum);
  if (h === null) return { ok: false, varning: false, txt: "Datum saknas" };
  if (h > 24)
    return { ok: false, varning: true, txt: `Rapport saknas — ${Math.floor(h / 24)} dygn sedan händelsen` };
  return { ok: false, varning: false, txt: `Rapport ska skickas inom ${Math.max(0, 24 - h)} h` };
}

/* ---------- Slutdokumentation ---------- */

export function slutdokRader(state, pid) {
  return (state.slutdok || []).filter((d) => d.projektId === pid);
}

export function slutdokIndex(state, pid) {
  const rader = slutdokRader(state, pid);
  const godkanda = rader.filter((d) => d.status === "godkand").length;
  return {
    rader,
    godkanda,
    av: rader.length,
    proc: rader.length ? Math.round((godkanda / rader.length) * 100) : 0,
  };
}

/** Kritiska kategorier 1–4 låser upp M6 när allt är godkänt. */
export function slutdokKritisktKlart(state, pid) {
  const kritiska = SLUTDOK_MALL.slice(0, 4).map(([k]) => k);
  const rader = slutdokRader(state, pid).filter((d) => kritiska.includes(d.kategori));
  return rader.length > 0 && rader.every((d) => d.status === "godkand");
}

/* Slutbesiktningsprotokollet går inte att sätta status på förrän de kritiska
   kategorierna är godkända — man kan inte slutbesikta mot ofullständigt
   underlag. Matchar mot kravtexten och inte mot kategoriindex, så mallen kan
   justeras utan att låsningen tappar bort sig. */
export function slutdokArLast(d, pid, state) {
  return /slutbesiktningsprotokoll/i.test(d.krav || "") && !slutdokKritisktKlart(state, pid);
}

export function dagarTillM6(state, pid) {
  const m = state.milstolpar.find(
    (x) => x.projektId === pid && /färdigställ|slutbesikt/i.test(x.titel || "")
  );
  return m && m.datum ? dagarTill(m.datum) : null;
}

/* ---------- Handlingsplan ---------- */

/** Planhuvudet för projektet — sås i efterInlasning, kan saknas i äldre state. */
export function handlingsplan(state, pid) {
  return (state.handlingsplaner || []).find((h) => h.projektId === pid) || null;
}

/* Åtgärderna i den ordning de lagts till. Ordningen är stegnumret i vyn och
   ska inte hoppa när någon ändrar ett datum, så de sorteras inte. */
export function hpAtgarder(state, pid) {
  return (state.hpAtgarder || []).filter((a) => a.projektId === pid);
}

export function hpForsenad(a) {
  return a.status !== "klar" && !!a.datum && dagarTill(a.datum) < 0;
}

export function hpSammanfattning(state, pid) {
  const rader = hpAtgarder(state, pid);
  const klara = rader.filter((a) => a.status === "klar").length;
  return {
    antal: rader.length,
    klara,
    pagaende: rader.filter((a) => a.status === "pagaende").length,
    forsenade: rader.filter(hpForsenad).length,
    proc: rader.length ? Math.round((klara / rader.length) * 100) : 0,
  };
}

/* ---------- Dagbok ---------- */

export const DAGBOK_FALT = ["startdatum", "omfattning", "vader", "kostnad", "forvantadTid", "faktiskTid"];

export function dagbokKomplett(rad) {
  return DAGBOK_FALT.every((f) => String(rad[f] ?? "").trim() !== "");
}

export function dagbokGrupper(state, pid) {
  const rader = state.dagbok.filter((d) => d.projektId === pid);
  const map = new Map();
  rader.forEach((d) => {
    const nyckel = d.ataRef || "(utan ÄTA-nummer)";
    if (!map.has(nyckel)) map.set(nyckel, []);
    map.get(nyckel).push(d);
  });
  return [...map.entries()]
    .map(([ataRef, r]) => ({
      ataRef,
      rader: r,
      kostnad: r.reduce((s, x) => s + (Number(x.kostnad) || 0), 0),
      komplett: r.every(dagbokKomplett),
      kravSignering: r.some((x) => x.kravSignering),
      signering: r.filter((x) => x.kravSignering).every((x) => x.signerad),
      fakturerad: r.every((x) => x.fakturerad),
    }))
    .sort((a, b) => a.ataRef.localeCompare(b.ataRef));
}

/* ---------- Leveranser och kommande händelser ---------- */

export const BESS_MATCH = /bess|batteri/i;

export function bessLeveranser(state) {
  return state.leveranser.filter((l) => l.datum && BESS_MATCH.test(l.benamning));
}

export function bessNedrakning(state) {
  const rader = bessLeveranser(state)
    .map((l) => ({ ...l, d: dagarTill(l.datum) }))
    .sort((a, b) => a.d - b.d);
  if (!rader.length) return null;
  const kommande = rader.filter((r) => r.d >= 0);
  return kommande.length ? kommande[0] : rader[rader.length - 1];
}

export function nastaHandelse(state, pid) {
  const rader = [];
  state.leveranser
    .filter((l) => l.projektId === pid && l.datum)
    .forEach((l) => rader.push({ datum: l.datum, titel: l.benamning, bess: BESS_MATCH.test(l.benamning) }));
  state.milstolpar
    .filter((m) => m.projektId === pid && m.datum && m.status !== "klar")
    .forEach((m) => rader.push({ datum: m.datum, titel: m.titel, bess: BESS_MATCH.test(m.titel) }));
  const kommande = rader
    .map((r) => ({ ...r, d: dagarTill(r.datum) }))
    .filter((r) => r.d !== null && r.d >= 0)
    .sort((a, b) => a.d - b.d);
  return kommande[0] || null;
}

export function kommandeHandelser(state) {
  const rader = [];
  state.leveranser.forEach((l) =>
    rader.push({
      datum: l.datum,
      titel: l.benamning + (l.leverantor && l.leverantor !== "—" ? ` (${l.leverantor})` : ""),
      pid: l.projektId,
      typ: "lev",
      status: l.status,
    })
  );
  state.milstolpar.forEach((m) => {
    if (!/leverans/i.test(m.titel))
      rader.push({ datum: m.datum, titel: m.titel, pid: m.projektId, typ: "ms", status: m.status });
  });
  return rader
    .filter((r) => !r.datum || dagarTill(r.datum) >= -14)
    .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
    .slice(0, 12);
}

/* ---------- Underlagsstämpel ---------- */

export function underlagsstampel(state) {
  const rader = state.projekt
    .map((p) => {
      const u = p.underlag && p.underlag.kalla ? p.underlag : null;
      if (!u) return null;
      return (p.nr || p.namn) + ": " + u.kalla + (u.datum ? " " + u.datum : "");
    })
    .filter(Boolean);
  return rader.length
    ? "Underlag — " + rader.join(" · ")
    : "Inget underlag registrerat — ange källa per projekt under Projektuppgifter";
}

/* ---------- Tid, resurser och budget ---------- */

export const person = (state, id) => state.medarbetare.find((m) => m.id === id) || null;
export const aktivaPersoner = (state) => state.medarbetare.filter((m) => m.aktiv !== false);
export const aktivitet = (state, id) => state.aktiviteter.find((a) => a.id === id) || null;
export const aktiviteterFor = (state, pid) => state.aktiviteter.filter((a) => a.projektId === pid);

export const otFaktor = (v) => Number(v) || 1;

export function timkostnad(state, rad) {
  const p = person(state, rad.personId);
  if (!p) return 0;
  return (Number(p.timpris) || 0) * otFaktor(rad.overtid) * (Number(rad.timmar) || 0);
}

export function bemanningsrad(state, personId, projektId, vecka) {
  return (
    state.bemanning.find(
      (b) => b.personId === personId && b.projektId === projektId && b.vecka === vecka
    ) || null
  );
}

export function planeratPerson(state, personId, vecka) {
  return state.bemanning
    .filter((b) => b.personId === personId && b.vecka === vecka)
    .reduce((s, b) => s + (Number(b.timmar) || 0), 0);
}

export function planeratProjekt(state, projektId, vecka) {
  return state.bemanning
    .filter((b) => b.projektId === projektId && b.vecka === vecka)
    .reduce((s, b) => s + (Number(b.timmar) || 0), 0);
}

export function belaggningsklass(proc) {
  if (!proc) return "bl-tom";
  if (proc > 100) return "bl-over";
  if (proc >= 95) return "bl-full";
  return "bl-del";
}

export const tidraderVecka = (state, personId, vstr) =>
  state.tidrader.filter((t) => t.personId === personId && t.vecka === vstr);

export function utfallAktivitet(state, aid) {
  const timmar = state.tidrader
    .filter((t) => t.aktivitetId === aid)
    .reduce((s, t) => s + (Number(t.timmar) || 0), 0);
  const kronor = state.tidrader
    .filter((t) => t.aktivitetId === aid)
    .reduce((s, t) => s + timkostnad(state, t), 0);
  const kostnad = state.kostnader
    .filter((k) => k.aktivitetId === aid)
    .reduce((s, k) => s + (Number(k.belopp) || 0), 0);
  return { timmar, kronor, kostnad, totalt: kronor + kostnad };
}

export const ofaktureradTid = (state, pid) =>
  state.tidrader.filter((t) => t.projektId === pid && t.debiterbar && !t.fakturerad);

export const ofakturKostnad = (state, pid) =>
  state.kostnader.filter((k) => k.projektId === pid && k.vidarefakturera && !k.fakturerad);

/** Entreprenadarvode på självkostnad, ABT 06 kap. 6 § 9. */
export const ARVODE = 10;

/* ---------- Övrigt ---------- */

/** Läge för en post på tidslinjen. 'planerad' som passerat sitt datum utan att
 *  vara klarmarkerad är i praktiken försenad — det ska synas som rött. */
export function harledLage(post) {
  if (["klar", "klarmarkerad", "levererad"].includes(post.status)) return "klar";
  if (["forsenad", "avvikelse"].includes(post.status)) return "forsenad";
  const d = dagarTill(post.slutdatum || post.datum);
  if (d !== null && d < 0) return "forsenad";
  if (["pagaende", "pagar"].includes(post.status)) return "pagaende";
  return "planerad";
}

export function saknarKarndata(p) {
  const saknas = [];
  if (p.kontraktsvarde === null || p.kontraktsvarde === undefined) saknas.push("kontraktsvärde");
  if (!p.mw) saknas.push("MW");
  if (!p.mwh) saknas.push("MWh");
  if (!p.natagare) saknas.push("nätägare");
  if (!p.fardigstallande) saknas.push("färdigställandetid");
  return saknas;
}

export function idagArDatum(iso) {
  return iso === idag();
}
