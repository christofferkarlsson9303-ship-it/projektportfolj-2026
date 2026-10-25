/* Sektionsregister — kopplar vy-id från VYER till komponent. Alla vyer i
   standalone-filen är flyttade hit; en ny vy läggs till både här och i
   data/vyer.js.

   Idag laddas direkt; övriga vyer laddas först när de öppnas (React.lazy),
   så att första laddningen på mobil inte drar med 3D, PDF och Excel. */

import { lazy } from "react";

import { Idag } from "./Idag.jsx";
const Projektmetod = lazy(() => import("./Projektmetod.jsx").then((m) => ({ default: m.Projektmetod })));
const DashboardView = lazy(() => import("./Oversikt.jsx").then((m) => ({ default: m.DashboardView })));
const EpcChecklista = lazy(() => import("./EpcChecklista.jsx").then((m) => ({ default: m.EpcChecklista })));
const Ekonomi = lazy(() => import("./Ekonomi.jsx").then((m) => ({ default: m.Ekonomi })));
const Milstolpar = lazy(() => import("./Milstolpar.jsx").then((m) => ({ default: m.Milstolpar })));
const Risker = lazy(() => import("./Risker.jsx").then((m) => ({ default: m.Risker })));
const Punkter = lazy(() => import("./Punkter.jsx").then((m) => ({ default: m.Punkter })));
const Kontakter = lazy(() => import("./Kontakter.jsx").then((m) => ({ default: m.Kontakter })));
const Tavla = lazy(() => import("./Tavla.jsx").then((m) => ({ default: m.Tavla })));
const Tidplan = lazy(() => import("./Tidplan.jsx").then((m) => ({ default: m.Tidplan })));
const Ata = lazy(() => import("./Ata/AtaSection.jsx").then((m) => ({ default: m.Ata })));
const AtaKalkylVy = lazy(() => import("./Ata/AtaKalkylVy.jsx").then((m) => ({ default: m.AtaKalkylVy })));
const Byggmoten = lazy(() => import("./Byggmoten.jsx").then((m) => ({ default: m.Byggmoten })));
const Dagbok = lazy(() => import("./Dagbok.jsx").then((m) => ({ default: m.Dagbok })));
const Storning = lazy(() => import("./Storning.jsx").then((m) => ({ default: m.Storning })));
const Rapport = lazy(() => import("./Rapport.jsx").then((m) => ({ default: m.Rapport })));
const Veckokoll = lazy(() => import("./Veckokoll.jsx").then((m) => ({ default: m.Veckokoll })));
const Rutiner = lazy(() => import("./Rutiner.jsx").then((m) => ({ default: m.Rutiner })));
const Hseq = lazy(() => import("./Hseq.jsx").then((m) => ({ default: m.Hseq })));
const Slutdok = lazy(() => import("./Slutdok.jsx").then((m) => ({ default: m.Slutdok })));
const Handlingsplan = lazy(() => import("./Handlingsplan.jsx").then((m) => ({ default: m.Handlingsplan })));
const Data = lazy(() => import("./Data.jsx").then((m) => ({ default: m.Data })));
const Resurser = lazy(() => import("./Resurser.jsx").then((m) => ({ default: m.Resurser })));
const Tidrapport = lazy(() => import("./Tidrapport.jsx").then((m) => ({ default: m.Tidrapport })));
const Budget = lazy(() => import("./Budget.jsx").then((m) => ({ default: m.Budget })));
const Faktura = lazy(() => import("./Faktura.jsx").then((m) => ({ default: m.Faktura })));
const Kontrakt = lazy(() => import("./Kontrakt.jsx").then((m) => ({ default: m.Kontrakt })));
const Site = lazy(() => import("./Site/Site.jsx").then((m) => ({ default: m.Site })));
const Projektstart = lazy(() => import("./Projektstart/Projektstart.jsx").then((m) => ({ default: m.Projektstart })));
const Bered = lazy(() => import("./Bered/Bered.jsx").then((m) => ({ default: m.Bered })));

export const SEKTIONER = {
  metod: Projektmetod,
  start: Projektstart,
  kontrakt: Kontrakt,
  idag: Idag,
  oversikt: DashboardView,
  epc: EpcChecklista,
  site: Site,
  bered: Bered,
  tavla: Tavla,
  tidplan: Tidplan,
  resurser: Resurser,
  tid: Tidrapport,
  budget: Budget,
  faktura: Faktura,
  milstolpar: Milstolpar,
  ata: Ata,
  atakalkyl: AtaKalkylVy,
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
