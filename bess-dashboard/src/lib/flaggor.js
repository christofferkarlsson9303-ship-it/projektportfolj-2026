/* Flaggmotorn — går igenom hela portföljen och räknar fram vad som kräver
   åtgärd just nu. Grindarna kommer ur projektmodellen: 24-timmarsfristen,
   prisgodkännande före start, fakturering samma vecka, skyddsrond varannan
   vecka och underlag inför nästa betalningsmilstolpe. */

import { dagarTill } from "./datum.js";
import {
  ampAktuell,
  dagarSedanRond,
  dagarTillM6,
  incidentLage,
  mUnderlagKlart,
  motesFlagga,
  nastaMilstolpe,
  prisGrind,
  riskMatrisFarg,
  riskvarde,
  saknarKarndata,
  slutdokIndex,
  underrattelseLage,
} from "./berakningar.js";
import { INCIDENTTYP } from "../data/konstanter.js";

export function berakFlaggor(state) {
  const fl = [];
  const lagg = (niva, text, projektId, vy, extra) => fl.push({ niva, text, projektId, vy, extra });

  /* Milstolpar som passerat sitt datum utan att vara klarmarkerade */
  state.milstolpar.forEach((m) => {
    if (m.datum && m.status !== "klar" && dagarTill(m.datum) < 0) {
      lagg("hog", `Milstolpe försenad — ${m.titel} (skulle klarats ${m.datum})`, m.projektId, "tidplan");
    }
  });

  /* Öppna punkter: förfallna och sådana som förfaller inom en vecka */
  state.punkter
    .filter((p) => p.status === "oppen" && p.forfaller)
    .forEach((pt) => {
      const d = dagarTill(pt.forfaller);
      if (d === null) return;
      if (d < 0) lagg("hog", `Öppen punkt har förfallit — ${pt.titel}`, pt.projektId, "punkter");
      else if (d <= 7)
        lagg("medel", `Öppen punkt förfaller om ${d} dag${d === 1 ? "" : "ar"} — ${pt.titel}`, pt.projektId, "punkter");
    });

  /* Projekt som saknar kärndata i underlaget */
  state.projekt.forEach((p) => {
    const saknas = saknarKarndata(p);
    if (saknas.length) {
      lagg(
        "medel",
        `Kärndata saknas (${saknas.join(", ")}) — ${p.nr ? p.nr + " " : ""}${p.namn}`,
        p.id,
        "oversikt",
        "projektdata"
      );
    }
  });

  /* Röda risker enligt riskmatrisen */
  state.risker
    .filter((r) => r.status !== "stangd" && riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod")
    .forEach((r) => lagg("hog", `Röd risk (RV ${riskvarde(r)}) — ${r.titel}`, r.projektId, "risker"));

  /* Röd risk utan förebyggande åtgärd — egen systemvarning */
  state.risker
    .filter(
      (r) =>
        r.status !== "stangd" &&
        riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod" &&
        !r.forebygg &&
        !r.atgard
    )
    .forEach((r) => lagg("hog", `Röd risk saknar förebyggande åtgärd — ${r.titel}`, r.projektId, "risker"));

  /* ÄTA-loggens grindar */
  (state.ur || []).forEach((u) => {
    const und = underrattelseLage(u);
    if (und && und.varning)
      lagg("hog", `Underrättelse om störning saknas mer än 24 h — ${u.nr} ${u.benamning}`, u.projektId, "ata");

    const pg = prisGrind(u);
    if (pg && pg.varning)
      lagg("hog", `Arbete startat utan skriftligt godkänt pris — ${u.nr} ${u.benamning}`, u.projektId, "ata");

    if (u.status === "godkand" && u.godkantDatum) {
      const d = dagarTill(u.godkantDatum);
      if (d !== null && d < -7)
        lagg(
          "medel",
          `Godkänd ÄTA ej fakturerad sedan ${u.godkantDatum} — ${u.nr} ${u.benamning}`,
          u.projektId,
          "ata"
        );
    }
  });

  /* HSEQ: skyddsrond varannan vecka, AMP ska finnas, incidentrapport inom 24 h */
  state.projekt.forEach((p) => {
    const d = dagarSedanRond(state, p.id);
    if (d !== null && d >= 14)
      lagg("hog", `Skyddsronden är ${d} dagar gammal — kravet är varannan vecka`, p.id, "hseq");
    if (!ampAktuell(state, p.id) && state.hseqRonder.some((r) => r.projektId === p.id))
      lagg("medel", "Arbetsmiljöplan saknas i portföljen", p.id, "hseq");
  });

  (state.hseqIncidenter || []).forEach((i) => {
    const l = incidentLage(i);
    if (l && l.varning) {
      const typ = (INCIDENTTYP.find((t) => t[0] === i.typ) || ["", "Incident"])[1];
      lagg("hog", `Incident saknar rapport mer än 24 h — ${typ} ${i.datum}`, i.projektId, "hseq");
    }
  });

  /* Byggmöten: punkter under §4/§5 utan registrerat ärende riskerar preskription */
  (state.byggmoten || []).forEach((m) => {
    const saknar = motesFlagga(m);
    if (saknar.length)
      lagg(
        "hog",
        `${m.nr}: ${saknar.length} punkt${saknar.length > 1 ? "er" : ""} under §4/§5 saknar registrerat ärende — risk för preskription`,
        m.projektId,
        "moten"
      );
  });

  /* Slutdokumentation inför M6 */
  state.projekt.forEach((p) => {
    const d6 = dagarTillM6(state, p.id);
    if (d6 === null || d6 >= 14) return;
    const ix = slutdokIndex(state, p.id);
    if (ix.proc < 80)
      lagg(
        "hog",
        `Kritiska överlämningshandlingar saknas inför slutbesiktning — index ${ix.proc} %, ${d6} dagar kvar`,
        p.id,
        "slutdok"
      );
  });

  /* Underlag inför nästa betalningsmilstolpe */
  state.projekt.forEach((p) => {
    const nasta = nastaMilstolpe(state, p.id);
    if (!nasta) return;
    const u = mUnderlagKlart(state, p.id, nasta);
    if (!u.allt && state.betalplan.some((x) => x.projektId === p.id))
      lagg(
        "medel",
        `${nasta.kod} ${nasta.namn}: ${u.av - u.klara} underlag återstår innan lyftet kan aviseras`,
        p.id,
        "milstolpar"
      );
  });

  return fl.sort((a, b) => (a.niva === "hog" ? 0 : 1) - (b.niva === "hog" ? 0 : 1));
}
