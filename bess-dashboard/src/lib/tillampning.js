/* Filtrering av kontrollpunkter på projektets hårdvaruprofil (granskning F09).
   En punkt utan `tillampning` gäller alla profiler. */

import { HARDVARUPROFILER } from "../data/hardvaruprofiler.js";

/** @param {{tillampning?: {profil: string}}} punkt @param {string} profilId */
export const gallerProfil = (punkt, profilId) => !punkt?.tillampning || punkt.tillampning.profil === profilId;

/**
 * Delar momentens punkter i de som gäller profilen och de som inte gör det.
 * @param {any[]} moment mallar med punkter
 * @param {string} profilId
 */
export function filtreraPaProfil(moment, profilId) {
  const undantagna = [];
  const ut = moment.map((m) => {
    const punkter = [];
    for (const p of m.punkter) {
      if (gallerProfil(p, profilId)) punkter.push(p);
      else undantagna.push({ momentId: m.id, punktId: p.id, titel: p.titel, profil: p.tillampning.profil, kalla: p.tillampning.manualRev });
    }
    return { ...m, punkter };
  });
  return { moment: ut, undantagna };
}

/** Öppna beslut för dokumentet: punkter som saknar krav för profilen, och krav som ska verifieras. */
export function oppnaBeslut(undantagna, moment, profilId) {
  const ut = [];
  if (undantagna.length) {
    const namn = HARDVARUPROFILER[profilId]?.namn || profilId;
    const fran = HARDVARUPROFILER[undantagna[0].profil]?.kort || undantagna[0].profil;
    ut.push(`${undantagna.length} punkter gäller ${fran} och är borttagna. Motsvarande kontrollkrav för ${namn} ska fastställas ur tillverkarens manual innan utförande.`);
  }
  const att = moment.flatMap((m) => m.punkter.filter((p) => p.verifiering && /verifier/i.test(p.verifiering)).map((p) => p.id));
  if (att.length) ut.push(`${att.length} krav är ej verifierade mot OEM-manual (${att.slice(0, 8).join(", ")}${att.length > 8 ? " …" : ""}).`);
  return ut;
}
