/* Mätning av portföljdokumentet (granskning F15).

   Portföljen sparas som en JSONB-rad som skrivs om vid varje ändring. Beslut
   2026-10-21: en användare, ingen extern åtkomst – dokumentet delas inte upp nu.
   I stället mäts storlek och sparlatens i appen, och vyn varnar när någon av
   gränserna nedan passeras. Då är det dags att dela per projekt (F15). */

export const F15_GRANSER = Object.freeze({ kB: 1024, p95Ms: 1500 });

/** 95:e percentilen (närmaste rang). */
export function p95(varden) {
  const v = [...varden].filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.ceil(0.95 * v.length) - 1)];
}

/** Lägger till en mätning i en ringbuffert med högst `max` poster. */
export const laggTillMatning = (lista, ms, max = 50) => [...lista, ms].slice(-max);

/** Bedömning mot gränserna. */
export function bedomLagring({ kB, p95Ms }) {
  const over = [];
  if (kB !== null && kB > F15_GRANSER.kB) over.push(`dokumentet är ${kB} kB (gräns ${F15_GRANSER.kB} kB)`);
  if (p95Ms !== null && p95Ms > F15_GRANSER.p95Ms) over.push(`sparning p95 ${p95Ms} ms (gräns ${F15_GRANSER.p95Ms} ms)`);
  return { ton: over.length ? "warn" : "ok", text: over.length ? `Dags att dela upp dokumentet per projekt: ${over.join(", ")}.` : "Inom gränserna för ett gemensamt dokument." };
}
