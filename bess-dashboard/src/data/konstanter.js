/* Konstanter och uppslagstabeller — extraherade ur standalone-filen.
   Ren data: statuslistor, prislistor, mallar och navigationsträd.
   Logiken som använder dem ligger i src/lib och src/sections. */

/* ---------- Projekt och status ---------- */

export const KANDA_MAPPAR = {
  "36037": {mapp:"Växjö · EAC- Växjö BESS", bestallare:"Ingrid Capacity AB"},
  "36038": {mapp:"Alvesta · EAC- Alvesta BESS", bestallare:"Ingrid Capacity AB"},
  "goteborg": {mapp:"Göteborg Skogome", bestallare:"Ingrid Capacity AB"},
  "gotene": {mapp:"Götene", bestallare:"Ingrid Capacity AB"}
};

export const PROJEKTSTATUS=["Planering","Produktion","Slutbesiktning","Avslutat"];

export const PILL={
  fakturerad:["p-ok","Fakturerad"], pagaende:["p-go","Pågår"], kvar:["p-wait","Kvar"],
  planerad:["p-go","Planerad"], klar:["p-ok","Klar"], forsenad:["p-bad","Försenad"],
  bekraftad:["p-ok","Bekräftad"], avvikelse:["p-bad","Avvikelse"], preliminar:["p-warn","Preliminär"],
  stangd:["p-ok","Stängd"], komplettering:["p-warn","Komplettering"],
  oppen:["p-warn","Öppen"], overvakad:["p-go","Övervakad"], klarmarkerad:["p-ok","Klar"],
  /* tavla + beställarrapport */
  ejpaborjad:["p-wait","Ej påbörjad"], vantar:["p-warn","Väntar på besked"],
  utkast:["p-wait","Utkast"], skickad:["p-warn","Skickad"], besvarad:["p-ok","Besvarad"],
  ejstartad:["p-wait","Ej startad"], projektering:["p-go","Projektering"],
  levererad:["p-go","Levererad"], installerad:["p-go","Installerad"],
  driftsatt:["p-ok","Driftsatt"], verifierad:["p-ok","Verifierad"],
  /* ÄTA-loggens åtta statuslägen */
  prissattning:["p-warn","Under prissättning"], skickad_best:["p-warn","Skickad till beställaren"],
  godkand_dok:["p-go","Godkänd — inväntar dok"], godkand:["p-ok","Godkänd"],
  utgar:["p-wait","Utgår"]
};

/* ---------- Navigation ---------- */

export const VYER=[
  ["oversikt","Översikt","Läget i portföljen just nu — framdrift, avvikelser och det som ligger närmast i tiden."],
  ["tavla","Tavla","Alla öppna punkter, ÄTA och störningar som kanban. Dra korten mellan lägena."],
  ["tidplan","Tidplan","Milstolpar och leveranser på tidsaxel, med dagens datum markerat."],
  ["_sek","Planering och tid"],
  ["resurser","Resurser","Vem som är bokad på vad, vecka för vecka — och var kapaciteten tar slut."],
  ["tid","Tidrapport","Rapportera tid per dag, projekt och aktivitet. Debiterbar tid går vidare till fakturaunderlaget."],
  ["budget","Budget och utfall","Budget per aktivitet mot faktiskt utfall i timmar och kronor, uppdaterat i realtid."],
  ["faktura","Fakturaunderlag","Sammanställ ofakturerad tid och kostnad till ett underlag — självkostnad plus arvode."],
  ["_sek","Kontrakt och pengar"],
  ["milstolpar","Milstolpar M1–M7","Betalningsmilstolparna med underlagskrav och faktureringsstatus."],
  ["ata","ÄTA och hinder","Hela ärendehanteringen: klassificering, 24-timmarsfrist, prissättning och fakturering."],
  ["ekonomi","Ekonomi","Kontraktsvärde, betalplan och ÄTA-ekonomi per projekt."],
  ["_sek","Utförande"],
  ["moten","Byggmöten","Protokoll med ÄTA- och hinderbevakning per byggmöte."],
  ["vecka","Veckokoll","Projektledarens checklista — går igenom varje vecka och flaggar det som kräver åtgärd."],
  ["dagbok","Dagbok","Dagboksnotering per ÄTA-tillfälle: omfattning, väder, kostnad och tidsåtgång."],
  ["storning","Störning","Underrättelse om störning — upprätta, skriv ut och följ upp."],
  ["hseq","HSEQ / BAS-U","Skyddsronder, incidenter, AMP och ID06 för båda siterna."],
  ["risker","Risker","Riskregistret med sannolikhet, konsekvens, åtgärd och ägare."],
  ["punkter","Öppna punkter","Allt som ligger på någon — sorterat på förfallodatum."],
  ["_sek","Avslut och rapport"],
  ["slutdok","Slutdokumentation","Grinden mot M6 och M7 — dokumentkrav enligt Appendix 03.7."],
  ["rapport","Beställarrapport","Granskad vy av vad beställaren får se — redigera vad som ingår, förhandsgranska och exportera."],
  ["rutiner","Projektledarens handbok","Rollen, ansvaret och ONE Nordics flödesscheman som egna kapitel — avbockade per projekt."],
  ["kontakter","Kontakter","Projektorganisation, nätägare, underentreprenörer och leverantörer."],
  ["data","Data och backup","Var portföljens data lagras, säkerhetskopia som fil och export till Excel."]
];

