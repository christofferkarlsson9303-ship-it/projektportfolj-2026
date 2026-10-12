/* Gränser och klampning för den delade vyns avdelare (components/site/SplitVy.jsx). */

export const SPLIT_MIN = 0.3;
export const SPLIT_MAX = 0.8;

/** Håller andelen inom gränserna; ogiltigt värde (NaN, text, null) ger startvärdet. */
export function klammaAndel(v, start = 0.62, min = SPLIT_MIN, max = SPLIT_MAX) {
  if (v === null || v === undefined || v === "") return start;
  const n = Number(v);
  if (!Number.isFinite(n)) return start;
  return Math.max(min, Math.min(max, n));
}
