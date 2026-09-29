/** Fel med kod, som providern sorterar på (konflikt, nekad, Postgres-koder). */
export function fel(kod, meddelande) {
  const e = new Error(meddelande);
  e.code = kod;
  return e;
}
