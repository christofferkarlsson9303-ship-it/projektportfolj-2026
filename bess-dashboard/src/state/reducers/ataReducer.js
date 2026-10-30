/* ÄTA: kalkylen, koppling till 3D-objekt och BCF.
   Delreducer: returnerar undefined för åtgärder den inte hanterar, så att
   portfolj-reducer.js kan fråga nästa domän. Flyttad oförändrad ur
   portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { ATA_KLASS, ATA_STATUS } from "../../data/konstanter.js";
import { idag } from "../../lib/datum.js";
import { kalkylRader, kalkylSummor } from "../../lib/atakalkyl.js";
import { fmtSEK } from "../../lib/format.js";
import { ifcObjektForProjekt } from "../../lib/ifcModell.js";
import { boxFel, kopplingFel, viewpointFel } from "../../lib/modellKoppling.js";
import { arGuid } from "../../lib/bcfHanterare.js";
import { byt, siteEtikett, loggat } from "./hjalp.js";

/** Lägger en fritextpost i ändringsloggen. */
/** Ändrar kalkylraderna på en ÄTA-post. En post med originalverktygets
 *  kalkyl får sina rader omlästa först, så att inget av det gamla tappas. */
function medKalkylrader(state, id, andra) {
  const u = state.ur.find((r) => r.id === id);
  if (!u) return state;
  const rader = andra(kalkylRader(u));
  return {
    ...state,
    ur: byt(state.ur, id, (r) => ({ ...r, kalkyl: { ...(r.kalkyl || {}), rader, uppdaterad: idag() } })),
  };
}

/** Fält en BCF-import får sätta på ett ärende. Allt annat (belopp, fakturering, datum m.m.) rörs aldrig. */
const BCF_FALT = ["benamning", "status", "klass", "ansvarig", "bcfGuid", "bcfBeskrivning", "bcfKomponenter", "objectGuid", "viewpoint", "boundingBox", "modelVersionId"];

/** Rensar BCF-fält: okända nycklar och ogiltiga värden tas bort i stället för att sparas. */
function bcfRensa(falt, objektIds) {
  const ut = {};
  for (const k of BCF_FALT) if (falt?.[k] !== undefined) ut[k] = falt[k];
  if (typeof ut.benamning !== "string" || !ut.benamning.trim()) delete ut.benamning;
  else ut.benamning = ut.benamning.trim().slice(0, 300);
  if (!ATA_STATUS.includes(ut.status)) delete ut.status;
  if (!ATA_KLASS.some(([k]) => k === ut.klass)) delete ut.klass;
  if (typeof ut.ansvarig !== "string") delete ut.ansvarig;
  if (typeof ut.bcfBeskrivning !== "string") delete ut.bcfBeskrivning;
  else ut.bcfBeskrivning = ut.bcfBeskrivning.slice(0, 2000);
  if (!arGuid(ut.bcfGuid)) delete ut.bcfGuid;
  if (!Array.isArray(ut.bcfKomponenter)) delete ut.bcfKomponenter;
  else ut.bcfKomponenter = ut.bcfKomponenter.filter((g) => typeof g === "string" && g).slice(0, 50);
  if (ut.viewpoint !== undefined && viewpointFel(ut.viewpoint) !== null) delete ut.viewpoint;
  if (ut.boundingBox !== undefined && boxFel(ut.boundingBox) !== null) delete ut.boundingBox;
  // En koppling kräver ett objekt som finns i projektet — annars faller den bort men kameran kan stå kvar.
  if (ut.objectGuid !== undefined && (typeof ut.objectGuid !== "string" || !objektIds.has(ut.objectGuid))) {
    delete ut.objectGuid;
    delete ut.boundingBox;
    delete ut.modelVersionId;
  }
  if (ut.modelVersionId !== undefined && typeof ut.modelVersionId !== "string") delete ut.modelVersionId;
  return ut;
}

