/* Siten i 3D (objekt, ritningar, modellversioner, IFC) och byggmöten.
   Delreducer: returnerar undefined för åtgärder den inte hanterar, så att
   portfolj-reducer.js kan fråga nästa domän. Flyttad oförändrad ur
   portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { ritningsFel } from "../../lib/ritningar.js";
import { IFC_MAX_MODELLER, ifcModellFel } from "../../lib/ifcModell.js";
import { MALLAR, objektFel, punkterForSite } from "../../lib/site.js";
import { medLogg, byt, siteEtikett, loggat } from "./hjalp.js";

export function siteReducer(state, action) {
  switch (action.type) {
    /* ---------- Siten ----------
       Volymer och nålar per projekt. En rad som inte går att spara (en nål
       utan punkt, en volym utan mått) avvisas — state lämnas orört. Flytt och
       måttändringar loggas inte, det skulle fylla loggen när någon drar. */
    case "SITE_LAGG_TILL": {
      const { rad } = action;
      if (objektFel(rad, punkterForSite(state, rad?.projektId)) !== null) return state;
      const ut = { ...state, siteObjekt: [...(state.siteObjekt || []), rad] };
      return loggat(ut, rad.projektId, `Site: ${siteEtikett(state, rad)} placerad`);
    }

    /* Profilens standardlayout (lib/siteLager.js) på en tom tomt, i ett steg och med en loggrad.
       Har projektet redan volymer på siten görs ingenting — layouten skriver aldrig över. */
    case "SITE_STANDARDLAYOUT": {
      const { projektId, rader, profil } = action;
      if (!Array.isArray(rader) || !rader.length || rader.some((r) => r.projektId !== projektId)) return state;
      if ((state.siteObjekt || []).some((r) => r.projektId === projektId && r.typ !== "nal")) return state;
      const punkter = punkterForSite(state, projektId);
      if (rader.some((r) => objektFel(r, punkter) !== null)) return state;
      const ut = { ...state, siteObjekt: [...(state.siteObjekt || []), ...rader] };
      return loggat(ut, projektId, `Site: standardlayout ${profil || ""} inlagd (${rader.length} objekt)`.replace("  ", " "));
    }

    /* Byggläget: flera objekt i ett steg (en rad containrar), en loggrad. Rader som inte går
       att spara hoppas över; inga objekt alls → state orört. */
    case "SITE_LAGG_TILL_FLERA": {
      const { projektId, rader } = action;
      if (!Array.isArray(rader)) return state;
      const punkter = punkterForSite(state, projektId);
      const ok = rader.filter((r) => r?.projektId === projektId && objektFel(r, punkter) === null);
      if (!ok.length) return state;
      const ut = { ...state, siteObjekt: [...(state.siteObjekt || []), ...ok] };
      return loggat(ut, projektId, `Site: ${ok.length} × ${MALLAR[ok[0].typ]?.namn || "objekt"} placerade i rad`);
    }

    /* Ångra i byggläget: projektets objekt sätts tillbaka till en tidigare lista. Andra
       projekts objekt rörs inte. Nålar vars punkt inte längre finns hoppas över. */
    case "SITE_ANGRA": {
      const { projektId, rader } = action;
      if (!projektId || !Array.isArray(rader)) return state;
      const punkter = punkterForSite(state, projektId);
      const ok = rader.filter((r) => r?.projektId === projektId && objektFel(r, punkter) === null);
      const ovriga = (state.siteObjekt || []).filter((r) => r.projektId !== projektId);
      return loggat({ ...state, siteObjekt: [...ovriga, ...ok] }, projektId, "Site: senaste ändringen ångrad");
    }

    case "SITE_ANDRA": {
      const { id, andring } = action;
      const o = (state.siteObjekt || []).find((r) => r.id === id);
      if (!o) return state;
      const nytt = { ...o, ...andring, id: o.id, projektId: o.projektId, typ: o.typ };
      if (objektFel(nytt, punkterForSite(state, o.projektId)) !== null) return state;
      return { ...state, siteObjekt: byt(state.siteObjekt, id, () => nytt) };
    }

    case "SITE_TA_BORT": {
      const o = (state.siteObjekt || []).find((r) => r.id === action.id);
      if (!o) return state;
      const ut = { ...state, siteObjekt: state.siteObjekt.filter((r) => r.id !== o.id) };
      return loggat(ut, o.projektId, `Site: ${siteEtikett(state, o)} borttagen`);
    }

    /* Ritningar i 3D-vyn: metadata och placering (lib/ritningar.js). Filen ligger i Storage
       eller IndexedDB och kommer aldrig in här. Uppladdning och borttagning loggas, flytt inte. */
    case "SITE_RITNING_LAGG_TILL": {
      const r = action.rad;
      if (!r?.id || !r.projektId || !r.sokvag || !state.projekt.some((p) => p.id === r.projektId)) return state;
      if ((state.siteRitningar || []).some((x) => x.id === r.id)) return state;
      if (/^data:/i.test(r.sokvag)) return state;
      return loggat({ ...state, siteRitningar: [...(state.siteRitningar || []), { ...r }] }, r.projektId, `Ritning uppladdad till siten: ${r.namn}`);
    }

    case "SITE_RITNING_ANDRA": {
      const { id, andring } = action;
      const r = (state.siteRitningar || []).find((x) => x.id === id);
      if (!r || ritningsFel(andring) !== null) return state;
      const tvatt = (k, v) => (k === "namn" ? String(v).trim() : k === "synlig" || k === "placering" ? v : Number(v));
      const tal = Object.fromEntries(Object.entries(andring).map(([k, v]) => [k, tvatt(k, v)]));
      return { ...state, siteRitningar: state.siteRitningar.map((x) => (x.id === id ? { ...x, ...tal } : x)) };
    }

    case "SITE_RITNING_TA_BORT": {
      const r = (state.siteRitningar || []).find((x) => x.id === action.id);
      if (!r) return state;
      return loggat({ ...state, siteRitningar: state.siteRitningar.filter((x) => x.id !== r.id) }, r.projektId, `Ritning borttagen från siten: ${r.namn}`);
    }

    /* Återställ = tomt läge för projektet. Andra projekts objekt lämnas. */
    case "SITE_ATERSTALL": {
      const { projektId } = action;
      const kvar = (state.siteObjekt || []).filter((r) => r.projektId !== projektId);
      if (kvar.length === (state.siteObjekt || []).length) return state;
      return loggat({ ...state, siteObjekt: kvar }, projektId, "Site: återställd till tom tomt");
    }

    /* ---------- Modellversioner ----------
       En ögonblicksbild av projektets siteObjekt, som jämförelseverktyget ställer mot
       nuläget. Bilden tas ur state, inte ur anroparen. De 20 senaste per projekt sparas. */
    case "MODELLVERSION_SKAPA": {
      const { projektId, id, namn, datum } = action;
      if (!projektId || !id || !state.projekt.some((p) => p.id === projektId)) return state;
      if ((state.modellVersioner || []).some((v) => v.id === id)) return state;
      const objekt = structuredClone((state.siteObjekt || []).filter((o) => o.projektId === projektId));
      const rad = { id, projektId, namn: String(namn || "").trim() || "Modellversion", datum: datum || new Date().toISOString(), objekt };
      const andra = (state.modellVersioner || []).filter((v) => v.projektId !== projektId);
      const egna = [...(state.modellVersioner || []).filter((v) => v.projektId === projektId), rad].slice(-20);
      return loggat({ ...state, modellVersioner: [...andra, ...egna] }, projektId, `Modellversion sparad: ${rad.namn} (${objekt.length} objekt)`);
    }

    case "MODELLVERSION_TA_BORT": {
      const v = (state.modellVersioner || []).find((r) => r.id === action.id);
      if (!v) return state;
      return loggat({ ...state, modellVersioner: state.modellVersioner.filter((r) => r.id !== v.id) }, v.projektId, `Modellversion borttagen: ${v.namn}`);
    }

    /* ---------- IFC-modeller ----------
       Bara metadata (GlobalId, expressID, namn, klass, låda) sparas här; geometrin ligger i
       webbläsarens IndexedDB (lib/ifcCache.js). Högst IFC_MAX_MODELLER per projekt. En modell
       som tas bort tar inte med sig ärendena — de behåller sitt GlobalId och sin kameravy. */
    case "IFC_MODELL_LAGG_TILL": {
      const m = action.modell;
      if (ifcModellFel(m) !== null || !state.projekt.some((p) => p.id === m.projektId)) return state;
      const alla = state.ifcModeller || [];
      if (alla.some((r) => r.id === m.id)) return state;
      if (alla.filter((r) => r.projektId === m.projektId).length >= IFC_MAX_MODELLER) return state;
      return loggat({ ...state, ifcModeller: [...alla, structuredClone(m)] }, m.projektId, `IFC-modell tillagd: ${m.namn} (${m.objekt.length} objekt)`);
    }

    case "IFC_MODELL_TA_BORT": {
      const m = (state.ifcModeller || []).find((r) => r.id === action.id);
      if (!m) return state;
      return loggat({ ...state, ifcModeller: state.ifcModeller.filter((r) => r.id !== m.id) }, m.projektId, `IFC-modell borttagen: ${m.namn}`);
    }

    /* ---------- Byggmöten ----------
       Protokollets punkter ligger nästlade i mötet, så de kan inte gå via
       UPPDATERA. Statusbyte på själva mötet loggas som alla andra. */
    case "UPPD_MOTE": {
      const { id, falt, varde } = action;
      const m = (state.byggmoten || []).find((x) => x.id === id);
      if (!m) return state;
      const gammalt = m[falt];
      const nytt = {
        ...state,
        byggmoten: state.byggmoten.map((x) => (x.id === id ? { ...x, [falt]: varde } : x)),
      };
      if (falt !== "status" || gammalt === varde) return nytt;
      return { ...nytt, andringslogg: medLogg(state, "byggmoten", id, gammalt, varde) };
    }

    case "NY_MOTESPUNKT": {
      const { moteId, punkt } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId ? { ...m, punkter: [...(m.punkter || []), punkt] } : m
        ),
      };
    }

    case "UPPD_MOTESPUNKT": {
      const { moteId, ptId, falt, varde } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId
            ? { ...m, punkter: m.punkter.map((pt) => (pt.id === ptId ? { ...pt, [falt]: varde } : pt)) }
            : m
        ),
      };
    }

    case "TA_BORT_MOTESPUNKT": {
      const { moteId, ptId } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId ? { ...m, punkter: m.punkter.filter((pt) => pt.id !== ptId) } : m
        ),
      };
    }

    default:
      return undefined;
  }
}
