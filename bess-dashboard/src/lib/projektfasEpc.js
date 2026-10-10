import { faslage } from "./epc.js";

/* Projektfasen (1–8) för ett projekt som styrs av EPC-checklistan, räknad ur checklistans egna
   16 faser (G0–G15). Aktuell EPC-fas är den första vars grind inte är passerad. Det här är ett
   ANTAGANDE: tidplanen och bockarna i checklistan visar var projektet är, inte projektstartsguiden. */
const EPC_TILL_PROJEKTFAS = [1, 1, 2, 2, 2, 3, 4, 4, 4, 5, 5, 5, 5, 6, 7, 8];

/** Reserv när checklistan inte går att räkna: fas 4, mitt i produktionen. */
export const RESERV_FAS = 4;

export function projektFasFranEpc(state, pid) {
  try {
    const faser = faslage(state, pid);
    const aktuell = faser.findIndex((f) => f.status !== "klar");
    const nr = aktuell === -1 ? faser.length - 1 : aktuell;
    return EPC_TILL_PROJEKTFAS[nr] ?? RESERV_FAS;
  } catch {
    return RESERV_FAS;
  }
}
