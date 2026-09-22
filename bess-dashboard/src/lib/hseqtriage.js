/* Triage för HSEQ.

   Skyddsrond ska genomföras minst varannan vecka. Fjorton dagar är alltså
   gränsen där kravet är brutet, och ett brott mot arbetsmiljöplanen är
   vitesgrundande enligt kontraktet. Därför varnar vi redan vid elva dagar —
   då finns det fortfarande tre dagar kvar att hinna boka ronden.

   Tröskelvärdena ligger här och inte i komponenten: de kommer ur kontraktet,
   inte ur formgivningen. */

export const ROND_KRAV_DAGAR = 14;
export const ROND_VARNING_DAGAR = 11;

/** "" | "warn" | "bad" — tom sträng när ingen rond finns att räkna på. */
export function rondKlass(dagar) {
  if (dagar === null || dagar === undefined) return "";
  if (dagar >= ROND_KRAV_DAGAR) return "bad";
  return dagar >= ROND_VARNING_DAGAR ? "warn" : "";
}

/** Kort förklaring till nyckeltalet, i samma ordning som klassen. */
export function rondHint(dagar) {
  if (dagar === null || dagar === undefined) return "ingen rond registrerad";
  return dagar >= ROND_KRAV_DAGAR ? "kravet är varannan vecka" : "inom intervallet";
}
