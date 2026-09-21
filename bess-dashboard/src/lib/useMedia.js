import { useEffect, useState } from "react";

/** Följer en media query. Används för att veta när sidomenyn är infällbar —
 *  brytpunkten är densamma som i design-system.css (980 px). */
export function useMedia(query) {
  const [traffar, setTraffar] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const lyssnare = (e) => setTraffar(e.matches);
    mql.addEventListener("change", lyssnare);
    return () => mql.removeEventListener("change", lyssnare);
  }, [query]);

  return traffar;
}
