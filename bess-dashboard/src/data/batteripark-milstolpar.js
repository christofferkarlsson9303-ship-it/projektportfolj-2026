/* BATTERIPARK_MILSTOLPAR — grunddata extraherad ur standalone-filen.
   Rör inte logiken: detta är ren data. */

export const BATTERIPARK_MILSTOLPAR = [
  { id:"M1", titel:"M1 · Commencement — 10 %", grupper:[
    { namn:"Före byggstart",
      info:"Krav enligt betalplan: bankgaranti utfärdad och kontrakt tecknat.",
      punkter:[
        {n:"kontrakt", t:"Kontrakt undertecknat (ABT 06)"},
        {n:"bankgaranti", t:"Bankgaranti utfärdad och godkänd av beställaren"},
        {n:"startmote", t:"Startmöte hållet och protokoll signerat", h:"Se Rutiner 2.1"} ] } ] },

  { id:"M2", titel:"M2 · Site Establishment — 25 %", grupper:[
    { namn:"Fas 1 — Etablering",
      info:"Ansvarig: UE mark / ONE Nordic. Handlingar: APD-plan godkänd av beställaren, startbesked, TA-plan, bygglov.",
      punkter:[
        {n:"startbesked", t:"Startbesked (byggnadsnämnd) mottaget — finns fysiskt på siten", h:"Utan det är det STOPP"},
        {n:"apd", t:"APD-plan godkänd av beställaren och tillgänglig på siten"},
        {n:"ta", t:"TA-plan (trafikanordningsplan) tillgänglig"},
        {n:"bygglov", t:"Bygglovshandlingar på siten"},
        {n:"inhagnad", t:"Tillfällig inhägnad uppsatt — inga öppningar"},
        {n:"byggskylt", t:"Byggskylt monterad vid entré"},
        {n:"id06", t:"ID06 personalliggare aktiv — alla incheckade från dag 1"},
        {n:"basu", t:"BAS-U anslagstavla uppsatt (nödnummer, samlingsplats, AMP)"},
        {n:"bod", t:"Etableringsbod, toaletter och vatten placerade"},
        {n:"avfall", t:"Sorterat byggavfallssystem på plats"} ] } ] },

  { id:"M3", titel:"M3 · Schakt + kabeltester — 25 %", grupper:[
    { namn:"Fas 2 — Schakt och masshantering",
      info:"Ansvarig: UE mark. Handlingar: utsättningsritning, geoteknikrapport, kanalisationsritning.",
      punkter:[
        {n:"utsattning", t:"Utsättning genomförd av mätingenjör och godkänd av platschef", h:"Ingen grävmaskin startar utan godkänd utsättning"},
        {n:"matjord", t:"Matjord separerad — volym dokumenterad med foto INNAN borttransport"},
        {n:"bottenniva", t:"Bottennivå godkänd av platschef, foto taget"},
        {n:"dolda", t:"Dolda hinder dokumenterade och projektledare informerad omedelbart"},
        {n:"kanalisation", t:"Kanalisationsritning bekräftad i slutversion (ej utkast)"},
        {n:"rorplugg", t:"Alla rörändar pluggade direkt efter förläggning"},
        {n:"gpsror", t:"GPS-foto av rörläge taget innan återfyllning"} ] },
    { namn:"Fas 5 — Kabelförläggning och kabeltester",
      info:"Testprotokoll skickas till beställaren omedelbart efter test — krav för att M3 ska betalas ut.",
      punkter:[
        {n:"bottenlag", t:"Bottenlag sand/finmaterial i alla kabelgravar"},
        {n:"gpskabel", t:"GPS-foto av kabelläge INNAN varningsband"},
        {n:"varnband", t:"Varningsband lagt och fotograferat INNAN återfyllning"},
        {n:"markning", t:"Alla kablar märkta i båda ändar"},
        {n:"isolation", t:"Isolationstest DC/HSP/LSP genomfört och godkänt — protokoll signerat"},
        {n:"mantel", t:"Manteltest HSP godkänt — protokoll signerat"},
        {n:"kontinuitet", t:"Kontinuitet skärm/jord uppmätt — protokoll signerat"},
        {n:"protokoll", t:"Testprotokoll skickade till beställaren"},
        {n:"klartecken", t:"Platschef har gett klartecken för återfyllning"} ] } ] },

  { id:"M4", titel:"M4 · Betongarbeten — 20 %", grupper:[
    { namn:"Fas 3 — Jordtagssystem",
      info:"Jordtagssystemet ska mätas och protokollföras INNAN återfyllning.",
      punkter:[
        {n:"jordinstr", t:"Jordinstruktion upprättad och signerad av elinstallatörsansvarig"},
        {n:"ringjord", t:"Ringjord komplett och sluten — kontinuitet verifierad"},
        {n:"gpsjord", t:"GPS-foto av alla korsningar och ändpunkter INNAN återfyllning"},
        {n:"jordmatt", t:"Jordtagsmotstånd uppmätt — protokoll signerat"} ] },
    { namn:"Fas 4 — Fundament",
      info:"Toleranser: ingjutningsgods ±5 mm (X/Y) / ±2 mm (höjd), fundamentyta ±2 mm/5 m.",
      punkter:[
        {n:"fotogrop", t:"Fundamentgrop fotograferad INNAN armering läggs"},
        {n:"armering", t:"Armering och ingjutningsgods kontrollerat och fotograferat INNAN gjutning"},
        {n:"betong", t:"Betong enligt EN 206 + EN 1992-1-1 — recept verifierat mot spec vid varje leverans"},
        {n:"provkroppar", t:"Betongprovkroppar tagna — minst 3 st per fundament"},
        {n:"gjutprot", t:"Gjutprotokoll upprättat (datum, leverantör, temperatur, recept)"},
        {n:"hardning", t:"Härdningsprotokoll godkänt innan belastning"},
        {n:"inmatning", t:"Fundamenthöjd och läge inmätt — protokoll klart"},
        {n:"synavgrund", t:"Syn av grund genomförd med beställaren"} ] } ] },

  { id:"M5", titel:"M5 · Battery Commissioned — 15 %", grupper:[
    { namn:"Fas 6 — E-House och ställverk",
      info:"Nivellering max 2,5 mm/5 m. Fasordning L1/L2/L3 verifieras med fasindikator.",
      punkter:[
        {n:"ehouse", t:"E-House levererat, placerat och nivellerat (max 2,5 mm/5 m)"},
        {n:"ehousejord", t:"E-House jordanslutet direkt efter placering"},
        {n:"stallverk", t:"Ställverk monterat i rätt ordning — bussbar fasordning L1/L2/L3 verifierad"},
        {n:"moment", t:"Bussbarskopplingar åtdragna med kalibrerat momentverktyg — foto per koppling"} ] },
    { namn:"Fas 7 — BESS-containrar",
      info:"Lyft max 5° lutning — annars risk för intern skada på battericeller.",
      punkter:[
        {n:"battplacering", t:"Containrar levererade, placerade, nivellerade och förankrade"},
        {n:"battjord", t:"Jordslinga ansluten till containrarna direkt efter placering"},
        {n:"battkabel", t:"DC/AC/kommunikation/brand anslutna enligt kabellista — alla genomföringar brandtätade"},
        {n:"precomm", t:"Leverantörens pre-commissioning check genomförd — protokoll signerat"} ] },
    { namn:"Fas 8 — EMS, brandlarm och permanent inhägnad",
      info:"Brandlarm och gasdetektering måste vara driftsatta och funktionstestade INNAN start.",
      punkter:[
        {n:"ems", t:"EMS driftsatt — all kommunikation testad"},
        {n:"brandlarm", t:"Brandlarm och gasdetektering driftsatta och funktionstestade INNAN BESS startas"},
        {n:"inhagnadperm", t:"Permanent inhägnad klar (2,5 m, anti-klättring, taggtråd, jordad) INNAN BESS-leverans"} ] },
    { namn:"Fas 9 — Testning, SAT och driftsättning",
      info:"All testning dokumenteras med signerat protokoll. ITP ska vara godkänd av beställaren innan SAT startar.",
      punkter:[
        {n:"itp", t:"ITP (testplan) godkänd av beställaren INNAN SAT startar"},
        {n:"sat", t:"SAT genomförd med beställarens representant — nominell effekt verifierad"},
        {n:"nodstopp", t:"Nödstopp (E-Stop) testat och godkänt"},
        {n:"spanning", t:"Spänningssättning: nätägarens godkännande + elinstallatörsansvarigs klartecken + driftintyg utfärdat", h:"Alla tre krävs" } ] } ] },

  { id:"M6", titel:"M6 · Final Acceptance — 3 %", grupper:[
    { namn:"Slutdokumentation (as-built)",
      info:"Allt underlag ska finnas i SharePoint OCH i tryckt form i E-House.",
      punkter:[
        {n:"kabellista", t:"As-built kabellista, kabelplan, fundamentplan och jordtag klara"},
        {n:"enlinje", t:"As-built enlinjeschema tryckt och placerat i E-House"},
        {n:"testprot", t:"Alla testprotokoll (kabel, ställverk, batteri, brandtätning, betong) signerade och samlade"},
        {n:"driftintyg", t:"Driftintyg och Declaration of Conformity utfärdade"},
        {n:"manualer", t:"Drift- och underhållsmanual på svenska, tryckta, i E-House"},
        {n:"foto", t:"Fotodokumentation komplett — alla obligatoriska GPS-foton uppladdade"} ] } ] },

  { id:"M7", titel:"M7 · Rectified Punch List — 2 %", grupper:[
    { namn:"Slutbesiktning och åtgärder",
      punkter:[
        {n:"punchlist", t:"Punch-lista från slutbesiktningen upprättad"},
        {n:"atgarder", t:"Alla anmärkningar åtgärdade"},
        {n:"godkant", t:"Åtgärder godkända av beställaren"} ] } ] }
];
