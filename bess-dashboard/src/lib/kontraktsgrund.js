/* Vilka kontraktsvillkor sidan får påstå för ett projekt.

   Betalningsmodellen M1–M7, vitesbelopp och vissa frister i mallarna kommer
   ur Batch C. Sidan påstår att de gäller ett projekts kontrakt först när en
   kontraktsprofil är inläst och granskad (sidan Kontraktet). Annars visas de
   som standardmall. */

import { kontraktsprofil } from "./kontraktsprofil.js";

/** Sant när projektet har en inläst kontraktsprofil. */
export const harKontrakt = (state, pid) => !!kontraktsprofil(state, pid);

/** Text för ett villkor: kontraktets lydelse när profil finns, annars mallmarkering. */
export function kontraktsText(state, pid, iKontraktet, iMallen) {
  return harKontrakt(state, pid) ? iKontraktet : iMallen;
}

/** Betalsteg där profilens andel skiljer sig från sidans M1–M7-modell. */
export function avvikandeAndelar(profil, modell) {
  if (!profil?.milstolpar?.length) return [];
  return modell
    .map((m) => ({ kod: m.kod, modell: m.andel, kontrakt: profil.milstolpar.find((k) => k.kod === m.kod)?.andel ?? null }))
    .filter((r) => r.kontrakt !== r.modell);
}
