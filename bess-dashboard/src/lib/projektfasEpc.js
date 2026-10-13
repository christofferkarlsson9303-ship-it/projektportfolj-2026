import { faslage } from "./epc.js";
import { projektfasFranMomentlage } from "./fasmappning.js";

/* Projektfasen (1–8) för ett projekt som styrs av EPC-checklistan, räknad ur checklistans moment
   0–15. Aktuellt moment är det första vars grind inte är passerad, och dess fas står i
   `projektfas` i data/bessChecklistData.ts. Det här är ett ANTAGANDE: tidplanen och bockarna i
   checklistan visar var projektet är, inte projektstartsguiden. */

/** Reserv när checklistan inte går att räkna: fas 4, mitt i produktionen. */
export const RESERV_FAS = 4;

export function projektFasFranEpc(state, pid) {
  try {
    return projektfasFranMomentlage(faslage(state, pid)) ?? RESERV_FAS;
  } catch {
    return RESERV_FAS;
  }
}
