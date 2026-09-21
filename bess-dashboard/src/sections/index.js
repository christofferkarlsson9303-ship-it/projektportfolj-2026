/* Sektionsregister — kopplar vy-id från VYER till komponent.
   Sektioner som saknas här renderas som UnderMigrering. */

import { Idag } from "./Idag.jsx";
import { Oversikt } from "./Oversikt.jsx";
import { Ekonomi } from "./Ekonomi.jsx";
import { Milstolpar } from "./Milstolpar.jsx";
import { Risker } from "./Risker.jsx";
import { Punkter } from "./Punkter.jsx";
import { Kontakter } from "./Kontakter.jsx";
import { Tavla } from "./Tavla.jsx";
import { Tidplan } from "./Tidplan.jsx";
import { Ata } from "./Ata.jsx";
import { Byggmoten } from "./Byggmoten.jsx";
import { Dagbok } from "./Dagbok.jsx";
import { Storning } from "./Storning.jsx";
import { Rapport } from "./Rapport.jsx";

export const SEKTIONER = {
  idag: Idag,
  oversikt: Oversikt,
  tavla: Tavla,
  tidplan: Tidplan,
  milstolpar: Milstolpar,
  ata: Ata,
  ekonomi: Ekonomi,
  moten: Byggmoten,
  dagbok: Dagbok,
  storning: Storning,
  risker: Risker,
  punkter: Punkter,
  kontakter: Kontakter,
  rapport: Rapport,
};
