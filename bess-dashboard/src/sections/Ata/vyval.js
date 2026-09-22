import { useCallback, useState } from "react";

/* Vyläget för ÄTA-sektionen. Egen fil av samma skäl som kontexter.js och
   hooks.js ligger isär: en .jsx som exporterar både komponenter och annat
   tappar Fast Refresh.

   Valet ligger i localStorage per webbläsare. Det är en vypreferens, inte
   projektdata, så det ska inte till den delade lagringen. */

const NYCKEL = "batchc-ata-vy";

export const VYER = [
  ["board", "▦ Tavla", "Kanban över ÄTA-flödet"],
  ["table", "▤ Tabell", "Kalkylbladsvy med sortering och export"],
  ["timeline", "▭ Tidslinje", "Ärendena på tidsaxel"],
];

const GILTIGA = new Set(VYER.map(([v]) => v));

function las(standard) {
  try {
    const v = localStorage.getItem(NYCKEL);
    return GILTIGA.has(v) ? v : standard;
  } catch {
    // Privat läge eller blockerad lagring — preferensen får bli standardvyn.
    return standard;
  }
}

/** Vyläget plus en sättare som kommer ihåg valet. */
export function useAtaVy(standard = "board") {
  const [vy, setVyState] = useState(() => las(standard));

  const setVy = useCallback((v) => {
    setVyState(v);
    try {
      localStorage.setItem(NYCKEL, v);
    } catch {
      /* preferensen lever då bara denna session */
    }
  }, []);

  return [vy, setVy];
}
