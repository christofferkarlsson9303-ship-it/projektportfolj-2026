/* Ekonomi: kontrakt, betalplan, underlag, milstolpestatus, fakturaunderlag och prognos.
   Delreducer: returnerar undefined för åtgärder den inte hanterar, så att
   portfolj-reducer.js kan fråga nästa domän. Flyttad oförändrad ur
   portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { angraFakturaunderlag, skapaFakturaunderlag } from "../../lib/planering.js";
import { granskaProfil, rensaProfil } from "../../lib/kontraktsprofil.js";
import { hamtaNamn, medLogg, byt, loggat } from "./hjalp.js";

export function ekonomiReducer(state, action) {
  switch (action.type) {
    /* Kontraktsprofil: ersätter projektets tidigare profil. Granskas igen här
       så att en felaktig fil aldrig sparas, oavsett varifrån den kommer. */
    case "SPARA_KONTRAKT": {
      const { profil, av = "", datum = "" } = action;
      if (granskaProfil(profil, state.projekt).fel.length) return state;
      const rad = rensaProfil(profil, { av, datum });
      const ovriga = (state.kontrakt || []).filter((k) => k.projektId !== rad.projektId);
      const fanns = ovriga.length !== (state.kontrakt || []).length;
      return loggat({ ...state, kontrakt: [...ovriga, rad] }, rad.projektId, `Kontraktsprofil ${fanns ? "uppdaterad" : "inläst"}: ${rad.kalla.dokument}${rad.kalla.datum ? ` (${rad.kalla.datum})` : ""}`);
    }

    case "TA_BORT_KONTRAKT": {
      const fore = state.kontrakt || [];
      if (!fore.some((k) => k.projektId === action.projektId)) return state;
      return loggat({ ...state, kontrakt: fore.filter((k) => k.projektId !== action.projektId) }, action.projektId, "Kontraktsprofil borttagen — standardmallen gäller igen");
    }

    /* Kontraktsvärde: administratörslåst, sparas i eget dokument. */
    case "UPPD_KONTRAKT": {
      const { pid, varde } = action;
      const v = varde === "" || varde === null || varde === undefined ? null : Number(varde);
      return { ...state, projekt: byt(state.projekt, pid, (p) => ({ ...p, kontraktsvarde: v })) };
    }

    /* Betalplan: administratörslåst, sparas i eget dokument. Status loggas. */
    case "UPPD_BETALPLAN": {
      const { id, falt, varde } = action;
      const rad = state.betalplan.find((r) => r.id === id);
      if (!rad) return state;
      const gammalt = rad[falt];
      const nytt = { ...state, betalplan: byt(state.betalplan, id, (r) => ({ ...r, [falt]: varde })) };
      if (falt !== "status" || gammalt === varde) return nytt;
      return { ...nytt, andringslogg: medLogg(state, "betalplan", id, gammalt, varde) };
    }

    /* Ny rad i betalplanen — även den administratörslåst. */
    case "UPPD_BETALPLAN_NY":
      return { ...state, betalplan: [...state.betalplan, action.rad] };

    /* Underlagsstämpel per projekt — sätter infört-datum och signatur. */
    case "UPPD_UNDERLAG": {
      const { pid, falt, varde, datum } = action;
      return {
        ...state,
        projekt: byt(state.projekt, pid, (p) => {
          const u = { ...(p.underlag || { kalla: "", datum: "", infort: "", av: "" }), [falt]: varde };
          if (falt === "kalla" || falt === "datum") {
            u.infort = datum;
            u.av = hamtaNamn() || "";
          }
          return { ...p, underlag: u };
        }),
      };
    }

    /* Milstolpestatus ligger i mstatus, som skapas lazy per projekt och kod. */
    case "UPPD_MSTATUS": {
      const { pid, kod, falt, varde } = action;
      const finns = (state.mstatus || []).some((x) => x.projektId === pid && x.kod === kod);
      const bas = { id: `ms-${pid}-${kod}`, projektId: pid, kod, underlag: {}, avisering: "", faktura: "" };
      const rader = finns ? state.mstatus : [...(state.mstatus || []), bas];
      return {
        ...state,
        mstatus: rader.map((r) =>
          r.projektId === pid && r.kod === kod ? { ...r, [falt]: varde } : r
        ),
      };
    }

    case "UPPD_MUNDERLAG": {
      const { pid, kod, n, varde } = action;
      const finns = (state.mstatus || []).some((x) => x.projektId === pid && x.kod === kod);
      const bas = { id: `ms-${pid}-${kod}`, projektId: pid, kod, underlag: {}, avisering: "", faktura: "" };
      const rader = finns ? state.mstatus : [...(state.mstatus || []), bas];
      return {
        ...state,
        mstatus: rader.map((r) =>
          r.projektId === pid && r.kod === kod
            ? { ...r, underlag: { ...(r.underlag || {}), [n]: !!varde } }
            : r
        ),
      };
    }

    /* Fakturaunderlag: skapas av allt ofakturerat och låser raderna i samma
       steg, så att ingen tidrad eller kostnad hamnar i två underlag. */
    case "SKAPA_FAKTURAUNDERLAG": {
      const ut = skapaFakturaunderlag(state, action.pid, action.datum);
      if (ut === state) return state;
      const f = ut.fakturor[ut.fakturor.length - 1];
      return loggat(ut, action.pid, `Fakturaunderlag ${f.nr} skapat (${f.summa} kr)`);
    }

    case "ANGRA_FAKTURAUNDERLAG": {
      const f = state.fakturor.find((x) => x.id === action.id);
      const ut = angraFakturaunderlag(state, action.id);
      if (ut === state) return state;
      return loggat(ut, f.projektId, `Fakturaunderlag ${f.nr} ångrat — raderna är upplåsta`);
    }

    /* Veckans prognos: en rad per projekt och vecka, skrivs över om den sparas igen. */
    case "SPARA_PROGNOS": {
      const { rad } = action;
      const lista = state.prognoser || [];
      const finns = lista.some((r) => r.id === rad.id);
      return { ...state, prognoser: finns ? lista.map((r) => (r.id === rad.id ? rad : r)) : [...lista, rad] };
    }

    default:
      return undefined;
  }
}

/** Sant för åtgärder som rör administratörslåst ekonomidata (eget dokument). */
export function arEkonomiAtgard(action) {
  return (
    action.type === "UPPD_KONTRAKT" ||
    action.type === "UPPD_BETALPLAN" ||
    action.type === "UPPD_BETALPLAN_NY"
  );
}
