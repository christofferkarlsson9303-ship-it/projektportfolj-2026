/* Sektionsregister — kopplar vy-id från VYER till komponent. Alla vyer i
   standalone-filen är flyttade hit; en ny vy läggs till både här och i
   data/vyer.js. */

import { Idag } from "./Idag.jsx";
import { Projektmetod } from "./Projektmetod.jsx";
import { DashboardView } from "./Oversikt.jsx";
import { EpcChecklista } from "./EpcChecklista.jsx";
import { Ekonomi } from "./Ekonomi.jsx";
import { Milstolpar } from "./Milstolpar.jsx";
import { Risker } from "./Risker.jsx";
import { Punkter } from "./Punkter.jsx";
import { Kontakter } from "./Kontakter.jsx";
import { Tavla } from "./Tavla.jsx";
import { Tidplan } from "./Tidplan.jsx";
import { Ata } from "./Ata/AtaSection.jsx";
import { Byggmoten } from "./Byggmoten.jsx";
import { Dagbok } from "./Dagbok.jsx";
import { Storning } from "./Storning.jsx";
import { Rapport } from "./Rapport.jsx";
import { Veckokoll } from "./Veckokoll.jsx";
import { Rutiner } from "./Rutiner.jsx";
import { Hseq } from "./Hseq.jsx";
import { Slutdok } from "./Slutdok.jsx";
import { Handlingsplan } from "./Handlingsplan.jsx";
import { Data } from "./Data.jsx";
import { Resurser } from "./Resurser.jsx";
import { Tidrapport } from "./Tidrapport.jsx";
import { Budget } from "./Budget.jsx";
import { Faktura } from "./Faktura.jsx";
import { Kontrakt } from "./Kontrakt.jsx";

export const SEKTIONER = {
  metod: Projektmetod,
  kontrakt: Kontrakt,
  idag: Idag,
  oversikt: DashboardView,
  epc: EpcChecklista,
  tavla: Tavla,
  tidplan: Tidplan,
  resurser: Resurser,
  tid: Tidrapport,
  budget: Budget,
  faktura: Faktura,
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
  vecka: Veckokoll,
  rutiner: Rutiner,
  hseq: Hseq,
  slutdok: Slutdok,
  handlingsplan: Handlingsplan,
  data: Data,
};