export const NAVIKON={
  oversikt:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  moten:'<path d="M3 5h18v11H8l-5 4z"/><path d="M7 9h10M7 12.5h6"/>',
  hseq:'<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  slutdok:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 13l2 2 4-4"/>',
  milstolpar:'<path d="M4 21V4"/><path d="M4 5h11l-2 3 2 3H4"/><circle cx="4" cy="21" r="1"/>',
  ata:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M12 10v7M8.5 13.5h7"/>',
  tavla:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="14" rx="1.5"/>',
  rapport:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 12h6M9 16h6"/>',
  vecka:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M8 14l2.5 2.5L16 11"/>',
  tidplan:'<rect x="3" y="5" width="10" height="3" rx="1"/><rect x="7" y="11" width="14" height="3" rx="1"/><rect x="3" y="17" width="8" height="3" rx="1"/>',
  ekonomi:'<path d="M4 20V10M10 20V4M16 20v-7M22 20v-3"/>',
  risker:'<path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
  punkter:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  storning:'<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
  dagbok:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/>',
  rutiner:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M9 7h7M9 11h7"/>',
  data:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  resurser:'<circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17 4v8M21 6v6"/>',
  tid:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  budget:'<path d="M3 17l5-6 4 3.5L21 5"/><path d="M21 5h-5M21 5v5"/><path d="M3 21h18"/>',
  faktura:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9.5 7h5M9.5 11h5M9.5 15h3"/>',
  kontakter:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="9" r="2.4"/><path d="M15.5 14a5 5 0 0 1 5.4 5"/>'
};

/* ---------- Tavla (kanban) ---------- */

export const KOLUMNER=[["ej","Ej påbörjad"],["pagar","Pågår"],
                ["vantar","Väntar på besked / komplettering"],["klar","Stängd / klar"]];

export const KANBAN={
  ur:{namn:"ÄTA / UR", vy:"ata",
      till:{ej:"oppen",pagar:"prissattning",vantar:"skickad_best",klar:"stangd"},
      fran:{oppen:"ej",prissattning:"pagar",godkand:"pagar",fakturerad:"pagar",
            skickad_best:"vantar",godkand_dok:"vantar",stangd:"klar",utgar:"klar",
            pagaende:"pagar",komplettering:"vantar",ejpaborjad:"ej"}},
  punkter:{namn:"Uppgift", vy:"punkter",
      till:{ej:"ejpaborjad",pagar:"oppen",vantar:"vantar",klar:"klarmarkerad"},
      fran:{ejpaborjad:"ej",oppen:"pagar",pagaende:"pagar",vantar:"vantar",klarmarkerad:"klar"}},
  hseqavvikelser:{namn:"HSEQ-avvikelse", vy:"hseq",
      till:{ej:"oppen",pagar:"oppen",vantar:"oppen",klar:"atgardad"},
      fran:{oppen:"pagar",atgardad:"klar"}},
  storningar:{namn:"Avvikelse", vy:"storning",
      till:{ej:"utkast",pagar:"utkast",vantar:"skickad",klar:"besvarad"},
      fran:{utkast:"ej",skickad:"vantar",besvarad:"klar"}}
};

