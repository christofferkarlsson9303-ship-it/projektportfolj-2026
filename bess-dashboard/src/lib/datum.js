/* Datum och ISO-veckor. Rena funktioner — inga sidoeffekter, inget globalt state. */

export const MANADER = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

export const DAGNAMN = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

/** Dagens datum som YYYY-MM-DD i lokal tid.
 *  Buggfix: originalet använde toISOString(), som är UTC. Öster om Greenwich
 *  gav det fel dag mellan midnatt och 02:00 sommartid — nedräkningar och
 *  "förfallen"-flaggor slog då till ett dygn för tidigt. */
export function idag() {
  return lokaltDatum(new Date());
}

/** Ett Date-objekt som YYYY-MM-DD i lokal tid — samma regel som idag(). */
export function lokaltDatum(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dag}`;
}

/** Antal dagar från idag till ett ISO-datum. Negativt = passerat. null om datum saknas. */
export function dagarTill(iso) {
  if (!iso) return null;
  const a = new Date(idag() + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  if (Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
}

/** ISO-vecka på formen "2026-v37". */
export function isoVecka(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const nyar = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const v = Math.ceil(((t - nyar) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + "-v" + String(v).padStart(2, "0");
}

export function veckaNu() {
  return isoVecka(new Date());
}

export function veckaForskjut(vstr, steg) {
  const [ar, v] = vstr.split("-v").map(Number);
  const d = new Date(Date.UTC(ar, 0, 4));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1) + (v - 1 + steg) * 7);
  return isoVecka(d);
}

export function veckaEtikett(vstr) {
  const [ar, v] = vstr.split("-v");
  return `v. ${v} ${ar}`;
}

/** Veckans sju datum (måndag–söndag) som ISO-strängar. */
export function veckansDagar(vstr) {
  const [ar, v] = vstr.split("-v").map(Number);
  const d = new Date(Date.UTC(ar, 0, 4));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1) + (v - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

/** {dag:"12", man:"okt"} för kompakta tidslinjer. */
export function kortDatum(d) {
  const dd = new Date(d + "T00:00:00");
  if (Number.isNaN(dd.getTime())) return { dag: "—", man: "" };
  return { dag: String(dd.getDate()), man: MANADER[dd.getMonth()] };
}

/** Klockslag HH:MM — används i synkstatusraden. */
export function nu() {
  return new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

/** "Idag 14:20" eller "12 okt 14:20" — kompakt tidsstämpel i ändringsloggen. */
export function fmtLoggTid(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  const datS = `${d.getFullYear()}-${m}-${dag}`;
  const tid = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  const datum =
    datS === idag() ? "Idag" : d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `${datum} ${tid}`;
}

/** Relativ tid för aktivitetsflödet: "Just nu", "12 min sedan", "3 h sedan",
 *  därefter "Igår 14:20" och till sist samma form som ändringsloggen. Timmar
 *  används bara inom samma dygn — "20 h sedan" säger mindre än "Igår 14:20". */
export function fmtRelativ(iso, nuMs = Date.now()) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const min = Math.floor((nuMs - d.getTime()) / 60000);
  if (min < 1) return "Just nu";
  if (min < 60) return `${min} min sedan`;

  const nu = new Date(nuMs);
  const dagS = lokaltDatum(d);
  if (dagS === lokaltDatum(nu)) return `${Math.floor(min / 60)} h sedan`;

  const igar = new Date(nu);
  igar.setDate(nu.getDate() - 1);
  if (dagS === lokaltDatum(igar)) {
    return "Igår " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }
  return fmtLoggTid(iso);
}

/** Timmar sedan en tidpunkt — driver 24-timmarsfristen i ÄTA-loggen. */
export function timmarSedan(datum) {
  if (!datum) return null;
  const d = new Date(datum.length <= 10 ? datum + "T00:00:00" : datum);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 3600000);
}
