/* Beredningens lagring. Beredningen är ett räkneunderlag per projekt (konstruktioner, UE-priser,
   påslag) och ligger i webbläsarens lagring under en egen nyckel — inte i portfolj/state, så att
   JSONB-schemat inte ändras för en kalkylator. Ta en säkerhetskopia via CSV om underlaget ska
   delas. */

import { useCallback, useState } from "react";
import { lokalFelText, skrivLokalt } from "../../lib/lokalLagring.js";

const nyckel = (pid) => `bered/v1/${pid}`;

function las(pid) {
  try {
    const t = globalThis.localStorage.getItem(nyckel(pid));
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

/** [underlag, spara] för valt projekt. `spara` ger en feltext om lagringen misslyckas. */
export function useBered(pid) {
  const [cache, setCache] = useState({});
  const underlag = pid in cache ? cache[pid] : las(pid);

  const spara = useCallback(
    (nytt) => {
      setCache((c) => ({ ...c, [pid]: nytt }));
      const r = skrivLokalt(nyckel(pid), nytt);
      return r.ok ? null : lokalFelText(r.orsak);
    },
    [pid]
  );

  return [underlag, spara];
}
