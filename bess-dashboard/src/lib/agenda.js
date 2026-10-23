/* Agenda och frister — vad som kräver handling, sorterat på hur bråttom det är.

   Två helt olika saker som ofta blandas ihop:

   • FRISTER löper i timmar och är juridiskt bindande. 24-timmarsfristen för
     underrättelse (ABT 06 kap. 2 § 7, kap. 5 § 4) och 24 timmar för
     incidentrapport. Missas de kan rätten till ersättning gå förlorad —
     de mäts därför i timmar, inte dagar, och ligger alltid överst.

   • AGENDAN är allt med ett datum: milstolpar, leveranser, fakturering,
     punkter, byggmöten och kontraktets färdigställandetid. Den mäts i dagar. */

import { dagarTill, timmarSedan } from "./datum.js";
import { gallerFor, incidentLage, underrattelseLage } from "./berakningar.js";
import { INCIDENTTYP } from "../data/konstanter.js";
import { bestallningslage } from "./bestallningar.js";

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
export function fristUtanDatum(state, pid = null) {
  return state.ur.filter(
    (u) => u.status !== "stangd" && u.status !== "utgar" && !u.underrattelseDatum && !u.handelseDatum && iProjekt(u.projektId, pid)
  );
}

export const AGENDATYPER = {
  Milstolpe: { ikon: "◆", vy: "tidplan" },
  Leverans: { ikon: "▣", vy: "tidplan" },
  Beställning: { ikon: "▢", vy: "tidplan" },
  Fakturering: { ikon: "◈", vy: "milstolpar" },
  Punkt: { ikon: "●", vy: "punkter" },
  Möte: { ikon: "▤", vy: "moten" },
  Kontrakt: { ikon: "★", vy: "oversikt" },
};

/** Datum som styr var en punkt hamnar i arbetslistan.

    `forfaller` är arbetsfristen, `uppfoljning` är när jag själv vill titta på
    punkten igen. Har fristen passerat står punkten kvar som förfallen, hur långt
    fram uppföljningen än är lagd. Annars styr uppföljningsdatumet, och saknas det
    gäller fristen. Fristen skrivs aldrig om härifrån. */
export function punktDatum(p) {
  const frist = p.forfaller && dagarTill(p.forfaller) !== null ? p.forfaller : "";
  const uppf = p.uppfoljning && dagarTill(p.uppfoljning) !== null ? p.uppfoljning : "";
  if (frist && dagarTill(frist) < 0) return frist;
  return uppf || frist;
}

/** Hör raden till valt projekt? Utan projekt (portföljläge) gäller allt. */
const iProjekt = (projektId, pid) => !pid || gallerFor({ projektId }, pid);

/** Allt med datum inom horisonten. `bakat` tar även med passerade poster. */
export function agendarader(state, dagar, bakat = 0) {
  const ut = [];

  const lagg = (datum, titel, typ, pid, id, extra, mer) => {
    if (!datum) return;
    const d = dagarTill(datum);
    if (d === null || d < -bakat || d > dagar) return;
    ut.push({ datum, d, titel, typ, pid, id, extra: extra || "", ...mer });
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

  /* Beställ senast: leveranser vars order inte är lagd, på datumet då den
     senast måste läggas för att hinna till momentet (lib/bestallningar.js). */
  state.projekt.forEach((p) =>
    bestallningslage(state, p.id).forEach((b) => {
      if (!["sen", "snart", "i-tid"].includes(b.status)) return;
      const lev = b.rad.leverantor && b.rad.leverantor !== "—" ? " — " + b.rad.leverantor : "";
      lagg(b.senast, `Beställ senast: ${b.rad.benamning}${lev}`, "Beställning", p.id, b.id, "", {
        moment: b.moment,
        ledtidVeckor: b.ledtidVeckor,
      });
    })
  );

  state.betalplan.forEach((b) => {
    if (b.status !== "fakturerad") lagg(b.datum, `${b.kod} ${b.benamning}`, "Fakturering", b.projektId, b.id);
  });

  state.punkter.forEach((p) => {
    if (p.status === "klarmarkerad") return;
    const datum = punktDatum(p);
    lagg(datum, p.titel, "Punkt", p.projektId, p.id, "", {
      agare: p.agare || "",
      forfaller: p.forfaller || "",
      uppfoljning: p.uppfoljning || "",
      foton: (p.foton || []).length,
      plats: p.plats?.namn || "",
    });
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

/** Sammanfattning för hero-raden i Idag-vyn. Med `pid` bara det projektets rader
 *  (och rader som gäller båda parkerna); utan `pid` hela portföljen. */
export function arbetslage(state, horisont = 30, pid = null) {
  const frister = fristrader(state).filter((f) => f.niva !== "oklar" && iProjekt(f.pid, pid));
  const rader = agendarader(state, horisont, 365).filter((r) => iProjekt(r.pid, pid));
  return {
    frister,
    forfallnaFrister: frister.filter((f) => f.niva === "forfallen"),
    utanDatum: fristUtanDatum(state, pid),
    forfallet: rader.filter((r) => r.d < 0),
    idag: rader.filter((r) => r.d === 0),
    veckan: rader.filter((r) => r.d > 0 && r.d <= 7),
    kommande: rader.filter((r) => r.d > 7),
  };
}
