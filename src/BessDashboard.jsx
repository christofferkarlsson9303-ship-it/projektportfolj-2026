/**
 * BESS Projektkontroll — dashboard för projektledning av batterilagerprojekt
 * under ABT 06. En enda självförsörjande React-komponent.
 *
 * Beroenden: react, lucide-react, recharts. Inga andra.
 *
 * Datakällor:
 *   FAKTA      — projektdata, UR-logg, leveranser och milstolpar ur BM7 (Växjö)
 *                och BM8 (Alvesta), signerade 2026-08-17.
 *   EXEMPEL    — ÄTA-belopp, HMS-statistik, kanbanens arbetspaket, FAT/SAT-läge
 *                och kostnadsprognos. Markerade med "ex" i gränssnittet.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Battery, Zap, Cable, FileText, Truck, ClipboardCheck, AlertTriangle,
  ShieldCheck, HardHat, Plus, X, TrendingUp, CheckCircle2, Clock,
  CircleDot, ChevronRight, Building2, Gauge, Wrench, PackageCheck, Ship,
  Activity, Coins, Hammer, Container, PlugZap, ListChecks, Info, Scale,
  MapPin, SlidersHorizontal, Sun, Moon, Layers, Trash2, Boxes, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Line, Cell, LabelList
} from "recharts";

/* ==========================================================================
   1. GRUNDDATA
   ========================================================================== */

const IDAG = "2026-09-17";

const SITER = [
  {
    id: "36037", nr: "36037", namn: "Växjö Batteripark", ort: "Växjö",
    mw: 16, mwh: 36, kontrakt: 11446000, bestallare: "Ingrid Capacity AB",
    natagare: "Växjö Energi", natkontakt: "Tina Strömberg", fiber: "Vexnet",
    poi: "Ej angiven i underlaget", spanning: "10–20 kV (MV)",
    coldComm: "2026-11-11", fardigstallande: "2026-12-02",
    batteri: "2026-10-12", mvStation: "2026-10-20",
    hms: { risk: 24, tillbud: 2, ronder: 7, senasteRond: "2026-09-04" }
  },
  {
    id: "36038", nr: "36038", namn: "Alvesta Batteripark", ort: "Alvesta",
    mw: 8, mwh: 16, kontrakt: 5600000, bestallare: "Ingrid Capacity AB",
    natagare: "Alvesta Energi AB", natkontakt: "Robin Carlsson", fiber: "Vexnet",
    poi: "Ej angiven i underlaget", spanning: "10–20 kV (MV)",
    coldComm: "2026-11-11", fardigstallande: "2026-12-04",
    batteri: "2026-10-14", mvStation: "2026-10-20",
    hms: { risk: 18, tillbud: 1, ronder: 6, senasteRond: "2026-09-02" }
  }
];

const GRENAR = [
  { id: "mark",     namn: "Mark / Fundament",           kort: "Mark",       ikon: Hammer },
  { id: "stallverk",namn: "Ställverk / Transformator",  kort: "Ställverk",  ikon: PlugZap },
  { id: "bess",     namn: "Battericontainrar / PCS",    kort: "BESS/PCS",   ikon: Container },
  { id: "idrift",   namn: "Idrifttagning / SAT",        kort: "Idrifttagning", ikon: Activity }
];

const SKEDEN = ["Projektering", "Produktion", "Provning", "Överlämning"];
const PRIOS  = [
  { id: "kritisk", namn: "Kritisk linje", ton: "bad" },
  { id: "hog",     namn: "Hög",           ton: "warn" },
  { id: "normal",  namn: "Normal",        ton: "info" }
];
const KOLUMNER = [
  { id: "ej",     namn: "Ej påbörjad" },
  { id: "pagar",  namn: "Pågår" },
  { id: "vantar", namn: "Väntar på besked" },
  { id: "klar",   namn: "Klar" }
];

const UE = ["Elleholms", "A-Bygg", "Jinert", "Harju Elekter", "CATL", "Flexgen",
            "Vinnergi", "ONE Nordic egen personal"];

/* Arbetspaket per entreprenadgren. Exempelvärden — byt mot er egna WBS. */
const UPPGIFTER = [
  { id:"t1",  site:"36037", gren:"mark",      titel:"Terrassering och packning plattform",        ue:"Elleholms", skede:"Produktion",  prio:"normal",  kol:"klar",   klar:100, slut:"2026-07-18" },
  { id:"t2",  site:"36037", gren:"mark",      titel:"Fundament BESS-rader A–D",                   ue:"A-Bygg",    skede:"Produktion",  prio:"kritisk", kol:"klar",   klar:100, slut:"2026-08-22" },
  { id:"t3",  site:"36037", gren:"mark",      titel:"Kabelschakt och kanalisation till POI",      ue:"Elleholms", skede:"Produktion",  prio:"hog",     kol:"pagar",  klar:72,  slut:"2026-10-03" },
  { id:"t4",  site:"36037", gren:"mark",      titel:"Hårdgjord uppställningsyta för kranbil",     ue:"Elleholms", skede:"Produktion",  prio:"kritisk", kol:"pagar",  klar:40,  slut:"2026-10-08" },
  { id:"t5",  site:"36037", gren:"stallverk", titel:"Montage MV-station och ställverk",           ue:"Harju Elekter", skede:"Produktion", prio:"kritisk", kol:"vantar", klar:15, slut:"2026-10-24" },
  { id:"t6",  site:"36037", gren:"stallverk", titel:"Kabelströmstransformatorer — omleverans",    ue:"Harju Elekter", skede:"Produktion", prio:"kritisk", kol:"vantar", klar:0,  slut:"" },
  { id:"t7",  site:"36037", gren:"stallverk", titel:"Jordningssystem och potentialutjämning",     ue:"ONE Nordic egen personal", skede:"Produktion", prio:"hog", kol:"pagar", klar:55, slut:"2026-10-17" },
  { id:"t8",  site:"36037", gren:"bess",      titel:"Lossning och placering battericontainrar",   ue:"Jinert",    skede:"Produktion",  prio:"kritisk", kol:"ej",     klar:0,   slut:"2026-10-16" },
  { id:"t9",  site:"36037", gren:"bess",      titel:"AC/DC-kabeldragning PCS ↔ MV-skid",          ue:"ONE Nordic egen personal", skede:"Produktion", prio:"hog", kol:"ej", klar:0, slut:"2026-10-30" },
  { id:"t10", site:"36037", gren:"bess",      titel:"Nivåsensor oljetråg (UR004)",                ue:"ONE Nordic egen personal", skede:"Produktion", prio:"normal", kol:"pagar", klar:60, slut:"2026-10-10" },
  { id:"t11", site:"36037", gren:"idrift",    titel:"Cold Commissioning-checklista",              ue:"Flexgen",   skede:"Provning",    prio:"kritisk", kol:"ej",     klar:0,   slut:"2026-11-09" },
  { id:"t12", site:"36037", gren:"idrift",    titel:"SAT — Site Acceptance Test",                 ue:"CATL",      skede:"Provning",    prio:"kritisk", kol:"ej",     klar:0,   slut:"2026-11-24" },
  { id:"t13", site:"36037", gren:"idrift",    titel:"Slutdokumentation Appendix 03.7",            ue:"ONE Nordic egen personal", skede:"Överlämning", prio:"hog", kol:"ej", klar:10, slut:"2026-11-28" },

  { id:"t20", site:"36038", gren:"mark",      titel:"Flytt fjärrvärmeledning (UR002)",            ue:"Elleholms", skede:"Produktion",  prio:"normal",  kol:"klar",   klar:100, slut:"2026-06-17" },
  { id:"t21", site:"36038", gren:"mark",      titel:"Dagvattendamm (UR005)",                      ue:"Elleholms", skede:"Produktion",  prio:"hog",     kol:"pagar",  klar:65,  slut:"2026-10-02" },
  { id:"t22", site:"36038", gren:"mark",      titel:"Bortforsling matjord 240 ton (UR006)",       ue:"Elleholms", skede:"Produktion",  prio:"normal",  kol:"pagar",  klar:80,  slut:"2026-09-26" },
  { id:"t23", site:"36038", gren:"mark",      titel:"Dold betongplatta / MKM-massor (UR007)",     ue:"Elleholms", skede:"Produktion",  prio:"kritisk", kol:"vantar", klar:25,  slut:"" },
  { id:"t24", site:"36038", gren:"mark",      titel:"Fundament och kabelränna",                   ue:"A-Bygg",    skede:"Produktion",  prio:"hog",     kol:"klar",   klar:100, slut:"2026-08-29" },
  { id:"t25", site:"36038", gren:"stallverk", titel:"MV-ställverk Harju — montage",               ue:"Harju Elekter", skede:"Produktion", prio:"kritisk", kol:"vantar", klar:10, slut:"2026-10-24" },
  { id:"t26", site:"36038", gren:"stallverk", titel:"Servisanslutning Alvesta Energi (UR003)",    ue:"ONE Nordic egen personal", skede:"Produktion", prio:"hog", kol:"pagar", klar:50, slut:"2026-10-09" },
  { id:"t27", site:"36038", gren:"bess",      titel:"Lossning battericontainrar",                 ue:"Jinert",    skede:"Produktion",  prio:"kritisk", kol:"ej",     klar:0,   slut:"2026-10-17" },
  { id:"t28", site:"36038", gren:"bess",      titel:"PCS-parametrering och EMS-koppling",         ue:"Flexgen",   skede:"Provning",    prio:"hog",     kol:"ej",     klar:0,   slut:"2026-11-06" },
  { id:"t29", site:"36038", gren:"idrift",    titel:"Cold Commissioning-checklista",              ue:"Flexgen",   skede:"Provning",    prio:"kritisk", kol:"ej",     klar:0,   slut:"2026-11-09" },
  { id:"t30", site:"36038", gren:"idrift",    titel:"Besiktning stationshus (Vinnergi)",          ue:"Vinnergi",  skede:"Överlämning", prio:"normal",  kol:"klar",   klar:100, slut:"2026-08-24" },
  { id:"t31", site:"36038", gren:"idrift",    titel:"Slutbesiktning och punch list",              ue:"Vinnergi",  skede:"Överlämning", prio:"hog",     kol:"ej",     klar:0,   slut:"2026-12-04" }
];

