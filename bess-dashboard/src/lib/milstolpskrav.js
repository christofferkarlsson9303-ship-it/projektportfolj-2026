import { FASER as MOMENT } from "../data/bessChecklistData.ts";
import { faslage, milstolpslage } from "./epc.js";

/* Betalmilstolparna M1–M7 mot den gemensamma checklistan.

   En milstolpe betalas när grinden den är knuten till är godkänd (MILSTOLPAR.grind).
   Grinden avslutar ett moment i Bygga batteripark, så det som krävs är det momentets
   punkter. Inget räknas eller bockas här: allt läses ur faslage(), samma källa som
   Bygga batteripark, Idag och kritisk linje. Beslut 2026-10-17, gemensam checklista
   §2.4: Tidplan visar en räknare och kan inte ändra. */

/** @typedef {"fakturerad" | "godkand" | "klarForGrind" | "kvar"} KravLage */

/** Läget för varje milstolpe i projektet `pid`. `faser` kan skickas in om de redan är räknade. */
export function milstolpskrav(state, pid, faser = faslage(state, pid)) {
  const betal = milstolpslage(state, pid, faser);
  return betal.map((m) => {
    const nr = MOMENT.findIndex((x) => x.grind.kod === m.grind);
    const f = nr >= 0 ? faser[nr] : null;
    const totalt = f?.punkter ?? 0;
    const klara = (f?.klara ?? 0) + (f?.ejAktuella ?? 0);
    const kvar = f?.kvar ?? 0;
    const grindGodkand = Boolean(f?.grind?.passerad);
    /** @type {KravLage} */
    let lage = "kvar";
    if (m.status === "fakturerad") lage = "fakturerad";
    else if (grindGodkand) lage = "godkand";
    else if (totalt > 0 && kvar === 0) lage = "klarForGrind";
    return {
      kod: m.kod,
      namn: m.namn,
      andel: m.andel,
      utloses: m.utloses,
      grind: m.grind,
      moment: nr >= 0 ? nr : null,
      momentTitel: nr >= 0 ? MOMENT[nr].titel : null,
      totalt,
      klara,
      kvar,
      hpKvar: f?.hpKvar ?? 0,
      ejRegistrerade: f?.ejRegistrerade ?? 0,
      grindGodkand,
      lage,
    };
  });
}
