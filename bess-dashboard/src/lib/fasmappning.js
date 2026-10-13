import { FASER, FAS_ANTAL, arEjVunnet, arFasNr, faseInfo } from "../data/projektfaser.ts";
import { FASER as MOMENT, MILSTOLPAR } from "../data/bessChecklistData.ts";

/* Fas 1–8 är appens enda fasnumrering. Allt som visar en fas läser härifrån.

   Tre källor knyts ihop:
   - projektets faser 1–8          data/projektfaser.ts (nr, kort, titel, status)
   - checklistans moment 0–15      data/bessChecklistData.ts, fältet `projektfas`
   - betalmilstolparna M1–M7       via grinden de låser (M4 → G7 → moment 7 → fas 4)

   Projektets aktiva fas är `projekt.fas`. Den sätts av projektstarten när en fas
   godkänns, av fasmätaren på projektkortet och av "Flytta till fas N" i
   milstolpsvyn — alltid med SATT_PROJEKTFAS. Fasens status räknas ur den, så en
   ändring syns samtidigt i projektstart, projektkort, tidplan och milstolpar. */

/** Fasens status. Samma fyra värden och texter i alla vyer. Tonen är designsystemets. */
export const FASSTATUS = {
  klar: { ton: "ok", text: "Klar" },
  pagar: { ton: "info", text: "Pågår" },
  ejPaborjad: { ton: "neutral", text: "Ej påbörjad" },
  last: { ton: "neutral", text: "Låst" },
};

/** Status för fas `nr` när projektet ligger i `aktiv`. Faser efter den aktiva är låsta: nästa fas
 *  låses upp först när allt obligatoriskt i den aktiva är godkänt. Är framdriften känd
 *  (`klara`/`totalt`) och inget är gjort, är den aktiva fasen ej påbörjad. */
export function fasStatus(nr, aktiv, { klara, totalt } = {}) {
  const a = arFasNr(aktiv) ? aktiv : 1;
  if (nr < a) return "klar";
  if (nr > a) return "last";
  return totalt > 0 && klara === 0 ? "ejPaborjad" : "pagar";
}

/** Projektstartens läge per fas (lib/projektfas.js fasLage) till den gemensamma statusen.
 *  "upplast" är en passerad fas med obligatoriskt kvar, alltså fortfarande pågående. */
export function fasStatusFranLage(f) {
  if (f.status === "klar") return "klar";
  if (f.status === "last") return "last";
  if (f.status === "upplast") return "pagar";
  return f.totalt > 0 && f.klara === 0 ? "ejPaborjad" : "pagar";
}

/** Alla åtta faser med status för ett projekt. Ett förlorat anbud har bara fas 1. */
export function projektetsFaser(p) {
  const aktiv = arFasNr(p?.fas) ? p.fas : 1;
  const faser = arEjVunnet(p?.status) ? FASER.filter((f) => f.nr === 1) : FASER;
  return faser.map((f) => ({ ...f, status: fasStatus(f.nr, aktiv) }));
}

/** "Fas 5 av 8 · Montage" */
export const fasEtikett = (nr) => `Fas ${nr} av ${FAS_ANTAL} · ${faseInfo(nr).kort}`;

/* ---------- Moment 0–15 ---------- */

/** Projektfasen ett checklistmoment hör till. */
export const projektfasForMoment = (m) => MOMENT[m]?.projektfas ?? null;

/** Momenten i en projektfas, i ordning. Fas 1–8 har alltid minst ett moment. */
export const momentIFas = (nr) => MOMENT.filter((m) => m.projektfas === nr).map((m) => m.nr);

/** Fas 1–8 med sina moment, för vyer som grupperar momenten under faserna. */
export const MOMENTGRUPPER = FASER.map((f) => ({ fas: f, moment: momentIFas(f.nr) }));

/** Grupperar en lista med moment ({ fas: { nr } } eller { nr }) under fas 1–8, i ordning. Faser
 *  utan moment i listan tas inte med. */
export function grupperaMoment(lista, momentNr = (x) => x.fas?.nr ?? x.nr) {
  return FASER.map((f) => ({ fas: f, rader: lista.filter((x) => projektfasForMoment(momentNr(x)) === f.nr) })).filter((g) => g.rader.length);
}

/** Projektfasen ur checklistans läge (lib/epc.js faslage): fasen för det första momentet vars grind
 *  inte är passerad. Är allt passerat är projektet i sista fasen. */
export function projektfasFranMomentlage(faslage) {
  const aktuell = faslage.findIndex((f) => f.status !== "klar");
  const m = aktuell === -1 ? faslage.length - 1 : aktuell;
  return projektfasForMoment(m);
}

/* ---------- Milstolpar M1–M7 ---------- */

/** Projektfasen en betalmilstolpe hör till: fasen för momentet vars grind utlöser betalningen. */
export function projektfasForMilstolpe(kod) {
  const grind = MILSTOLPAR.find((m) => m.kod === kod)?.grind;
  const moment = MOMENT.find((f) => f.grind.kod === grind);
  return moment ? moment.projektfas : null;
}

/** Milstolparna (koder) som hör till en projektfas. Fas 3, 5 och 8 har ingen betalning. */
export const milstolparIFas = (nr) => MILSTOLPAR.filter((m) => projektfasForMilstolpe(m.kod) === nr).map((m) => m.kod);

/* ---------- Avvikelse mellan projektkort och tidplan ---------- */

/** Projektkortets fas mot fasen tidplanen (checklistans grindar) pekar på. null när de stämmer,
 *  när projektet saknar fas eller när ingen grind är passerad — då säger tidplanen ingenting. */
export function fasAvvikelse(p, faslage) {
  if (!p || !arFasNr(p.fas) || arEjVunnet(p.status) || !faslage?.length) return null;
  if (!faslage.some((f) => f.grind?.passerad)) return null;
  const tidplan = projektfasFranMomentlage(faslage);
  return tidplan && tidplan !== p.fas ? { kort: p.fas, tidplan } : null;
}