/* ÄTA-logg. Nummer, benämning och status ur BM7/BM8. Belopp är exempelvärden. */
const ATA_ORSAKER = [
  "Markförhållanden", "Ändrad layout", "Beställarens föreskrift",
  "Myndighetskrav", "Leverantörsavvikelse", "Projekteringsändring", "Hinder"
];
const ATA_STATUS = {
  godkand:   { namn: "Godkänd",          ton: "ok"   },
  granskning:{ namn: "Under granskning", ton: "warn" },
  bestridd:  { namn: "Bestridd",         ton: "bad"  },
  utkast:    { namn: "Utkast",           ton: "info" }
};

const ATA_START = [
  { id:"a1",  site:"36037", nr:"UR001", benamning:"Projektering utöver kontrakterad omfattning", orsak:"Projekteringsändring", status:"godkand",    belopp:186500, handelse:"2026-03-02", underrattad:"2026-03-03", godkant:"2026-03-18", abt:"kap. 2 § 3", exempel:true },
  { id:"a2",  site:"36037", nr:"UR002", benamning:"KM och bortforsling av vegetationsmassor",    orsak:"Markförhållanden",     status:"godkand",    belopp:243000, handelse:"2026-04-11", underrattad:"2026-04-11", godkant:"2026-04-29", abt:"kap. 2 § 4", exempel:true },
  { id:"a3",  site:"36037", nr:"UR003", benamning:"Höjning av terrass",                          orsak:"Markförhållanden",     status:"godkand",    belopp:412000, handelse:"2026-05-06", underrattad:"2026-05-07", godkant:"2026-05-22", abt:"kap. 2 § 4", exempel:true },
  { id:"a4",  site:"36037", nr:"UR004", benamning:"Nivåsensor oljetråg",                         orsak:"Myndighetskrav",       status:"granskning", belopp:58400,  handelse:"2026-08-19", underrattad:"2026-08-20", godkant:"",           abt:"kap. 2 § 3", exempel:true },
  { id:"a5",  site:"36037", nr:"UR005", benamning:"Stolpe för CCTV",                             orsak:"Ändrad layout",        status:"granskning", belopp:71200,  handelse:"2026-08-26", underrattad:"2026-08-27", godkant:"",           abt:"kap. 2 § 3", exempel:true },
  { id:"a6",  site:"36037", nr:"UR006", benamning:"Kabelskåp — vågkvitto för deponimassor saknas", orsak:"Beställarens föreskrift", status:"utkast", belopp:96000, handelse:"2026-09-08", underrattad:"",       godkant:"",           abt:"kap. 2 § 6", exempel:true },

  { id:"a10", site:"36038", nr:"UR001", benamning:"Projektering utöver kontrakterad omfattning", orsak:"Projekteringsändring", status:"godkand",    belopp:152000, handelse:"2026-03-04", underrattad:"2026-03-05", godkant:"2026-03-20", abt:"kap. 2 § 3", exempel:true },
  { id:"a11", site:"36038", nr:"UR002", benamning:"Flytt av fjärrvärmeledning",                  orsak:"Hinder",               status:"godkand",    belopp:318000, handelse:"2026-05-19", underrattad:"2026-05-19", godkant:"2026-06-17", abt:"kap. 2 § 4", exempel:true },
  { id:"a12", site:"36038", nr:"UR003", benamning:"Servis till Alvesta Energi",                  orsak:"Ändrad layout",        status:"granskning", belopp:127500, handelse:"2026-06-30", underrattad:"2026-07-01", godkant:"",           abt:"kap. 2 § 3", exempel:true },
  { id:"a13", site:"36038", nr:"UR004", benamning:"Kabelfriläggning",                            orsak:"Markförhållanden",     status:"godkand",    belopp:84000,  handelse:"2026-05-28", underrattad:"2026-05-28", godkant:"2026-06-17", abt:"kap. 2 § 4", exempel:true },
  { id:"a14", site:"36038", nr:"UR005", benamning:"Dagvattendamm",                               orsak:"Myndighetskrav",       status:"granskning", belopp:364000, handelse:"2026-07-14", underrattad:"2026-07-15", godkant:"",           abt:"kap. 2 § 3", exempel:true },
  { id:"a15", site:"36038", nr:"UR006", benamning:"Bortforsling matjord 240 ton",                orsak:"Markförhållanden",     status:"granskning", belopp:141000, handelse:"2026-08-04", underrattad:"2026-08-05", godkant:"",           abt:"kap. 2 § 4", exempel:true },
  { id:"a16", site:"36038", nr:"UR007", benamning:"Dold betongplatta och MKM-massor",            orsak:"Markförhållanden",     status:"bestridd",   belopp:287000, handelse:"2026-08-12", underrattad:"2026-08-13", godkant:"",           abt:"kap. 2 § 4", exempel:true },
  { id:"a17", site:"36038", nr:"UR008", benamning:"Kabelskåp — ytterligare avspärrning",         orsak:"Beställarens föreskrift", status:"bestridd", belopp:64500, handelse:"2026-08-21", underrattad:"2026-08-21", godkant:"",          abt:"kap. 2 § 6", exempel:true },
  { id:"a18", site:"36038", nr:"UR010", benamning:"Hårdgjord yta för kranbilens uppställning",   orsak:"Markförhållanden",     status:"granskning", belopp:198000, handelse:"2026-09-01", underrattad:"2026-09-02", godkant:"",           abt:"kap. 2 § 4", exempel:true }
];

/* Bilaga 06.1 Prislista 2026 — gäller mot beställaren under ABT 06. */
const PRISLISTA = [
  { roll: "Montör",                        pris: 945  },
  { roll: "Ledande montör",                pris: 1010 },
  { roll: "Projektledare",                 pris: 1245 },
  { roll: "Eldriftledare / kopplingsledare", pris: 1245 },
  { roll: "Elkonstruktör",                 pris: 1325 },
  { roll: "Termograför",                   pris: 1400 },
  { roll: "Provningsingenjör",             pris: 1540 }
];
const ARVODE = 0.10;   // entreprenadarvode på självkostnad
const KM_PRIS = 16;    // servicebil, inget påslag

/* Leverans- och materialspårning för kritiska komponenter. */
const LEVERANSER = [
  { id:"d1", site:"36037", komponent:"BESS-containrar (CATL EnerX)", leverantor:"CATL", antal:"9 st",
    eta:"2026-10-12", incoterm:"DAP Växjö", transport:"Sjöfrakt + landtransport",
    tull:"Tullklarerad", tullTon:"ok", status:"pa_vag", not:"Lossning kräver hårdgjord yta (UR010-motsvarighet i Växjö klar v.41)." },
  { id:"d2", site:"36037", komponent:"Power Electronics MV Skid", leverantor:"Power Electronics", antal:"2 st",
    eta:"2026-10-20", incoterm:"DAP Växjö", transport:"Landtransport EU",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"pa_vag", not:"Samordnas med MV-stationens montagevecka." },
  { id:"d3", site:"36037", komponent:"Inverter / PCS-moduler", leverantor:"Power Electronics", antal:"8 st",
    eta:"2026-10-20", incoterm:"DAP Växjö", transport:"Landtransport EU",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"bekraftad", not:"" },
  { id:"d4", site:"36037", komponent:"Krafttransformator", leverantor:"Harju Elekter", antal:"1 st",
    eta:"2026-10-20", incoterm:"DAP Växjö", transport:"Specialtransport",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"bekraftad", not:"Lyftplan krävs före leverans." },
  { id:"d5", site:"36037", komponent:"Kabelströmstransformatorer (jordfel)", leverantor:"Harju Elekter", antal:"12 st",
    eta:"", incoterm:"DAP Växjö", transport:"Retur pågår",
    tull:"—", tullTon:"neutral", status:"avvikelse",
    not:"För liten innerdiameter för antalet enledare till skidarna. Retur och nybeställning pågår — Christoffer kontaktar Harju. Inget bekräftat nytt leveransdatum." },

  { id:"d10", site:"36038", komponent:"BESS-containrar (CATL EnerX)", leverantor:"CATL", antal:"4 st",
    eta:"2026-10-14", incoterm:"DAP Alvesta", transport:"Sjöfrakt + landtransport",
    tull:"Tullklarerad", tullTon:"ok", status:"pa_vag", not:"Batterivikt överstiger tidigare beräkning — kranbilsyta enligt UR010." },
  { id:"d11", site:"36038", komponent:"MV-ställverk / MV-station", leverantor:"Harju Elekter", antal:"1 st",
    eta:"2026-10-20", incoterm:"DAP Alvesta", transport:"Specialtransport",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"bekraftad", not:"" },
  { id:"d12", site:"36038", komponent:"Inverter / PCS-moduler", leverantor:"Power Electronics", antal:"4 st",
    eta:"2026-10-20", incoterm:"DAP Alvesta", transport:"Landtransport EU",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"bekraftad", not:"" },
  { id:"d13", site:"36038", komponent:"Kabelströmstransformatorer (jordfel)", leverantor:"Harju Elekter", antal:"6 st",
    eta:"", incoterm:"DAP Alvesta", transport:"Retur pågår",
    tull:"—", tullTon:"neutral", status:"avvikelse",
    not:"Samma avvikelse som i Växjö — gemensam omleverans." },
  { id:"d14", site:"36038", komponent:"Kabel MV 24 kV", leverantor:"Diverse", antal:"1 200 m",
    eta:"2026-09-29", incoterm:"DAP Alvesta", transport:"Landtransport",
    tull:"Ej tullpliktig (EU)", tullTon:"ok", status:"avvikelse",
    not:"Tidigare leverans hade fel area och fel spänningsklass, samt gick till fel site. Ersättningsleverans bevakas." }
];

