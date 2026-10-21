import { lazy } from "react";

/* När en ny version publiceras på Vercel byter alla delfiler namn (SiteScen-<hash>.js).
   En flik som öppnades före publiceringen pekar fortfarande på de gamla namnen, och
   första gången den vill ladda 3D-scenen, PDF:en eller Excel blir det
   "Failed to fetch dynamically imported module". Rätt åtgärd är att ladda om sidan
   en gång, så att den nya index.html med nya filnamn hämtas. */

const NYCKEL = "bess-omladdning-delfil";
const SPARR_MS = 60_000;

/** Är felet en delfil som inte gick att hämta (gammal version eller tappad nätverksanslutning)? */
export function arDelfilFel(fel) {
  const t = String(fel?.message || fel || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk \S+ failed/i.test(t);
}

/** Laddar om sidan, men högst en gång per minut så att ett riktigt fel inte ger en evig loop. */
export function laddaOmEnGang() {
  try {
    const senast = Number(window.sessionStorage.getItem(NYCKEL) || 0);
    if (Date.now() - senast < SPARR_MS) return false;
    window.sessionStorage.setItem(NYCKEL, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Som React.lazy, men laddar om sidan en gång om delfilen saknas efter en publicering. */
export function lazyMedOmladdning(importera) {
  return lazy(() =>
    importera().catch((fel) => {
      if (arDelfilFel(fel) && laddaOmEnGang()) return new Promise(() => {});
      throw fel;
    })
  );
}
