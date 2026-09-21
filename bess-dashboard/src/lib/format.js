/* Formatering av tal, belopp och filstorlekar. */

const SEK = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

/** Belopp i kronor, eller "—" när värdet saknas i underlaget. */
export function fmtSEK(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return SEK.format(n) + " kr";
}

export function fmtTal(n, decimaler = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  }).format(n);
}

export function fmtProcent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n) + " %";
}

export function fmtStorlek(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " kB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

/** Tomt värde som text. React escapar själv — esc() från originalet behövs inte. */
export function txt(v) {
  return v === null || v === undefined ? "" : String(v);
}