const LEV_STATUS = {
  bekraftad: { namn: "Bekräftad",   ton: "info" },
  pa_vag:    { namn: "På väg",      ton: "ok"   },
  levererad: { namn: "Levererad",   ton: "ok"   },
  avvikelse: { namn: "Avvikelse",   ton: "bad"  }
};

/* Idrifttagning och compliance. */
const CHECKLISTOR = [
  {
    id: "fat", namn: "FAT — Factory Acceptance Test", ikon: PackageCheck,
    ref: "Utförs hos leverantör före leverans",
    punkter: [
      { id:"fat1", txt:"FAT-protokoll PCS (Power Electronics)", klar:true },
      { id:"fat2", txt:"FAT-protokoll batterisystem (CATL EnerX)", klar:true },
      { id:"fat3", txt:"FAT-protokoll MV-ställverk (Harju Elekter)", klar:true },
      { id:"fat4", txt:"FAT-protokoll EMS (Flexgen)", klar:false },
      { id:"fat5", txt:"Avvikelselista från FAT stängd", klar:false }
    ]
  },
  {
    id: "cold", namn: "Cold Commissioning", ikon: PlugZap,
    ref: "Checklista 2026-11-09 · start 2026-11-11",
    punkter: [
      { id:"c1", txt:"Isolationsmätning AC- och DC-system", klar:false },
      { id:"c2", txt:"Kontinuitetsmätning jordningssystem", klar:false },
      { id:"c3", txt:"Fasföljd och polaritet kontrollerad", klar:false },
      { id:"c4", txt:"Reläskydd parametrerat enligt selektivplan", klar:false },
      { id:"c5", txt:"Brandlarm och släcksystem funktionsprovat", klar:false },
      { id:"c6", txt:"Elsäkerhetsledare utsedd och kopplingsorder klar", klar:false }
    ]
  },
  {
    id: "sat", namn: "SAT — Site Acceptance Test", ikon: ClipboardCheck,
    ref: "Efter Hot Commissioning, före PAC",
    punkter: [
      { id:"s1", txt:"Kapacitetstest mot garanterad MWh", klar:false },
      { id:"s2", txt:"Verkningsgradstest (round-trip efficiency)", klar:false },
      { id:"s3", txt:"SCADA- och larmpunktslista verifierad", klar:false },
      { id:"s4", txt:"EMS-regler och börvärden verifierade", klar:false },
      { id:"s5", txt:"Svarstid mot setpoint uppmätt", klar:false }
    ]
  },
  {
    id: "svk", namn: "Stödtjänsttester — Svenska kraftnät", ikon: Zap,
    ref: "Förkvalificering per stödtjänst",
    punkter: [
      { id:"v1", txt:"FCR-N — normaldriftsreserv, statiskt test", klar:false },
      { id:"v2", txt:"FCR-N — dynamiskt test (sinussvep)", klar:false },
      { id:"v3", txt:"FCR-D upp — störningsreserv uppreglering", klar:false },
      { id:"v4", txt:"FCR-D ned — störningsreserv nedreglering", klar:false },
      { id:"v5", txt:"FFR — snabb frekvensreserv", klar:false },
      { id:"v6", txt:"Mätdatarapportering och förkvalificering inskickad", klar:false }
    ]
  },
  {
    id: "slut", namn: "Slutbesiktning och överlämning", ikon: ShieldCheck,
    ref: "ABT 06 kap. 7 · Appendix 03.7",
    punkter: [
      { id:"b1", txt:"As-built-dokumentation (Appendix 03.7)", klar:false },
      { id:"b2", txt:"Elinstallationsintyg", klar:false },
      { id:"b3", txt:"Drift- och underhållsinstruktion", klar:false },
      { id:"b4", txt:"Relaskyddsprotokoll och provningsrapporter", klar:false },
      { id:"b5", txt:"Slutbesiktning genomförd och protokoll signerat", klar:false },
      { id:"b6", txt:"Punch list åtgärdad och efterbesiktad", klar:false }
    ]
  }
];

/* Ekonomisk prognos mot budget — exempelvärden i tusental kronor. */
const EKONOMI = [
  { man: "Apr", budget: 1150, utfall: 1210 },
  { man: "Maj", budget: 2480, utfall: 2610 },
  { man: "Jun", budget: 4020, utfall: 4280 },
  { man: "Jul", budget: 5600, utfall: 5910 },
  { man: "Aug", budget: 7350, utfall: 7840 },
  { man: "Sep", budget: 9100, utfall: 9720 },
  { man: "Okt", budget: 11800, prognos: 12650 },
  { man: "Nov", budget: 14600, prognos: 15700 },
  { man: "Dec", budget: 17046, prognos: 18420 }
];

/* ==========================================================================
   2. HJÄLPFUNKTIONER
   ========================================================================== */

const cls = (...a) => a.filter(Boolean).join(" ");

const fmtSEK = (n) =>
  typeof n === "number" && isFinite(n)
    ? new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr"
    : "—";

const fmtMkr = (n) =>
  typeof n === "number" && isFinite(n)
    ? new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        .format(n / 1000000) + " Mkr"
    : "—";

function dagarTill(datum) {
  if (!datum) return null;
  const a = new Date(datum + "T00:00:00");
  const b = new Date(IDAG + "T00:00:00");
  if (isNaN(a)) return null;
  return Math.round((a - b) / 86400000);
}

function kvarText(datum) {
  const d = dagarTill(datum);
  if (d === null) return "Datum saknas";
  if (d < 0) return Math.abs(d) + " dagar sedan";
  if (d === 0) return "Idag";
  if (d === 1) return "Imorgon";
  return "om " + d + " dagar";
}

/* Läser och skriver till webbläsarens lagring. Får misslyckas tyst —
   sidan ska fungera lika bra utan den. */
const LAGER_NYCKEL = "bess-projektkontroll-v1";
function lasLagrat() {
  try {
    const r = window.localStorage.getItem(LAGER_NYCKEL);
    return r ? JSON.parse(r) : null;
  } catch (e) { return null; }
}
function skrivLagrat(data) {
  try { window.localStorage.setItem(LAGER_NYCKEL, JSON.stringify(data)); } catch (e) {}
}

/* ==========================================================================
   3. TEMA OCH BYGGSTENAR
   ========================================================================== */

const TON = {
  ok:      "bg-ok-bg text-ok-ink",
  warn:    "bg-warn-bg text-warn-ink",
  bad:     "bg-bad-bg text-bad-ink",
  info:    "bg-info-bg text-info-ink",
  neutral: "bg-sunken text-ink-soft"
};

function Pill({ ton = "neutral", children, className }) {
  return (
    <span className={cls(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
      TON[ton] || TON.neutral, className
    )}>{children}</span>
  );
}

function Card({ children, className, ...rest }) {
  return (
    <div {...rest} className={cls(
      "rounded-2xl border border-hairline bg-surface", className
    )}>{children}</div>
  );
}

function CardHead({ ikon: Ikon, titel, lead, hoger }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-head text-[15px] font-semibold text-ink">
          {Ikon ? <Ikon className="h-4 w-4 shrink-0 text-one" aria-hidden="true" /> : null}
          {titel}
        </h3>
        {lead ? <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-ink-soft">{lead}</p> : null}
      </div>
      {hoger ? <div className="flex shrink-0 flex-wrap items-center gap-2">{hoger}</div> : null}
    </div>
  );
}

