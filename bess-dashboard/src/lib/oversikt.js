/* Översiktens nyckeltal — härledda ur portföljens state, summerade över alla
   projekt. Rena funktioner som resten av lib/, så att siffrorna i korten kan
   testas utan att rendera något.

   Ingenting här hittar på historik. Portföljen sparar inga tidsserier för
   fakturering eller framdrift, så korten visar läget nu som mätare och
   segment. Det enda som har tidsstämplar att räkna på är ändringsloggen. */

// Flödets kolumner är ÄTA-tavlans modell — samma indelning här, annars visar
// översikten andra steg än tavlan man klickar sig vidare till.
import { KOLUMNER, kolumnFor } from "../sections/Ata/flode.js";
import { dagarTill, idag, lokaltDatum, veckaEtikett, veckaNu } from "./datum.js";
import { berakFlaggor } from "./flaggor.js";
import {
  BESS_MATCH,
  ataSummering,
  dagarSedanRond,
  dagbokKomplett,
  ekonomi,
  oppnaRondavvikelser,
  prisGrind,
  underrattelseLage,
  veckaFlaggor,
  veckorad,
} from "./berakningar.js";

/** Skyddsrond varannan vecka — samma gräns som flaggmotorn larmar på. */
export const RONDINTERVALL = 14;

const kortNamn = (p) => p.nr || p.ort || p.namn;
const harBetalplan = (state, pid) => state.betalplan.some((b) => b.projektId === pid);

/* ---------- Budget: fakturerat av kontrakterat ---------- */

export function budgetLage(state) {
  const rader = state.projekt
    .filter((p) => harBetalplan(state, p.id))
    .map((p) => {
      const e = ekonomi(state, p.id);
      return { p, kv: e.kv ?? null, faktProc: e.faktProc, pagProc: e.pagProc, faktSEK: e.faktSEK };
    });

  // Procenten vägs med kontraktsvärdet. Projekt utan värde kan inte vägas in
  // och räknas därför inte i totalen — de redovisas separat.
  const medKv = rader.filter((r) => r.kv !== null);
  const kv = medKv.reduce((s, r) => s + r.kv, 0);
  const fakt = medKv.reduce((s, r) => s + (r.kv * r.faktProc) / 100, 0);
  const pag = medKv.reduce((s, r) => s + (r.kv * r.pagProc) / 100, 0);

  return {
    rader,
    kv,
    fakt: Math.round(fakt),
    pag: Math.round(pag),
    faktProc: kv ? Math.round((fakt / kv) * 100) : 0,
    pagProc: kv ? Math.round((pag / kv) * 100) : 0,
    saknarKv: state.projekt.filter((p) => p.kontraktsvarde === null || p.kontraktsvarde === undefined),
  };
}

/* ---------- ÄTA: ärenden per steg i flödet ---------- */

export function ataLage(state) {
  const aktiva = (state.ur || []).filter((u) => kolumnFor(u) !== null);
  const summor = state.projekt.map((p) => ataSummering(state, p.id));
  const summa = (f) => summor.reduce((s, x) => s + x[f], 0);

  return {
    oppna: aktiva.length,
    steg: KOLUMNER.map(([id, namn]) => ({
      id,
      namn,
      antal: aktiva.filter((u) => kolumnFor(u) === id).length,
    })),
    godkant: summa("godkant"),
    pending: summa("pending"),
    ejFakt: summa("ejFakt"),
    larm: aktiva.filter((u) => underrattelseLage(u)?.varning || prisGrind(u)?.varning).length,
    perProjekt: state.projekt
      .map((p) => ({ p, antal: aktiva.filter((u) => u.projektId === p.id).length }))
      .filter((x) => x.antal),
  };
}

/* ---------- HSEQ: skyddsronder och avvikelser per site ---------- */

export function hseqLage(state) {
  const ar = idag().slice(0, 4);
  // Siter = projekt med angiven effekt, samma urval som site-statusraden hade.
  const rader = state.projekt
    .filter((p) => p.mw)
    .map((p) => ({
      p,
      dagar: dagarSedanRond(state, p.id),
      avvikelser: oppnaRondavvikelser(state, p.id).length,
      tillbud: state.hseqIncidenter.filter(
        (i) => i.projektId === p.id && i.typ === "tillbud" && (i.datum || "").slice(0, 4) === ar
      ).length,
    }));

  return {
    rader,
    ar,
    avvikelser: rader.reduce((s, r) => s + r.avvikelser, 0),
    tillbud: rader.reduce((s, r) => s + r.tillbud, 0),
    forsenade: rader.filter((r) => r.dagar !== null && r.dagar >= RONDINTERVALL).length,
    utanRond: rader.filter((r) => r.dagar === null).length,
  };
}

/* ---------- Aktivitet per dag ---------- */

