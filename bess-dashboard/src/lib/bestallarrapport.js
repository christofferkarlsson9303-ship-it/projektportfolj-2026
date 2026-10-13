import { FAS_ANTAL, arFasNr, faseInfo } from "../data/projektfaser.ts";
import { FAS_STATUS, faslage, milstolpslage } from "./epc.js";
import { FASSTATUS, projektetsFaser, projektfasForMilstolpe, projektfasForMoment } from "./fasmappning.js";
import { kritiskLinje } from "./kritiskLinje.js";
import { SITE_STATUS, parkSumma, siteObjekt } from "./site.js";
import { idag } from "./datum.js";

/* Det beställarrapporten visar utöver nyckeltal och ÄTA: fasstatus, betalmilstolparna M1–M7,
   prognos mot kontraktet och anläggningsdata. Ren funktion över state, så att PDF:en
   (components/ui/Bestallarrapport.jsx) och förhandsgranskningen (sections/Rapport.jsx) visar
   samma sak.

   Fasstatus följer samma regel som projektstartens PDF: bara faser som är påbörjade eller klara
   kommer med. Faserna efter den aktiva redovisas som en rad ("återstår"), inte som tomma rader.
   Allt räknas ur det som finns i portföljen. Saknas en uppgift står det, inget fylls i. */

export const MS_TEXT = { fakturerad: "Fakturerad", pagaende: "Aviserad / pågående", kvar: "Kvar" };

/** Moment i checklistan som säger var nätanslutningen står: 12 Anslutning BESS/PCS, 13 Idrifttagning. */
const NATMOMENT = [12, 13];

export function bestallarrapportData(state, pid, nu = idag()) {
  const p = (state.projekt || []).find((x) => x.id === pid);
  if (!p) return null;

  const aktiv = arFasNr(p.fas) ? p.fas : 1;
  const alla = projektetsFaser(p);
  const faser = alla
    .filter((f) => f.status !== "last")
    .map((f) => ({ nr: f.nr, titel: f.titel, status: f.status, text: FASSTATUS[f.status].text }));
  const aterstar = alla.filter((f) => f.status === "last").map((f) => f.nr);

  const fl = faslage(state, pid, nu);
  const milstolpar = milstolpslage(state, pid, fl).map((m) => {
    const fas = projektfasForMilstolpe(m.kod);
    return { kod: m.kod, namn: m.namn, andel: m.andel, utloses: m.utloses, datum: m.datum, status: m.status, text: MS_TEXT[m.status], fas, fasKort: faseInfo(fas).kort };
  });

  const k = kritiskLinje(state, pid, nu);
  const tid = k
    ? {
        slutPrognos: k.slutPrognos,
        kontrakt: k.kontrakt,
        forsening: k.forsening,
        styr: k.faser.filter((f) => f.kritisk).map((f) => ({ moment: f.nr, kort: f.kort, fas: projektfasForMoment(f.nr) })),
      }
    : null;

  const objekt = siteObjekt(state, pid);
  const ps = parkSumma(objekt);
  const perStatus = (typ) => {
    const v = objekt.filter((o) => o.typ === typ);
    return {
      antal: v.length,
      lagen: SITE_STATUS.map(([id, text]) => ({ id, text, antal: v.filter((o) => o.status === id).length })).filter((x) => x.antal),
      utanStatus: v.filter((o) => !o.status).length,
    };
  };

  const anlaggning = {
    mw: p.mw ?? null,
    mwh: p.mwh ?? null,
    siteMw: ps.mw || null,
    siteMwh: ps.mwh || null,
    skid: perStatus("skid"),
    container: perStatus("container"),
    natagare: p.natagare || "",
    natkontakt: p.natkontakt || "",
    natmoment: NATMOMENT.map((nr) => {
      const f = fl[nr];
      return f ? { nr, kort: f.fas.kort, status: f.status, text: FAS_STATUS[f.status]?.[1] ?? "—", slut: f.grind.datum || f.slut } : null;
    }).filter(Boolean),
  };

  return { projekt: p, aktiv, antalFaser: FAS_ANTAL, faser, aterstar, milstolpar, tid, anlaggning };
}

/** "3 Levererad · 2 Monterad", eller vad som saknas. */
export function statusrad(s, namn) {
  if (!s.antal) return `Inga ${namn} inlagda på siten`;
  const delar = s.lagen.map((l) => `${l.antal} ${l.text.toLowerCase()}`);
  if (s.utanStatus) delar.push(`${s.utanStatus} utan status`);
  return `${s.antal} st · ${delar.join(" · ")}`;
}