function Matare({ varde, etikett, ton = "one" }) {
  const p = Math.max(0, Math.min(100, varde || 0));
  const r = 26, omkrets = 2 * Math.PI * r;
  const strokes = { one: "stroke-one", turkos: "stroke-turkos", orange: "stroke-orange", rod: "stroke-rod" };
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} className="fill-none stroke-hairline-stark" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} strokeWidth="7" strokeLinecap="round"
          className={cls("fill-none transition-[stroke-dashoffset] duration-700", strokes[ton])}
          strokeDasharray={omkrets} strokeDashoffset={omkrets * (1 - p / 100)} />
      </svg>
      <div className="min-w-0">
        <b className="block font-head text-lg leading-none text-ink tabular-nums">{Math.round(p)} %</b>
        <span className="mt-1 block text-[11px] leading-snug text-ink-soft">{etikett}</span>
      </div>
    </div>
  );
}

function Field({ etikett, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{etikett}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-snug text-ink-soft">{hint}</span> : null}
    </label>
  );
}

const inputKlass =
  "w-full rounded-lg border border-hairline-stark bg-surface px-3 py-2 text-sm text-ink " +
  "outline-none transition focus:border-one focus:ring-2 focus:ring-one-ring";

function Knapp({ variant = "primar", ikon: Ikon, children, className, ...rest }) {
  const v = {
    primar: "bg-one text-white hover:bg-one-mork shadow-sm",
    sekundar: "border border-one text-one-djup hover:bg-info-bg",
    tyst: "border border-hairline text-ink-soft hover:border-one hover:text-one-djup",
    fara: "bg-rod text-white hover:brightness-95"
  }[variant];
  return (
    <button type="button" {...rest} className={cls(
      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold",
      "transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one",
      v, className
    )}>
      {Ikon ? <Ikon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* Modal och detaljpanel delar samma skal. */
function Overlay({ oppen, stang, children, bredd = "max-w-2xl" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!oppen) return;
    const tangent = (e) => { if (e.key === "Escape") stang(); };
    document.addEventListener("keydown", tangent);
    const t = setTimeout(() => { if (ref.current) ref.current.focus(); }, 30);
    return () => { document.removeEventListener("keydown", tangent); clearTimeout(t); };
  }, [oppen, stang]);
  if (!oppen) return null;
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(4,25,32,0.55)] p-4 pt-[6vh] backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) stang(); }}>
      <div ref={ref} tabIndex={-1} className={cls(
        "w-full rounded-2xl border border-hairline bg-surface shadow-2xl outline-none", bredd
      )}>{children}</div>
    </div>
  );
}

function OverlayHead({ titel, under, stang }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-5">
      <div className="min-w-0">
        <h3 className="font-head text-lg font-semibold text-ink">{titel}</h3>
        {under ? <p className="mt-1 text-xs text-ink-soft">{under}</p> : null}
      </div>
      <button type="button" onClick={stang} aria-label="Stäng"
        className="rounded-lg p-1.5 text-ink-faint transition hover:bg-sunken hover:text-ink">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ==========================================================================
   4. SIDHUVUD MED KPI
   ========================================================================== */

function SiteHeader({ site, ata, tema, vaxlaTema, siter, valjSite }) {
  const godkanda = ata.filter((a) => a.status === "godkand");
  const pending  = ata.filter((a) => a.status === "granskning" || a.status === "utkast");
  const bestridda= ata.filter((a) => a.status === "bestridd");
  const summa    = ata.reduce((s, a) => s + (a.belopp || 0), 0);
  const dagar    = dagarTill(site.fardigstallande);

  return (
    <header className="border-b border-hairline bg-djup text-white">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8">

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
              <span>ONE Nordic AB</span><span aria-hidden="true">·</span>
              <span>BESS EPC</span><span aria-hidden="true">·</span><span>ABT 06</span>
            </div>
            <h1 className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-head text-[26px] font-bold leading-tight sm:text-[30px]">
              <Battery className="h-7 w-7 shrink-0 text-one" aria-hidden="true" />
              {site.namn}
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-body text-sm font-semibold tabular-nums text-white/80">
                {site.nr}
              </span>
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/70">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{site.ort}</span>
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" aria-hidden="true" />Beställare {site.bestallare}</span>
              <span className="inline-flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" aria-hidden="true" />Kontraktssumma {fmtMkr(site.kontrakt)}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/10 p-1" role="tablist" aria-label="Välj site">
              {siter.map((s) => (
                <button key={s.id} type="button" role="tab" aria-selected={s.id === site.id}
                  onClick={() => valjSite(s.id)}
                  className={cls(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                    s.id === site.id ? "bg-one text-white" : "text-white/70 hover:text-white"
                  )}>
                  {s.nr} {s.ort}
                </button>
              ))}
            </div>
            <button type="button" onClick={vaxlaTema}
              aria-label={tema === "dark" ? "Byt till ljust läge" : "Byt till mörkt läge"}
              className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white">
              {tema === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* KPI-rad */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <KpiKort ikon={Battery} etikett="Systemkapacitet">
            <div className="flex items-baseline gap-2">
              <b className="font-head text-[27px] leading-none tabular-nums">{site.mw}</b>
              <span className="text-sm text-white/60">MW</span>
              <span className="text-white/30" aria-hidden="true">/</span>
              <b className="font-head text-[27px] leading-none tabular-nums">{site.mwh}</b>
              <span className="text-sm text-white/60">MWh</span>
            </div>
            <p className="mt-2 text-[11.5px] text-white/55">
              C-rate {(site.mw / site.mwh).toFixed(2)} · urladdning ca {(site.mwh / site.mw).toFixed(1)} h
            </p>
          </KpiKort>

          <KpiKort ikon={PlugZap} etikett="Nätanslutning">
            <div className="text-[13px] leading-snug">
              <div className="font-semibold">{site.natagare}</div>
              <div className="text-white/60">{site.natkontakt} · fiber {site.fiber}</div>
            </div>
            <dl className="mt-2 space-y-0.5 text-[11.5px] text-white/55">
              <div className="flex justify-between gap-3"><dt>Anslutningspunkt</dt><dd className="text-right text-white/70">{site.poi}</dd></div>
              <div className="flex justify-between gap-3"><dt>Spänningsnivå</dt><dd className="text-right text-white/70">{site.spanning}</dd></div>
              <div className="flex justify-between gap-3"><dt>Idrifttagning</dt><dd className="text-right text-white/70">{site.coldComm}</dd></div>
            </dl>
          </KpiKort>

          <KpiKort ikon={Coins} etikett="ÄTA-summering">
            <div className="flex items-baseline gap-2">
              <b className="font-head text-[27px] leading-none tabular-nums">{fmtMkr(summa)}</b>
              <span className="text-sm text-white/60">totalt</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill ton="ok">{godkanda.length} godkända</Pill>
              <Pill ton="warn">{pending.length} pending</Pill>
              {bestridda.length ? <Pill ton="bad">{bestridda.length} bestridda</Pill> : null}
            </div>
          </KpiKort>

          <KpiKort ikon={HardHat} etikett="BAS-U / HMS">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Riskobs.", site.hms.risk, "text-turkos"],
                ["Tillbud", site.hms.tillbud, site.hms.tillbud ? "text-orange" : "text-turkos"],
                ["Skyddsronder", site.hms.ronder, "text-turkos"]
              ].map(([namn, v, f]) => (
                <div key={namn} className="rounded-lg bg-white/[0.07] px-1 py-2">
                  <b className={cls("block font-head text-xl leading-none tabular-nums", f)}>{v}</b>
                  <span className="mt-1 block text-[10px] leading-tight text-white/55">{namn}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-white/55">Senaste skyddsrond {site.hms.senasteRond}</p>
          </KpiKort>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Färdigställandetid <b className="font-semibold text-white">{site.fardigstallande}</b>
            <span className={cls(dagar !== null && dagar < 90 ? "text-orange" : "")}>({kvarText(site.fardigstallande)})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />BESS-batteri {site.batteri}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Container className="h-3.5 w-3.5" aria-hidden="true" />MV-station {site.mvStation}
          </span>
        </div>
      </div>
    </header>
  );
}

function KpiKort({ ikon: Ikon, etikett, children }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
      <div className="mb-2.5 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/50">
        <Ikon className="h-3.5 w-3.5 text-one" aria-hidden="true" />{etikett}
      </div>
      {children}
    </div>
  );
}

/* ==========================================================================
   5. FLIK 1 — ENTREPRENAD-KANBAN OCH FRAMDRIFT
   ========================================================================== */

function FramdriftDiagram({ uppgifter }) {
  const data = GRENAR.map((g) => {
    const r = uppgifter.filter((u) => u.gren === g.id);
    const snitt = r.length ? r.reduce((s, u) => s + u.klar, 0) / r.length : 0;
    return { namn: g.kort, klar: Math.round(snitt), antal: r.length };
  });
  const farg = (v) => (v >= 80 ? "var(--turkos)" : v >= 40 ? "var(--one-bla)" : "var(--orange)");
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--hairline)" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit=" %"
            tick={{ fill: "var(--ink-soft)", fontSize: 11 }} stroke="var(--hairline-stark)" />
          <YAxis type="category" dataKey="namn" width={92}
            tick={{ fill: "var(--ink)", fontSize: 11.5 }} stroke="var(--hairline-stark)" />
          <Tooltip
            cursor={{ fill: "var(--sunken)" }}
            contentStyle={{
              background: "var(--surface)", border: "1px solid var(--hairline-stark)",
              borderRadius: 12, fontSize: 12, color: "var(--ink)"
            }}
            formatter={(v, n, p) => [v + " % klart · " + p.payload.antal + " arbetspaket", "Framdrift"]} />
          <Bar dataKey="klar" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.namn} fill={farg(d.klar)} />)}
            <LabelList dataKey="klar" position="right" formatter={(v) => v + " %"}
              style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kort({ u, onOppna }) {
  const gren = GRENAR.find((g) => g.id === u.gren);
  const prio = PRIOS.find((p) => p.id === u.prio);
  const Ikon = gren ? gren.ikon : Wrench;
  const dagar = dagarTill(u.slut);
  const sent = dagar !== null && dagar < 0 && u.kol !== "klar";
  return (
    <button type="button" onClick={() => onOppna(u)}
      className={cls(
        "w-full rounded-xl border-l-[3px] bg-surface p-3 text-left shadow-sm transition",
        "hover:-translate-y-px hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-one",
        u.prio === "kritisk" ? "border-l-rod" : u.prio === "hog" ? "border-l-orange" : "border-l-one"
      )}>
      <div className="mb-1.5 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
        <Ikon className="h-3.5 w-3.5" aria-hidden="true" />{gren ? gren.kort : ""}
        {u.prio !== "normal" ? <Pill ton={prio.ton} className="ml-auto">{prio.namn}</Pill> : null}
      </div>
      <div className="text-[12.5px] font-semibold leading-snug text-ink">{u.titel}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-soft">
        <span>{u.ue}</span><span className="text-hairline-stark" aria-hidden="true">|</span><span>{u.skede}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
          <span className={cls("block h-full rounded-full", u.klar === 100 ? "bg-turkos" : "bg-one")}
            style={{ width: u.klar + "%" }} />
        </div>
        <span className="text-[10.5px] font-bold tabular-nums text-ink-soft">{u.klar} %</span>
      </div>
      {u.slut ? (
        <div className={cls("mt-2 text-[10.5px]", sent ? "font-semibold text-bad-ink" : "text-ink-faint")}>
          {sent ? "Försenad — " : ""}{u.slut} · {kvarText(u.slut)}
        </div>
      ) : (
        <div className="mt-2 text-[10.5px] text-ink-faint">Inget bekräftat slutdatum</div>
      )}
    </button>
  );
}

