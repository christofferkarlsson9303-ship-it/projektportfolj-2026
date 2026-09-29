/* Versionshistorik för en post — vad som ändrades mellan två versioner.
   Ren funktion; komponenten Posthistorik ritar resultatet. */

/** Fältnamn som visas i historiken. Okända fält visas med sin nyckel. */
export const FALTNAMN = {
  benamning: "Benämning",
  titel: "Titel",
  status: "Status",
  klass: "Klass",
  belopp: "Belopp",
  handelseDatum: "Händelsedatum",
  underrattelseDatum: "Underrättelse skickad",
  godkantDatum: "Pris godkänt",
  fakturaDatum: "Fakturadatum",
  prisgrund: "Prisgrund",
  arbeteStartat: "Arbete startat",
  orsak: "Orsak",
  atgard: "Åtgärd",
  agare: "Ägare",
  sannolikhet: "Sannolikhet",
  konsekvens: "Konsekvens",
  datum: "Datum",
  ansvarig: "Ansvarig",
  kommentar: "Kommentar",
};

const visa = (v) => {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ja" : "Nej";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Fält som skiljer mellan en äldre och en nyare version av samma post. */
export function andringar(nyare, aldre) {
  if (!aldre) return [];
  const nycklar = new Set([...Object.keys(aldre || {}), ...Object.keys(nyare || {})]);
  const ut = [];
  for (const k of nycklar) {
    if (k === "id") continue;
    const a = aldre?.[k];
    const b = nyare?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    ut.push({ falt: k, namn: FALTNAMN[k] || k, fore: visa(a), efter: visa(b) });
  }
  return ut;
}

export const OPERATION = {
  skapad: "Skapad",
  andrad: "Ändrad",
  borttagen: "Borttagen",
  aterstalld: "Återställd",
};

/** Versionerna (nyast först) med ändrade fält mot föregående version. */
export function historikrader(versioner) {
  return versioner.map((v, i) => ({
    ...v,
    rubrik: OPERATION[v.operation] || v.operation,
    andringar: v.operation === "andrad" ? andringar(v.data, versioner[i + 1]?.data) : [],
  }));
}
