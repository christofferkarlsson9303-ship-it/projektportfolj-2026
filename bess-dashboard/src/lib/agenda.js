/* Agenda och frister — vad som kräver handling, sorterat på hur bråttom det är.

   Två helt olika saker som ofta blandas ihop:

   • FRISTER löper i timmar och är juridiskt bindande. 24-timmarsfristen för
     underrättelse (ABT 06 kap. 2 § 7, kap. 5 § 4) och 24 timmar för
     incidentrapport. Missas de kan rätten till ersättning gå förlorad —
     de mäts därför i timmar, inte dagar, och ligger alltid överst.

   • AGENDAN är allt med ett datum: milstolpar, leveranser, fakturering,
     punkter, byggmöten och kontraktets färdigställandetid. Den mäts i dagar. */

import { dagarTill, timmarSedan } from "./datum.js";
import { incidentLage, underrattelseLage } from "./berakningar.js";
import { INCIDENTTYP } from "../data/konstanter.js";

/** Löpande frister. Nivåerna: forfallen > akut (≥12 h kvar av dygnet) > snart > oklar. */
export function fristrader(state) {
  const ut = [];

  state.ur.forEach((u) => {
    if (u.status === "stangd" || u.status === "utgar") return;
    const l = underrattelseLage(u);
    if (!l || l.ok) return;
    const h = u.handelseDatum ? timmarSedan(u.handelseDatum) : null;
    ut.push({
      niva: l.varning ? "forfallen" : h !== null && h >= 12 ? "akut" : h === null ? "oklar" : "snart",
      titel: `${u.nr} ${u.benamning || ""}`.trim(),
      text: l.txt,
      pid: u.projektId,
      typ: "ÄTA-frist",
      timmar: h,
      sort: l.varning ? 0 : h === null ? 2 : 1,
      id: u.id,
      vy: "ata",
    });
  });

  (state.hseqIncidenter || []).forEach((i) => {
    if (i.rapporterad) return;
    const l = incidentLage(i);
    if (l.ok) return;
    const typ = (INCIDENTTYP.find((t) => t[0] === i.typ) || [undefined, "Incident"])[1];
    ut.push({
      niva: l.varning ? "forfallen" : "akut",
      titel: `${typ} ${i.datum || ""}`.trim(),
      text: l.txt,
      pid: i.projektId,
      typ: "Incidentrapport",
      timmar: timmarSedan(i.datum),
      sort: l.varning ? 0 : 1,
      id: i.id,
      vy: "hseq",
    });
  });

  return ut.sort((a, b) => a.sort - b.sort || (b.timmar || 0) - (a.timmar || 0));
}

/** Poster där fristen inte ens går att räkna — händelsedatum saknas. */
export function fristUtanDatum(state) {
  return state.ur.filter(
    (u) => u.status !== "stangd" && u.status !== "utgar" && !u.underrattelseDatum && !u.handelseDatum
  );
}

export const AGENDATYPER = {
  Milstolpe: { ikon: "◆", vy: "tidplan" },
  Leverans: { ikon: "▣", vy: "tidplan" },
  Fakturering: { ikon: "◈", vy: "milstolpar" },
  Punkt: { ikon: "●", vy: "punkter" },
  Möte: { ikon: "▤", vy: "moten" },
  Kontrakt: { ikon: "★", vy: "oversikt" },
};

/** Allt med datum inom horisonten. `bakat` tar även med passerade poster. */
export function agendarader(state, dagar, bakat = 0) {
  const ut = [];

  const lagg = (datum, titel, typ, pid, id, extra) => {
    if (!datum) return;
    const d = dagarTill(datum);
    if (d === null || d < -bakat || d > dagar) return;
    ut.push({ datum, d, titel, typ, pid, id, extra: extra || "" });
  };

  state.milstolpar.forEach((m) => {
    if (m.status !== "klar") lagg(m.datum, m.titel, "Milstolpe", m.projektId, m.id);
  });

  state.leveranser.forEach((l) =>
    lagg(
      l.datum,
      l.benamning + (l.leverantor && l.leverantor !== "—" ? " — " + l.leverantor : ""),
      "Leverans",
      l.projektId,
      l.id,
      l.status === "avvikelse" ? "avvikelse" : ""
    )
  );

  state.betalplan.forEach((b) => {
    if (b.status !== "fakturerad") lagg(b.datum, `${b.kod} ${b.benamning}`, "Fakturering", b.projektId, b.id);
  });

  state.punkter.forEach((p) => {
    if (p.status !== "klarmarkerad") lagg(p.forfaller, p.titel, "Punkt", p.projektId, p.id);
  });

  (state.byggmoten || []).forEach((m) => {
    if (m.status !== "justerat") lagg(m.datum, `Byggmöte ${m.nr || ""}`.trim(), "Möte", m.projektId, m.id);
  });

  state.projekt.forEach((p) =>
    lagg(p.fardigstallande, "Kontrakterad färdigställandetid", "Kontrakt", p.id, p.id)
  );

  return ut.sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Kortform av hur länge kvar: "idag", "i morgon", "3 d" eller "−2 d". */
export function dagsetikett(d) {
  if (d === 0) return "idag";
  if (d === 1) return "i morgon";
  if (d < 0) return `${Math.abs(d)} d sen`;
  return `${d} d`;
}

/** Sammanfattning för hero-raden i Idag-vyn. */
export function arbetslage(state, horisont = 30) {
  const frister = fristrader(state).filter((f) => f.niva !== "oklar");
  const rader = agendarader(state, horisont, 365);
  return {
    frister,
    forfallnaFrister: frister.filter((f) => f.niva === "forfallen"),
    utanDatum: fristUtanDatum(state),
    forfallet: rader.filter((r) => r.d < 0),
    idag: rader.filter((r) => r.d === 0),
    veckan: rader.filter((r) => r.d > 0 && r.d <= 7),
    kommande: rader.filter((r) => r.d > 7),
  };
}