function FlikEntreprenad({ uppgifter, alla, filter, satFilter, onOppna, flyttaUppgift }) {
  const val = (etikett, varde, namn, lista) => (
    <Field etikett={etikett}>
      <select value={varde} onChange={(e) => satFilter(namn, e.target.value)} className={inputKlass}>
        <option value="alla">Alla</option>
        {lista.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </Field>
  );
  const aktiva = ["ue", "skede", "prio"].filter((k) => filter[k] !== "alla").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHead ikon={TrendingUp} titel="Framdrift per entreprenadgren"
            lead="Viktat medelvärde av arbetspaketens färdiggrad. Turkos ≥ 80 %, blå 40–79 %, orange under 40 %." />
          <div className="px-3 pb-4 pt-3"><FramdriftDiagram uppgifter={alla} /></div>
        </Card>

        <Card>
          <CardHead ikon={SlidersHorizontal} titel="Filter"
            hoger={aktiva ? <Knapp variant="tyst" ikon={X} className="!px-3 !py-1 !text-[12px]"
              onClick={() => satFilter("nollstall")}>Nollställ</Knapp> : null} />
          <div className="space-y-3.5 px-5 pb-5 pt-4">
            {val("Underentreprenör", filter.ue, "ue", UE.map((u) => [u, u]))}
            {val("Skede", filter.skede, "skede", SKEDEN.map((s) => [s, s]))}
            {val("Prioritet", filter.prio, "prio", PRIOS.map((p) => [p.id, p.namn]))}
            <p className="text-[11.5px] text-ink-soft">
              Visar <b className="text-ink">{uppgifter.length}</b> av {alla.length} arbetspaket.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
        {KOLUMNER.map((k) => {
          const i = uppgifter.filter((u) => u.kol === k.id);
          return (
            <section key={k.id} aria-label={k.namn} className="rounded-2xl bg-sunken p-3">
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft">{k.namn}</h3>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-ink-soft">{i.length}</span>
              </div>
              <div className="space-y-2.5">
                {i.length ? i.map((u) => <Kort key={u.id} u={u} onOppna={onOppna} />)
                  : <p className="px-1 py-2 text-[12px] text-ink-faint">Inga arbetspaket.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function UppgiftDetalj({ u, stang, flyttaUppgift }) {
  if (!u) return null;
  const gren = GRENAR.find((g) => g.id === u.gren);
  const prio = PRIOS.find((p) => p.id === u.prio);
  return (
    <Overlay oppen={!!u} stang={stang} bredd="max-w-xl">
      <OverlayHead titel={u.titel} under={(gren ? gren.namn : "") + " · " + u.ue} stang={stang} />
      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap gap-2">
          <Pill ton={prio.ton}>{prio.namn}</Pill>
          <Pill ton="info">{u.skede}</Pill>
          <Pill ton={u.klar === 100 ? "ok" : "neutral"}>{u.klar} % klart</Pill>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Entreprenadgren", gren ? gren.namn : "—"],
            ["Underentreprenör", u.ue],
            ["Skede", u.skede],
            ["Planerat slutdatum", u.slut ? u.slut + " (" + kvarText(u.slut) + ")" : "Inget bekräftat datum"]
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Flytta till kolumn</span>
          <div className="flex flex-wrap gap-2">
            {KOLUMNER.map((k) => (
              <button key={k.id} type="button" onClick={() => flyttaUppgift(u.id, k.id)}
                className={cls(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                  k.id === u.kol ? "bg-one text-white" : "border border-hairline text-ink-soft hover:border-one hover:text-one-djup"
                )}>{k.namn}</button>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ==========================================================================
   6. FLIK 2 — ÄTA-LOGG, KALKYL OCH EKONOMI
   ========================================================================== */

function tomKalkyl() {
  return {
    site: "36037", benamning: "", orsak: ATA_ORSAKER[0], abt: "kap. 2 § 4",
    handelse: IDAG, underrattad: IDAG,
    rader: [{ roll: "Montör", timmar: 0, ot: 1 }],
    materiel: 0, ue: 0, maskin: 0, km: 0
  };
}

/* Belopp enligt Bilaga 06.1: timmar × á-pris × OT-faktor, självkostnad + 10 %
   entreprenadarvode, samt milersättning utan påslag. */
function beraknaAta(k) {
  const arbete = (k.rader || []).reduce((s, r) => {
    const p = PRISLISTA.find((x) => x.roll === r.roll);
    return s + (Number(r.timmar) || 0) * (p ? p.pris : 0) * (Number(r.ot) || 1);
  }, 0);
  const sjalvkostnad = (Number(k.materiel) || 0) + (Number(k.ue) || 0) + (Number(k.maskin) || 0);
  const arvode = sjalvkostnad * ARVODE;
  const mil = (Number(k.km) || 0) * KM_PRIS;
  return {
    arbete, sjalvkostnad, arvode, mil,
    total: Math.round(arbete + sjalvkostnad + arvode + mil)
  };
}

function NyAtaModal({ oppen, stang, spara, siteId }) {
  const [k, satK] = useState(() => ({ ...tomKalkyl(), site: siteId }));
  useEffect(() => { if (oppen) satK({ ...tomKalkyl(), site: siteId }); }, [oppen, siteId]);

  const sum = beraknaAta(k);
  const satt = (f, v) => satK((p) => ({ ...p, [f]: v }));
  const sattRad = (i, f, v) => satK((p) => {
    const rader = p.rader.map((r, j) => (j === i ? { ...r, [f]: v } : r));
    return { ...p, rader };
  });
  const nyRad = () => satK((p) => ({ ...p, rader: [...p.rader, { roll: "Montör", timmar: 0, ot: 1 }] }));
  const taBort = (i) => satK((p) => ({ ...p, rader: p.rader.filter((_, j) => j !== i) }));
  const giltigt = k.benamning.trim().length > 2 && sum.total > 0;

  return (
    <Overlay oppen={oppen} stang={stang} bredd="max-w-3xl">
      <OverlayHead titel="Ny ÄTA / UR" stang={stang}
        under="Beloppet räknas ut löpande ur Bilaga 06.1 Prislista 2026. Underrättelse ska skickas inom 24 timmar från att hindret upptäcktes (ABT 06 kap. 2 § 7, kap. 5 § 4)." />

      <div className="max-h-[62vh] space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field etikett="Projekt">
            <select value={k.site} onChange={(e) => satt("site", e.target.value)} className={inputKlass}>
              {SITER.map((s) => <option key={s.id} value={s.id}>{s.nr} {s.namn}</option>)}
            </select>
          </Field>
          <Field etikett="Orsak">
            <select value={k.orsak} onChange={(e) => satt("orsak", e.target.value)} className={inputKlass}>
              {ATA_ORSAKER.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        <Field etikett="Beskrivning av arbetet">
          <textarea rows={2} value={k.benamning} onChange={(e) => satt("benamning", e.target.value)}
            placeholder="t.ex. Extra kabelschakt i berg vid schakt B"
            className={cls(inputKlass, "resize-y leading-relaxed")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field etikett="Händelsedatum"><input type="date" value={k.handelse}
            onChange={(e) => satt("handelse", e.target.value)} className={inputKlass} /></Field>
          <Field etikett="Underrättelse skickad"><input type="date" value={k.underrattad}
            onChange={(e) => satt("underrattad", e.target.value)} className={inputKlass} /></Field>
          <Field etikett="ABT 06-grund">
            <select value={k.abt} onChange={(e) => satt("abt", e.target.value)} className={inputKlass}>
              {["kap. 2 § 3", "kap. 2 § 4", "kap. 2 § 6", "kap. 5 § 4"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Arbetstid enligt Bilaga 06.1</h4>
            <Knapp variant="tyst" ikon={Plus} className="!px-3 !py-1 !text-[12px]" onClick={nyRad}>Rad</Knapp>
          </div>
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-wider text-ink-faint">
                  <th className="px-3 py-2 font-bold">Yrkeskategori</th>
                  <th className="px-3 py-2 text-right font-bold">Á-pris</th>
                  <th className="px-3 py-2 text-right font-bold">Timmar</th>
                  <th className="px-3 py-2 text-right font-bold">OT</th>
                  <th className="px-3 py-2 text-right font-bold">Belopp</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {k.rader.map((r, i) => {
                  const p = PRISLISTA.find((x) => x.roll === r.roll);
                  const rad = (Number(r.timmar) || 0) * (p ? p.pris : 0) * (Number(r.ot) || 1);
                  return (
                    <tr key={i} className="border-b border-hairline last:border-0">
                      <td className="px-3 py-2">
                        <select value={r.roll} onChange={(e) => sattRad(i, "roll", e.target.value)}
                          className={cls(inputKlass, "!py-1.5 !text-[13px]")}>
                          {PRISLISTA.map((x) => <option key={x.roll} value={x.roll}>{x.roll}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{p ? p.pris : 0} kr/h</td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.5" value={r.timmar}
                          onChange={(e) => sattRad(i, "timmar", e.target.value)}
                          className={cls(inputKlass, "!w-24 !py-1.5 text-right tabular-nums")} />
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.ot} onChange={(e) => sattRad(i, "ot", e.target.value)}
                          className={cls(inputKlass, "!w-[92px] !py-1.5 !text-[13px]")}>
                          <option value={1}>Normal</option><option value={1.5}>OT 1,5</option><option value={2}>OT 2,0</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtSEK(rad)}</td>
                      <td className="px-2 py-2">
                        {k.rader.length > 1 ? (
                          <button type="button" onClick={() => taBort(i)} aria-label="Ta bort rad"
                            className="rounded-md p-1 text-ink-faint transition hover:bg-bad-bg hover:text-bad-ink">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
            Självkostnad — påslag {Math.round(ARVODE * 100)} % entreprenadarvode
          </h4>
          <div className="grid gap-4 sm:grid-cols-4">
            {[["materiel", "Materiel"], ["ue", "Underentreprenör"], ["maskin", "Maskin / hyra"]].map(([f, n]) => (
              <Field key={f} etikett={n}>
                <input type="number" min="0" step="100" value={k[f]}
                  onChange={(e) => satt(f, e.target.value)}
                  className={cls(inputKlass, "text-right tabular-nums")} />
              </Field>
            ))}
            <Field etikett="Körsträcka (km)" hint={KM_PRIS + " kr/km, inget påslag"}>
              <input type="number" min="0" step="10" value={k.km}
                onChange={(e) => satt("km", e.target.value)}
                className={cls(inputKlass, "text-right tabular-nums")} />
            </Field>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline bg-sunken px-6 py-4">
        <dl className="space-y-1 text-[13px]">
          {[
            ["Arbetstid", sum.arbete], ["Självkostnad", sum.sjalvkostnad],
            ["Entreprenadarvode " + Math.round(ARVODE * 100) + " %", sum.arvode], ["Milersättning", sum.mil]
          ].map(([n, v]) => (
            <div key={n} className="flex justify-between gap-4 text-ink-soft">
              <dt>{n}</dt><dd className="tabular-nums">{fmtSEK(v)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t border-hairline-stark pt-2">
            <dt className="font-semibold text-ink">Summa att begära</dt>
            <dd className="font-head text-xl font-bold tabular-nums text-one-djup">{fmtSEK(sum.total)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Knapp variant="tyst" onClick={stang}>Avbryt</Knapp>
          <Knapp ikon={Plus} disabled={!giltigt} onClick={() => spara(k, sum)}>Lägg till i ÄTA-loggen</Knapp>
        </div>
      </div>
    </Overlay>
  );
}

function EkonomiDiagram() {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={EKONOMI} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis dataKey="man" tick={{ fill: "var(--ink-soft)", fontSize: 11 }} stroke="var(--hairline-stark)" />
          <YAxis tick={{ fill: "var(--ink-soft)", fontSize: 11 }} stroke="var(--hairline-stark)"
            tickFormatter={(v) => (v / 1000).toFixed(0) + " Mkr"} width={56} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)", border: "1px solid var(--hairline-stark)",
              borderRadius: 12, fontSize: 12, color: "var(--ink)"
            }}
            formatter={(v, n) => [fmtSEK(v * 1000), n]} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)", paddingTop: 6 }} />
          <Bar dataKey="budget" name="Budget" fill="var(--himmel)" radius={[5, 5, 0, 0]} barSize={18} isAnimationActive={false} />
          <Line type="monotone" dataKey="utfall" name="Utfall" stroke="var(--one-bla)" strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--one-bla)" }} isAnimationActive={false} />
          <Line type="monotone" dataKey="prognos" name="Prognos" stroke="var(--orange)" strokeWidth={2.5}
            strokeDasharray="5 4" dot={{ r: 3, fill: "var(--orange)" }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FlikAta({ ata, onOppna, onNy }) {
  const summa = ata.reduce((s, a) => s + (a.belopp || 0), 0);
  const perStatus = Object.keys(ATA_STATUS).map((k) => ({
    k, ...ATA_STATUS[k],
    antal: ata.filter((a) => a.status === k).length,
    belopp: ata.filter((a) => a.status === k).reduce((s, a) => s + (a.belopp || 0), 0)
  }));
  const utanUnderrattelse = ata.filter((a) => !a.underrattad && a.status !== "godkand");

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHead ikon={FileText} titel="ÄTA-logg — ändrings- och tilläggsarbeten"
            lead="Varje post ska ha en skriftlig underrättelse inom 24 timmar och ett skriftligt godkännande av priset innan arbetet påbörjas."
            hoger={<Knapp ikon={Plus} onClick={onNy}>Ny ÄTA</Knapp>} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-hairline text-left text-[10px] uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-2.5 font-bold">ÄTA-nr</th>
                  <th className="px-3 py-2.5 font-bold">Beskrivning</th>
                  <th className="px-3 py-2.5 font-bold">Orsak</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-5 py-2.5 text-right font-bold">Belopp</th>
                </tr>
              </thead>
              <tbody>
                {ata.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-faint">Ingen ÄTA registrerad för detta projekt.</td></tr>
                ) : ata.map((a) => (
                  <tr key={a.id} onClick={() => onOppna(a)} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") onOppna(a); }}
                    className="cursor-pointer border-b border-hairline transition last:border-0 hover:bg-sunken focus:bg-sunken focus:outline-none">
                    <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums text-ink">{a.nr}</td>
                    <td className="px-3 py-3 text-ink">{a.benamning}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{a.orsak}</td>
                    <td className="px-3 py-3"><Pill ton={ATA_STATUS[a.status].ton}>{ATA_STATUS[a.status].namn}</Pill></td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-ink">{fmtSEK(a.belopp)}</td>
                  </tr>
                ))}
              </tbody>
              {ata.length ? (
                <tfoot>
                  <tr className="bg-sunken">
                    <td colSpan={4} className="px-5 py-3 font-semibold text-ink">Summa ÄTA</td>
                    <td className="px-5 py-3 text-right font-head text-base font-bold tabular-nums text-one-djup">{fmtSEK(summa)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHead ikon={Coins} titel="Fördelning per status" />
            <dl className="space-y-2 px-5 pb-5 pt-4">
              {perStatus.map((s) => (
                <div key={s.k} className="flex items-center justify-between gap-3">
                  <dt><Pill ton={s.ton}>{s.namn}</Pill></dt>
                  <dd className="text-right">
                    <b className="block text-sm font-semibold tabular-nums text-ink">{fmtSEK(s.belopp)}</b>
                    <span className="text-[11px] text-ink-soft">{s.antal} st</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {utanUnderrattelse.length ? (
            <Card className="!border-bad">
              <CardHead ikon={AlertTriangle} titel="24-timmarsfristen"
                lead="Underrättelse saknas — utan den riskerar rätten till ersättning att gå förlorad." />
              <ul className="space-y-1.5 px-5 pb-5 pt-3 text-[13px]">
                {utanUnderrattelse.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-bad-ink">
                    <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span><b>{a.nr}</b> — {a.benamning}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHead ikon={Activity} titel="Ekonomisk prognos mot budget"
          lead="Ackumulerat utfall till och med september, prognos därefter. Staplarna är budget enligt betalplanen M1–M7." />
        <div className="px-3 pb-4 pt-3"><EkonomiDiagram /></div>
      </Card>
    </div>
  );
}

function AtaDetalj({ a, stang, satStatus }) {
  if (!a) return null;
  const site = SITER.find((s) => s.id === a.site);
  return (
    <Overlay oppen={!!a} stang={stang} bredd="max-w-xl">
      <OverlayHead titel={a.nr + " — " + a.benamning}
        under={(site ? site.nr + " " + site.namn : "") + " · " + a.orsak} stang={stang} />
      <div className="space-y-5 px-6 py-5">
        <div className="rounded-xl bg-sunken px-4 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Begärt belopp</span>
          <b className="mt-1 block font-head text-2xl font-bold tabular-nums text-one-djup">{fmtSEK(a.belopp)}</b>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Orsak", a.orsak],
            ["Avtalsgrund", "ABT 06 " + a.abt],
            ["Händelsedatum", a.handelse || "—"],
            ["Underrättelse skickad", a.underrattad || "Saknas"],
            ["Godkänd", a.godkant || "Inte godkänd ännu"],
            ["Prisgrund", "Bilaga 06.1 Prislista 2026"]
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{k}</dt>
              <dd className={cls("mt-0.5", v === "Saknas" ? "font-semibold text-bad-ink" : "text-ink")}>{v}</dd>
            </div>
          ))}
        </dl>
        {!a.underrattad && a.status !== "godkand" ? (
          <p className="flex items-start gap-2 rounded-xl bg-bad-bg px-4 py-3 text-[12.5px] leading-relaxed text-bad-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Ingen underrättelse är registrerad. Enligt ABT 06 kap. 2 § 7 och kap. 5 § 4 ska beställaren
            underrättas utan dröjsmål — annars kan rätten till ersättning och tidsförlängning gå förlorad.
          </p>
        ) : null}
        <div>
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">Sätt status</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ATA_STATUS).map((k) => (
              <button key={k} type="button" onClick={() => satStatus(a.id, k)}
                className={cls(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                  k === a.status ? "bg-one text-white" : "border border-hairline text-ink-soft hover:border-one hover:text-one-djup"
                )}>{ATA_STATUS[k].namn}</button>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ==========================================================================
   7. FLIK 3 — LEVERANS- OCH MATERIALSPÅRNING
   ========================================================================== */

function FlikLeverans({ leveranser, onOppna }) {
  const avvikelser = leveranser.filter((l) => l.status === "avvikelse");
  return (
    <div className="space-y-5">
      {avvikelser.length ? (
        <Card className="!border-bad !bg-bad-bg">
          <CardHead ikon={AlertTriangle} titel={avvikelser.length + " kritiska leveransavvikelser"}
            lead="Komponenter utan bekräftat leveransdatum eller med känd felleverans. Dessa styr den kritiska linjen mot Cold Commissioning." />
          <ul className="space-y-2 px-5 pb-5 pt-3">
            {avvikelser.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onOppna(l)}
                  className="flex w-full items-start gap-3 rounded-xl bg-surface px-4 py-3 text-left transition hover:shadow-md">
                  <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-rod" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[13px] font-semibold text-ink">{l.komponent}</b>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{l.not}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHead ikon={Boxes} titel="Kritiska komponenter"
          lead="Leveranskedja för de komponenter som styr idrifttagningen. Klicka en rad för transport-, tull- och lyftdetaljer." />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-hairline text-left text-[10px] uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-2.5 font-bold">Komponent</th>
                <th className="px-3 py-2.5 font-bold">Leverantör</th>
                <th className="px-3 py-2.5 font-bold">Antal</th>
                <th className="px-3 py-2.5 font-bold">Beräknad leverans</th>
                <th className="px-3 py-2.5 font-bold">Tull / transport</th>
                <th className="px-5 py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leveranser.map((l) => {
                const d = dagarTill(l.eta);
                return (
                  <tr key={l.id} onClick={() => onOppna(l)} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") onOppna(l); }}
                    className="cursor-pointer border-b border-hairline transition last:border-0 hover:bg-sunken focus:bg-sunken focus:outline-none">
                    <td className="px-5 py-3 font-semibold text-ink">{l.komponent}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{l.leverantor}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-soft">{l.antal}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {l.eta ? (
                        <>
                          <b className="block tabular-nums text-ink">{l.eta}</b>
                          <span className={cls("text-[11px]", d !== null && d < 14 ? "text-warn-ink" : "text-ink-soft")}>{kvarText(l.eta)}</span>
                        </>
                      ) : <span className="text-[12px] font-semibold text-bad-ink">Inget bekräftat datum</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Pill ton={l.tullTon}>{l.tull}</Pill>
                      <span className="mt-1 block text-[11px] text-ink-soft">{l.transport}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Pill ton={LEV_STATUS[l.status].ton}>{LEV_STATUS[l.status].namn}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LeveransDetalj({ l, stang }) {
  if (!l) return null;
  const site = SITER.find((s) => s.id === l.site);
  return (
    <Overlay oppen={!!l} stang={stang} bredd="max-w-xl">
      <OverlayHead titel={l.komponent} under={(site ? site.nr + " " + site.namn : "") + " · " + l.leverantor} stang={stang} />
      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap gap-2">
          <Pill ton={LEV_STATUS[l.status].ton}>{LEV_STATUS[l.status].namn}</Pill>
          <Pill ton={l.tullTon}>{l.tull}</Pill>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Leverantör", l.leverantor], ["Antal", l.antal],
            ["Beräknad leverans", l.eta ? l.eta + " (" + kvarText(l.eta) + ")" : "Inget bekräftat datum"],
            ["Leveransvillkor", l.incoterm], ["Transportsätt", l.transport], ["Tullstatus", l.tull]
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {l.not ? (
          <p className={cls(
            "flex items-start gap-2 rounded-xl px-4 py-3 text-[12.5px] leading-relaxed",
            l.status === "avvikelse" ? "bg-bad-bg text-bad-ink" : "bg-sunken text-ink-soft"
          )}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{l.not}
          </p>
        ) : null}
      </div>
    </Overlay>
  );
}

/* ==========================================================================
   8. FLIK 4 — IDRIFTTAGNING OCH COMPLIANCE
   ========================================================================== */

function FlikCompliance({ listor, vaxla }) {
  const total = listor.reduce((s, l) => s + l.punkter.length, 0);
  const klara = listor.reduce((s, l) => s + l.punkter.filter((p) => p.klar).length, 0);
  const proc = total ? (klara / total) * 100 : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHead ikon={Gauge} titel="Vägen till kommersiell drift"
          lead="FAT hos leverantör, Cold Commissioning på site, SAT mot garanterade värden, förkvalificering av stödtjänster hos Svenska kraftnät och slutligen slutbesiktning enligt ABT 06 kap. 7." />
        <div className="grid gap-5 px-5 pb-5 pt-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <Matare varde={proc} etikett={klara + " av " + total + " punkter avklarade"}
            ton={proc >= 80 ? "turkos" : proc >= 40 ? "one" : "orange"} />
          <ol className="flex flex-wrap gap-2">
            {listor.map((l) => {
              const k = l.punkter.filter((p) => p.klar).length;
              const allt = k === l.punkter.length;
              return (
                <li key={l.id} className={cls(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold",
                  allt ? "bg-ok-bg text-ok-ink" : k ? "bg-info-bg text-info-ink" : "bg-sunken text-ink-soft"
                )}>
                  {allt ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Clock className="h-4 w-4" aria-hidden="true" />}
                  {l.namn.split(" — ")[0]}
                  <span className="tabular-nums opacity-70">{k}/{l.punkter.length}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        {listor.map((l) => {
          const Ikon = l.ikon;
          const k = l.punkter.filter((p) => p.klar).length;
          return (
            <Card key={l.id}>
              <CardHead ikon={Ikon} titel={l.namn} lead={l.ref}
                hoger={<Pill ton={k === l.punkter.length ? "ok" : k ? "info" : "neutral"}>{k}/{l.punkter.length}</Pill>} />
              <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
                {l.punkter.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-2.5 transition hover:bg-sunken">
                      <input type="checkbox" checked={p.klar} onChange={() => vaxla(l.id, p.id)}
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--one-bla)]" />
                      <span className={cls("text-[13px] leading-snug", p.klar ? "text-ink-faint line-through" : "text-ink")}>{p.txt}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   9. HUVUDKOMPONENT
   ========================================================================== */

const FLIKAR = [
  { id: "entreprenad", namn: "Entreprenad", ikon: Layers,         under: "Kanban per gren" },
  { id: "ata",         namn: "ÄTA-logg",    ikon: FileText,       under: "Ändrings- och tilläggsarbeten" },
  { id: "leverans",    namn: "Leveranser",  ikon: Truck,          under: "Material och transport" },
  { id: "compliance",  namn: "Idrifttagning", ikon: ClipboardCheck, under: "FAT/SAT och stödtjänster" }
];

export default function BessDashboard() {
  const sparat = useMemo(() => lasLagrat(), []);

  const [tema, satTema]         = useState(() => (sparat && sparat.tema) || "system");
  const [siteId, satSiteId]     = useState(() => (sparat && sparat.siteId) || "36037");
  const [flik, satFlik]         = useState("entreprenad");
  const [uppgifter, satUppg]    = useState(() => (sparat && sparat.uppgifter) || UPPGIFTER);
  const [ata, satAta]           = useState(() => (sparat && sparat.ata) || ATA_START);
  const [listor, satListor]     = useState(() => (sparat && sparat.listor) || CHECKLISTOR.map((l) => ({ ...l, punkter: l.punkter.map((p) => ({ ...p })) })));
  const [filter, satFilterRaw]  = useState({ ue: "alla", skede: "alla", prio: "alla" });

  const [oppenUppg, satOppenUppg] = useState(null);
  const [oppenAta, satOppenAta]   = useState(null);
  const [oppenLev, satOppenLev]   = useState(null);
  const [nyOppen, satNyOppen]     = useState(false);
  const [notis, satNotis]         = useState("");

  const site = SITER.find((s) => s.id === siteId) || SITER[0];

  /* Checklistorna tappar sina ikoner när de läses tillbaka ur lagringen —
     koppla på dem igen från grunddefinitionen. */
  const listorMedIkon = useMemo(
    () => listor.map((l) => ({ ...l, ikon: (CHECKLISTOR.find((c) => c.id === l.id) || {}).ikon || ListChecks })),
    [listor]
  );

  useEffect(() => {
    const rot = document.documentElement;
    if (tema === "system") rot.removeAttribute("data-theme");
    else rot.setAttribute("data-theme", tema);
  }, [tema]);

  useEffect(() => {
    skrivLagrat({
      tema, siteId, uppgifter, ata,
      listor: listor.map(({ ikon, ...rest }) => rest)
    });
  }, [tema, siteId, uppgifter, ata, listor]);

  useEffect(() => {
    if (!notis) return;
    const t = setTimeout(() => satNotis(""), 2800);
    return () => clearTimeout(t);
  }, [notis]);

  const uppgSite = useMemo(() => uppgifter.filter((u) => u.site === siteId), [uppgifter, siteId]);
  const uppgFiltrerade = useMemo(() => uppgSite.filter((u) =>
    (filter.ue === "alla" || u.ue === filter.ue) &&
    (filter.skede === "alla" || u.skede === filter.skede) &&
    (filter.prio === "alla" || u.prio === filter.prio)
  ), [uppgSite, filter]);
  const ataSite = useMemo(() => ata.filter((a) => a.site === siteId), [ata, siteId]);
  const levSite = useMemo(() => LEVERANSER.filter((l) => l.site === siteId), [siteId]);

  const satFilter = (namn, varde) => {
    if (namn === "nollstall") satFilterRaw({ ue: "alla", skede: "alla", prio: "alla" });
    else satFilterRaw((p) => ({ ...p, [namn]: varde }));
  };

  const flyttaUppgift = (id, kol) => {
    satUppg((p) => p.map((u) => u.id === id
      ? { ...u, kol, klar: kol === "klar" ? 100 : u.klar === 100 ? 90 : u.klar }
      : u));
    satOppenUppg(null);
    satNotis("Arbetspaketet flyttades till " + (KOLUMNER.find((k) => k.id === kol) || {}).namn);
  };

  const satAtaStatus = (id, status) => {
    satAta((p) => p.map((a) => a.id === id
      ? { ...a, status, godkant: status === "godkand" ? (a.godkant || IDAG) : "" }
      : a));
    satOppenAta(null);
    satNotis("Status satt till " + ATA_STATUS[status].namn);
  };

  const sparaNyAta = (k, sum) => {
    const nr = "UR" + String(
      ata.filter((a) => a.site === k.site).length + 1
    ).padStart(3, "0");
    const rad = {
      id: "a" + Date.now(), site: k.site, nr, benamning: k.benamning.trim(),
      orsak: k.orsak, status: k.underrattad ? "granskning" : "utkast",
      belopp: sum.total, handelse: k.handelse, underrattad: k.underrattad,
      godkant: "", abt: k.abt, exempel: false
    };
    satAta((p) => [...p, rad]);
    satSiteId(k.site);
    satNyOppen(false);
    satNotis(nr + " tillagd — " + fmtSEK(sum.total));
  };

  const vaxlaPunkt = (listId, punktId) => {
    satListor((p) => p.map((l) => l.id !== listId ? l : {
      ...l, punkter: l.punkter.map((x) => x.id === punktId ? { ...x, klar: !x.klar } : x)
    }));
  };

  const vaxlaTema = () => satTema((t) => {
    if (t === "system") {
      const morkt = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return morkt ? "light" : "dark";
    }
    return t === "dark" ? "light" : "dark";
  });

  const aktivtMorkt = tema === "dark" ||
    (tema === "system" && typeof window !== "undefined" && window.matchMedia &&
     window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-ground font-body text-ink">
      <SiteHeader site={site} ata={ataSite} tema={aktivtMorkt ? "dark" : "light"}
        vaxlaTema={vaxlaTema} siter={SITER} valjSite={satSiteId} />

      <nav aria-label="Moduler" className="sticky top-0 z-30 border-b border-hairline bg-surface backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] gap-1 overflow-x-auto px-3 sm:px-6">
          {FLIKAR.map((f) => {
            const Ikon = f.ikon;
            const pa = f.id === flik;
            return (
              <button key={f.id} type="button" onClick={() => satFlik(f.id)} aria-current={pa ? "page" : undefined}
                className={cls(
                  "relative flex shrink-0 items-center gap-2.5 px-4 py-3.5 text-[13.5px] font-semibold transition",
                  pa ? "text-one-djup" : "text-ink-soft hover:text-ink"
                )}>
                <Ikon className={cls("h-4 w-4", pa ? "text-one" : "")} aria-hidden="true" />
                <span className="text-left">
                  {f.namn}
                  <span className="block text-[10.5px] font-normal text-ink-faint">{f.under}</span>
                </span>
                {pa ? <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-one" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-6 sm:px-8">
        <p className="mb-5 flex items-start gap-2.5 rounded-xl bg-warn-bg px-4 py-3 text-[12.5px] leading-relaxed text-warn-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <b>Fakta</b> i sidan: projektdata, nätägare, UR-nummer, leveransdatum och den kända
            avvikelsen på kabelströmstransformatorerna kommer ur BM7 (Växjö) och BM8 (Alvesta),
            signerade 2026-08-17. <b>Antaganden</b>: ÄTA-belopp, HMS-statistik, kanbanens arbetspaket,
            FAT/SAT-läge och kostnadsprognosen är exempelvärden tills de fylls i från era egna underlag.
          </span>
        </p>

        {flik === "entreprenad" ? (
          <FlikEntreprenad uppgifter={uppgFiltrerade} alla={uppgSite} filter={filter}
            satFilter={satFilter} onOppna={satOppenUppg} flyttaUppgift={flyttaUppgift} />
        ) : null}
        {flik === "ata" ? (
          <FlikAta ata={ataSite} onOppna={satOppenAta} onNy={() => satNyOppen(true)} />
        ) : null}
        {flik === "leverans" ? (
          <FlikLeverans leveranser={levSite} onOppna={satOppenLev} />
        ) : null}
        {flik === "compliance" ? (
          <FlikCompliance listor={listorMedIkon} vaxla={vaxlaPunkt} />
        ) : null}
      </main>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-5 text-[11.5px] text-ink-soft sm:px-8">
          <span>ONE Nordic AB · BESS Projektkontroll · entreprenadform ABT 06</span>
          <span>Prisgrund Bilaga 06.1 Prislista 2026 · one-nordic.se</span>
        </div>
      </footer>

      <UppgiftDetalj u={oppenUppg} stang={() => satOppenUppg(null)} flyttaUppgift={flyttaUppgift} />
      <AtaDetalj a={oppenAta} stang={() => satOppenAta(null)} satStatus={satAtaStatus} />
      <LeveransDetalj l={oppenLev} stang={() => satOppenLev(null)} />
      <NyAtaModal oppen={nyOppen} stang={() => satNyOppen(false)} spara={sparaNyAta} siteId={siteId} />

      <div aria-live="polite" className={cls(
        "pointer-events-none fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-xl border border-hairline",
        "bg-surface px-4 py-3 text-[13px] font-semibold text-ink shadow-xl transition-all duration-200",
        notis ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}>
        <CheckCircle2 className="h-4 w-4 text-turkos" aria-hidden="true" />{notis || " "}
      </div>
    </div>
  );
}
