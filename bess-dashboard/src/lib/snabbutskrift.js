/* Snabbutskrift: förvalda dokument som hoppar över fältmaterialpanelen.
   Samma dokumentmodell som panelen (byggFaltmaterial), så utskrift och PDF
   ser likadana ut. Blanketter är alltid tomma — inga sparade resultat följer
   med i snabbvägen. */

import { arbetsrader, byggFaltmaterial } from "./faltmaterial.js";
import { idag } from "./datum.js";
import { PROJEKTMALLAR } from "../data/projektkontroll.js";

/** Utförare med öppna uppgifter i projektet, i bokstavsordning. */
export function utforareMedUppgifter(state, pid) {
  return [...new Set(arbetsrader(state, pid).map((p) => p.utforare).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
}

/** Arbetslista med öppna uppgifter — för en utförare, valda rader eller alla. */
export function arbetslistaDokument(state, projekt, { utforare = "", ids, skapadAv = "" } = {}) {
  return byggFaltmaterial({
    projekt,
    mallpaket: "teknisk",
    mallIds: [],
    metadata: { datum: idag(), skapadAv, utforare, enhet: "", ritning: "", fran: "", till: "" },
    uppgifter: arbetsrader(state, projekt.id, { utforare, ids }),
  });
}

/** Blank egenkontrollblankett för en byggfas. Null om fasen saknar kontroller. */
export function fasblankettDokument(projekt, fas, { enhet = "", skapadAv = "" } = {}) {
  const mall = PROJEKTMALLAR.find((m) => m.id === `projekt-${fas}`);
  if (!mall) return null;
  return byggFaltmaterial({
    projekt,
    mallpaket: "projekt",
    mallIds: [mall.id],
    kontroller: [],
    metadata: { datum: idag(), skapadAv, enhet, ritning: "", visaResultat: false, kontrollplan: "" },
  });
}

/** Byggfaser som har en egenkontrollblankett: [{fas, titel}]. */
export const FASBLANKETTER = PROJEKTMALLAR.map((m) => ({ fas: Number(m.id.replace("projekt-", "")), titel: m.titel })).filter((m) => Number.isFinite(m.fas));
