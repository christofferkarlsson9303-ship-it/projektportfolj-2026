/* Jämförelse mellan två modellversioner — ren logik, ingen three och ingen
   lagring, så att den går att testa utan WebGL och kan flyttas till en server
   senare utan att ändras.

   En version är en lista objekt (siteObjekt). Objektets id är dess GUID: det
   är nyckeln mellan versionerna och mellan ärenden och modell. Finns ett
   explicit `guid` på objektet går det före id.

   Resultat: tillagda och borttagna GUID:n, och ändrade objekt med de fält som
   skiljer. "Ändrat" är geometri (läge, rotation, mått) och attribut (namn,
   BESS-data, status). Ordning och oförändrade objekt spelar ingen roll. */

/** Fälten som räknas som en ändring. */
export const DIFF_FALT = ["typ", "x", "z", "rotation", "bredd", "djup", "hojd", "namn", "mw", "mwh", "mva", "soc", "status", "spec", "punktId"];

/** Färg per diffstatus som CSS-variabel ur designsystemet — grön, röd, gul/orange. */
export const DIFF_FARG = {
  tillagd: "--ok-ink",
  borttagen: "--rod",
  andrad: "--orange",
};

export const DIFF_TEXT = {
  tillagd: "Tillagd",
  borttagen: "Borttagen",
  andrad: "Modifierad",
};

export const guidAv = (o) => (o?.guid !== undefined && o?.guid !== null && o?.guid !== "" ? String(o.guid) : o?.id !== undefined && o?.id !== null ? String(o.id) : "");

const tomt = (v) => v === undefined || v === null || v === "";

/** Samma värde? Tal jämförs med tolerans, tomt är tomt oavsett hur det är skrivet. */
function likaVarde(a, b, tolerans) {
  if (tomt(a) && tomt(b)) return true;
  if (tomt(a) || tomt(b)) return false;
  const na = typeof a === "number" ? a : Number.NaN;
  const nb = typeof b === "number" ? b : Number.NaN;
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) <= tolerans;
  return String(a) === String(b);
}

const tillMap = (lista) => {
  const m = new Map();
  for (const o of Array.isArray(lista) ? lista : []) {
    const g = guidAv(o);
    if (g) m.set(g, o);
  }
  return m;
};

/**
 * Jämför version `a` (före) med `b` (efter).
 * @param {object[]} a
 * @param {object[]} b
 * @param {{tolerans?: number, falt?: string[]}} [val] tolerans i meter/grader för tal
 * @returns {{tillagda: string[], borttagna: string[], andrade: {guid: string, falt: string[]}[], oforandrade: number}}
 */
export function diffaModeller(a, b, { tolerans = 0.001, falt = DIFF_FALT } = {}) {
  const fore = tillMap(a);
  const efter = tillMap(b);
  const tillagda = [];
  const borttagna = [];
  const andrade = [];
  let oforandrade = 0;
  for (const [g, nytt] of efter) {
    const gammalt = fore.get(g);
    if (!gammalt) {
      tillagda.push(g);
      continue;
    }
    const skiljer = falt.filter((f) => !likaVarde(gammalt[f], nytt[f], tolerans));
    if (skiljer.length) andrade.push({ guid: g, falt: skiljer });
    else oforandrade += 1;
  }
  for (const g of fore.keys()) if (!efter.has(g)) borttagna.push(g);
  const sortera = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  return {
    tillagda: tillagda.sort(sortera),
    borttagna: borttagna.sort(sortera),
    andrade: andrade.sort((x, y) => sortera(x.guid, y.guid)),
    oforandrade,
  };
}

/** GUID → "tillagd" | "andrad" för objekt som finns i den nya versionen. Borttagna ritas för sig. */
export function diffStatusPerGuid(diff) {
  const m = new Map();
  for (const g of diff?.tillagda || []) m.set(g, "tillagd");
  for (const a of diff?.andrade || []) m.set(a.guid, "andrad");
  return m;
}

export const diffArTom = (diff) => !diff || (!diff.tillagda.length && !diff.borttagna.length && !diff.andrade.length);

export const diffSammanfattning = (diff) =>
  `${diff?.tillagda?.length || 0} tillagda · ${diff?.borttagna?.length || 0} borttagna · ${diff?.andrade?.length || 0} modifierade`;
