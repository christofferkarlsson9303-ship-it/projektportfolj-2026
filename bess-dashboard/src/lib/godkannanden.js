/* Serverkvitterade godkännanden (granskning F05).

   Egenkontroller och grindpassager sparas som förut i portföljen, men kvitteras
   dessutom i tabellen godkannanden via RPC registrera_godkannande. Där sätter
   databasen vem (auth.uid) och när (now) – klienten kan inte skriva det själv.
   Den här filen är ren logik: vilka åtgärder som ska kvitteras, samma kontroller
   som servern gör, och en kö för kvittenser som inte nådde fram. */

import { arGiltigtDatum, idag } from "./datum.js";

/** @typedef {{projektId: string, typ: "egenkontroll"|"grind", objektId: string, varde: object, utfordAv: string}} Kvittens */

/** Kvittensen en åtgärd ger, eller null. @returns {Kvittens|null} */
export function kvittensFor(action, namn = "") {
  if (action?.type === "FALT_KONTROLL") {
    const r = action.rad;
    if (!r?.id || !r.resultat) return null;
    const varde = { punktId: r.punktId, omfattning: r.omfattning, resultat: r.resultat, datum: r.datum || "", kontrollant: r.kontrollant || "", referens: r.referens || "", notering: r.notering || "", mallrevision: r.mallrevision || "",
      ...(r.utforsAv === "ue" ? { utforsAv: "ue", ue: r.ue || "", ueSignerat: !!r.ueSignerat, ueDaterat: !!r.ueDaterat, ueAvvikelser: !!r.ueAvvikelser, skickadBestallare: r.skickadBestallare || "" } : {}) };
    return validera({ typ: "egenkontroll", varde }).length ? null : { projektId: r.projektId, typ: "egenkontroll", objektId: r.id, varde, utfordAv: r.kontrollant || "" };
  }
  if (action?.type === "EPC_FAS" && action.falt === "grindDatum") {
    const varde = { grindDatum: action.varde || "" };
    return validera({ typ: "grind", varde }).length ? null : { projektId: action.pid, typ: "grind", objektId: `G${action.fas}`, varde, utfordAv: namn };
  }
  return null;
}

/** Samma regler som registrera_godkannande() i databasen. @returns {string[]} fel */
export function validera({ typ, varde }) {
  const fel = [];
  if (typ === "egenkontroll") {
    if (!["ok", "ej-ok", "ej-tillamplig"].includes(varde.resultat)) fel.push("Ogiltigt resultat");
    if (!arGiltigtDatum(varde.datum)) fel.push("Ogiltigt kontrolldatum");
    else if (varde.datum > idag()) fel.push("Kontrolldatum i framtiden");
    if (!String(varde.kontrollant || "").trim() || !String(varde.referens || "").trim()) fel.push("Kontrollant och referens krävs");
    if (varde.resultat === "ej-tillamplig" && !String(varde.notering || "").trim()) fel.push("Ej tillämplig kräver motivering");
  } else if (typ === "grind") {
    if (varde.grindDatum && !arGiltigtDatum(varde.grindDatum)) fel.push("Ogiltigt grinddatum");
  } else fel.push("Okänd typ");
  return fel;
}

const KO = "batchc-godkannanden-ko-v1";
const koNyckel = (k) => `${k.projektId}|${k.typ}|${k.objektId}`;

/** Kön av kvittenser som väntar. Senaste värdet per objekt gäller. */
export function lasKo(lagring = globalThis.localStorage) {
  try {
    const v = JSON.parse(lagring.getItem(KO) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function sparaKo(ko, lagring = globalThis.localStorage) {
  try {
    if (ko.length) lagring.setItem(KO, JSON.stringify(ko));
    else lagring.removeItem(KO);
  } catch {
    /* blockerad lagring: kön lever i minnet till nästa försök */
  }
}

export const laggIKo = (ko, k) => [...ko.filter((x) => koNyckel(x) !== koNyckel(k)), k];

/** Skickar kön. `rpc(k)` kastar vid fel. Nekade (42501/22023) tas bort och rapporteras. */
export async function tomKo(ko, rpc) {
  const kvar = [];
  const nekade = [];
  let skickade = 0;
  for (const k of ko) {
    try {
      await rpc(k);
      skickade++;
    } catch (e) {
      if (["42501", "22023"].includes(e?.code)) nekade.push({ ...k, fel: e.message || String(e) });
      else kvar.push(k);
    }
  }
  return { kvar, nekade, skickade };
}
