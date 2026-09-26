/* BESS EPC-checklistan som data — "Bygga batteripark som totalentreprenad",
   version 1.1 (2026-09-26), ONE Nordic AB. Avtalsgrund ABT 06 / ABT-U 07.

   Allt här är extraherat ur checklistans PDF: 16 faser med grind (G0–G15),
   286 kontrollpunkter varav 47 hållpunkter, betalmilstolparna M1–M7,
   nyckelvärdena, ledtidstabellen, de tio lärdomarna från Batch C (Växjö
   36037, Alvesta 36038) och de tolv motsägelserna att reda ut.
   src/data/bessChecklistData.test.js låser antalen, så en punkt som
   försvinner eller dubbleras vid en uppdatering syns direkt.

   Version 1.1 bygger på en genomgång av samtliga källor i åtta
   NotebookLM-böcker. De 87 nya punkterna ligger sist i varje fas, under
   "Från källgenomgången" (fas 1: "Kontraktsgranskning efter signering"),
   och sist i löpande ÄTA-disciplin. Punkterna från 1.0 är oförändrade.

   Id:n ("7.3", "lop.4") står i länkar (#kp-7.3) och i ledtidernas
   punkthänvisning — de får aldrig numreras om. Ny punkt i en fas läggs sist
   i fasen med nästa lediga nummer. Läget sparas per fas och ledtid, inte per
   punkt.

   Två saker är tillägg, inte ur PDF:en, och markerade där de står:
   - `kort` och `mall` per fas (kort namn för Gantt och standardplanens läge)
   - `ankare` och `dagar` per ledtid (vad fristen räknas mot, i dagar) */

/* ---------- Typer ---------- */

/** HP = hållpunkt, stopp tills godkänt · K = kontrakts- eller lagkrav · L = lärdom från Batch C. */
export type Markering = "HP" | "K" | "L";

export type MilstolpeKod = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";

export interface Kontrollpunkt {
  /** Stabil nyckel: "fas.löpnummer", eller "lop.n" för löpande punkter. */
  id: string;
  text: string;
  badges: Markering[];
  ansvar: string;
  nar: string;
}

export interface Sektion {
  /** Tom sträng när fasen bara har en lista utan underrubrik. */
  namn: string;
  punkter: Kontrollpunkt[];
}

export interface Fas {
  nr: number;
  titel: string;
  /** Kort namn för Gantt-schemats etikettkolumn. Tillägg. */
  kort: string;
  syfte: string;
  grind: { kod: string; text: string };
  /** Betalningen som grinden låser ("orange ram i flödet"), annars null. */
  milstolpe: MilstolpeKod | null;
  /** Fasens läge i standardplanen på MALL_SKALA. Tillägg — se lib/epc.js. */
  mall: { fran: number; till: number };
  sektioner: Sektion[];
}

export interface Lopande {
  titel: string;
  syfte: string;
  sektioner: Sektion[];
}

export interface Milstolpe {
  kod: MilstolpeKod;
  namn: string;
  utloses: string;
  andel: number;
  /** Grinden vars passage utlöser betalningen. */
  grind: string;
}

/** Händelser i projektet som en ledtid räknas mot. */
export type Ankare =
  | "byggstart"
  | "schaktstart"
  | "bessLeverans"
  | "mvLeverans"
  | "satStallverk"
  | "idrifttagning"
  | "slutbesiktning";

export interface Ledtid {
  id: string;
  arende: string;
  /** Ledtiden som den står i checklistan. */
  ledtid: string;
  /** Ledtiden i kalenderdagar. null när den inte går att räkna (månader–år). Tillägg. */
  dagar: number | null;
  /** "fore" = senast så här många dagar före ankaret, "efter" = senast efter. */
  riktning: "fore" | "efter";
  ankare: Ankare | null;
  agare: "Entreprenör" | "Beställare" | "Båda";
  /** Kontrollpunkten som bockas av när ärendet är klart. */
  punkt: string;
  not?: string;
}

export interface Nyckelvarde {
  omrade: string;
  /** Värdena som de står på sidan, ett per del (sidan skiljer dem med ·). */
  varden: string[];
}

export interface Lardom {
  handelse: string;
  vadHande: string;
  gorSa: string;
}

/** Checklistans version — står i kapitlets rubrik. */
export const VERSION = { nr: "1.1", datum: "2026-09-26" } as const;

/* ---------- Markeringar ---------- */

export const MARKERINGAR: Record<Markering, { namn: string; beskrivning: string }> = {
  HP: { namn: "Hållpunkt", beskrivning: "Stopp tills godkänt" },
  K: { namn: "Kontraktskrav", beskrivning: "Kontrakts- eller lagkrav" },
  L: { namn: "Lärdom", beskrivning: "Lärdom från Batch C / källor" },
};

/* ---------- Standardplanen ----------

   Fasernas `mall` ligger på en skala med tre ankare i projektet:
     -1 → 0   de åtta veckorna före start (anbud)
      0 → 1   start (NTP) → BESS-leverans
      1 → 2   BESS-leverans → slutbesiktning
      2 → 3   de sex veckorna efter slutbesiktning (slutreglering)
   Leveransen som mittankare gör att planen följer det datum som faktiskt
   styr bygget. Planen är en utgångspunkt — varje fas kan få egna datum. */

export const MALL_SKALA = { foreStartDagar: 56, efterSlutDagar: 42 } as const;

