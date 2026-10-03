export function tolkaCelltal(text) {
  if (String(text).trim() === "") return null;
  const s = String(text).replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return undefined;
  const n = Number(s); return Number.isFinite(n) ? n : undefined;
}
