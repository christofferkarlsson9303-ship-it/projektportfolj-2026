/* Läget för ett projekt i en rad — samma svar i Översikt och i Idag.

   Tid (tidsdom), pengar (prognosLage), vad som blockerar (nästa grind) och hur
   mycket som väntar (arbetslage). Dessutom projektets fas och den åtgärd som
   fasen pekar ut just nu: nastaUppgifter() väger in sena ledtider, försenade
   och pågående moment och nästa grind. Inget räknas om här; varje del kommer
   ur sin egen motor. */

import { faseInfo } from "../data/projektfaser.ts";
import { arbetslage } from "./agenda.js";
import { lagesbild, nastaUppgifter, planAnkare, tidigareErfarenheter } from "./epc.js";
import { idag } from "./datum.js";
import { prognos, prognosLage } from "./prognos.js";
import { tidsdom } from "./tidsdom.js";

/** Det som blockerar: nästa grind som inte är passerad och vad som saknas. */
export function blockerar(state, pid, nu = idag()) {
  if (!planAnkare(state, pid)) return { ton: "warn", text: "Datum saknas" };
  const ng = lagesbild(state, pid, nu).nastaGrind;
  if (!ng) return { ton: "ok", text: "Alla grindar passerade" };
  if (!ng.kvar) return { ton: "ok", text: `${ng.fas.grind.kod} kan passeras` };
  return {
    ton: ng.status === "sen" ? "bad" : "neutral",
    text: `${ng.fas.grind.kod}: ${ng.kvar} ${ng.kvar === 1 ? "punkt" : "punkter"} kvar${ng.hpKvar ? `, ${ng.hpKvar} HP` : ""}`,
  };
}

/**
 * Nästa åtgärd i checklistan, eller null. `post` är "kp-<id>" för en punkt och
 * "fas-<nr>" för en grind — samma ankare som Bygga batteripark öppnar.
 * `lardomar` är antal avvikelser/lärdomar på samma punkt i andra projekt.
 * @returns {{text: string, orsak: string, ton: string, post: string, lardomar: number} | null}
 */
export function nastaAtgard(state, pid, nu = idag()) {
  if (!planAnkare(state, pid)) return null;
  const forsta = nastaUppgifter(state, pid, nu)[0];
  if (!forsta) return null;
  if (forsta.typ === "grind") {
    return { text: `Passera ${forsta.fas.fas.grind.kod}`, orsak: forsta.orsak, ton: forsta.ton || "", post: `fas-${forsta.fas.fas.nr}`, lardomar: 0 };
  }
  return {
    text: forsta.punkt.text, orsak: forsta.orsak, ton: forsta.ton || "", post: `kp-${forsta.punkt.id}`,
    lardomar: tidigareErfarenheter(state, forsta.punkt.id, pid).length,
  };
}

/** Antal rader som kräver åtgärd inom en vecka — samma räkning som Idag. */
export function attGoraAntal(state, pid) {
  const l = arbetslage(state, 30, pid);
  return l.frister.length + l.forfallet.length + (l.utanDatum.length ? 1 : 0) + l.idag.length + l.veckan.length;
}

/** Hela raden för ett projekt. */
export function projektlage(state, p, nu = idag()) {
  const fas = faseInfo(p.fas);
  return {
    p,
    fas: { nr: fas.nr, kort: fas.kort },
    tid: tidsdom(state, p.id, nu),
    pengar: prognosLage(prognos(state, p.id)),
    block: blockerar(state, p.id, nu),
    nasta: nastaAtgard(state, p.id, nu),
    attGora: attGoraAntal(state, p.id),
  };
}