export const FASER: Fas[] = [
  {
    nr: 0,
    titel: "Anbud & kalkyl",
    kort: "Anbud & kalkyl",
    syfte: "Rätt pris, rätt reservationer – risker prissatta innan kontrakt.",
    grind: { kod: "G0", text: "Anbud lämnat med granskad kalkyl och reservationsbilaga" },
    milstolpe: null,
    mall: { fran: -1.0, till: 0.0 },
    sektioner: [
      {
        namn: "Förfrågningsunderlag & gränsdragning",
        punkter: [
          { id: "0.1", text: "Läs avtalsform: ABT 06 + ändringar (viten, preklusion, säkerheter, betalplan, fast pris utan index – hur länge?)", badges: ["K"], ansvar: "PL", nar: "Anbudsstart" },
          { id: "0.2", text: "Upprätta ansvarsmatris cBoP / eBoP / OEM (BESS, MV-station, ställverk) / nätägare (POC)", badges: [], ansvar: "PL", nar: "Anbudsstart" },
          { id: "0.3", text: "Klargör vem som har bygglov, nätanslutningsavtal, miljötillstånd – och vad som är entreprenörens tillstånd", badges: [], ansvar: "PL", nar: "Anbudsstart" },
          { id: "0.4", text: "Kontrollera funktionsansvar: allt som krävs för full funktion anses ingå även om det inte är beskrivet", badges: ["K"], ansvar: "PL", nar: "Anbudsstart" },
        ],
      },
      {
        namn: "Kalkyl",
        punkter: [
          { id: "0.5", text: "Mark: schakt, kapillärbrytande lager, kabelgravar, vägar/hårdytor, stängsel, grind, dränering, dagvatten", badges: [], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.6", text: "Betong: fundament BESS/MV-skid/stationshus, oljegrop (≥ oljevolym + regn), EPD/grön betong, provkuber", badges: [], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.7", text: "El: MV/LV/fiber, jordning (ring 95 mm² Cu + grenar 35 mm²), kabelskåp, belysning, CCTV, provningar (VLF, Riso, OTDR, jordtag)", badges: [], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.8", text: "Kran & lyft: antal leveransdagar, kranstorlek (≥ 45 t BESS, ≥ 40 t MV-skid), uppställningsyta med bärighet", badges: ["L"], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.9", text: "Etablering: bodar, byggström, belysning, snöröjning, hyrtid – räkna med realistisk entreprenadtid", badges: ["L"], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.10", text: "Projektledning, platschef, BAS-P/BAS-U, elsäkerhetsledare, eldriftledning, dokumentation/relation", badges: [], ansvar: "Kalkyl", nar: "Kalkyl" },
          { id: "0.11", text: "Lokala resurser – mobilisering långväga (t.ex. Malmö → Umeå) driver kostnad kraftigt", badges: ["L"], ansvar: "PL", nar: "Kalkyl" },
        ],
      },
      {
        namn: "UE-offerter & reservationer",
        punkter: [
          { id: "0.12", text: "Minst 2–3 offerter per huvud-UE (mark, betong, kran). Kräv att toleranser, betongklass, miljökrav täcks", badges: [], ansvar: "PL", nar: "Kalkyl" },
          { id: "0.13", text: "Reservera: berg/storsten, lera, grundvatten, föroreningar > MRR/KM, vinterkostnader, tull, extra kranetablering", badges: ["L"], ansvar: "PL", nar: "Anbud" },
          { id: "0.14", text: "Reservera: förseningar/skador på beställarlevererad utrustning (OEM)", badges: [], ansvar: "PL", nar: "Anbud" },
          { id: "0.15", text: "Riskpåslag om geoteknik saknas eller är tunn (provgropar ≠ verklig mäktighet)", badges: ["L"], ansvar: "PL", nar: "Anbud" },
          { id: "0.16", text: "Vitesexponering beräknad: t.ex. 0,5 %/v milstolpe, 1,25 %/v inspektion, 1,5 %/v slutbesiktning, tak 12,5 %", badges: ["K"], ansvar: "PL", nar: "Anbud" },
          { id: "0.17", text: "Säkerheter & försäkring kalkylerade: bankgaranti 10 % (entreprenadtid) / 5 % (garantitid), allrisk, ansvar", badges: ["K"], ansvar: "PL / ekonomi", nar: "Anbud" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "0.18", text: "Ortsspecifika à-priser för förorenade massor i reservationsbilagan (t.ex. Växjö KM 210 / MKM 380 / IFA 640 kr/t; Alvesta 207 / 390 / 650)", badges: ["L"], ansvar: "Kalkyl", nar: "Anbud" },
          { id: "0.19", text: "Vinterkostnader (< −10 °C, snö/is) på löpande räkning med tak (Batch C: 52 000 kr, Göteborg 65 000 kr)", badges: ["K"], ansvar: "PL", nar: "Anbud" },
          { id: "0.20", text: "TA-plan: skriv tydligt per projekt om den ingår – Batch C-bilagan säger både 'ingår' och 'ingår ej'", badges: ["L"], ansvar: "PL", nar: "Anbud" },
          { id: "0.21", text: "Leveransvillkor för elutrustning (NU 15) och ABT 06 / ABT-U 07 rätt kopplade i avtalskedjan", badges: ["K"], ansvar: "PL", nar: "Anbud" },
          { id: "0.22", text: "Tvistlösning (Batch C: SCC-skiljeförfarande, engelska) och sekretessvite (5 %) kända före signering", badges: ["K"], ansvar: "PL", nar: "Anbud" },
        ],
      },
    ],
  },
  {
    nr: 1,
    titel: "Kontrakt & uppstart",
    kort: "Kontrakt & uppstart",
    syfte: "Formalia klar tidigt så att M1 kan faktureras och inget stoppar byggstart.",
    grind: { kod: "G1", text: "Kontrakt signerat, säkerhet ställd, M1 fakturerad" },
    milstolpe: "M1",
    mall: { fran: 0.0, till: 0.08 },
    sektioner: [
      {
        namn: "Inom 2 veckor från kontrakt / NTP",
        punkter: [
          { id: "1.1", text: "Bankgaranti/säkerhet i original (10 %) överlämnad", badges: ["K"], ansvar: "Ombud / ekonomi", nar: "NTP + 2 v" },
          { id: "1.2", text: "Försäkringsintyg (entreprenad/allrisk + ansvar) överlämnat", badges: ["K"], ansvar: "PL", nar: "NTP + 2 v" },
          { id: "1.3", text: "Samordningstidplan (Coordination Time Schedule) inlämnad", badges: ["K"], ansvar: "PL", nar: "NTP + 2 v" },
          { id: "1.4", text: "Projektorganisation med namn, roller och ersättare dokumenterad", badges: [], ansvar: "PL", nar: "NTP + 2 v" },
        ],
      },
      {
        namn: "Inom 4 veckor från NTP",
        punkter: [
          { id: "1.5", text: "Kvalitetsplan med utsedd kvalitetsansvarig", badges: ["K"], ansvar: "PL", nar: "NTP + 4 v" },
          { id: "1.6", text: "Arbetsmiljöplan (BAS-P/BAS-U) och miljöplan", badges: ["K"], ansvar: "BAS-P / PL", nar: "NTP + 4 v" },
        ],
      },
      {
        namn: "Intern uppstart",
        punkter: [
          { id: "1.7", text: "Projektdirektiv + kontraktsöverlämning från sälj (juridiska risker, reservationer, rabattvillkor)", badges: [], ansvar: "PL", nar: "Uppstart" },
          { id: "1.8", text: "Projekt i ERP (IFS): WBS/aktiviteter, budget (BAC ≠ 0), intäktselement per milstolpe", badges: ["L"], ansvar: "PL / ekonomi", nar: "Uppstart" },
          { id: "1.9", text: "Ekonomisk översikt/EAC-mall, ÄTA/UR-logg, riskregister och Gantt uppsatta", badges: [], ansvar: "PL", nar: "Uppstart" },
          { id: "1.10", text: "Dokumentstruktur: intern pärm, UE-pärm, beställarens samarbetsyta. ÄTA-prissättning bara internt", badges: ["L"], ansvar: "PL", nar: "Uppstart" },
          { id: "1.11", text: "UE presenterade för beställaren (rätt till invändning) innan bindande UE-avtal", badges: ["K"], ansvar: "PL", nar: "Före UE-avtal" },
          { id: "1.12", text: "UE-avtal back-to-back (ABT-U 07): tider, viten, preklusion, garantier, uppförandekod, överlåtelseklausul", badges: ["K", "L"], ansvar: "PL", nar: "Före UE-start" },
          { id: "1.13", text: "M1-avisering (Excel-mall) → godkännande → faktura i IFS", badges: [], ansvar: "PL", nar: "Direkt" },
        ],
      },
      {
        namn: "Kontraktsgranskning efter signering",
        punkter: [
          { id: "1.14", text: "Kontrollera alla milstolpedatum – Batch C-AF anger 2025 i stället för 2026. Få skriftlig bekräftelse", badges: ["HP", "L"], ansvar: "PL", nar: "Direkt" },
          { id: "1.15", text: "Kontraktssumma hämtas ur signerat kontrakt – aldrig ur kalkyl/anbud", badges: ["L"], ansvar: "PL / ekonomi", nar: "Uppstart" },
          { id: "1.16", text: "Bilagenummer skiljer mellan huvudkontrakt och UE-avtal – hänvisa med dokumentnamn i skrivelser", badges: ["L"], ansvar: "PL", nar: "Löpande" },
          { id: "1.17", text: "UE-intyg: F-skatt, registreringsbevis, försäkring, kollektivavtal – före start och var 12:e månad", badges: ["K"], ansvar: "PL", nar: "Före UE-start" },
          { id: "1.18", text: "Direct Agreement med finansiär vid anfordran – information till Security Agent inom 15 dagar", badges: ["K"], ansvar: "Ombud", nar: "Vid anfordran" },
          { id: "1.19", text: "Ingen publicering/referens av projektet utan beställarens skriftliga OK (vite 5 %)", badges: ["K"], ansvar: "PL", nar: "Hela projektet" },
          { id: "1.20", text: "Volymrabatt: huvudavtal löpande vs UE-avtal mot sista lyft – planera kassaflödet", badges: ["L"], ansvar: "PL / ekonomi", nar: "Uppstart" },
          { id: "1.21", text: "UE bär obegränsat ONE Nordics viten vid UE-försening – kontrollera att det står i UE-avtalet", badges: ["K"], ansvar: "PL", nar: "Före UE-avtal" },
        ],
      },
    ],
  },
  {
    nr: 2,
    titel: "Tillstånd & myndighet",
    kort: "Tillstånd & myndighet",
    syfte: "Inga myndighetsstopp. Starta ledtidskrävande ärenden först.",
    grind: { kod: "G2", text: "Alla entreprenörstillstånd klara före byggstart" },
    milstolpe: null,
    mall: { fran: 0.0, till: 0.25 },
    sektioner: [
      {
        namn: "Beställaren (bevaka – påverkar din tidplan)",
        punkter: [
          { id: "2.1", text: "Bygglov + startbesked (kontrollplan, tekniskt samråd). Handläggning upp till 10 v + laga kraft", badges: ["K"], ansvar: "Beställare", nar: "Före byggstart" },
          { id: "2.2", text: "Nätanslutningsavtal / koncession – kapacitetsutredning månader–år", badges: [], ansvar: "Beställare / DSO", nar: "Tidigt" },
          { id: "2.3", text: "Räddningstjänst: insatsplan, släckvatten, säkerhetsavstånd för BESS", badges: [], ansvar: "Beställare", nar: "Parallellt med bygglov" },
        ],
      },
      {
        namn: "Entreprenören",
        punkter: [
          { id: "2.4", text: "Förhandsanmälan till Arbetsmiljöverket – insänd och anslagen", badges: ["K"], ansvar: "BAS-P / PL", nar: "≥ 4 v före byggstart" },
          { id: "2.5", text: "Ledningsvisning via Ledningskollen – uppdaterad före varje schaktetapp", badges: ["K"], ansvar: "Platschef", nar: "1–2 v före schakt" },
          { id: "2.6", text: "TA-plan och schakttillstånd hos väghållaren (kommun/Trafikverket)", badges: ["K", "L"], ansvar: "PL", nar: "≥ 3 v före arbete" },
          { id: "2.7", text: "TA-plan / transportväg för BESS-leveranser: kurvradier, bärighet, lutningar, tjällossning", badges: ["L"], ansvar: "PL", nar: "≥ 4 v före leverans" },
          { id: "2.8", text: "§ 28-anmälan vid förorenad mark (MKM/KM-massor) – 6 v handläggning", badges: ["K", "L"], ansvar: "PL", nar: "≥ 6 v före schakt" },
          { id: "2.9", text: "Avverkningsplan godkänd av beställaren innan avverkning (5 AD granskning)", badges: ["HP", "K"], ansvar: "PL", nar: "Före avverkning" },
          { id: "2.10", text: "Elinstallationsföretag registrerat hos Elsäkerhetsverket med egenkontrollprogram (även UE)", badges: ["K"], ansvar: "Elinstallatör", nar: "Före elarbete" },
          { id: "2.11", text: "Heta arbeten, sprängning (t.ex. Simplex/snigeldynamit), tunga transporter – egna tillstånd", badges: [], ansvar: "Platschef", nar: "Före moment" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "2.12", text: "All myndighetskontakt kanaliseras via beställaren (Batch C)", badges: ["K"], ansvar: "PL", nar: "Löpande" },
          { id: "2.13", text: "Bullrande arbete vardagar 07–18; kringboende informeras i förväg", badges: ["K"], ansvar: "Platschef", nar: "Löpande" },
          { id: "2.14", text: "Sprängning < 100 m från elanläggning: anmälan ≥ 2 v före med sprängplan; < 50 m inga elektriska tändsystem", badges: ["K"], ansvar: "Platschef", nar: "≥ 2 v före" },
          { id: "2.15", text: "Vattenskyddsområde: separat tillstånd, inga öppna schakt över natt, ingen tankning, miljöklassad hydraulolja", badges: ["K"], ansvar: "PL", nar: "Före start" },
          { id: "2.16", text: "Fornlämning/okänd förorening: stopplikt + anmälan till länsstyrelse/kommun och beställare", badges: ["HP", "K"], ansvar: "Platschef", nar: "Omedelbart" },
          { id: "2.17", text: "Klargör vem som betalar myndighetsavgift för § 28-anmälan (oklart i Batch C)", badges: ["L"], ansvar: "PL", nar: "Tidigt" },
        ],
      },
    ],
  },
  {
    nr: 3,
    titel: "Projektering & granskning",
    kort: "Projektering & granskning",
    syfte: "Godkända bygghandlingar = M2. Inget byggs på handling under granskning.",
    grind: { kod: "G3", text: "Bygghandlingar godkända av beställaren (M2)" },
    milstolpe: "M2",
    mall: { fran: 0.03, till: 0.3 },
    sektioner: [
      {
        namn: "Handlingar",
        punkter: [
          { id: "3.1", text: "cBoP: mark, vägar, hårdytor, dränering, kabelgravar (.dwg + PDF)", badges: ["K"], ansvar: "Projektör", nar: "Enligt kontrakt" },
          { id: "3.2", text: "K-handlingar: fundament BESS, MV-skid/trafo, stationshus – SS-EN 1990/1992/1997, 25 års livslängd", badges: ["K"], ansvar: "K-konstruktör", nar: "Enligt kontrakt" },
          { id: "3.3", text: "Betongklass, exponeringsklass (XC4/XF1–XF3), vct, täckskikt fastställda och överförda till UE", badges: ["L"], ansvar: "K-konstruktör", nar: "Före beställning" },
          { id: "3.4", text: "Fundamentdimensionering mot verklig containervikt – begär skriftligt från OEM (t.ex. 43,8 t / 46 t mot 45 t)", badges: ["HP", "L"], ansvar: "K-konstruktör / PL", nar: "Före gjutning" },
          { id: "3.5", text: "eBoP: SLD, jordning, kabellista, fiber, åskskydd, belysning, CCTV, kabelskåp", badges: [], ansvar: "Elprojektör", nar: "Enligt kontrakt" },
          { id: "3.6", text: "Kabellista kontrollerad mot rätt topologi (radiell vs slinga) – ingen copy-paste från systerprojekt", badges: ["L"], ansvar: "Elprojektör", nar: "Före beställning" },
          { id: "3.7", text: "Selektivplan och reläskyddsinställningar – ansvarsfördelning skriftlig", badges: ["L"], ansvar: "Elprojektör / leverantör", nar: "Före provning" },
          { id: "3.8", text: "Kabelstorlekar/antal ledare verifierade mot genomföringar och CT-fönster (t.ex. Ø160 mm)", badges: ["L"], ansvar: "Elprojektör", nar: "Före beställning" },
          { id: "3.9", text: "Kabeltyper för signal (CAN, brandlarm) verifierade med elinstallatörsansvarig", badges: ["L"], ansvar: "Elinstallatör", nar: "Före beställning" },
        ],
      },
      {
        namn: "Granskning",
        punkter: [
          { id: "3.10", text: "Beställaren granskar inom 15 AD – entreprenören svarar inom 15 AD", badges: ["K"], ansvar: "PL", nar: "Löpande" },
          { id: "3.11", text: "Granskningshandlingar uppladdade i beställarens yta med revisionslogg", badges: [], ansvar: "PL", nar: "Löpande" },
          { id: "3.12", text: "Beställarens godkännande fritar INTE från funktionsansvar", badges: ["K"], ansvar: "PL", nar: "—" },
          { id: "3.13", text: "Beställarändringar i handlingar → UR direkt (kap. 2 § 6)", badges: ["K"], ansvar: "PL", nar: "Samma dag" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "3.14", text: "CATL-placering: sida–sida ≥ 3,0 m (rek. 3,5 m), bak ≥ 1,1 m, ≥ 50 m till bostäder, över högsta vattennivå", badges: ["K"], ansvar: "Projektör", nar: "Layout" },
          { id: "3.15", text: "Klimatlaster med 50-års returperiod; 25 års teknisk livslängd", badges: ["K"], ansvar: "K-konstruktör", nar: "Projektering" },
          { id: "3.16", text: "Material, metoder, kabeltyper eller dimensioner ändras aldrig utan beställarens skriftliga samtycke", badges: ["K"], ansvar: "PL", nar: "Hela projektet" },
          { id: "3.17", text: "Skyltplan till beställaren för godkännande – stålstolpar, inga trästolpar", badges: ["K"], ansvar: "PL", nar: "Före montage" },
          { id: "3.18", text: "Stationshus: takhöjd ≥ 2 700 mm (tryckavlastning), golv ±5 mm/m, varje rum EI60", badges: ["K"], ansvar: "Projektör", nar: "Före beställning" },
          { id: "3.19", text: "Lås beteckningar och data: lokaltrafo 315/630 kVA, 11/12 kV, LSP IP31/IP21 och 800/400 A, fack H1/HA01/H01", badges: ["L"], ansvar: "Elprojektör", nar: "Före beställning" },
          { id: "3.20", text: "Klargör provningsansvar för ställverksfack vid nätägarens inkoppling (ansvarsmatris saknade detta)", badges: ["L"], ansvar: "PL", nar: "Före beställning" },
        ],
      },
    ],
  },
  {
    nr: 4,
    titel: "Inköp & långa ledtider",
    kort: "Inköp & ledtider",
    syfte: "Material på plats före behov. Rätt spec vid första leveransen.",
    grind: { kod: "G4", text: "Inköpsmatris komplett, alla kritiska ordrar bekräftade" },
    milstolpe: null,
    mall: { fran: 0.05, till: 0.6 },
    sektioner: [
      {
        namn: "Kritiska beställningar",
        punkter: [
          { id: "4.1", text: "Inköpsmatris: artikel, spec, leverantör, ordernr, bekräftat datum, leveransadress per projekt", badges: ["L"], ansvar: "PL", nar: "Uppstart" },
          { id: "4.2", text: "MV-kabel (t.ex. AXLJ-TT 1×240/35 12 kV), kabeldon, skarvar – rätt area OCH spänningsklass", badges: ["L"], ansvar: "PL", nar: "Tidigt" },
          { id: "4.3", text: "Kabelströmstransformatorer (jordfel) – innerdiameter verifierad mot antal enledare", badges: ["L"], ansvar: "PL / elinstallatör", nar: "Före order" },
          { id: "4.4", text: "Kabelskåp (t.ex. ABB SDCM), jordlina, jordspett, kabelskyddsrör, fiber", badges: [], ansvar: "PL", nar: "Tidigt" },
          { id: "4.5", text: "Betong (grön betong + EPD), armering B500B, ingjutningsgods/fästplattor", badges: [], ansvar: "UE betong", nar: "Före gjutning" },
          { id: "4.6", text: "Kran bokad för varje lyft med reservdag; kranbil/uppställning dimensionerad för verklig vikt", badges: ["L"], ansvar: "PL", nar: "≥ 4 v före lyft" },
          { id: "4.7", text: "Skyltar/märkning, brandtätning (brandkitt), Roxtec/MCT-genomföringar", badges: ["L"], ansvar: "PL", nar: "Före montage" },
        ],
      },
      {
        namn: "Mottagning",
        punkter: [
          { id: "4.8", text: "Mottagningskontroll varje leverans: rätt artikel, spec, antal, rätt site – avvikelse samma dag", badges: ["L"], ansvar: "Platschef", nar: "Vid leverans" },
          { id: "4.9", text: "Material > 5 000 EUR märkt med beställarens namn och projekt-ID (äganderätt)", badges: ["K"], ansvar: "Platschef", nar: "Vid leverans" },
          { id: "4.10", text: "Fakturor matchas mot order på pris × antal × summa – inte bara ordernr", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "4.11", text: "Förankring M16 A4-70 för MV-skid/PCS ingår INTE i PE-leveransen – beställ själv", badges: ["L"], ansvar: "PL", nar: "Före lyft" },
          { id: "4.12", text: "Harju: kWh-mätare (DSO) och SIM-kort (kund) ingår inte; site-driftsättning KA1 offereras separat", badges: ["L"], ansvar: "PL", nar: "Vid beställning" },
          { id: "4.13", text: "FAT KA1 i Västerås (3–4 AD) – ritningsunderlag ska vara godkänt innan", badges: ["HP"], ansvar: "PL", nar: "Före FAT" },
          { id: "4.14", text: "Kranfirma: lyftok c/c 2 500–2 700 mm, schacklar 6,5 t + 13,5 t; räkna MV-skid som 13 t", badges: ["L"], ansvar: "PL", nar: "Vid bokning" },
          { id: "4.15", text: "Hitta CATL-shims vid mottagning (ligger vid vattenrörens skydd i elrummet)", badges: [], ansvar: "Platschef", nar: "Vid leverans" },
        ],
      },
    ],
  },
  {
    nr: 5,
    titel: "Etablering & arbetsmiljö (BAS-U)",
    kort: "Etablering & BAS-U",
    syfte: "Säker arbetsplats från dag 1 – inga sanktioner, inga viten.",
    grind: { kod: "G5", text: "Etablering klar, AMP kvitterad av alla" },
    milstolpe: null,
    mall: { fran: 0.22, till: 0.3 },
    sektioner: [
      {
        namn: "Före första spadtaget",
        punkter: [
          { id: "5.1", text: "AMP upprättad, anslagen och kvitterad av alla UE och arbetstagare", badges: ["K"], ansvar: "BAS-U", nar: "Före start" },
          { id: "5.2", text: "Risk-P klar; arbetsberedningar för schakt > 1,5 m, lyft, arbete nära väg, högspänning", badges: ["K"], ansvar: "BAS-U / UE", nar: "Före moment" },
          { id: "5.3", text: "ID06 + elektronisk personalliggare i drift", badges: ["K"], ansvar: "BAS-U", nar: "Dag 1" },
          { id: "5.4", text: "Etableringsplan: bodar, UC, belysning, stängsel, skyltning, uppställningsytor", badges: [], ansvar: "Platschef", nar: "Dag 1" },
          { id: "5.5", text: "Startmöte med UE, beställare, BAS-U – dagordning inkl. arbetsmiljö och miljö", badges: [], ansvar: "PL", nar: "Byggstart" },
          { id: "5.6", text: "Arbete nära trafikerad väg: barriär/TMA beslutad innan arbete (lärdom väg 50)", badges: ["HP", "L"], ansvar: "BAS-U / beställare", nar: "Före start" },
        ],
      },
      {
        namn: "Löpande",
        punkter: [
          { id: "5.7", text: "Skyddsrond dokumenterad (ENIA) – minst varannan vecka, minst 1 gång/mån", badges: ["K"], ansvar: "BAS-U", nar: "Varannan vecka" },
          { id: "5.8", text: "Tillbud/olyckor i ENIA inom 24 h; allvarliga till Arbetsmiljöverket", badges: ["K"], ansvar: "Platschef", nar: "≤ 24 h" },
          { id: "5.9", text: "Lyftplan per tungt lyft: signalman, avspärrning, bärighet, provlyft, besiktningsintyg, förarbevis", badges: ["HP", "K"], ansvar: "Kranförare / BAS-U", nar: "Före varje lyft" },
          { id: "5.10", text: "Heta arbeten: tillstånd, certifikat, brandvakt ≥ 1 h efter", badges: ["K"], ansvar: "Tillståndsansvarig", nar: "Per moment" },
          { id: "5.11", text: "Elsäkerhet: ESA, elsäkerhetsledare, arbets- och driftbevis, frånskiljning/LOTO", badges: ["K"], ansvar: "Elsäkerhetsledare", nar: "Alla elarbeten" },
          { id: "5.12", text: "HSEQ-avvikelse kan ge vite (t.ex. 10 000 kr/tillfälle)", badges: ["K"], ansvar: "PL", nar: "—" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "5.13", text: "KMA-avvikelse ej åtgärdad inom 3 AD → vite 10 000 kr/händelse (max 150 000 kr)", badges: ["K"], ansvar: "BAS-U", nar: "≤ 3 AD" },
          { id: "5.14", text: "Incident: omedelbar anmälan till beställaren; utredning + åtgärdsbevis inom 1 vecka på begäran", badges: ["K"], ansvar: "Platschef", nar: "≤ 1 v" },
          { id: "5.15", text: "Byggstängsel runt hela arbetsområdet från dag 1", badges: ["K"], ansvar: "Platschef", nar: "Dag 1" },
          { id: "5.16", text: "Beställarens Code of Conduct, alkohol- och drogpolicy kommunicerade till alla UE", badges: ["K"], ansvar: "PL", nar: "Byggstart" },
          { id: "5.17", text: "Kompetensregister med utgångsdatum: ESA (3 år), HLR (2 år), heta arbeten, förarbevis, OEM-utbildning", badges: ["L"], ansvar: "BAS-U", nar: "Byggstart" },
          { id: "5.18", text: "Formella, skriftliga utseenden av BAS-P och BAS-U med avgränsning", badges: ["K"], ansvar: "PL", nar: "Före start" },
        ],
      },
    ],
  },
  {
    nr: 6,
    titel: "Mark, geoteknik & massor",
    kort: "Mark & geoteknik",
    syfte: "Schaktbotten godkänd i tid. Varje avvikande ton dokumenterad.",
    grind: { kod: "G6", text: "Schaktbotten godkänd (milstolpe)" },
    milstolpe: null,
    mall: { fran: 0.28, till: 0.5 },
    sektioner: [
      {
        namn: "Utförande",
        punkter: [
          { id: "6.1", text: "Avbaning mulljord enligt geoteknik; kontrollera mäktighet mot PM löpande", badges: ["L"], ansvar: "UE mark", nar: "Schaktstart" },
          { id: "6.2", text: "Avvikelse mot geotekniskt PM = beställarens risk → UR + underrättelse direkt", badges: ["K", "L"], ansvar: "PL", nar: "Samma dag" },
          { id: "6.3", text: "Vågkvitton för ALLA bortforslade massor (matjord, MKM, deponi) sparas per UR", badges: ["L"], ansvar: "UE mark / PL", nar: "Löpande" },
          { id: "6.4", text: "Miljöprov: 1 samlingsprov per 500 ton; MRR ingår normalt i fast pris", badges: ["K"], ansvar: "UE mark", nar: "Löpande" },
          { id: "6.5", text: "Okänd förorening/dold konstruktion (t.ex. betongplatta) → stopp, anmälan, UR", badges: ["HP", "K", "L"], ansvar: "Platschef", nar: "Omedelbart" },
          { id: "6.6", text: "Befintliga ledningar (fjärrvärme, kablar): skyddsarbete ingår – omläggning = ÄTA", badges: ["L"], ansvar: "PL", nar: "Före schakt" },
          { id: "6.7", text: "Volymändring > 25 % → begär förhandling om nytt à-pris (kap. 6 § 6)", badges: ["K"], ansvar: "PL", nar: "Vid konstaterande" },
          { id: "6.8", text: "Dagvatten/dränering och ev. dagvattendamm enligt handling – dokumentera tillägg", badges: ["L"], ansvar: "UE mark", nar: "Löpande" },
        ],
      },
      {
        namn: "Hållpunkter",
        punkter: [
          { id: "6.9", text: "Schaktbotten besiktigad och godkänd (beställarens byggledare) – protokoll", badges: ["HP"], ansvar: "Platschef", nar: "Milstolpe" },
          { id: "6.10", text: "Kapillärbrytande lager/packning (≥ 98 %) verifierat innan fundament", badges: ["HP"], ansvar: "UE mark", nar: "Före gjutning" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "6.11", text: "Geotekniker besiktigar schaktbotten när provgropar bara nått 0,3–0,4 m (Växjö: flytbenägen silthaltig morän)", badges: ["HP", "L"], ansvar: "PL", nar: "Vid schaktbotten" },
          { id: "6.12", text: "Samlingsprov för massor till mottagning tas av certifierad miljöprovtagare", badges: ["K"], ansvar: "UE mark", nar: "Löpande" },
          { id: "6.13", text: "Höjdsättning av mark och fundament enligt beviljat bygglov", badges: ["K"], ansvar: "Platschef", nar: "Utsättning" },
        ],
      },
    ],
  },
  {
    nr: 7,
    titel: "Fundament & betong",
    kort: "Fundament & betong",
    syfte: "Rätt nivå och planhet första gången – betong går inte att ångra.",
    grind: { kod: "G7", text: "Fundament godkända = klart för leverans (M4)" },
    milstolpe: "M4",
    mall: { fran: 0.45, till: 0.68 },
    sektioner: [
      {
        namn: "Före gjutning",
        punkter: [
          { id: "7.1", text: "K-ritningar godkända av beställaren", badges: ["HP", "K"], ansvar: "PL", nar: "Före gjutning" },
          { id: "7.2", text: "Jordning/ingjutningsgods, rör och ursparingar kontrollerade (jordfel i betong kan stoppa driftsättning)", badges: ["HP", "L"], ansvar: "Elinstallatör", nar: "Före gjutning" },
          { id: "7.3", text: "Armeringskontroll – skriftligt godkännande", badges: ["HP", "K"], ansvar: "K-konstruktör / byggledare", nar: "Före gjutning" },
          { id: "7.4", text: "Dräneringsöppning under MV-skidens oljesystem (≥ 800 × 100 mm)", badges: ["L"], ansvar: "UE betong", nar: "Före gjutning" },
          { id: "7.5", text: "MV-skid + PCS på gemensam platta (sättningar knäcker AC-kragen)", badges: ["L"], ansvar: "K-konstruktör", nar: "Projektering" },
        ],
      },
      {
        namn: "Gjutning & kontroll",
        punkter: [
          { id: "7.6", text: "Grön betong enligt SS-EN 206 med EPD; ≥ 3 provkuber per fundament", badges: ["K"], ansvar: "UE betong", nar: "Vid gjutning" },
          { id: "7.7", text: "Toleranser BESS: nivå ≤ ±10 mm, planhet ≤ 4 mm/2 m, ≤ 5 mm mellan 6 stödpunkter", badges: ["HP"], ansvar: "Platschef", nar: "Efter gjutning" },
          { id: "7.8", text: "Oljegrop/oljetråg tät, dimensionerad för olja + regn, med släckskikt", badges: ["HP"], ansvar: "UE betong", nar: "Före leverans" },
          { id: "7.9", text: "Härdningstid inlagd i tidplanen – kritisk linje, särskilt vinter", badges: ["L"], ansvar: "PL", nar: "Planering" },
          { id: "7.10", text: "Syn/besiktning av stationshus- och BESS-fundament – protokoll", badges: ["HP"], ansvar: "Beställare / PL", nar: "Milstolpe" },
          { id: "7.11", text: "Egenkontroller kompletta, daterade, signerade → avisering M4", badges: ["K", "L"], ansvar: "PL", nar: "Före M4" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "7.12", text: "Temperaturmätning under härdning (SS-EN 206)", badges: ["K"], ansvar: "UE betong", nar: "Vid gjutning" },
          { id: "7.13", text: "CATL-stödpunkter: ≥ 6 st, Ø ≥ 500 mm, maxhöjd 200 mm, ≥ 80 mm luftspalt under", badges: ["HP"], ansvar: "K-konstruktör", nar: "Projektering" },
          { id: "7.14", text: "MV-skid + PCS: platta ≥ 9 700 × 6 020 mm i marknivå, lutning ≤ 0,25 %, ≥ 25 N/mm², packning ≥ 98 %", badges: ["K"], ansvar: "K-konstruktör", nar: "Projektering" },
          { id: "7.15", text: "Plintgrundläggning INTE tillåten när PCS dockas mot MV-skid", badges: ["L"], ansvar: "K-konstruktör", nar: "Projektering" },
          { id: "7.16", text: "Ursparingar/kabelrännor i betong ±20 mm", badges: ["HP"], ansvar: "UE betong", nar: "Före gjutning" },
        ],
      },
    ],
  },
  {
    nr: 8,
    titel: "Jordning",
    kort: "Jordning",
    syfte: "Godkänt jordtag före montage – fel här blockerar driftsättning och betalning.",
    grind: { kod: "G8", text: "Jordtagsmätning godkänd" },
    milstolpe: null,
    mall: { fran: 0.48, till: 0.7 },
    sektioner: [
      {
        namn: "",
        punkter: [
          { id: "8.1", text: "Beställarens godkännande av jordningsplan innan arbete", badges: ["HP"], ansvar: "PL", nar: "Före start" },
          { id: "8.2", text: "Ringjord 95 mm² Cu runt MV-utrustning; grenar 35 mm² till containrar och stängsel", badges: [], ansvar: "Elinstallatör", nar: "Med schakt" },
          { id: "8.3", text: "Stängsel jordat var 25:e m och i alla hörn", badges: [], ansvar: "Elinstallatör", nar: "Med stängsel" },
          { id: "8.4", text: "Jordtagsmätning yt/djup: < 50 Ω yt, < 100 Ω djup (eller kontraktets värde) – protokoll", badges: ["HP", "K"], ansvar: "Elinstallatör", nar: "Före montage" },
          { id: "8.5", text: "Kontinuitet < 0,1 Ω mot container/skid; CATL: M12, 50 Nm, ≥ 150 mm² Cu", badges: ["HP"], ansvar: "Elinstallatör", nar: "Vid anslutning" },
          { id: "8.6", text: "GPS-koordinater, foton och mätvärden tas vid installation – kan inte rekonstrueras", badges: ["L"], ansvar: "Elinstallatör", nar: "Löpande" },
          { id: "8.7", text: "Datum och utförare för mätning korrekt i dagbok (avvikelser skapar tvist)", badges: ["L"], ansvar: "Platschef", nar: "Löpande" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "8.8", text: "Jordtagsmätning med bryggmetod: hjälpjord och sond ≥ 80 m ut, 100 gon isär", badges: ["K"], ansvar: "Elinstallatör", nar: "Vid mätning" },
          { id: "8.9", text: "MV-skid jordas via M8 på jordplattan i LV-skåpet; PCS endast via BE13-plattan – aldrig chassiskruv. PE ansluts först, kopplas bort sist", badges: ["K"], ansvar: "Elinstallatör", nar: "Vid anslutning" },
        ],
      },
    ],
  },
  {
    nr: 9,
    titel: "Kabel & kanalisation",
    kort: "Kabel & kanalisation",
    syfte: "Kabeltester godkända och skickade till beställaren = M3.",
    grind: { kod: "G9", text: "Kabeltestprotokoll signerade och skickade (M3)" },
    milstolpe: "M3",
    mall: { fran: 0.5, till: 0.75 },
    sektioner: [
      {
        namn: "",
        punkter: [
          { id: "9.1", text: "Kabelgravar: sandbädd, varningsband, skyddstäckning, rör – foto före återfyllning", badges: [], ansvar: "UE mark / elinstallatör", nar: "Löpande" },
          { id: "9.2", text: "Kabel mottagen mot kabellista (area, spänningsklass, längd) innan förläggning", badges: ["HP", "L"], ansvar: "Elinstallatör", nar: "Före förläggning" },
          { id: "9.3", text: "Böjradier respekterade; kabel märkt i båda ändar", badges: [], ansvar: "Elinstallatör", nar: "Förläggning" },
          { id: "9.4", text: "MV: manteltest, isolationsprov (megger), VLF, faskontroll, kontinuitet", badges: ["HP", "K"], ansvar: "Elinstallatör", nar: "Efter förläggning" },
          { id: "9.5", text: "Fiber: OTDR (bidirektionell)", badges: ["K"], ansvar: "Elinstallatör", nar: "Efter förläggning" },
          { id: "9.6", text: "Signerade kabeltestprotokoll skickas DIREKT till beställaren – vänta inte till slutbesiktning", badges: ["K", "L"], ansvar: "PL", nar: "Samma vecka" },
          { id: "9.7", text: "Relationsdata (sträckning, djup, skarvar, GPS) samlas vid förläggning", badges: ["L"], ansvar: "Elinstallatör", nar: "Löpande" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "9.8", text: "24-timmars spänningsprov med U0 på MV-kabel (Växjö SoW)", badges: ["K"], ansvar: "Elinstallatör", nar: "Före spänning" },
          { id: "9.9", text: "Foto av kabelgrav med GPS före återfyllning", badges: ["K"], ansvar: "Elinstallatör", nar: "Före återfyllning" },
          { id: "9.10", text: "PD-mätning på skarvar och avslut 24–36 kV; skärmkontroll inom 0,3–0,9", badges: ["L"], ansvar: "Elinstallatör", nar: "Före spänning" },
          { id: "9.11", text: "Kabelände som inte skarvas samma dag förses med ändtätning", badges: ["L"], ansvar: "Elinstallatör", nar: "Dagligen" },
          { id: "9.12", text: "Skyddsrör under container: innerdiameter ≥ 1,5 × kabelns ytterdiameter", badges: ["K"], ansvar: "Elinstallatör", nar: "Förläggning" },
          { id: "9.13", text: "Inkommande nätkabel alltid i Line 1 (vänster om skyddscellen) i RMU", badges: ["K"], ansvar: "Elinstallatör", nar: "Montage" },
        ],
      },
    ],
  },
  {
    nr: 10,
    titel: "Stationshus & MV-ställverk",
    kort: "Stationshus & MV",
    syfte: "Ställverket provat och klart för spänningssättning utan överraskningar.",
    grind: { kod: "G10", text: "SAT ställverk godkänd, klart för spänningssättning" },
    milstolpe: null,
    mall: { fran: 0.85, till: 1.45 },
    sektioner: [
      {
        namn: "Leverans & montage",
        punkter: [
          { id: "10.1", text: "FAT-protokoll med reläinställningar begärt från leverantören (Harju/VEO/Aktif)", badges: ["L"], ansvar: "PL", nar: "Före leverans" },
          { id: "10.2", text: "Mottagningskontroll: transportskador, tillbehör, verktygssats", badges: [], ansvar: "Platschef", nar: "Vid leverans" },
          { id: "10.3", text: "Stationshus besiktigat efter leverans – störningar dokumenterade (vem orsakar/bär kostnad)", badges: ["L"], ansvar: "PL", nar: "Efter leverans" },
          { id: "10.4", text: "Fack sammandockade, samlingsskena och jordskena skarvade, tryckavlastning monterad", badges: [], ansvar: "Leverantör / elinstallatör", nar: "Montage" },
          { id: "10.5", text: "Genomföringar tätade för EI60 / kapslingsklass", badges: [], ansvar: "Elinstallatör", nar: "Montage" },
        ],
      },
      {
        namn: "Kabelavslutningar & skydd",
        punkter: [
          { id: "10.6", text: "Kabeldon rätt för area/ledarmaterial", badges: [], ansvar: "Elinstallatör", nar: "Montage" },
          { id: "10.7", text: "Skärmåterföring genom nollföljds-CT innan jordplint – annars falska/missade jordfel", badges: ["HP", "L"], ansvar: "Elinstallatör", nar: "Montage" },
          { id: "10.8", text: "CT-omsättning och sekundärsteg samma på alla faser; reläparametrar enligt selektivplan", badges: ["HP", "L"], ansvar: "Reläprovare", nar: "Före provning" },
          { id: "10.9", text: "Sekundärprovning reläskydd (riktat jordfel kräver U0 + I0), trippprov, ljusbågsvakt", badges: ["HP"], ansvar: "Reläprovare", nar: "Före spänningssättning" },
          { id: "10.10", text: "RTU/SCADA: indikeringar, manövrar, larm verifierade", badges: [], ansvar: "Leverantör", nar: "Före spänningssättning" },
          { id: "10.11", text: "Provresurser (Omicron/Megger) bokade i god tid", badges: ["L"], ansvar: "PL", nar: "≥ 6 v före provning" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "10.12", text: "Verktygssats (handtag jordkopplare/brytare, servicevagn) kvitterad och vägghängd", badges: [], ansvar: "Platschef", nar: "Mottagning" },
          { id: "10.13", text: "Fack H3: jordkopplaren kräver spänningssatt förreglingsmagnet (110 VDC) – forcera aldrig", badges: ["L"], ansvar: "Elinstallatör", nar: "Drift/provning" },
          { id: "10.14", text: "Ljusbågsskydd testat (trippreläer ~7 ms) inkl. utlösning av effektbrytare", badges: ["HP"], ansvar: "Reläprovare", nar: "SAT" },
          { id: "10.15", text: "LS1 110 VDC: laddning och batteritest verifierat innan ställverket spänningssätts", badges: ["HP"], ansvar: "Elinstallatör", nar: "Före spänning" },
        ],
      },
    ],
  },
  {
    nr: 11,
    titel: "Leverans, lyft & montage BESS / MV-skid",
    kort: "Leverans & lyft",
    syfte: "Lyft på avtalade dagar – fundament klara, kran och väg klara.",
    grind: { kod: "G11", text: "Samtliga enheter placerade, fastsatta och jordade" },
    milstolpe: null,
    mall: { fran: 1.0, till: 1.25 },
    sektioner: [
      {
        namn: "Förberedelse",
        punkter: [
          { id: "11.1", text: "Leveransdatum bekräftade skriftligt av OEM; följs upp veckovis", badges: [], ansvar: "PL", nar: "Löpande" },
          { id: "11.2", text: "Transportväg och TA-plan godkända; bärighet under tjällossning kontrollerad", badges: ["L"], ansvar: "PL", nar: "≥ 4 v före" },
          { id: "11.3", text: "Hårdgjord kranyta dimensionerad för verklig vikt (lärdom UR010 Alvesta)", badges: ["L"], ansvar: "PL / UE mark", nar: "≥ 2 v före" },
          { id: "11.4", text: "Lyftplan: BESS ≥ 45 t kran, vinkel ≥ 60°, linor > 6,3 m; MV-skid ≥ 40 t, lyftok, kätting A kortare", badges: ["HP"], ansvar: "Kranförare", nar: "Före lyft" },
          { id: "11.5", text: "Hjälpkraft (3AC 400 V, ~37 kW/container) klar vid ankomst – annars risk för CATL-garanti", badges: ["HP", "L"], ansvar: "Elinstallatör", nar: "Före leverans" },
        ],
      },
      {
        namn: "Lyftdag",
        punkter: [
          { id: "11.6", text: "Avspärrning, ingen under hängande last, lyft bara i lugnt väder", badges: ["K"], ansvar: "BAS-U", nar: "Lyftdag" },
          { id: "11.7", text: "Mottagningsprotokoll med foto per enhet", badges: [], ansvar: "Platschef", nar: "Lyftdag" },
          { id: "11.8", text: "CATL: placering på 6 punkter, svetsning i 4 hörnbeslag. PE-skid: endast bult M16 A4-70 – ALDRIG svets", badges: ["HP"], ansvar: "Montör", nar: "Lyftdag" },
          { id: "11.9", text: "Lyftdon kvar tills enheten är inriktad och förankrad", badges: [], ansvar: "Kranförare", nar: "Lyftdag" },
          { id: "11.10", text: "Avvikelse från avtalat leveransfönster → skriftligt varsel direkt (extra krandagar = ÄTA)", badges: ["K", "L"], ansvar: "PL", nar: "Samma dag" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "11.11", text: "CATL-lyft: acceleration ≤ 0,5 g, lutning < 5°; vikt ~43,8 t", badges: ["HP"], ansvar: "Kranförare", nar: "Lyftdag" },
          { id: "11.12", text: "Batterier levereras vid ~30 % SOC; lagring −35 … +60 °C", badges: ["L"], ansvar: "PL", nar: "Före leverans" },
          { id: "11.13", text: "Shims justerade så att alla dörrar öppnar/stänger fritt", badges: ["K"], ansvar: "Montör", nar: "Efter placering" },
          { id: "11.14", text: "Svetsfogar CATL korrosionsskyddas direkt", badges: ["K"], ansvar: "Montör", nar: "Lyftdag" },
          { id: "11.15", text: "PCS (~5,5 t) dockas mot MV-skid med centreringsverktyg medan den hänger i kranen", badges: ["HP"], ansvar: "Montör", nar: "Lyftdag" },
        ],
      },
    ],
  },
  {
    nr: 12,
    titel: "Anslutning BESS / PCS / hjälpsystem",
    kort: "Anslutning BESS/PCS",
    syfte: "Rätt moment, rätt ordning, rätt dokumenterat – klart för cold commissioning.",
    grind: { kod: "G12", text: "Cold commissioning-checklista inlämnad" },
    milstolpe: null,
    mall: { fran: 1.1, till: 1.55 },
    sektioner: [
      {
        namn: "",
        punkter: [
          { id: "12.1", text: "PCS: DC-säkringar monterade INNAN DC-kablar ansluts (garanti)", badges: ["HP", "L"], ansvar: "Montör", nar: "Montage" },
          { id: "12.2", text: "DC: dubbelhåls kabelskor (c/c 45 mm), M12 50 Nm, balans mellan block ≤ ±20 %", badges: ["HP"], ansvar: "Montör", nar: "Montage" },
          { id: "12.3", text: "AC-krage PCS–skid: etanol, kontaktpasta, M12 A2-70, packning tät", badges: [], ansvar: "Montör", nar: "Montage" },
          { id: "12.4", text: "Aerosolkablage (brandsläckning) FRÅNKOPPLAT till sista steget i hot commissioning", badges: ["HP", "L"], ansvar: "Elinstallatör", nar: "Hela montaget" },
          { id: "12.5", text: "Kommunikation: fiber/Ethernet/CAN; CAN-bridge vid > 30 m; terminering 60 Ω uppmätt", badges: ["L"], ansvar: "Elinstallatör", nar: "Montage" },
          { id: "12.6", text: "Brandlarm/FSS: gränsdragning OEM vs entreprenör skriftlig; certifiering för panel (t.ex. INIM) säkrad", badges: ["L"], ansvar: "PL", nar: "Tidigt" },
          { id: "12.7", text: "LV: PEN-delningspunkt dokumenterad per kabelskåp (TN-C → TN-S)", badges: ["L"], ansvar: "Elinstallatör", nar: "Montage" },
          { id: "12.8", text: "Brandtätning av alla kabelgenomföringar (brandkitt) – egenkontroll med foto", badges: ["K"], ansvar: "Elinstallatör", nar: "Montage" },
          { id: "12.9", text: "VCI-rostskyddsskum borttaget ur skåp", badges: ["L"], ansvar: "Montör", nar: "Före spänning" },
          { id: "12.10", text: "Momentprotokoll med kalibrerad nyckel", badges: ["K"], ansvar: "Montör", nar: "Montage" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "12.11", text: "CATL: 2 skyddsplåtar i busbar-utrymmet demonteras före kabeldragning, återmonteras 10 Nm (kondens)", badges: ["HP"], ansvar: "Montör", nar: "Montage" },
          { id: "12.12", text: "Moment: CATL-busbar 50 Nm, AC-krage 60 Nm; märk förband med färgpenna efter kalibrerad nyckel", badges: ["K"], ansvar: "Montör", nar: "Montage" },
          { id: "12.13", text: "VCI-rostskyddsskum sitter kvar under byggtiden – tas bort först vid idrifttagning", badges: ["L"], ansvar: "Montör", nar: "Idrifttagning" },
          { id: "12.14", text: "Torrrör DN50 PN16 anslutet till containerflänsen, RAL 3000", badges: ["K"], ansvar: "Rörentreprenör", nar: "Montage" },
          { id: "12.15", text: "Oljetråg: regnvattenventil ÖPPEN, avtappningsventil stängd och tejpad", badges: ["K"], ansvar: "Montör", nar: "Före spänning" },
          { id: "12.16", text: "LSP-kabelfärger enligt bygghandling (manöver DC+ mörkblå/DC− vit, yttre manöver orange)", badges: ["K"], ansvar: "Elinstallatör", nar: "Montage" },
        ],
      },
    ],
  },
  {
    nr: 13,
    titel: "Idrifttagning & spänningssättning",
    kort: "Idrifttagning",
    syfte: "M5 kräver verifiering från BESS-leverantören – planera deras närvaro.",
    grind: { kod: "G13", text: "BESS commissioned, verifierat av OEM (M5)" },
    milstolpe: "M5",
    mall: { fran: 1.45, till: 1.9 },
    sektioner: [
      {
        namn: "Förutsättningar",
        punkter: [
          { id: "13.1", text: "Test- och kontrollplan (\"Check before commissioning\") till beställaren", badges: ["K"], ansvar: "PL", nar: "≥ 2 mån före" },
          { id: "13.2", text: "SITP (Site Inspection & Test Plan) levererad", badges: ["K"], ansvar: "PL", nar: "Enligt kontrakt" },
          { id: "13.3", text: "Personal: OEM-utbildning (CATL Qualified Person), läkarintyg, PPE kat 2/ljusbåge kat 3", badges: ["K"], ansvar: "PL", nar: "Före start" },
          { id: "13.4", text: "Elanläggningsansvar och eldriftledare avtalade skriftligt", badges: ["HP", "K"], ansvar: "PL / beställare", nar: "Före spänning" },
          { id: "13.5", text: "Spänningssättningstillstånd från EAA och nätägare; nätägarens kontaktperson bokad", badges: ["HP"], ansvar: "PL", nar: "≥ 4 v före" },
        ],
      },
      {
        namn: "Cold commissioning",
        punkter: [
          { id: "13.6", text: "Isolationsmätning (2500 V) HV DC/AC, CAN-resistans, LOTO-status, aerosol frånkopplad", badges: ["HP"], ansvar: "Elinstallatör / OEM", nar: "Cold" },
          { id: "13.7", text: "Cold commissioning-checklista inlämnad i tid (Batch C: 2026-11-09)", badges: ["K"], ansvar: "PL", nar: "Före start" },
        ],
      },
      {
        namn: "Hot commissioning & SAT",
        punkter: [
          { id: "13.8", text: "Hjälpkraft stabil, BMS-boot, PCS/EMS-kommunikation, nödstopp (1 s/2 s)", badges: ["HP"], ansvar: "OEM / elinstallatör", nar: "Hot" },
          { id: "13.9", text: "SAT separat för BoP, BESS, station, SCADA, EMS, brandlarm", badges: ["K"], ansvar: "PL", nar: "Hot" },
          { id: "13.10", text: "Aerosolkablage återansluten sist – protokollfört", badges: ["HP"], ansvar: "Elinstallatör", nar: "Sist" },
          { id: "13.11", text: "Egen avgränsningsklausul: intyga bara egna anslutningar – inte OEM-utrustning", badges: ["L"], ansvar: "PL", nar: "Vid intyg" },
          { id: "13.12", text: "Spänningssättning = beställaren tar i bruk → risk övergår för den delen (kap. 5 § 1) – kräv protokoll", badges: ["K"], ansvar: "PL", nar: "Vid spänning" },
          { id: "13.13", text: "CATL/OEM-verifiering skriftlig → avisering M5", badges: ["K", "L"], ansvar: "PL", nar: "Direkt" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "13.14", text: "Cold commissioning startar först när ≥ 50 % av installationen och hjälpkraften är klar", badges: ["HP"], ansvar: "PL", nar: "Före cold" },
          { id: "13.15", text: "Mätutrustning på plats: 1500 VDC multimeter, megger 2500 V, DC-tång 600 A, CAN-interface, täthetsprovare", badges: ["K"], ansvar: "Elinstallatör", nar: "Före cold" },
          { id: "13.16", text: "MSD (manual service disconnect) installeras som sista moment", badges: ["HP"], ansvar: "OEM / montör", nar: "Hot" },
          { id: "13.17", text: "Ansvarsgräns: CATL = BMS/firmware/batterifel; entreprenör/kund = PCS/EMS, station, nät, FSS", badges: ["K"], ansvar: "PL", nar: "Före start" },
          { id: "13.18", text: "FSS-test: H2 10 % LEL startar fläkt; aerosol 30 s fördröjning (avbrytbar)", badges: ["K"], ansvar: "OEM / elinstallatör", nar: "Hot" },
          { id: "13.19", text: "Energisation Certificate utfärdas efter godkänd cold commissioning", badges: ["K"], ansvar: "PL", nar: "Efter cold" },
          { id: "13.20", text: "SAT nätfunktioner: Q/V, P-Q, FCR/FFR, peak shaving, SoC-styrning", badges: ["K"], ansvar: "PL / OEM", nar: "Hot" },
          { id: "13.21", text: "Elanläggningsansvar till ONE Nordic: kopplingsansvar dygnet runt (Alvesta 3 000 kr/mån) – bemanna", badges: ["HP", "L"], ansvar: "PL", nar: "Före spänning" },
          { id: "13.22", text: "Under provning: inga andra arbetsbevis utlämnade; permanent märkning monterad före spänning", badges: ["K"], ansvar: "Eldriftledare", nar: "Provning" },
        ],
      },
    ],
  },
  {
    nr: 14,
    titel: "Besiktning & överlämning",
    kort: "Besiktning & överlämning",
    syfte: "Godkänd slutbesiktning = M6. Anmärkningar stängda = M7.",
    grind: { kod: "G14", text: "Slutbesiktning godkänd, anläggning övertagen" },
    milstolpe: "M6",
    mall: { fran: 1.85, till: 2.0 },
    sektioner: [
      {
        namn: "",
        punkter: [
          { id: "14.1", text: "Förbesiktning av delar (kap. 7) – använd för att ta ner anmärkningar tidigt", badges: [], ansvar: "PL", nar: "Före slut" },
          { id: "14.2", text: "Egen förbesiktning/punch walk med UE innan besiktningsman kommer", badges: [], ansvar: "PL / platschef", nar: "2–3 v före" },
          { id: "14.3", text: "Slutdokumentation komplett till beställaren", badges: ["HP", "K"], ansvar: "PL", nar: "≥ 2 v före slutbesiktning" },
          { id: "14.4", text: "Skriftlig anmälan om slutbesiktningsberedskap", badges: ["K"], ansvar: "PL", nar: "Enligt kontrakt" },
          { id: "14.5", text: "Slutbesiktning (opartisk besiktningsman) – protokoll mottaget", badges: ["K"], ansvar: "Beställare", nar: "Slutdatum" },
          { id: "14.6", text: "Anmärkningar åtgärdade inom 2 v – annars vite (t.ex. 0,2 %/v)", badges: ["K"], ansvar: "PL", nar: "≤ 2 v" },
          { id: "14.7", text: "Efterbesiktning skriftligt bekräftad → M7", badges: ["K"], ansvar: "PL", nar: "Efter åtgärd" },
          { id: "14.8", text: "Särskild besiktning inom 6 mån för delar som inte kunde besiktigas (snö/is)", badges: ["K"], ansvar: "PL", nar: "≤ 6 mån" },
          { id: "14.9", text: "Återställd mark utanför site – kvittens från fastighetsägare", badges: ["K"], ansvar: "PL", nar: "Före slut" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "14.10", text: "Beställaren kan anmäla fel upp till 1 månad efter upptäckt – åtgärd inom 2 veckor", badges: ["K"], ansvar: "PL", nar: "Garantitid" },
          { id: "14.11", text: "Skriftlig underrättelse om driftfärdig anläggning med kopplingsläge före slutbesiktning", badges: ["K"], ansvar: "PL", nar: "Före SB" },
        ],
      },
    ],
  },
  {
    nr: 15,
    titel: "Slutdokumentation, ekonomi & garanti",
    kort: "Slutdok & garanti",
    syfte: "Slutbetalning utan tvist, garantitid under kontroll.",
    grind: { kod: "G15", text: "Slutreglering klar, projekt stängt, lärdomar dokumenterade" },
    milstolpe: null,
    mall: { fran: 1.8, till: 3.0 },
    sektioner: [
      {
        namn: "Slutdokumentation (enligt kontraktets lista, t.ex. App. 03.7)",
        punkter: [
          { id: "15.1", text: "Relationsritningar (.dwg + PDF): situationsplan, SLD, kretsscheman, kabelförläggning", badges: ["K"], ansvar: "Projektör", nar: "≥ 2 v före SB" },
          { id: "15.2", text: "Provprotokoll: FAT, SAT, megger, mantel, VLF, OTDR, jordtag, betongkuber, moment", badges: ["K"], ansvar: "PL", nar: "≥ 2 v före SB" },
          { id: "15.3", text: "Reläinställningar, selektivplan, signal-/manöverlistor", badges: ["K"], ansvar: "PL", nar: "≥ 2 v före SB" },
          { id: "15.4", text: "DoU-instruktioner (sv/en), CE-intyg, kemikalieförteckning, EPD, egenkontroller", badges: ["K"], ansvar: "PL", nar: "≥ 2 v före SB" },
          { id: "15.5", text: "Verifiering från OEM (CATL) klar i tid för M5", badges: ["L"], ansvar: "PL", nar: "Före M5" },
        ],
      },
      {
        namn: "Ekonomi",
        punkter: [
          { id: "15.6", text: "Alla ÄTA/UR godkända och fakturerade före slutreglering", badges: ["L"], ansvar: "PL", nar: "Löpande" },
          { id: "15.7", text: "Sluträkning inom avtalad frist (Batch C: 14 dagar efter avhjälpta anmärkningar)", badges: ["K"], ansvar: "PL", nar: "Enligt kontrakt" },
          { id: "15.8", text: "Krav som inte tas med i sluträkningen går förlorade", badges: ["K"], ansvar: "PL", nar: "—" },
          { id: "15.9", text: "Innehållna medel (t.ex. 3 %) frigjorda; säkerhet nedtrappad till garantinivå", badges: [], ansvar: "Ekonomi", nar: "Efter M7" },
          { id: "15.10", text: "Volymrabatt/flerprojektsrabatt hanterad enligt kontrakt vid slutbetalning", badges: ["K"], ansvar: "PL", nar: "Slutbetalning" },
          { id: "15.11", text: "Slut-EAC mot kalkyl; UE-slutfakturor och hyror stängda", badges: [], ansvar: "PL", nar: "Avslut" },
        ],
      },
      {
        namn: "Garanti & avslut",
        punkter: [
          { id: "15.12", text: "Garantitid: 5 år arbete / 2 år material – bevakning i kalender", badges: ["K"], ansvar: "PL", nar: "Från övertagande" },
          { id: "15.13", text: "Garantibesiktning bokad före garantitidens slut", badges: ["K"], ansvar: "PL", nar: "Garantislut" },
          { id: "15.14", text: "Kick-out: projekttriangel utvärderad, lärdomar in i nästa anbud", badges: [], ansvar: "PL", nar: "Avslut" },
        ],
      },
      {
        namn: "Från källgenomgången",
        punkter: [
          { id: "15.15", text: "RTU- och HMI-projektfiler överlämnas i redigerbart format", badges: ["K"], ansvar: "PL", nar: "Överlämning" },
          { id: "15.16", text: "Eldokumentation: 2 pappersexemplar + digitalt (Harju)", badges: ["K"], ansvar: "PL", nar: "Överlämning" },
          { id: "15.17", text: "Batterigaranti vid stillestånd > 90 dagar: SOC 30–60 %, cell aldrig < 3,21 V, full cykel var 12:e månad – in i DoU", badges: ["L"], ansvar: "PL", nar: "Överlämning" },
          { id: "15.18", text: "Farligt avfall (olja, batterier, kemikalier) e-rapporterat till Naturvårdsverket; transportdokument sparas ≥ 1 år", badges: ["K"], ansvar: "PL", nar: "Löpande" },
          { id: "15.19", text: "Underhållsintervall i DoU: ställverk inspektion vart 5:e år, jordtag vart 8:e år (ELSÄK-FS 2022:3)", badges: [], ansvar: "PL", nar: "Överlämning" },
        ],
      },
    ],
  },
];

/** Löpande genom hela projektet — ÄTA-disciplin, styrning och ekonomi varje vecka. */
export const LOPANDE: Lopande = {
  titel: "Löpande genom hela projektet",
  syfte: "ÄTA-disciplin, styrning och ekonomi – varje vecka, i varje fas.",
  sektioner: [
    {
      namn: "ÄTA / UR-disciplin (ABT 06)",
      punkter: [
        { id: "lop.1", text: "Ny omständighet → UR-nummer samma dag (kolla loggen – nummer kan vara upptagna)", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.2", text: "Underrättelse innan arbetet utförs; hinderanmälan inom 24 h (kontraktets yttersta frist, t.ex. 10 AD, gäller – annars preklusion)", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.3", text: "Grund i kontraktet: kap. 2 § 6 (ändrade förutsättningar), skyddsarbete ingår / omläggning = ÄTA", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.4", text: "Pris före start: à-pris (rätt bilaga mot beställaren) eller självkostnad + 10 % arvode", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.5", text: "Skriftlig ÄTA-order/godkännande innan arbete – muntligt på byggmöte räcker inte", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.6", text: "Underlag per UR: dagbok, timmar, foto före/under/efter, vågkvitton, UE-fakturor", badges: [], ansvar: "Platschef", nar: "Löpande" },
        { id: "lop.7", text: "Fakturera samma vecka som godkännande – håll ÄTA-pipeline låg", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.8", text: "UE-ÄTA (ABT-U 07) kopplas till rätt UR mot beställaren – samma frister back-to-back", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.9", text: "Tidsförlängning begärs löpande med orsakssamband – inte i slutet", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.10", text: "Skilj projekten åt: separata UR-loggar per projekt, aldrig korsreferera", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.22", text: "Paraplymodell: beställarens UR-nr som huvudnyckel, UE-krav länkade under (SUMIF)", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.23", text: "Rätt timpris (Bilaga 06.1): montör 945, PL/eldriftledare 1 245, provningsingenjör 1 540 kr/h; övertid +50/100/200 %", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.24", text: "Restid och traktamente debiteras; resekostnader + 10 %", badges: ["K"], ansvar: "PL", nar: "Löpande" },
      ],
    },
    {
      namn: "Styrning & dokumentation",
      punkter: [
        { id: "lop.11", text: "Byggmöte med protokoll (beslut, tider, UR-status) – signerat", badges: [], ansvar: "PL", nar: "Löpande" },
        { id: "lop.12", text: "Dagbok dagligen: defensiv, saklig, UR-referens på avvikelsedagar", badges: ["L"], ansvar: "Platschef", nar: "Löpande" },
        { id: "lop.13", text: "Veckovis: tidplan mot kritisk linje, leveransbevakning, inköpsmatris", badges: [], ansvar: "PL", nar: "Löpande" },
        { id: "lop.14", text: "Månadsrapport till beställaren: framdrift, foto, tidplan", badges: ["K"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.15", text: "Riskregister (5×5) uppdateras varje vecka – kritiska risker eskaleras", badges: [], ansvar: "PL", nar: "Löpande" },
        { id: "lop.16", text: "Alla beslut skriftligt – verbala överenskommelser gäller inte", badges: ["L"], ansvar: "PL", nar: "Löpande" },
      ],
    },
    {
      namn: "Ekonomi & likviditet",
      punkter: [
        { id: "lop.17", text: "Milstolpsavisering (Excel) → beställarens OK → faktura i IFS", badges: [], ansvar: "PL", nar: "Löpande" },
        { id: "lop.18", text: "EAC per delprojekt månadsvis; IFS-export som grund, inte bara orderbekräftelser", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.19", text: "Timmar mot kalkyl månadsvis; felkonterade fakturor ombokade direkt", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.20", text: "Hyror (bodar, maskiner) efter kontrakterad tid → ÄTA-underlag", badges: ["L"], ansvar: "PL", nar: "Löpande" },
        { id: "lop.21", text: "Planera kassaflödesglappet mellan M4 och M5", badges: ["L"], ansvar: "PL", nar: "Löpande" },
      ],
    },
  ],
};

/* ---------- Betalmilstolpar (Batch C) ----------
   Rutin: avisering (Excel) → beställarens OK → faktura i IFS. */

export const MILSTOLPAR: Milstolpe[] = [
  { kod: "M1", namn: "Kontrakt + säkerhet", utloses: "Signerat kontrakt, bankgaranti 10 %", andel: 10, grind: "G1" },
  { kod: "M2", namn: "Etablering & design", utloses: "Bygghandlingar godkända", andel: 25, grind: "G3" },
  { kod: "M3", namn: "Schakt, återfyllning, kabeltest", utloses: "Signerade kabeltestprotokoll skickade", andel: 25, grind: "G9" },
  { kod: "M4", namn: "Betongarbeten", utloses: "Alla fundament klara, egenkontroller signerade", andel: 20, grind: "G7" },
  { kod: "M5", namn: "Batteri idrifttaget", utloses: "Verifierat av BESS-leverantören", andel: 15, grind: "G13" },
  { kod: "M6", namn: "Slutbesiktning", utloses: "Godkänd SB + slutdokumentation", andel: 3, grind: "G14" },
  { kod: "M7", namn: "Anmärkningar åtgärdade", utloses: "Efterbesiktning godkänd", andel: 2, grind: "G14" },
];

/** M7 kommer efter slutbesiktningen: anmärkningar ska vara åtgärdade inom 2 veckor. */
export const M7_EFTER_SB_DAGAR = 14;

/* ---------- Ligg steget före — ledtider ----------
   Ledtidstabellen från sidan 2 plus de ledtider som står i faserna (kran,
   kranyta, provresurser, spänningssättningstillstånd, punch walk). */

export const LEDTIDER: Ledtid[] = [
  { id: "natanslutning", arende: "Nätanslutning / koncession", ledtid: "Månader – 3 år", dagar: null, riktning: "fore", ankare: null, agare: "Beställare", punkt: "2.2", not: "Kapacitetsutredning — bevaka, går inte att räkna fram" },
  { id: "bygglov", arende: "Bygglov → startbesked", ledtid: "≤ 10 v + laga kraft", dagar: 91, riktning: "fore", ankare: "byggstart", agare: "Beställare", punkt: "2.1", not: "Laga kraft räknat som 3 v överklagandetid — antagande" },
  { id: "forhandsanmalan", arende: "Förhandsanmälan till Arbetsmiljöverket", ledtid: "≥ 4 v före start", dagar: 28, riktning: "fore", ankare: "byggstart", agare: "Entreprenör", punkt: "2.4" },
  { id: "p28", arende: "§ 28-anmälan förorenad mark", ledtid: "6 v", dagar: 42, riktning: "fore", ankare: "schaktstart", agare: "Entreprenör", punkt: "2.8" },
  { id: "taplan", arende: "TA-plan och schakttillstånd", ledtid: "≥ 3 v före arbete", dagar: 21, riktning: "fore", ankare: "schaktstart", agare: "Entreprenör", punkt: "2.6" },
  { id: "ledningsvisning", arende: "Ledningsvisning (Ledningskollen)", ledtid: "1–2 v före schakt", dagar: 14, riktning: "fore", ankare: "schaktstart", agare: "Entreprenör", punkt: "2.5" },
  { id: "granskning", arende: "Granskning av bygghandling", ledtid: "15 AD + 15 AD svar", dagar: 42, riktning: "fore", ankare: "schaktstart", agare: "Båda", punkt: "3.10", not: "30 arbetsdagar ≈ 6 v — inget byggs på handling under granskning" },
  { id: "transportvag", arende: "Transportväg / TA-plan för BESS", ledtid: "≥ 4 v före leverans", dagar: 28, riktning: "fore", ankare: "bessLeverans", agare: "Entreprenör", punkt: "2.7" },
  { id: "kranBess", arende: "Kranbokning BESS (≥ 45 t)", ledtid: "≥ 4 v före lyft", dagar: 28, riktning: "fore", ankare: "bessLeverans", agare: "Entreprenör", punkt: "4.6" },
  { id: "kranMv", arende: "Kranbokning MV-skid (≥ 40 t)", ledtid: "≥ 4 v före lyft", dagar: 28, riktning: "fore", ankare: "mvLeverans", agare: "Entreprenör", punkt: "4.6" },
  { id: "kranyta", arende: "Hårdgjord kranyta för verklig vikt", ledtid: "≥ 2 v före leverans", dagar: 14, riktning: "fore", ankare: "bessLeverans", agare: "Entreprenör", punkt: "11.3" },
  { id: "provresurser", arende: "Provresurser (Omicron/Megger)", ledtid: "≥ 6 v före provning", dagar: 42, riktning: "fore", ankare: "satStallverk", agare: "Entreprenör", punkt: "10.11" },
  { id: "testplan", arende: "Test- och kontrollplan", ledtid: "≥ 2 mån före idrifttagning", dagar: 61, riktning: "fore", ankare: "idrifttagning", agare: "Entreprenör", punkt: "13.1" },
  { id: "spanning", arende: "Spänningssättningstillstånd (EAA + nätägare)", ledtid: "≥ 4 v före", dagar: 28, riktning: "fore", ankare: "idrifttagning", agare: "Entreprenör", punkt: "13.5" },
  { id: "punchwalk", arende: "Egen förbesiktning / punch walk", ledtid: "2–3 v före SB", dagar: 21, riktning: "fore", ankare: "slutbesiktning", agare: "Entreprenör", punkt: "14.2" },
  { id: "slutdok", arende: "Slutdokumentation till beställaren", ledtid: "≥ 2 v före slutbesiktning", dagar: 14, riktning: "fore", ankare: "slutbesiktning", agare: "Entreprenör", punkt: "14.3" },
  { id: "felavhjalpande", arende: "Felavhjälpande efter slutbesiktning", ledtid: "≤ 2 v", dagar: 14, riktning: "efter", ankare: "slutbesiktning", agare: "Entreprenör", punkt: "14.6" },
];

/** Hur ankarna beskrivs i gränssnittet. */
export const ANKARE_NAMN: Record<Ankare, string> = {
  byggstart: "byggstart",
  schaktstart: "schaktstart",
  bessLeverans: "BESS-leverans",
  mvLeverans: "MV-skid/station-leverans",
  satStallverk: "SAT ställverk",
  idrifttagning: "idrifttagning",
  slutbesiktning: "slutbesiktning",
};

/* ---------- Nyckelvärden — snabbreferens ----------
   Gränsvärden och frister ur kontrakt, leverantörsmanualer och EBR som
   oftast avgör om en hållpunkt passeras. Motsägande värden: ATT_VERIFIERA. */

export const NYCKELVARDEN: Nyckelvarde[] = [
  { omrade: "Jordtag", varden: ["Ytjord < 50 Ω", "djupjord < 100 Ω", "container–jordnät ≤ 0,1 Ω"] },
  { omrade: "CATL-fundament", varden: ["Nivå ±10 mm", "planhet ±4 mm/2 m", "6 stöd Ø ≥ 500 mm", "dimensionera 45 t"] },
  { omrade: "CATL-avstånd", varden: ["Sida–sida ≥ 3,0 m (rek. 3,5)", "bak ≥ 1,1 m", "≥ 50 m till bostäder"] },
  { omrade: "CATL-lyft", varden: ["~43,8 t", "kran ≥ 45 t", "linor > 6,3 m", "vinkel ≥ 60°", "lutning < 5°"] },
  { omrade: "CATL-anslutning", varden: ["DC M12 50 Nm dubbelhålssko c/c 45", "jord M12 50 Nm", "hjälpkraft 37 kW"] },
  { omrade: "CATL-kommunikation", varden: ["CAN-terminering 60 Ω", "CAN-bridge vid > 30 m", "nödstopp PCS 1 s / 0 A 2 s"] },
  { omrade: "MV-skid", varden: ["13 t", "kran ≥ 40 t", "platta 9 700 × 6 020 mm", "lutning ≤ 0,25 %", "dränering 800 × 100 mm"] },
  { omrade: "PCS", varden: ["DC-säkringar före kabel (40 Nm)", "max 2 kablar/terminal", "balans ≤ ±20 %"] },
  { omrade: "Betong", varden: ["Grön betong + EPD", "≥ 3 kuber/fundament", "≥ 25 N/mm²", "25 års livslängd"] },
  { omrade: "Stationshus", varden: ["Takhöjd ≥ 2 700 mm", "golv ±5 mm/m", "EI60 per rum"] },
  { omrade: "Kabel", varden: ["Mantel", "megger", "VLF", "24 h U0", "PD 24–36 kV", "skärmkontroll 0,3–0,9", "rör ≥ 1,5 × OD"] },
  { omrade: "Batteri i vila", varden: ["SOC 30–60 %", "cell ≥ 3,21 V", "full cykel var 12:e månad"] },
  { omrade: "Frister", varden: ["Granskning 15 + 15 AD", "hinder 24 h (max 10 AD)", "fel 2 v", "slutdok 2 v före SB", "sluträkning 14 d"] },
  { omrade: "Viten (Batch C)", varden: ["0,5 %/v", "1,25 %/v", "1,5 %/v", "0,2 %/v", "tak 12,5 %", "KMA 10 000 kr (max 150 000)"] },
];

/* ---------- Lärdomar från Batch C — de 10 som kostat mest ---------- */

export const LARDOMAR: Lardom[] = [
  { handelse: "Fel kabelspec", vadHande: "Fel area och spänningsklass på kritisk kabel; leverans till fel site.", gorSa: "Mottagningskontroll mot kabellista samma dag." },
  { handelse: "Kabel-CT för liten", vadHande: "Innerdiameter räckte inte för antal enledare – retur och nybeställning.", gorSa: "Verifiera CT-fönster mot kabelantal vid beställning." },
  { handelse: "Matjord > geoteknik", vadHande: "240 ton mer än kalkylerat (Alvesta).", gorSa: "Vågkvitton + UR direkt; mängdomprövning kap. 6 § 6." },
  { handelse: "Dolda hinder i mark", vadHande: "Betongplatta, MKM-massor, fjärrvärme i vägen.", gorSa: "Stopp, foto, underrättelse, UR samma dag." },
  { handelse: "Container tyngre än fundament", vadHande: "46 t mot 45 t dimensionerat; kranyta räckte inte (UR010).", gorSa: "Skriftlig vikt från OEM före K-handling och kranplan." },
  { handelse: "Väg utan barriär", vadHande: "Arbete 1,5–2 m från trafikerad väg.", gorSa: "Barriär/TMA beslutad före start; in i riskanalys." },
  { handelse: "TA-plan obesvarad", vadHande: "Kommunens förfrågan kvar inför containerlyft.", gorSa: "Skriftligt till beställaren – fastställ ansvar för försening." },
  { handelse: "Störningar stationshus", vadHande: "~21 elektrikertimmar i störningar utan anmälan.", gorSa: "Underrätta enligt kap. 2 § 7 innan fler timmar läggs." },
  { handelse: "Beställartillägg sent", vadHande: "Extra barriär, dokumentationskrav, kabelskåp.", gorSa: "Bedöm ÄTA direkt; skriftlig order före utförande." },
  { handelse: "Copy-paste mellan projekt", vadHande: "Slinga i stället för radiell i kabellista.", gorSa: "Egenkontroll av handling mot projektets SLD." },
];

/* ---------- Att verifiera — källorna säger olika ---------- */

export const ATT_VERIFIERA: { amne: string; text: string }[] = [
  { amne: "Hinderanmälan", text: "Egen rutin 24 h (ABT 06 kap. 2 § 7) mot kontraktets preklusionsfrist 10 AD (AF cl. 18.2). Tillämpa 24 h – fristen är ytterkanten." },
  { amne: "Milstolpedatum", text: "Batch C-AF (cl. 6.3) anger 2025, huvudkontrakt och tidplaner 2026. Få skriftlig bekräftelse – annars teoretisk vitesrisk." },
  { amne: "Alvesta kontraktssumma", text: "NotebookLM läser 6 614 187 kr i kontraktet, tidigare underlag anger 5 600 000 kr. Kontrollera mot signerat kontrakt." },
  { amne: "Alvesta storlek", text: "'General info' anger 12 MW / ca 1 000 m², kontraktet 8 MW / 16 MWh; miljörapport 3 batterirack mot 4 containrar i teknisk beskrivning." },
  { amne: "TA-plan", text: "Reservationsbilagan säger 'ingår ej' (eBoP generellt) och 'ingår' (Alvesta)." },
  { amne: "Betalplan", text: "M1–M7 enligt Batch C (10/25/25/20/15/3/2 %). Andra källor visar andra fördelningar – kontrollera alltid aktuellt kontrakt." },
  { amne: "CATL", text: "Fundamentlast 36 t eller 45 t, planhet ±4 mm/2 m eller ≤ 5 mm totalt, transport-SOC 30 % eller 23 %, moment XT0 1,5–1,8 eller 0,6–0,8 Nm, XT1 3,2–3,7 eller 6–8 Nm, kylvätska glykol eller 'etanol' (tryckfel). Dimensionera för strängaste värdet och få skriftligt svar från CATL." },
  { amne: "Containervikt", text: "CATL-manual ~43,8 t; Alvesta-dialog 46 t mot 45 t fundament." },
  { amne: "Power Electronics", text: "MV-skid 11,5 t eller 13 t (räkna 13 t); M12 50 Nm (CATL-busbar) eller 60 Nm (AC-krage)." },
  { amne: "Harju/Aktif", text: "Lokaltrafo 315 eller 630 kVA, 11 eller 12 kV, LSP IP31/IP21 och 800/400 A, fackbeteckningar H1/HA01/H01 – lås innan beställning." },
  { amne: "Volymrabatt", text: "Huvudavtal räknar av löpande, UE-avtal mot sista lyftet – ger kassaflödesförskjutning." },
  { amne: "Sluträkning", text: "Batch C 14 dagar efter avhjälpta anmärkningar; standard-ABT annan frist. Kontraktet gäller." },
];

/* ---------- Härledda uppslag ---------- */

/** Alla kontrollpunkter i ordning, med fasnummer (null för löpande). */
export const ALLA_PUNKTER: (Kontrollpunkt & { fas: number | null })[] = [
  ...FASER.flatMap((f) => f.sektioner.flatMap((s) => s.punkter.map((p) => ({ ...p, fas: f.nr })))),
  ...LOPANDE.sektioner.flatMap((s) => s.punkter.map((p) => ({ ...p, fas: null }))),
];

export const PUNKT_FOR_ID: Map<string, Kontrollpunkt & { fas: number | null }> = new Map(
  ALLA_PUNKTER.map((p) => [p.id, p])
);

export const SUMMERING = {
  faser: FASER.length,
  punkter: ALLA_PUNKTER.length,
  hallpunkter: ALLA_PUNKTER.filter((p) => p.badges.includes("HP")).length,
  milstolpar: MILSTOLPAR.length,
  motsagelser: ATT_VERIFIERA.length,
};