export function ataReducer(state, action) {
  switch (action.type) {
    /* ---------- ÄTA-kalkylen ----------
       Raderna ligger på posten (kalkyl.rader) och sparas som allt annat.
       Beloppet på posten ändras bara när användaren sparar kalkylen — då
       skrivs nettot (exkl. moms) och ändringen loggas. */
    case "ATA_KALKYL_LAGG_TILL": {
      const { id, rader, efter } = action;
      return medKalkylrader(state, id, (fore) => {
        const i = efter ? fore.findIndex((r) => r.id === efter) : -1;
        return i < 0 ? [...fore, ...rader] : [...fore.slice(0, i + 1), ...rader, ...fore.slice(i + 1)];
      });
    }

    case "ATA_KALKYL_ANDRA": {
      const { id, radId, andring } = action;
      return medKalkylrader(state, id, (fore) => fore.map((r) => (r.id === radId ? { ...r, ...andring } : r)));
    }

    case "ATA_KALKYL_TA_BORT": {
      const { id, radId } = action;
      return medKalkylrader(state, id, (fore) => fore.filter((r) => r.id !== radId));
    }

    case "ATA_KALKYL_SPARA": {
      const u = state.ur.find((r) => r.id === action.id);
      if (!u) return state;
      const rader = kalkylRader(u);
      const { netto } = kalkylSummor(rader);
      const ut = {
        ...state,
        ur: byt(state.ur, u.id, (r) => ({
          ...r,
          belopp: netto,
          kalkyl: { ...(r.kalkyl || {}), rader, uppdaterad: idag(), sparad: idag() },
        })),
      };
      const fore = u.belopp === null || u.belopp === undefined || u.belopp === "" ? "utan belopp" : fmtSEK(u.belopp);
      return loggat(ut, u.projektId, `${u.nr}: belopp ur kalkylen ${fore} → ${fmtSEK(netto)} (exkl. moms)`);
    }

    /* ---------- Ärende ↔ modell (CDE/BCF-anda) ----------
       Ett UR/ÄTA-ärende pekar på ett siteObjekt (objectGuid), en kameravy, objektets
       omslutande låda och en modellversion. Fälten ligger direkt på ärendet. Kopplingen
       avvisas om ärendet eller objektet inte finns, eller om objektet hör till ett annat
       projekt — state lämnas då orört. */
    case "ATA_KOPPLA_OBJEKT": {
      const { id, koppling } = action;
      const u = (state.ur || []).find((r) => r.id === id);
      if (!u || kopplingFel(koppling) !== null) return state;
      const o = (state.siteObjekt || []).find((r) => r.id === koppling.objectGuid && r.projektId === u.projektId)
        || ifcObjektForProjekt(state, u.projektId).find((r) => r.id === koppling.objectGuid);
      if (!o) return state;
      const falt = {
        objectGuid: koppling.objectGuid,
        viewpoint: koppling.viewpoint ?? null,
        boundingBox: koppling.boundingBox ?? null,
        modelVersionId: koppling.modelVersionId ?? "",
      };
      if (JSON.stringify([u.objectGuid, u.viewpoint, u.boundingBox, u.modelVersionId]) === JSON.stringify([falt.objectGuid, falt.viewpoint, falt.boundingBox, falt.modelVersionId])) return state;
      const ut = { ...state, ur: byt(state.ur, id, (r) => ({ ...r, ...falt })) };
      return loggat(ut, u.projektId, `${u.nr || id}: kopplad till ${siteEtikett(state, o)} i 3D`);
    }

    case "ATA_LOSS_OBJEKT": {
      const u = (state.ur || []).find((r) => r.id === action.id);
      if (!u || !u.objectGuid) return state;
      const ut = {
        ...state,
        ur: byt(state.ur, u.id, (r) => {
          const { objectGuid: _g, viewpoint: _v, boundingBox: _b, modelVersionId: _m, ...kvar } = r;
          return kvar;
        }),
      };
      return loggat(ut, u.projektId, `${u.nr || u.id}: koppling till 3D-objekt borttagen`);
    }

    /* ---------- BCF ----------
       Import skapar nya ärenden och uppdaterar de som redan har samma bcfGuid. Bara BCF-fälten
       (se BCF_FALT) skrivs; en ogiltig status, kameravy eller koppling tas bort ur raden i
       stället för att sparas. Ett nytt ärende vars bcfGuid redan finns i projektet hoppas över. */
    case "ATA_IMPORTERA_BCF": {
      const { projektId, nya = [], uppdatera = [] } = action;
      if (!state.projekt.some((p) => p.id === projektId)) return state;
      const objektIds = new Set([...(state.siteObjekt || []).filter((o) => o.projektId === projektId), ...ifcObjektForProjekt(state, projektId)].map((o) => o.id));
      const ur = state.ur || [];
      let rader = ur;
      let antalNya = 0;
      let antalUppd = 0;
      for (const u of uppdatera) {
        const rad = rader.find((r) => r.id === u?.id && r.projektId === projektId);
        if (!rad) continue;
        const falt = bcfRensa(u.falt, objektIds);
        if (!Object.keys(falt).length) continue;
        rader = byt(rader, rad.id, (r) => ({ ...r, ...falt }));
        antalUppd += 1;
      }
      for (const n of nya) {
        if (!n || typeof n.id !== "string" || n.projektId !== projektId || rader.some((r) => r.id === n.id)) continue;
        if (n.bcfGuid && rader.some((r) => r.projektId === projektId && r.bcfGuid === n.bcfGuid)) continue;
        const falt = bcfRensa(n, objektIds);
        if (!falt.benamning) continue;
        // BCF-fälten kommer bara ur den rensade `falt` — inget som rensats bort får följa med n.
        const bas = Object.fromEntries(Object.entries(n).filter(([k]) => !BCF_FALT.includes(k)));
        rader = [...rader, { ...bas, ...falt }];
        antalNya += 1;
      }
      if (!antalNya && !antalUppd) return state;
      return loggat({ ...state, ur: rader }, projektId, `BCF-import: ${antalNya} nya och ${antalUppd} uppdaterade ärenden`);
    }

    /* Efter en export: ärenden som fick ett nytt BCF-guid sparar det, så att en senare import uppdaterar dem. */
    case "ATA_SATT_BCFGUID": {
      const guider = action.guider || {};
      let rader = state.ur || [];
      let andrat = false;
      for (const [id, g] of Object.entries(guider)) {
        const rad = rader.find((r) => r.id === id);
        if (!rad || !arGuid(g) || rad.bcfGuid === g) continue;
        rader = byt(rader, id, (r) => ({ ...r, bcfGuid: g }));
        andrat = true;
      }
      return andrat ? { ...state, ur: rader } : state;
    }

    default:
      return undefined;
  }
}
