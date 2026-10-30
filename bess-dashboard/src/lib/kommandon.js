/* Åtgärder i kommandopaletten (Ctrl/Cmd+K) — att göra något, inte bara gå någonstans.

   Två slag:
   - Skapa ur det man skrivit: "Ny punkt" (samma tolkning som snabbraden i Idag,
     datum sist blir frist) och "Ny ÄTA" (händelsedatum idag). De läggs SIST i
     träfflistan, så att Enter på "risker" fortfarande öppnar Risker. Börjar
     texten med "+" är det en punkt, och den hamnar först.
   - Fasta åtgärder: registrera händelse, fältmaterial, alla projekt, tema.

   Rena funktioner: paletten kopplar på vad som händer (kor). */

import { tolkaSnabbrad } from "./snabbrad.js";
import { datumKort } from "./datum.js";

/**
 * Förslag att skapa ur söktexten.
 * @param {string} q söktexten
 * @param {string} idagIso YYYY-MM-DD
 * @returns {{forst: boolean, poster: {typ: "punkt"|"ata", titel: string, forfaller?: string, uppfoljning?: string, sub: string}[]}}
 */
export function skapaForslag(q, idagIso) {
  const text = String(q || "").trim();
  if (!text) return { forst: false, poster: [] };
  const plus = text.startsWith("+");
  const ren = plus ? text.slice(1).trim() : text;
  const punkt = tolkaSnabbrad(ren, idagIso);
  /** @type {{typ: "punkt"|"ata", titel: string, forfaller?: string, uppfoljning?: string, sub: string}[]} */
  const poster = [];
  if (punkt) {
    poster.push({
      typ: "punkt",
      ...punkt,
      sub: punkt.forfaller ? `frist ${datumKort(punkt.forfaller)}` : "uppföljning idag",
    });
  }
  // En ÄTA har en händelse, inget frist-ord — hela texten är beskrivningen.
  if (!plus && ren.length >= 3) poster.push({ typ: "ata", titel: ren, sub: "händelsedatum idag · 24-timmarsfristen börjar" });
  return { forst: plus, poster };
}

/** Delar en träfflista och förslagen: förslagen sist, eller först efter "+". */
export function medForslag(traffar, forslag) {
  return forslag.forst ? [...forslag.poster, ...traffar] : [...traffar, ...forslag.poster];
}
