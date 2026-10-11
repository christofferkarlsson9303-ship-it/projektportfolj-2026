/* Skrivning till den lokala spegelkopian. I lokalt läge är webbläsarens lagring den enda lagringen, så ett
   misslyckat skrivförsök får aldrig se ut som en lyckad sparning. Delar av koden som bara har
   `localStorage` som reserv kan ignorera resultatet. */

/** Skriver `varde` som JSON. Ger `{ ok: true }` eller `{ ok: false, orsak: "full" | "blockerad" }`. */
export function skrivLokalt(nyckel, varde, ...lagring) {
  try {
    /* Själva uppslaget av `localStorage` kan kasta (SecurityError), så det sker inne i try — inte som
       standardvärde, som utvärderas före blocket. */
    const l = lagring.length ? lagring[0] : globalThis.localStorage;
    l.setItem(nyckel, JSON.stringify(varde));
    return { ok: true };
  } catch (fel) {
    const full = fel?.name === "QuotaExceededError" || fel?.name === "NS_ERROR_DOM_QUOTA_REACHED" || fel?.code === 22 || fel?.code === 1014;
    return { ok: false, orsak: full ? "full" : "blockerad" };
  }
}

/** Texten i statusraden när lokal sparning misslyckas. */
export const lokalFelText = (orsak) =>
  orsak === "full"
    ? "Kunde inte spara: webbläsarens lagring är full. Ta en säkerhetskopia under Data och backup."
    : "Kunde inte spara: webbläsaren blockerar lagring. Ta en säkerhetskopia under Data och backup.";
