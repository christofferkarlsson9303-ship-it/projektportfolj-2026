/* SEED — grunddata extraherad ur standalone-filen.
   Rör inte logiken: detta är ren data. */

export const SEED = {
  projekt: [
    { id:"36037", nr:"36037", namn:"Växjö Batteripark", ort:"Växjö", mw:16, mwh:36,
      kontraktsvarde:11446000, natagare:"Växjö Energi", natkontakt:"Tina Strömberg",
      fiber:"Vexnet", fardigstallande:"2026-12-02", status:"Produktion", anteckning:"" },
    { id:"36038", nr:"36038", namn:"Alvesta Batteripark", ort:"Alvesta", mw:8, mwh:16,
      kontraktsvarde:5600000, natagare:"Alvesta Energi AB", natkontakt:"Robin Carlsson",
      fiber:"Vexnet", fardigstallande:"2026-12-04", status:"Produktion", anteckning:"" },
    { id:"goteborg", nr:"", namn:"Göteborg Skogome", ort:"Göteborg", mw:null, mwh:null,
      kontraktsvarde:null, natagare:"", natkontakt:"",
      fiber:"", fardigstallande:"", status:"Planering",
      anteckning:"Ställverk: VEO (avviker från Harju på övriga siter)" },
    { id:"gotene", nr:"", namn:"Götene", ort:"Götene", mw:null, mwh:null,
      kontraktsvarde:null, natagare:"", natkontakt:"",
      fiber:"", fardigstallande:"", status:"Planering", anteckning:"" }
  ],

  betalplan: [
    { id:"b1", projektId:"36037", kod:"M1", andel:10, benamning:"Lyft 1", status:"fakturerad", datum:"" },
    { id:"b2", projektId:"36037", kod:"M2", andel:25, benamning:"Lyft 2", status:"fakturerad", datum:"" },
    { id:"b3", projektId:"36037", kod:"M3", andel:25, benamning:"Lyft 3", status:"fakturerad", datum:"" },
    { id:"b4", projektId:"36037", kod:"M4", andel:20, benamning:"Lyft 4", status:"fakturerad", datum:"" },
    { id:"b5", projektId:"36037", kod:"M5", andel:15, benamning:"Lyft 5 — mål v. 42", status:"pagaende", datum:"2026-10-16" },
    { id:"b6", projektId:"36037", kod:"M6", andel:3,  benamning:"Lyft 6 — avslut", status:"kvar", datum:"" },
    { id:"b7", projektId:"36037", kod:"M7", andel:2,  benamning:"Lyft 7 — slutavräkning", status:"kvar", datum:"" },
    { id:"b8", projektId:"36038", kod:"M1", andel:10, benamning:"Lyft 1", status:"fakturerad", datum:"" },
    { id:"b9", projektId:"36038", kod:"M2", andel:25, benamning:"Lyft 2", status:"fakturerad", datum:"" },
    { id:"b10",projektId:"36038", kod:"M3", andel:25, benamning:"Lyft 3", status:"fakturerad", datum:"" },
    { id:"b11",projektId:"36038", kod:"M4", andel:20, benamning:"Lyft 4", status:"fakturerad", datum:"" },
    { id:"b12",projektId:"36038", kod:"M5", andel:15, benamning:"Lyft 5 — mål v. 42", status:"pagaende", datum:"2026-10-16" },
    { id:"b13",projektId:"36038", kod:"M6", andel:3,  benamning:"Lyft 6 — avslut", status:"kvar", datum:"" },
    { id:"b14",projektId:"36038", kod:"M7", andel:2,  benamning:"Lyft 7 — slutavräkning", status:"kvar", datum:"" }
  ],

  milstolpar: [
    { id:"m1", projektId:"36037", titel:"BESS-batteri leverans", datum:"2026-10-12", status:"planerad" },
    { id:"m2", projektId:"36037", titel:"MV-station leverans",   datum:"2026-10-20", status:"planerad" },
    { id:"m3", projektId:"36037", titel:"Cold Comm. checklista", datum:"2026-11-09", status:"planerad" },
    { id:"m4", projektId:"36037", titel:"Cold Commissioning start", datum:"2026-11-11", status:"planerad" },
    { id:"m5", projektId:"36037", titel:"Färdigställandetid",    datum:"2026-12-02", status:"planerad" },
    { id:"m6", projektId:"36038", titel:"BESS-batteri leverans", datum:"2026-10-14", status:"planerad" },
    { id:"m7", projektId:"36038", titel:"MV-station leverans",   datum:"2026-10-20", status:"planerad" },
    { id:"m8", projektId:"36038", titel:"Cold Comm. checklista", datum:"2026-11-09", status:"planerad" },
    { id:"m9", projektId:"36038", titel:"Cold Commissioning start", datum:"2026-11-11", status:"planerad" },
    { id:"m10",projektId:"36038", titel:"Färdigställandetid",    datum:"2026-12-04", status:"planerad" }
  ],

  leveranser: [
    { id:"l1", projektId:"36037", benamning:"BESS-batteri", leverantor:"CATL", datum:"2026-10-12", status:"bekraftad" },
    { id:"l2", projektId:"36037", benamning:"MV-station", leverantor:"—", datum:"2026-10-20", status:"bekraftad" },
    { id:"l3", projektId:"36037", benamning:"Kabelströmstransformatorer (omleverans)", leverantor:"Harju Elekter", datum:"", status:"avvikelse" },
    { id:"l4", projektId:"36038", benamning:"BESS-batteri", leverantor:"CATL", datum:"2026-10-14", status:"bekraftad" },
    { id:"l5", projektId:"36038", benamning:"MV-ställverk / MV-station", leverantor:"Harju Elekter", datum:"2026-10-20", status:"bekraftad" },
    { id:"l6", projektId:"36038", benamning:"Kabelströmstransformatorer (omleverans)", leverantor:"Harju Elekter", datum:"", status:"avvikelse" }
  ],

  ur: [
    { id:"u1", projektId:"36037", nr:"UR001", benamning:"Projektering", status:"pagaende" },
    { id:"u2", projektId:"36037", nr:"UR002", benamning:"KM / bortforsling vegetationsmassor", status:"pagaende" },
    { id:"u3", projektId:"36037", nr:"UR003", benamning:"Höjning terrass", status:"pagaende" },
    { id:"u4", projektId:"36037", nr:"UR004", benamning:"Nivåsensor oljetråg", status:"pagaende" },
    { id:"u5", projektId:"36037", nr:"UR005", benamning:"Stolpe CCTV", status:"pagaende" },
    { id:"u6", projektId:"36037", nr:"UR006", benamning:"Kabelskåp — under komplettering", status:"komplettering" },
    { id:"u7", projektId:"36038", nr:"UR001", benamning:"Projektering", status:"pagaende" },
    { id:"u8", projektId:"36038", nr:"UR002", benamning:"Flytt fjärrvärmeledning", status:"stangd" },
    { id:"u9", projektId:"36038", nr:"UR003", benamning:"Servis", status:"pagaende" },
    { id:"u10",projektId:"36038", nr:"UR004", benamning:"Kabelfriläggning", status:"stangd" },
    { id:"u11",projektId:"36038", nr:"UR005", benamning:"Dagvattendamm", status:"pagaende" },
    { id:"u12",projektId:"36038", nr:"UR006", benamning:"Bortforsling matjord 240 ton", status:"pagaende" },
    { id:"u13",projektId:"36038", nr:"UR007", benamning:"Dold betongplatta / MKM-massor", status:"pagaende" },
    { id:"u14",projektId:"36038", nr:"UR008", benamning:"Kabelskåp", status:"pagaende" },
    { id:"u15",projektId:"36038", nr:"UR010", benamning:"Hårdgjord yta för kranbil", status:"pagaende" }
  ],

  risker: [
    { id:"r1", projektId:"bada", titel:"Kabelströmstransformatorer (jordfel) har för liten innerdiameter för antal enledare till skidarna",
      sannolikhet:4, konsekvens:4, atgard:"Retur och nybeställning pågår. Bevaka omleveransdatum mot Cold Commissioning 11 nov.",
      agare:"Christoffer Karlsson", status:"oppen" },
    { id:"r2", projektId:"bada", titel:"Felaktig kabelspecifikation (area och spänningsnivå) samt leverans sänd till fel site",
      sannolikhet:3, konsekvens:4, atgard:"Avstäm inköpsmatris mot konstruktionsunderlag. Spåra felleverans och kreditera.",
      agare:"Christoffer Karlsson", status:"oppen" },
    { id:"r3", projektId:"36037", titel:"Marginal mellan batterileverans 12 okt och färdigställandetid 2 dec är tunn",
      sannolikhet:3, konsekvens:5, atgard:"Lås lyftresurs (Jinert) och elmontagelag tidigt. Bevaka Cold Comm.-checklistan 9 nov som grind.",
      agare:"Christoffer Karlsson", status:"oppen" },
    { id:"r4", projektId:"bada", titel:"M5-fakturering v. 42 förutsätter att CATL-verifieringsdokumentation är komplett",
      sannolikhet:3, konsekvens:4, atgard:"Begär dokumentationen från CATL nu. Stäm av kravbilden mot Appendix 03.7 innan fakturering.",
      agare:"Christoffer Karlsson", status:"oppen" },
    { id:"r5", projektId:"36038", titel:"Underlag för förorenade massor saknas — kan stoppa avslut av UR007",
      sannolikhet:3, konsekvens:3, atgard:"Dialog med Mark och Mekan pågår. Kräv provtagningsprotokoll skriftligt.",
      agare:"Christoffer Karlsson", status:"oppen" },
    { id:"r6", projektId:"36038", titel:"Etablering (Cramo) löper längre än kontrakterade 20 veckor enligt Bilaga 3",
      sannolikhet:4, konsekvens:3, atgard:"Räkna hyresmaterial för veckor därefter i ÄTA-underlaget, självkostnad + 10 % entreprenadarvode.",
      agare:"Christoffer Karlsson", status:"overvakad" },
    { id:"r7", projektId:"bada", titel:"Slutdokumentation enligt Appendix 03.7 ej klar i tid för M6/M7",
      sannolikhet:3, konsekvens:3, atgard:"Starta insamling parallellt med produktion. Lägg dokumentkrav på UE i slutbesiktningsunderlaget.",
      agare:"Christoffer Karlsson", status:"overvakad" }
  ],

  punkter: [
    { id:"p1", projektId:"bada", titel:"Kabelströmstransformatorer — retur och nybeställning, bekräfta nytt leveransdatum", agare:"Christoffer / Harju", forfaller:"2026-09-18", status:"oppen" },
    { id:"p2", projektId:"36037", titel:"Vågkvitto för deponimassor efterfrågas av beställaren", agare:"Alex Young → Kim Wilton", forfaller:"2026-09-15", status:"oppen" },
    { id:"p3", projektId:"36038", titel:"Underlag förorenade massor saknas — dialog med Mark och Mekan", agare:"Christoffer Karlsson", forfaller:"2026-09-18", status:"oppen" },
    { id:"p4", projektId:"bada", titel:"CATL-verifieringsdokumentation färdigställs inför M5-fakturering", agare:"Christoffer Karlsson", forfaller:"2026-10-09", status:"oppen" },
    { id:"p5", projektId:"36037", titel:"UR006 kabelskåp — komplettera underlag och prissätt enligt Bilaga 06.1", agare:"Christoffer Karlsson", forfaller:"2026-09-25", status:"oppen" },
    { id:"p6", projektId:"bada", titel:"Skyltbeställningar", agare:"Christoffer Karlsson", forfaller:"2026-09-30", status:"oppen" },
    { id:"p7", projektId:"bada", titel:"Inköpsmatris — uppföljning kvarvarande materiel", agare:"Christoffer Karlsson", forfaller:"2026-09-30", status:"oppen" },
    { id:"p8", projektId:"bada", titel:"OKLARHET: UR008 (tillkommande barriär, ABT 06 kap. 2 §6) — bekräfta vilket projekt numret tillhör", agare:"Christoffer Karlsson", forfaller:"2026-09-14", status:"oppen" },
    { id:"p9", projektId:"36038", titel:"OKLARHET: UR009 saknas i UR-serien för Alvesta — makulerad eller ej upprättad?", agare:"Christoffer Karlsson", forfaller:"2026-09-14", status:"oppen" }
  ],

  kontakter: [
    { id:"k1", namn:"Alex Young", roll:"Projektledare", org:"Ingrid Capacity", omr:"Båda" },
    { id:"k2", namn:"Henrik Gyllenklo", roll:"Byggledare", org:"Ingrid Capacity / Vinnergi", omr:"Båda" },
    { id:"k3", namn:"Ruben Medina", roll:"Ombud", org:"Ingrid Capacity", omr:"Båda" },
    { id:"k4", namn:"Christoffer Karlsson", roll:"Projektledare", org:"ONE Nordic", omr:"Båda" },
    { id:"k5", namn:"Kim Wilton", roll:"Ombud", org:"ONE Nordic", omr:"Båda" },
    { id:"k6", namn:"Johan Adolfsson", roll:"HMS", org:"ONE Nordic", omr:"Båda" },
    { id:"k7", namn:"Josef Fällman", roll:"Elsäkerhetsledare", org:"ONE Nordic", omr:"Alvesta" },
    { id:"k8", namn:"Daniel Larsson", roll:"BAS-U / platsansvarig", org:"ONE Nordic", omr:"Båda" },
    { id:"k9", namn:"Theo Erlandsson", roll:"CAD", org:"ONE Nordic", omr:"Båda" },
    { id:"k10",namn:"Fredrik Larsson", roll:"Besiktning stationshus", org:"Vinnergi", omr:"Båda" },
    { id:"k11",namn:"Tina Strömberg", roll:"Nätägare", org:"Växjö Energi", omr:"Växjö" },
    { id:"k12",namn:"Robin Carlsson", roll:"Nätägare", org:"Alvesta Energi AB", omr:"Alvesta" },
    { id:"k13",namn:"Stephan Östergren", roll:"Fibernätägare", org:"Vexnet", omr:"Båda" },
    { id:"k14",namn:"Elleholms", roll:"UE — markarbeten", org:"Elleholms", omr:"Båda" },
    { id:"k15",namn:"A-Bygg", roll:"UE — betong", org:"A-Bygg", omr:"Båda" },
    { id:"k16",namn:"Jinert", roll:"UE — kran och lyft", org:"Jinert", omr:"Båda" },
    { id:"k17",namn:"CATL", roll:"Leverantör BESS", org:"CATL", omr:"Båda" },
    { id:"k18",namn:"Flexgen", roll:"Leverantör EMS", org:"Flexgen", omr:"Båda" },
    { id:"k19",namn:"Harju Elekter", roll:"MV-ställverk", org:"Harju Elekter", omr:"Alvesta" },
    { id:"k20",namn:"Cramo", roll:"Etablering (bodar, UC, belysning)", org:"Cramo", omr:"Alvesta" }
  ],

  /* Veckochecklistan — en rad per projekt och vecka. Fylls i löpande. */
  veckokoll: [],

  /* Underrättelse om störning — register. Skapas via knapp i Störning-fliken. */
  storningar: [],

  /* Rutinstatus — endast ikryssade punkter lagras. Nyckel: "rutin|grupp|punkt". */
  rutinstatus: [],

  /* BESS EPC-checklistan (data/bessChecklistData.ts) per projekt.
     epcStatus: en rad per avbockad eller UR-kopplad kontrollpunkt
       {id, projektId, punkt, klar, datum, av, urId}
     epcFaser: en rad per fas som avviker från standardplanen
       {id, projektId, fas, start, slut, grindDatum, anteckning} */
  epcStatus: [],
  epcFaser: [],

  /* Dagbok — en rad per ÄTA-tillfälle. Källa: 2.4 "Har följande noterats om ÄTA
     i dagboken? Nedan måste noteras för varje enskilt ÄTA": startdatum, omfattning,
     väder och temperatur, kostnad, förväntad tidsåtgång, faktisk tidsåtgång. */
  dagbok: [],

  /* Beställarrapport per projekt (ONE-P). Trafikljus, systemstatus och
     prioritering är projektledarens bedömning — inte hämtat ur underlaget. */
  rapportstatus: [],

  /* Underlagsbockar och faktureringsdatum per betalningsmilstolpe (öppet dokument —
     själva betalstatusen ligger kvar i det administratörslåsta ekonomidokumentet). */
  mstatus: [],

  /* Byggmötesprotokoll med ÄTA- och hinderbevakning */
  byggmoten: [],
  /* HSEQ / BAS-U */
  hseqRonder: [], hseqIncidenter: [], hseqAmp: [], hseqId06: [],
  /* Slutdokumentation — grind för M6/M7 */
  slutdok: [],
  /* Handlingsplan per projekt: mål → drivkraft/strategi → åtgärder → slutresultat.
     Planhuvudet sås per projekt i efterInlasning; åtgärderna läggs till i vyn. */
  handlingsplaner: [],
  hpAtgarder: [],

  /* ==========================================================================
     PLANERING OCH TID — resurser, tidrapport, aktivitetsbudget, fakturaunderlag
     Kapacitet och á-priser är ANTAGANDEN (á-pris enligt Bilaga 06.1, kapacitet
     satt till heltid/deltid efter roll). Justera per person i Resurser-vyn.
     ========================================================================== */
  medarbetare: [
    { id:"me1", namn:"Christoffer Karlsson", roll:"Projektledare", kapacitet:40, apris:1245, aktiv:true },
    { id:"me2", namn:"Daniel Larsson", roll:"Ledande montör", kapacitet:40, apris:1010, aktiv:true },
    { id:"me3", namn:"Josef Fällman", roll:"Eldriftledare / kopplingsledare", kapacitet:20, apris:1245, aktiv:true },
    { id:"me4", namn:"Theo Erlandsson", roll:"Elkonstruktör", kapacitet:20, apris:1325, aktiv:true },
    { id:"me5", namn:"Johan Adolfsson", roll:"Projektledare", kapacitet:8, apris:1245, aktiv:true },
    { id:"me6", namn:"Kim Wilton", roll:"Projektledare", kapacitet:8, apris:1245, aktiv:true }
  ],

  /* Planerad tid per person, projekt och vecka: {id,personId,projektId,vecka,timmar} */
  bemanning: [],

  /* Rapporterad tid: {id,datum,personId,projektId,aktivitetId,timmar,ot,ataRef,debiterbar,fakturerad,notering} */
  tidrader: [],

  /* Aktiviteter med budget per projekt: {id,projektId,namn,budgetTim,budgetMtrl,budgetUE,ansvarig} */
  aktiviteter: [
    { id:"a1", projektId:"36037", namn:"Projektering och handlingar", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a2", projektId:"36037", namn:"Mark och kanalisation", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a3", projektId:"36037", namn:"Betong och fundament", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a4", projektId:"36037", namn:"MV-montage och ställverk", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a5", projektId:"36037", namn:"LV, AC och jordning", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a6", projektId:"36037", namn:"Driftsättning och provning", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a7", projektId:"36037", namn:"Dokumentation och avslut", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a8", projektId:"36038", namn:"Projektering och handlingar", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a9", projektId:"36038", namn:"Mark och kanalisation", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a10",projektId:"36038", namn:"Betong och fundament", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a11",projektId:"36038", namn:"MV-montage och ställverk", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a12",projektId:"36038", namn:"LV, AC och jordning", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a13",projektId:"36038", namn:"Driftsättning och provning", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" },
    { id:"a14",projektId:"36038", namn:"Dokumentation och avslut", budgetTim:0, budgetMtrl:0, budgetUE:0, ansvarig:"" }
  ],

  /* Kostnader mot aktivitet: {id,projektId,aktivitetId,datum,typ,benamning,belopp,debiterbar,fakturerad} */
  kostnader: [],

  /* Fakturaunderlag: {id,projektId,nr,period,skapad,status,summa,rader:[…]} */
  fakturor: [],

  /* Bilagor — foton och filer. assetId pekar på artifactens assetlagring. */
  bilagor: [],

  /* Ändringslogg — statusändringar m.fl. händelser, senaste ~150 posterna, nyast först. */
  andringslogg: []
};