/** Antal loggposter per lokalt dygn, de senaste `antal` dygnen till och med `slut`. */
export function aktivitetPerDag(logg, antal = 14, slut = idag()) {
  const sista = new Date(slut + "T00:00:00");
  const dagar = Array.from({ length: antal }, (_, i) => {
    const d = new Date(sista);
    d.setDate(sista.getDate() - (antal - 1 - i));
    return lokaltDatum(d);
  });

  const rakna = new Map(dagar.map((d) => [d, 0]));
  for (const post of logg || []) {
    const t = new Date(post.ts);
    if (Number.isNaN(t.getTime())) continue;
    const dag = lokaltDatum(t);
    if (rakna.has(dag)) rakna.set(dag, rakna.get(dag) + 1);
  }
  return dagar.map((datum) => ({ datum, antal: rakna.get(datum) }));
}

/* ---------- Kräver uppmärksamhet ---------- */

/** Påminnelser som inte är flaggor i motorn men hör hemma i samma lista:
 *  veckochecklistan, sena svar på störningar och dagboksrader utan underlag. */
export function paminnelser(state, vecka = veckaNu()) {
  const ut = [];
  const lagg = (niva, text, vy, projektId = "") => ut.push({ niva, text, projektId, vy });

  const kvar = state.projekt.filter((p) => {
    const r = veckorad(state, p.id, vecka);
    return !r || !r.klar;
  });
  if (kvar.length)
    lagg(
      "medel",
      `Veckochecklistan ${veckaEtikett(vecka)} är inte genomgången — ${kvar.map(kortNamn).join(", ")}`,
      "vecka",
      kvar.length === 1 ? kvar[0].id : ""
    );

  const veckoflagg = state.projekt.reduce((s, p) => s + veckaFlaggor(veckorad(state, p.id, vecka)).length, 0);
  if (veckoflagg)
    lagg("hog", `${veckoflagg} punkt${veckoflagg > 1 ? "er" : ""} i veckans checklista kräver åtgärd`, "vecka");

  const sena = state.storningar.filter((s) => s.status === "skickad" && s.svarSenast && dagarTill(s.svarSenast) < 0);
  if (sena.length)
    lagg(
      "hog",
      `${sena.length} underrättelse${sena.length > 1 ? "r" : ""} om störning har passerat begärt svarsdatum — ta upp förlängning på nästa byggmöte`,
      "storning"
    );

  const dagbok = state.dagbok.filter((d) => !dagbokKomplett(d) && !d.fakturerad);
  if (dagbok.length)
    lagg(
      "medel",
      `${dagbok.length} dagboksrad${dagbok.length > 1 ? "er" : ""} saknar underlag — komplettera innan fakturering`,
      "dagbok"
    );

  return ut;
}

/** Flaggor och påminnelser i en lista, akuta först. Sorteringen är stabil, så
 *  flaggmotorns egen ordning håller inom varje nivå. */
export function uppmarksamhet(state, vecka) {
  const alla = [...paminnelser(state, vecka), ...berakFlaggor(state)];
  return [...alla.filter((f) => f.niva === "hog"), ...alla.filter((f) => f.niva !== "hog")];
}

/* ---------- Kommande händelser ---------- */

/** Leveranser och grindar inom `dagar` dagar framåt, närmast först. Milstolpar
 *  som själva är leveranser hoppas över — de finns redan som leveransrad. */
export function kommandeFonster(state, dagar = 90) {
  const rader = [];
  state.leveranser.forEach((l) =>
    rader.push({
      id: "l-" + l.id,
      datum: l.datum,
      titel: l.benamning + (l.leverantor && l.leverantor !== "—" ? ` (${l.leverantor})` : ""),
      pid: l.projektId,
      typ: "lev",
      status: l.status,
    })
  );
  state.milstolpar.forEach((m) => {
    if (m.status === "klar" || /leverans/i.test(m.titel)) return;
    rader.push({ id: "m-" + m.id, datum: m.datum, titel: m.titel, pid: m.projektId, typ: "ms", status: m.status });
  });

  const daterade = rader
    .map((r) => ({ ...r, d: dagarTill(r.datum), bess: BESS_MATCH.test(r.titel) }))
    .filter((r) => r.d !== null && r.d >= 0 && r.d <= dagar)
    .sort((a, b) => a.d - b.d || a.titel.localeCompare(b.titel));

  return {
    daterade,
    utanDatum: rader.filter((r) => r.typ === "lev" && !r.datum),
  };
}

/** Slår ihop händelser som ligger inom `dagar` dagar från gruppens första,
 *  så att två punkter på en smal tidslinje inte ritas ovanpå varandra.
 *  Förutsätter att raderna är sorterade på d. */
export function klustra(rader, dagar = 3) {
  const ut = [];
  for (const r of rader) {
    const sista = ut[ut.length - 1];
    if (sista && r.d - sista.d <= dagar) sista.poster.push(r);
    else ut.push({ d: r.d, poster: [r] });
  }
  return ut;
}