export const ROLLER=["PL","UE","Nätägare","Beställare"];

/* ---------- Beställarrapport ---------- */

export const STYRPARAM=[["tid","Tid"],["leverabler","Leverabler"],["kvalitet","Kvalitet"],
                 ["resurser","Resurser"],["budget","Budget"]];

export const TRAFIK={gron:["tl-gron","Enligt plan / klart"],gul:["tl-gul","Att bevaka"],rod:["tl-rod","Åtgärd krävs"]};

export const BESS_SYSTEM=[
  ["poi","Anslutningspunkt / elnät (POI)","Nätägarens anslutning, mätning och driftklarhet"],
  ["pcs","Växelriktare (PCS)","Leverans, montage och parametrering"],
  ["bess","Batterisystem (BESS / BMS)","Containrar, moduler och batteriövervakning"],
  ["ems","Energy Management System (EMS)","Styrsystem och regler (Flexgen)"],
  ["scada","SCADA / HMI","Övervakning, larm och operatörsgränssnitt"],
  ["natjanst","Nätjänstverifiering","FCR, aFRR/mFRR och FFR mot Svenska kraftnät"]
];

export const SYSSTATUS=["ejstartad","projektering","levererad","installerad","driftsatt","verifierad"];

export const ONEP_MILSTOLPAR=["Site establishment","Betong och fundament klart","BESS-containrar på plats",
  "MV-station / ställverk driftklart","Cold Commissioning","Hot Commissioning",
  "SAT — Site Acceptance Test","PAC — Färdigställande","COD — Kommersiell drift"];

export const RAPPORT_ATA_PUBLIKA = ["skickad_best","godkand_dok","godkand","fakturerad","stangd"];

export const SEKRETESSORD = [
  /påslag/i, /marginal/i, /täckningsbidrag/i, /självkostnad/i, /inköpspris/i,
  /internpris/i, /\bUE-pris/i, /kalkyl/i, /\bvinst/i, /förtjänst/i,
  /\bintern[at]?\b/i, /konfidentiell/i, /\bej för beställaren\b/i,
  /spekul/i, /\brykte/i, /misstänker att/i, /resurskonflikt/i,
  /\bà-pris/i, /\ba-pris/i, /timpris/i, /timkostnad/i
];

export const SEKRETESSFALT = [
  "kalkyl","apris","arvode","timmar","belopp","summa","kostnad","kostnadNetto",
  "budgetTim","budgetMtrl","budgetUE","kontraktsvarde","debiterbar","tidrader",
  "medarbetare","bemanning","fakturor","anteckning","internt","notering"
];

export const RAPPORT_SEKTIONER=[
  ["sammanfattning","Sammanfattning"],["framdrift","Framdrift och status"],
  ["milstolpar","Milstolpar i huvudtidplanen"],["ata","Aviserade ÄTA och hinder"],
  ["hms","HMS och BAS-U"],["beslut","Beslut som krävs av beställaren"],
  ["risker","Projektrisker och åtgärdsplaner"]
];

/* ---------- ÄTA och hinder ---------- */

export const ATA_STATUS = ["oppen","prissattning","skickad_best","godkand_dok","godkand","fakturerad","stangd","utgar"];

export const ATA_KLASS = [["ata","ÄTA — tillkommande arbete"],["hinder","Hinder — tid, normalt ej ersättning"],
                   ["bada","Både hinder och ÄTA"],["oklar","Ej klassificerad ännu"]];

export const PRISGRUND = [["lopande","Löpande räkning / självkostnad"],["aprislista","Avtalad á-prislista"],
                   ["mangd","Mängdförteckning"],["ejavtalat","Inget avtalat — självkostnadsprincipen"]];

export const ORSAKER = [
  ["best_atagande","Beställaren har inte uppfyllt sina åtaganden","hinder"],
  ["fel_uppgift","Fel eller ofullständiga uppgifter från beställaren","ata"],
  ["ue_material","UE:s material kom inte i tid","hinder"],
  ["omvarld","Händelse i omvärlden — väder, myndighet, materialbrist","hinder"],
  ["plats_avviker","Förutsättningarna på arbetsplatsen stämde inte","ata"],
  ["fackmassig","Arbetsområdet avvek från fackmässig förväntan","ata"],
  ["one_ejforutse","Omständighet på ONEs sida som ej kunde förutses","hinder"],
  ["one_vallande","Störningen beror på ONE som entreprenör","ingen"]
];

