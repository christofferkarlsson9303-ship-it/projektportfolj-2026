import { prisGrind, underrattelseLage } from "../../lib/berakningar.js";
import { idag } from "../../lib/datum.js";

/* ÄTA-flödets kolumnmodell. Ligger separat från komponenterna så att Fast
   Refresh fungerar — en .jsx som exporterar både komponenter och annat tappar
   hot reload.

   Kolumnerna är HÄRLEDDA, inte lagrade. ATA_STATUS har åtta lägen och inget av
   dem heter "underrättad" — underrättelsen spåras via fältet
   underrattelseDatum. Att lägga till en status hade ändrat datastrukturen, och
   den ska vara orörd, så tavlan räknar i stället fram vilken kolumn en post hör
   hemma i och skriver rätt fält vid släpp. */

export const KOLUMNER = [
  ["identifierad", "Identifierad / störning", "Ny omständighet. Underrättelse ska ut inom 24 timmar."],
  ["underrattad", "Underrättad", "Underrättelse avsänd — fristen är stoppad."],
  ["underlag", "Underlag & pris skickat", "Prissatt och skickat till beställaren."],
  ["godkand", "Godkänd", "Skriftligt godkänt pris — arbetet får utföras."],
  ["fakturerad", "Fakturerad", "Reglerad med UR-numret som referens."],
];

const UNDERLAGSSTATUS = ["prissattning", "skickad_best", "godkand_dok"];

/** Vilken kolumn en post hör hemma i. Avslutade poster hör inte hemma på tavlan. */
export function kolumnFor(u) {
  if (u.status === "stangd" || u.status === "utgar") return null;
  if (u.status === "fakturerad") return "fakturerad";
  if (u.status === "godkand") return "godkand";
  if (UNDERLAGSSTATUS.includes(u.status)) return "underlag";
  if (u.underrattelseDatum) return "underrattad";
  return "identifierad";
}

/* Vad ett släpp betyder. Datum stämplas bara när kolumnen i sig innebär att
   handlingen sker nu, och bara när fältet är tomt — ett datum som redan står
   där är en uppgift någon fyllt i med avsikt och skrivs aldrig över.

   handelseDatum stämplas aldrig automatiskt. Det är när omständigheten
   inträffade, ett faktum systemet inte känner till, och en gissning där vore
   en falsk avtalsuppgift. */
export function slappAtgard(u, kolumn) {
  const nu = idag();
  switch (kolumn) {
    case "identifierad":
      // Tillbaka till början: underrättelsen måste bort, annars studsar kortet
      // direkt tillbaka till nästa kolumn.
      return { status: "oppen", falt: u.underrattelseDatum ? { underrattelseDatum: "" } : {} };
    case "underrattad":
      return { status: "oppen", falt: u.underrattelseDatum ? {} : { underrattelseDatum: nu } };
    case "underlag":
      // Prissättning säger inget om när underrättelsen gick — den lämnas ifred.
      return { status: UNDERLAGSSTATUS.includes(u.status) ? u.status : "prissattning", falt: {} };
    case "godkand":
      return { status: "godkand", falt: u.godkantDatum ? {} : { godkantDatum: nu } };
    case "fakturerad":
      return { status: "fakturerad", falt: u.fakturaDatum ? {} : { fakturaDatum: nu } };
    default:
      return null;
  }
}

/** Grön, gul eller röd utifrån samma grindar som flaggmotorn använder. */
export function flagga(u) {
  const und = underrattelseLage(u);
  const pris = prisGrind(u);

  if (und?.varning) return { niva: "rod", txt: und.txt, ikon: "⏱" };
  if (pris?.varning) return { niva: "rod", txt: pris.txt, ikon: "🔒" };
  if (und && !und.ok) return { niva: "gul", txt: und.txt, ikon: "⏱" };
  if (pris && !pris.ok) return { niva: "gul", txt: pris.txt, ikon: "🔒" };
  if (und?.ok) return { niva: "gron", txt: und.txt, ikon: "✓" };
  return null;
}

/** Det datum som bäst beskriver var posten står just nu — för tidslinjen. */
export function datumFor(u) {
  return u.fakturaDatum || u.godkantDatum || u.underrattelseDatum || u.handelseDatum || "";
}
