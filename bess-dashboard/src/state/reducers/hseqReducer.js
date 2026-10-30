/* HSEQ: skyddsronder och deras avvikelser.
   Delreducer: returnerar undefined för åtgärder den inte hanterar, så att
   portfolj-reducer.js kan fråga nästa domän. Flyttad oförändrad ur
   portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { loggat } from "./hjalp.js";

export function hseqReducer(state, action) {
  switch (action.type) {
    /* Rondavvikelser ligger nästlade i hseqRonder — uppdateras via avvikelsens id. */
    case "UPPD_RONDAVVIKELSE": {
      const { id, falt, varde } = action;
      const rond = (state.hseqRonder || []).find((r) => (r.avvikelser || []).some((a) => a.id === id));
      const fore = rond?.avvikelser.find((a) => a.id === id);
      const nytt = {
        ...state,
        hseqRonder: (state.hseqRonder || []).map((r) => {
          if (!(r.avvikelser || []).some((a) => a.id === id)) return r;
          return { ...r, avvikelser: r.avvikelser.map((a) => (a.id === id ? { ...a, [falt]: varde } : a)) };
        }),
      };
      // Statusbyte på en rondavvikelse är en HSEQ-händelse och ska finnas i spåret.
      if (falt !== "status" || !fore || fore.status === varde) return nytt;
      const text = String(fore.text || "Rondavvikelse");
      return loggat(nytt, rond.projektId, `Rondavvikelse ${text.length > 60 ? text.slice(0, 57) + "…" : text}: status ${fore.status || "—"} → ${varde}`);
    }

    default:
      return undefined;
  }
}
