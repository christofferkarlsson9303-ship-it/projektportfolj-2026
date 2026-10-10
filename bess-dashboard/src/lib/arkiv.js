import { arEjVunnet } from "../data/projektfaser.ts";

/* Förlorade anbud (status ANBUD_EJ_VUNNET) ligger kvar i datan som arkiv men ska inte räknas med i
   aktiva dashboards, resursplanering, kassaflöde eller prognoser. `aktivaProjekt` är den enda
   definitionen av "aktivt". Providern ger vyerna `aktivVy(state)`, så ingen enskild vy behöver
   filtrera själv. Skrivningar går alltid mot hela datan. */

export const aktivaProjekt = (state) => (state.projekt || []).filter((p) => !arEjVunnet(p.status));
export const forlorade = (state) => (state.projekt || []).filter((p) => arEjVunnet(p.status));

const ejVunnetIds = (state) => new Set(forlorade(state).map((p) => p.id));

/** Är raden dold i de aktiva vyerna? Projekten själva, och allt som hör till dem via `projektId`. */
export function arDold(state, lista, rad, ids = ejVunnetIds(state)) {
  if (lista === "projekt") return arEjVunnet(rad?.status);
  return !!rad && typeof rad === "object" && ids.has(rad.projektId);
}

/** Portföljen utan förlorade anbud: projekten och alla rader som hör till dem är borta. */
export function aktivVy(state) {
  const ids = ejVunnetIds(state);
  if (!ids.size) return state;
  const ut = { ...state };
  for (const [k, v] of Object.entries(state)) {
    if (Array.isArray(v)) ut[k] = v.filter((r) => !arDold(state, k, r, ids));
  }
  return ut;
}