/* ---------- Milstolpar M1–M7 ---------- */

export const MILSTOLPE_MODELL = [
  {kod:"M1", namn:"Commencement Date", andel:10, krav:"Signerat kontrakt och ställd säkerhet (bankgaranti 10 %)",
   underlag:[["kontrakt","Signerat kontrakt"],["garanti","Bankgaranti 10 % i original"],["forsakring","Försäkringscertifikat överlämnat"]]},
  {kod:"M2", namn:"Site Establishment & Design", andel:25, krav:"Godkända bygghandlingar av beställaren",
   underlag:[["cbop","Detaljprojektering cBoP"],["ebop","Detaljprojektering eBoP"],["fundament","Fundamentritningar krafttransformator"],["avverkning","Avverkningsplan med arbetsinstruktion"],["godkant","Beställarens skriftliga godkännande"]]},
  {kod:"M3", namn:"Excavation, Backfilling & Cable Testing", andel:25, krav:"Schakt klar och kabeltester godkända",
   underlag:[["schakt","Schakt klar och inmätt"],["kabeltest","Kabeltestprotokoll signerade"],["vagkvitto","Vågkvitton för massor"]]},
  {kod:"M4", namn:"Concrete Works", andel:20, krav:"Samtliga fundament klara",
   underlag:[["gjutning","Gjutprotokoll samtliga fundament"],["hardning","Betonghärdning dokumenterad"],["inmatning","Inmätning och geometri godkänd"]]},
  {kod:"M5", namn:"Battery Commissioned", andel:15, krav:"Verifierat av BESS-leverantören (CATL)",
   underlag:[["catl","CATL-verifieringsdokumentation"],["fat","FAT-protokoll"],["sat","SAT-protokoll"],["idrift","Idrifttagningsprotokoll"]]},
  {kod:"M6", namn:"Final Acceptance", andel:3, krav:"Slutbesiktning godkänd och slutdokumentation levererad",
   underlag:[["slutbesikt","Slutbesiktningsprotokoll"],["asbuilt","As-built-dokumentation (Appendix 03.7)"],["elintyg","Elinstallationsintyg"],["drift","Drift- och underhållsinstruktion"]]},
  {kod:"M7", namn:"Rectified Punch List", andel:2, krav:"Samtliga anmärkningar åtgärdade",
   underlag:[["punch","Punch list åtgärdad"],["efterbesikt","Efterbesiktning skriftligt bekräftad"]]}
];

/* ---------- ÄTA-kalkylator ---------- */

export const PRISLISTA_061 = [
  ["Montör",945],["Ledande montör",1010],["Projektledare",1245],
  ["BESS-specialist / Driftsättare",1150],
  ["Provningsingenjör",1540],["Termograför",1400],["Elkonstruktör",1325],
  ["Eldriftledare / kopplingsledare",1245]
];

export const OVERTID = [[1,"Normaltid"],[1.5,"Övertid 50 % (06–07, 16–20 mån–fre)"],
                 [2,"Övertid 100 % (annan tid)"],[3,"Storhelg 200 %"]];

export const KOSTNADSTYP = [["material","Material"],["ue","Underentreprenör / konsult"],
                     ["hjalpmedel","Hjälpmedel, instrument"],["resa","Traktamente och resa"]];

export const ERSATTNINGSFORM = [["lopande","Löpande räkning (självkostnad)"],
                         ["aprislista","Á-pris enligt Bilaga 06.1"],["fast","Fast pris"]];

export const KM_PRIS = 16;   // servicebil/personbil, inget påslag

/* ---------- Byggmöten ---------- */

export const PARAGRAFER = [
  ["1","Organisation, närvarande och behörigheter"],
  ["2","Ekonomi, fakturering och betalningsplan"],
  ["3","Tidplan, framdrift och milstolpar M1–M7"],
  ["4","ÄTA-arbeten, tillägg och avvikelser"],
  ["5","Hinder, störningar och tidsförlängning"],
  ["6","HSEQ och KMA"],
  ["7","Beslutspunkter för beställaren och nästa möte"]
];

export const MOTESSTATUS = [["utkast","Utkast"],["justerat","Justerat"],["utskickat","Utskickat"]];

export const PUNKTROLL = ["PL","UE","Beställare","Nätägare","BAS-U"];

/* ---------- HSEQ / BAS-U ---------- */

export const HSEQ_VITE = 10000;

export const RONDPUNKTER = [
  ["elskarm","Elskärmning, högspänning och avspärrningar"],
  ["heta","Heta arbeten och brandutrustning"],
  ["ppe","Personlig skyddsutrustning och ID06-kontroll"],
  ["lyft","Kranlyft, schakt och fallskydd"],
  ["kemi","Kemikalier, miljö och saneringsutrustning"]
];

export const AVVIKELSENIVA = [["lag","Låg"],["medium","Medium"],["akut","Akut"]];

export const INCIDENTTYP = [["tillbud","Tillbud"],["olycka","Olycka"],["miljo","Miljöincident"]];

/* ---------- Slutdokumentation ---------- */

export const SLUTDOK_MALL = [
  ["FAT och SAT", [
    "FAT-protokoll BESS, battericeller och BMS",
    "SAT-protokoll växelriktare (PCS) och transformator",
    "SAT-protokoll EMS och SCADA/HMI"]],
  ["Elkraft och provning på site", [
    "Elinstallationsintyg och egenkontrollprogram el",
    "Jordtagsmätningsprotokoll",
    "Kabelprovningsprotokoll hög- och mellanspänning",
    "Skyddsprovnings- och idrifttagningsprotokoll ställverk/POI"]],
  ["Nätägare och nättjänster", [
    "Parallelldriftsavtal och tillstånd från nätägaren",
    "Verifieringsrapport nättjänster (FCR, aFRR/mFRR, FFR)"]],
  ["Relationshandlingar (as-built)", [
    "As-built huvudlednings- och enlinjeschema",
    "As-built mark- och kabelförläggningsritningar",
    "Fundament- och sitelayout"]],
  ["Drift, underhåll och besiktning", [
    "Drift- och underhållsinstruktioner (O&M)",
    "Garanti- och intygsdokument från leverantörer",
    "Slutbesiktningsprotokoll utan väsentliga anmärkningar"]]
];

export const DOKSTATUS = [["ejpaborjad","Ej påbörjad"],["bestalld","Beställd / under framtagande"],
                   ["mottagen","Under granskning"],["godkand","Godkänd"]];

/* ---------- Riskregister ---------- */

export const RISKKATEGORI = [["teknik","Teknik / BESS (POI, PCS, EMS)"],["mark","Entreprenad / mark"],
  ["leverans","Leverans / long-lead"],["kontrakt","Kontrakt / ekonomi"],["hseq","HSEQ / arbetsmiljö"]];

export const RISKAGARE = [["one","ONE Nordic (entreprenörsrisk)"],["bestallare","Beställaren"],
  ["delad","Delad / tredje part"]];

export const RISKSTATUS_NY = [["oppen","Aktiv"],["overvakad","Mitigerad / bevakad"],
  ["stangd","Stängd / avförd"],["utlost","Utlöst"]];

/* ---------- Filter och export ---------- */

export const SNABBFILTER=[["alla","Alla"],["min","Kräver min åtgärd"],["larm","Vitesrisk / 24h-larm"],["oppna","Mina öppna"]];

export const CSV_TABELLER = [
  ["ur","ÄTA och hinder"], ["risker","Risker"], ["punkter","Öppna punkter"],
  ["tidrader","Tidrader"], ["kostnader","Kostnader"], ["bemanning","Bemanning"],
  ["aktiviteter","Aktiviteter och budget"], ["fakturor","Fakturaunderlag"],
  ["milstolpar","Milstolpar"], ["leveranser","Leveranser"], ["betalplan","Betalplan"],
  ["dagbok","Dagbok"], ["storningar","Störningar"], ["veckokoll","Veckokoll"],
  ["kontakter","Kontakter"], ["medarbetare","Medarbetare"], ["andringslogg","Ändringslogg"]
];

