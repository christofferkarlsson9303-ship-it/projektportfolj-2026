/* Kontrollpunkter per steg i projektstarten. Innehållet speglar ONE-P-checklistorna i
   projektmetoden (docs/projektmetod.md); kritiska punkter (critical) markeras i guiden. */

export const KATALOG = {
 "calloff": [
  {
   "id": "signed",
   "grupp": "Innan ni tackar ja",
   "text": "Kontrakt och samtliga bilagor är lästa",
   "kritisk": true
  },
  {
   "id": "penalty",
   "grupp": "Innan ni tackar ja",
   "text": "Viten och deltidsmilstolpar är identifierade",
   "kritisk": true
  },
  {
   "id": "termination",
   "grupp": "Innan ni tackar ja",
   "text": "Hävningsgrunder är identifierade"
  },
  {
   "id": "payplan",
   "grupp": "Innan ni tackar ja",
   "text": "Betalningsplan och indexregler är förstådda",
   "kritisk": true
  },
  {
   "id": "cash",
   "grupp": "Innan ni tackar ja",
   "text": "Kassaflöde kontrollerat: betalar vi innan vi får betalt?",
   "tips": "Räkna längsta negativa perioden mot 30 dagars betaltid.",
   "kritisk": true
  },
  {
   "id": "guarantee",
   "grupp": "Innan ni tackar ja",
   "text": "Bankgaranti: belopp, kostnad, giltighet och utfärdare bedömda",
   "kritisk": true
  },
  {
   "id": "reporting",
   "grupp": "Innan ni tackar ja",
   "text": "Krav på personalliggare, dagbok och rapportering är noterade"
  },
  {
   "id": "profit",
   "grupp": "Beslut",
   "text": "Lönsamheten är bedömd mot risk och resurser",
   "kritisk": true
  },
  {
   "id": "resources",
   "grupp": "Beslut",
   "text": "Personal, maskiner och nyckelroller finns eller kan säkras",
   "kritisk": true
  },
  {
   "id": "escalated",
   "grupp": "Beslut",
   "text": "Oklara punkter är lyfta till intern beställare innan start",
   "tips": "Kan vi tacka nej eller skjuta på uppdraget?",
   "kritisk": true
  }
 ],
 "org": [
  {
   "id": "rolesWritten",
   "grupp": "Organisation",
   "text": "Rollerna är namngivna skriftligt",
   "kritisk": true
  },
  {
   "id": "customerKeys",
   "grupp": "Organisation",
   "text": "Kunden har godkänt nyckelpersoner där kontraktet kräver det"
  },
  {
   "id": "backtoback",
   "grupp": "Organisation",
   "text": "UE-roller speglar huvudavtalet (back-to-back)"
  },
  {
   "id": "eslFormal",
   "grupp": "Organisation",
   "text": "Elsäkerhetsledare är formellt utsedd",
   "kritisk": true
  },
  {
   "id": "orgChart",
   "grupp": "Organisation",
   "text": "Organisationsschema är skickat till beställaren"
  },
  {
   "id": "insurance",
   "grupp": "Handlingar efter kontrakt",
   "text": "Försäkringscertifikat är överlämnat",
   "tips": "Ofta senast två veckor efter kontrakt.",
   "kritisk": true
  },
  {
   "id": "security",
   "grupp": "Handlingar efter kontrakt",
   "text": "Säkerhet i original är överlämnad",
   "kritisk": true
  },
  {
   "id": "otherDocs",
   "grupp": "Handlingar efter kontrakt",
   "text": "Övriga kontraktuella handlingar är överlämnade"
  },
  {
   "id": "ataNamed",
   "grupp": "Behörighet",
   "text": "Det är bestämt vem som underrättar om ÄTA, hinder och tar emot ÄTA",
   "kritisk": true
  },
  {
   "id": "meetingRoles",
   "grupp": "Behörighet",
   "text": "Det är bestämt vem som kallar till och deltar i byggmöten"
  },
  {
   "id": "staffChange",
   "grupp": "Behörighet",
   "text": "Eventuellt personalbyte uppfyller kontraktets krav och är underrättat"
  },
  {
   "id": "kickoffRead",
   "grupp": "Startmöte",
   "text": "Alla kontraktshandlingar är genomlästa inför startmötet",
   "kritisk": true
  },
  {
   "id": "kickoffCalled",
   "grupp": "Startmöte",
   "text": "Startmöte är kallat enligt kontraktet, eller beställaren är påmind skriftligen",
   "tips": "Arbete ska inte starta innan startmöte hållits.",
   "kritisk": true
  },
  {
   "id": "protocol",
   "grupp": "Startmöte",
   "text": "Protokoll från startmötet är granskat, signerat och sparat"
  },
  {
   "id": "customerAuthority",
   "grupp": "Startmöte",
   "text": "Det är klarlagt vem hos beställaren som tar emot underrättelser och beställer ÄTA",
   "kritisk": true
  },
  {
   "id": "calendar",
   "grupp": "Startmöte",
   "text": "Mötesfrekvens ligger i kalendern"
  }
 ],
 "contract": [
  {
   "id": "dates",
   "grupp": "Kontraktssanning",
   "text": "Milstolpsdatum är kontrollerade, inklusive årtal",
   "tips": "Fel årtal i en paragraf är en klassisk fälla.",
   "kritisk": true
  },
  {
   "id": "price",
   "grupp": "Kontraktssanning",
   "text": "Kontraktspris och index är bekräftade",
   "kritisk": true
  },
  {
   "id": "viteExposure",
   "grupp": "Kontraktssanning",
   "text": "Alla deltidsmilstolpar med vitesexponering är listade"
  },
  {
   "id": "guaranteeCheck",
   "grupp": "Kontraktssanning",
   "text": "Bankgaranti är verifierad: belopp, tid, utfärdare",
   "kritisk": true
  },
  {
   "id": "payLinked",
   "grupp": "Kontraktssanning",
   "text": "Betalningsplanen är kopplad till rätt milstolpsutlösare"
  },
  {
   "id": "ifs",
   "grupp": "System",
   "text": "Projektet ligger i IFS med rätt nummer och delprojekt"
  },
  {
   "id": "logs",
   "grupp": "System",
   "text": "Loggar finns för ÄTA, risk, beslut, möten och prognos"
  },
  {
   "id": "folders",
   "grupp": "System",
   "text": "Mappstruktur är satt (t.ex. YYYYMMDD_Typ_Beskrivning_v1)"
  },
  {
   "id": "diary",
   "grupp": "System",
   "text": "Byggdagbok är startad och ägare är utsedd",
   "tips": "Dagbok varje arbetsdag. På engelska om kontraktet kräver det.",
   "kritisk": true
  },
  {
   "id": "id06",
   "grupp": "System",
   "text": "ID06-personalliggare är aktiverad"
  },
  {
   "id": "ataRule",
   "grupp": "ÄTA och störning",
   "text": "Regel satt: inget extraarbete utan underrättelse",
   "kritisk": true
  },
  {
   "id": "ataLink",
   "grupp": "ÄTA och störning",
   "text": "Underrättelse kopplas till tid och kostnad och hänvisar till kontraktet",
   "kritisk": true
  },
  {
   "id": "rule25",
   "grupp": "ÄTA och störning",
   "text": "25-procentsregeln är bevakad"
  },
  {
   "id": "disturbance",
   "grupp": "ÄTA och störning",
   "text": "Rutin finns för störning: underrätta direkt, dagboksnotering samma dag",
   "kritisk": true
  },
  {
   "id": "noticeBeforeInvoice",
   "grupp": "Fakturering",
   "text": "Förhandsavisering går till beställaren innan faktura",
   "kritisk": true
  },
  {
   "id": "invoicePack",
   "grupp": "Fakturering",
   "text": "Fakturapaket per milstolpe är förberett med bilagor"
  },
  {
   "id": "profitHold",
   "grupp": "Fakturering",
   "text": "Vinstuttag hålls rimligt tills riskerna är stängda"
  }
 ],
 "solution": [
  {
   "id": "docs",
   "grupp": "Grind före inköp",
   "text": "Tekniska handlingar är färdiga",
   "kritisk": true
  },
  {
   "id": "internalOk",
   "grupp": "Grind före inköp",
   "text": "Intern beställare har godkänt lösningen",
   "kritisk": true
  },
  {
   "id": "customerOk",
   "grupp": "Grind före inköp",
   "text": "Kunden är informerad skriftligt där det krävs"
  },
  {
   "id": "lead",
   "grupp": "Grind före inköp",
   "text": "Leveranstider matchar tidplanen",
   "kritisk": true
  },
  {
   "id": "cashOk",
   "grupp": "Grind före inköp",
   "text": "Kassaflödet är säkrat för inköpen",
   "kritisk": true
  },
  {
   "id": "risksNoted",
   "grupp": "Grind före inköp",
   "text": "Riskerna är dokumenterade innan beställning"
  },
  {
   "id": "noBuy",
   "grupp": "Grind före inköp",
   "text": "Inga stora inköp släpps innan grinden är grön",
   "kritisk": true
  },
  {
   "id": "sld",
   "grupp": "Teknik",
   "text": "SLD stämmer mot kontraktet",
   "tips": "Spänning, märkström och kortslutningshållfasthet."
  },
  {
   "id": "drawings",
   "grupp": "Teknik",
   "text": "Bygghandlingar är framtagna och godkända av beställaren"
  },
  {
   "id": "sleeves",
   "grupp": "Teknik",
   "text": "Hålbild för kabelgenomföring är låst innan gjutning",
   "kritisk": true
  },
  {
   "id": "cable",
   "grupp": "Teknik",
   "text": "Kabeltyp, dimension och rördimension är fastställda"
  },
  {
   "id": "interfaces",
   "grupp": "Teknik",
   "text": "Interface-lista finns: mark/el, leverantör/site, el/nätägare, brand/drift",
   "kritisk": true
  },
  {
   "id": "geotech",
   "grupp": "Teknik",
   "text": "Geoteknisk rapport är granskad mot kontraktets förutsättningar",
   "tips": "Avvikelse är en ÄTA-trigger. Meddela skriftligt.",
   "kritisk": true
  }
 ],
 "permits": [
  {
   "id": "permit",
   "grupp": "Myndighet",
   "text": "Bygglov är lagakraftvunnet och startbesked finns",
   "kritisk": true
  },
  {
   "id": "av",
   "grupp": "Myndighet",
   "text": "Förhandsanmälan till Arbetsmiljöverket är inskickad och bekräftad",
   "kritisk": true
  },
  {
   "id": "county",
   "grupp": "Myndighet",
   "text": "Anmälan till länsstyrelsen är gjord om fornminne eller naturskydd berörs"
  },
  {
   "id": "heritage",
   "grupp": "Myndighet",
   "text": "Inga fornlämningar eller skyddad vegetation berörs, eller fynd är rapporterade"
  },
  {
   "id": "masses",
   "grupp": "Myndighet",
   "text": "Markföroreningar och KM-klassning av massor är hanterade",
   "kritisk": true
  },
  {
   "id": "gridContract",
   "grupp": "Nätägare",
   "text": "Anslutningsavtal med nätägare är signerat",
   "kritisk": true
  },
  {
   "id": "buildPower",
   "grupp": "Nätägare",
   "text": "Byggström är föranmäld"
  },
  {
   "id": "relay",
   "grupp": "Nätägare",
   "text": "Tekniska krav är avstämda: reläskydd och spänningssättningsprotokoll"
  },
  {
   "id": "gridMeeting",
   "grupp": "Nätägare",
   "text": "Möte med nätägare inför spänningssättning är bokat tidigt",
   "kritisk": true
  },
  {
   "id": "testPlan",
   "grupp": "Provningsplan",
   "text": "Test- och kontrollplan lämnas senast två månader före driftsättning",
   "kritisk": true
  },
  {
   "id": "fat",
   "grupp": "Provningsplan",
   "text": "FAT är planerad hos leverantörerna"
  },
  {
   "id": "sat",
   "grupp": "Provningsplan",
   "text": "SAT-plan och ansvarig är bekräftade"
  }
 ],
 "hseq": [
  {
   "id": "foreNotice",
   "grupp": "Arbetsplatstavla",
   "text": "Förhandsanmälan (kopia) är anslagen"
  },
  {
   "id": "amp",
   "grupp": "Arbetsplatstavla",
   "text": "Arbetsmiljöplan / KMA-plan är projektspecifik och på plats",
   "kritisk": true
  },
  {
   "id": "rules",
   "grupp": "Arbetsplatstavla",
   "text": "Ordnings- och skyddsregler är anslagna"
  },
  {
   "id": "riskPosted",
   "grupp": "Arbetsplatstavla",
   "text": "Riskanalys med åtgärder är anslagen"
  },
  {
   "id": "emergency",
   "grupp": "Arbetsplatstavla",
   "text": "Nödnummer och olycksinsruktion är anslagna",
   "kritisk": true
  },
  {
   "id": "apd",
   "grupp": "Arbetsplatstavla",
   "text": "Aktuell APD-plan är anslagen",
   "tips": "Skalenlig, ungefär 1:400. Skydda träd och byggnader som ska stå kvar.",
   "kritisk": true
  },
  {
   "id": "lastRound",
   "grupp": "Arbetsplatstavla",
   "text": "Senaste skyddsrondsprotokollet är anslaget"
  },
  {
   "id": "rescue",
   "grupp": "Arbetsplatstavla",
   "text": "Räddnings- och säkerhetsplan är anslagen"
  },
  {
   "id": "roads",
   "grupp": "APD och logistik",
   "text": "Transportvägar klarar tunga fordon, helst rundkörning"
  },
  {
   "id": "gates",
   "grupp": "APD och logistik",
   "text": "In- och utfarter mot allmän väg är säkra, TA-plan om det krävs"
  },
  {
   "id": "laydown",
   "grupp": "APD och logistik",
   "text": "Upplag ligger nära inbyggnad och inom kran- eller hissräckvidd"
  },
  {
   "id": "unload",
   "grupp": "APD och logistik",
   "text": "Lossningsplats är markerad och skild från persontrafik",
   "kritisk": true
  },
  {
   "id": "parking",
   "grupp": "APD och logistik",
   "text": "Parkering för personal och besökare är avsatt"
  },
  {
   "id": "spoil",
   "grupp": "APD och logistik",
   "text": "Yta för schaktmassor och mellanlagring är avsatt"
  },
  {
   "id": "huts",
   "grupp": "Bodar och försörjning",
   "text": "Personalbodar inom 100 m, VA-anslutna och uppvärmda"
  },
  {
   "id": "office",
   "grupp": "Bodar och försörjning",
   "text": "Arbetsplatskontor ligger nära infart och bodar"
  },
  {
   "id": "stores",
   "grupp": "Bodar och försörjning",
   "text": "Varm- och kallförråd ligger vid transportväg"
  },
  {
   "id": "hazmat",
   "grupp": "Bodar och försörjning",
   "text": "Farligt gods har egen ventilerad och invallad plats",
   "kritisk": true
  },
  {
   "id": "stations",
   "grupp": "Bodar och försörjning",
   "text": "Stationer för armering, såg och betong är ergonomiskt placerade"
  },
  {
   "id": "cranes",
   "grupp": "Bodar och försörjning",
   "text": "Kranars centrum, radie och plushöjd är angivna och synkade"
  },
  {
   "id": "power",
   "grupp": "Bodar och försörjning",
   "text": "Elcentraler är placerade och kablar skyddade vid vägövergång",
   "kritisk": true
  },
  {
   "id": "light",
   "grupp": "Bodar och försörjning",
   "text": "Belysning på transportvägar och nödbelysning finns"
  },
  {
   "id": "waste",
   "grupp": "Avfall",
   "text": "Miljöstation ligger vid transportväg med tydliga fraktioner"
  },
  {
   "id": "fence",
   "grupp": "Skydd",
   "text": "Inhägnad runt området, vaktbehov bedömt",
   "kritisk": true
  },
  {
   "id": "fire",
   "grupp": "Skydd",
   "text": "Släckutrustning, utrymning och återsamlingsplats är markerade",
   "kritisk": true
  },
  {
   "id": "firstaid",
   "grupp": "Skydd",
   "text": "Första hjälpen, ögondusch och sanering är på plats och kontrollerade",
   "kritisk": true
  },
  {
   "id": "signs",
   "grupp": "Skydd",
   "text": "Orienteringstavla, arbetsplatstavla och varningsskyltar är uppsatta",
   "tips": "Adress, koordinater, BAS-U och räddningstjänstens körväg."
  },
  {
   "id": "sitePermits",
   "grupp": "Skydd",
   "text": "Tillstånd för bodar, skyltar och utfarter är inne"
  },
  {
   "id": "prepWork",
   "grupp": "HSE-dokument",
   "text": "Arbetsberedningar finns för schakt, el, tunga lyft, höjd och ensamarbete",
   "kritisk": true
  },
  {
   "id": "brandPlan",
   "grupp": "HSE-dokument",
   "text": "Brandskyddsplan inkluderar BESS-specifika risker",
   "kritisk": true
  },
  {
   "id": "envPlan",
   "grupp": "HSE-dokument",
   "text": "Miljöplan finns på plats"
  },
  {
   "id": "sds",
   "grupp": "HSE-dokument",
   "text": "Kemikalieförteckning och SDS för fordon och maskiner finns"
  },
  {
   "id": "hotwork",
   "grupp": "HSE-dokument",
   "text": "Heta arbeten är kontrollerade och tillstånd finns vid behov"
  },
  {
   "id": "induction",
   "grupp": "Introduktion",
   "text": "Site-induktion är gjord och signerad för egen personal och UE",
   "kritisk": true
  },
  {
   "id": "id06live",
   "grupp": "Introduktion",
   "text": "ID06 kontrolleras vid ankomst",
   "kritisk": true
  },
  {
   "id": "competence",
   "grupp": "Introduktion",
   "text": "ESA, EBR och körtillstånd är kontrollerade där arbetet kräver det"
  },
  {
   "id": "alone",
   "grupp": "Introduktion",
   "text": "Rutin för ensamarbete är dokumenterad, inte bara muntlig"
  },
  {
   "id": "riskU",
   "grupp": "Löpande",
   "text": "Daglig Risk-U är igång",
   "kritisk": true
  },
  {
   "id": "rounds",
   "grupp": "Löpande",
   "text": "Skyddsronder går enligt plan och protokoll sparas"
  },
  {
   "id": "incident",
   "grupp": "Löpande",
   "text": "Incident rapporteras inom 24 timmar",
   "kritisk": true
  },
  {
   "id": "hseqFine",
   "grupp": "Löpande",
   "text": "HSEQ-vite och konsekvenser är kommunicerade till alla UE"
  }
 ],
 "cbop": [
  {
   "id": "ueContract",
   "grupp": "Schakt och mark",
   "text": "Mark-UE har signerat kontrakt och gjort induktion samt ID06",
   "kritisk": true
  },
  {
   "id": "cablesInGround",
   "grupp": "Schakt och mark",
   "text": "Ledningskoll är gjord innan schakt",
   "kritisk": true
  },
  {
   "id": "dailyRisk",
   "grupp": "Schakt och mark",
   "text": "Daglig Risk-U dokumenteras under schakt"
  },
  {
   "id": "bottom",
   "grupp": "Schakt och mark",
   "text": "Schaktbotten är kontrollerad mot geotekniken",
   "kritisk": true
  },
  {
   "id": "deviation",
   "grupp": "Schakt och mark",
   "text": "Geoteknisk avvikelse skrivs i dagboken och underrättas skriftligt samma dag",
   "tips": "Sten, lera, grundvatten eller förorenat material är en potentiell ÄTA.",
   "kritisk": true
  },
  {
   "id": "km",
   "grupp": "Schakt och mark",
   "text": "KM-klassning av massor är kontrollerad, labb vid osäkerhet"
  },
  {
   "id": "selfDig",
   "grupp": "Schakt och mark",
   "text": "Egenkontroll schaktbotten är signerad och lagrad"
  },
  {
   "id": "drain",
   "grupp": "Schakt och mark",
   "text": "Dränering och slamavskiljning innan avledning är säkrad"
  },
  {
   "id": "ducts",
   "grupp": "Kabel och jord",
   "text": "Kabelrör ligger i rätt dimension och läge mot hålbilden",
   "kritisk": true
  },
  {
   "id": "earth",
   "grupp": "Kabel och jord",
   "text": "Jordtag är installerat och mätprotokoll finns"
  },
  {
   "id": "backfill",
   "grupp": "Kabel och jord",
   "text": "Kringfyllning utan sten mot kabel och kompaktering är kontrollerad"
  },
  {
   "id": "sleeveLock",
   "grupp": "Betong",
   "text": "Hålbild är verifierad mot gällande ritning innan gjutning",
   "kritisk": true
  },
  {
   "id": "bessFound",
   "grupp": "Betong",
   "text": "Fundament stämmer mot batterileverantörens krav"
  },
  {
   "id": "swFound",
   "grupp": "Betong",
   "text": "Fundament stämmer mot ställverksleverantörens krav"
  },
  {
   "id": "rebar",
   "grupp": "Betong",
   "text": "Betongkvalitet och armering är verifierade"
  },
  {
   "id": "cure",
   "grupp": "Betong",
   "text": "Härdningstid respekteras innan belastning",
   "kritisk": true
  },
  {
   "id": "flat",
   "grupp": "Betong",
   "text": "Planhet är kontrollerad mot leverantörens tolerans",
   "kritisk": true
  },
  {
   "id": "inspBess",
   "grupp": "Betong",
   "text": "Inspektion av batterifundament är protokollförd"
  },
  {
   "id": "inspHouse",
   "grupp": "Betong",
   "text": "Besiktning av grund till stationshus är gjord"
  },
  {
   "id": "selfConc",
   "grupp": "Betong",
   "text": "Egenkontroll betong är signerad och lagrad"
  }
 ],
 "ebop": [
  {
   "id": "windows",
   "grupp": "Innan leverans",
   "text": "Leveransfönster är skriftligt bekräftade med alla leverantörer",
   "kritisk": true
  },
  {
   "id": "bearing",
   "grupp": "Innan leverans",
   "text": "Lossningsyta och markbärighet är verifierade",
   "kritisk": true
  },
  {
   "id": "access",
   "grupp": "Innan leverans",
   "text": "Tillfart: bredd, höjd, bärighet och vändning för långa fordon"
  },
  {
   "id": "liftPlan",
   "grupp": "Innan leverans",
   "text": "Lyftplan är upprättad och godkänd, redskap besiktade",
   "kritisk": true
  },
  {
   "id": "exclusion",
   "grupp": "Innan leverans",
   "text": "Avspärrning: inga obehöriga i lyftzon"
  },
  {
   "id": "planB",
   "grupp": "Innan leverans",
   "text": "Plan B finns för väder, kranfel, fel leverans och försening"
  },
  {
   "id": "swDate",
   "grupp": "Ställverk",
   "text": "Inget installationsarbete på ställverk är planerat före bekräftad leverans",
   "kritisk": true
  },
  {
   "id": "swFat",
   "grupp": "Ställverk",
   "text": "FAT för ställverk är genomförd"
  },
  {
   "id": "swRecv",
   "grupp": "Ställverk",
   "text": "Leverans kontrollerad mot följesedel och FAT, skador anmälda direkt"
  },
  {
   "id": "swMount",
   "grupp": "Ställverk",
   "text": "Ställverk monterat och anslutningar stämda mot SLD"
  },
  {
   "id": "swSelf",
   "grupp": "Ställverk",
   "text": "Egenkontroll ställverk är klar"
  },
  {
   "id": "bessDate",
   "grupp": "Battericontainrar",
   "text": "Inget batterimontage är planerat före bekräftad leverans",
   "kritisk": true
  },
  {
   "id": "bessOrder",
   "grupp": "Battericontainrar",
   "text": "Montageordning är fastställd"
  },
  {
   "id": "bessLift",
   "grupp": "Battericontainrar",
   "text": "Lyft utförda enligt lyftplan, visuell kontroll mot leveranslista"
  },
  {
   "id": "bessDmg",
   "grupp": "Battericontainrar",
   "text": "Transportskador dokumenterade och anmälda till leverantören direkt"
  },
  {
   "id": "bessAnchor",
   "grupp": "Battericontainrar",
   "text": "Containrar sitter på fundament med planhet, passning och förankring kontrollerad",
   "kritisk": true
  },
  {
   "id": "skid",
   "grupp": "MV-skid och transformatorer",
   "text": "MV-skid och transformatorer är mottagna, oljetråg utan läckage"
  },
  {
   "id": "skidPlace",
   "grupp": "MV-skid och transformatorer",
   "text": "Placering, förankring och anslutning mot battericontainrar är verifierad"
  },
  {
   "id": "ebopUe",
   "grupp": "Elektrisk installation",
   "text": "eBoP-underentreprenör är kontrakterad innan produktion",
   "kritisk": true
  },
  {
   "id": "mvTerm",
   "grupp": "Elektrisk installation",
   "text": "MV-anslutningar: märkning, krimpning och isolationstest"
  },
  {
   "id": "lv",
   "grupp": "Elektrisk installation",
   "text": "LV-arbeten och kabelmärkning är klara enligt märkplan"
  },
  {
   "id": "bond",
   "grupp": "Elektrisk installation",
   "text": "Jordning och potentialutjämning är verifierade",
   "kritisk": true
  },
  {
   "id": "ems",
   "grupp": "Elektrisk installation",
   "text": "EMS-kommunikation är verifierad. Fiber/SCADA har tydlig scope-gräns"
  },
  {
   "id": "selfEl",
   "grupp": "Elektrisk installation",
   "text": "Egenkontroll elinstallation är klar"
  },
  {
   "id": "cablePull",
   "grupp": "Kabel",
   "text": "MV-kabel av rätt typ, böjradie och dragkraft respekterade"
  },
  {
   "id": "sheath",
   "grupp": "Kabel",
   "text": "Mantelprovning och kabeltester är protokollförda",
   "kritisk": true
  }
 ],
 "commission": [
  {
   "id": "planIn",
   "grupp": "Förberedelse",
   "text": "Test- och kontrollplan är överlämnad i tid",
   "kritisk": true
  },
  {
   "id": "satOk",
   "grupp": "Förberedelse",
   "text": "SAT är bekräftad med batterileverantör och beställare"
  },
  {
   "id": "fatsIn",
   "grupp": "Förberedelse",
   "text": "FAT-protokoll från alla leverantörer är insamlade och granskade"
  },
  {
   "id": "eslThere",
   "grupp": "Förberedelse",
   "text": "Elsäkerhetsledare är tillgänglig under driftsättning",
   "kritisk": true
  },
  {
   "id": "energProc",
   "grupp": "Förberedelse",
   "text": "Spänningssättningsprocedur är verifierad med nätägaren"
  },
  {
   "id": "relaySet",
   "grupp": "Förberedelse",
   "text": "Reläskyddsinställningar är kontrollerade och dokumenterade"
  },
  {
   "id": "esa",
   "grupp": "Elsäkerhet",
   "text": "Risk-U, frånkoppling, blockering och spänningsprovning före varje elarbete",
   "kritisk": true
  },
  {
   "id": "earthWork",
   "grupp": "Elsäkerhet",
   "text": "Arbetsjordning och potentialutjämning är säkrade"
  },
  {
   "id": "ppe",
   "grupp": "Elsäkerhet",
   "text": "Isolerande handskar, personlig skyddsutrustning och avspärrning är kontrollerade"
  },
  {
   "id": "iso",
   "grupp": "Prov",
   "text": "Isolationstest och mantelprovning av MV-kablar är godkända"
  },
  {
   "id": "earthOk",
   "grupp": "Prov",
   "text": "Jordtagsmätning är godkänd"
  },
  {
   "id": "relayTest",
   "grupp": "Prov",
   "text": "Reläprovning är protokollförd"
  },
  {
   "id": "bessSat",
   "grupp": "Prov",
   "text": "Funktionsprov av battericontainrar (SAT) är godkänd"
  },
  {
   "id": "scada",
   "grupp": "Prov",
   "text": "EMS, SCADA och larmkedja är verifierade"
  },
  {
   "id": "gridTest",
   "grupp": "Prov",
   "text": "Nätanslutningstest, inkopplingstransient och skyddsutlösning är gjorda"
  },
  {
   "id": "capacity",
   "grupp": "Prov",
   "text": "Kapacitetstest är dokumenterat"
  },
  {
   "id": "live",
   "grupp": "Driftsättning",
   "text": "Spänningssättning gjord av behörig personal tillsammans med nätägaren",
   "kritisk": true
  },
  {
   "id": "vendorOnSite",
   "grupp": "Driftsättning",
   "text": "Leverantörens tekniker är på plats vid uppstart av batterisystem"
  },
  {
   "id": "cycle",
   "grupp": "Driftsättning",
   "text": "Initial ladd- och urladdningscykel är genomförd"
  },
  {
   "id": "m5",
   "grupp": "Driftsättning",
   "text": "Batterisystem verifierat av leverantören enligt milstolpe",
   "kritisk": true
  },
  {
   "id": "fireTest",
   "grupp": "Driftsättning",
   "text": "Brandlarm, brandsystem och nödstopp är funktionstestade",
   "kritisk": true
  },
  {
   "id": "readyInsp",
   "grupp": "Driftsättning",
   "text": "Driftberedskapsbesiktning är genomförd"
  },
  {
   "id": "protocols",
   "grupp": "Dokumentation",
   "text": "Alla provningsprotokoll, avvikelser och intyg samlas löpande, inte i slutet",
   "kritisk": true
  }
 ],
 "closeout": [
  {
   "id": "pre",
   "grupp": "Slutbesiktning",
   "text": "Intern förgranskning är gjord och egna anmärkningar åtgärdade",
   "kritisk": true
  },
  {
   "id": "packQc",
   "grupp": "Slutbesiktning",
   "text": "Egenkontroller och provningsprotokoll är sammanställda"
  },
  {
   "id": "asbuilt",
   "grupp": "Slutbesiktning",
   "text": "As-built och relationshandlingar är granskade internt",
   "kritisk": true
  },
  {
   "id": "manuals",
   "grupp": "Slutbesiktning",
   "text": "Drift- och underhållsmanualer samt garantibevis är insamlade"
  },
  {
   "id": "people",
   "grupp": "Slutbesiktning",
   "text": "Beställarens besiktningsmän är bokade"
  },
  {
   "id": "call",
   "grupp": "Slutbesiktning",
   "text": "Skriftlig kallelse till slutbesiktning är skickad inom kontraktstid",
   "kritisk": true
  },
  {
   "id": "done",
   "grupp": "Slutbesiktning",
   "text": "Slutbesiktning är genomförd och protokollet signerat"
  },
  {
   "id": "m6",
   "grupp": "Slutbesiktning",
   "text": "Godkänd besiktning är kopplad till slutfakturans utlösare"
  },
  {
   "id": "punch",
   "grupp": "Punchlista",
   "text": "Punchlista har ägare och datum per punkt"
  },
  {
   "id": "punchClosed",
   "grupp": "Punchlista",
   "text": "Punkterna är åtgärdade, verifierade och formellt stängda",
   "kritisk": true
  },
  {
   "id": "m7",
   "grupp": "Punchlista",
   "text": "Slutfaktura för stängd punchlista är skickad med underlag"
  },
  {
   "id": "docs",
   "grupp": "Slutdokumentation",
   "text": "Jordtag, reläprov, kabeltest, SAT, FAT och CE-intyg ligger i paketet"
  },
  {
   "id": "elHandover",
   "grupp": "Slutdokumentation",
   "text": "Elsäkerhetsanläggningen är överlämnad av elsäkerhetsledaren",
   "kritisk": true
  },
  {
   "id": "warrantyList",
   "grupp": "Slutdokumentation",
   "text": "Garantiförteckning med start- och slutdatum per komponent"
  },
  {
   "id": "opsHandover",
   "grupp": "Slutdokumentation",
   "text": "Överlämning till driftansvarig är dokumenterad"
  },
  {
   "id": "ataFile",
   "grupp": "Ekonomi",
   "text": "Varje ÄTA har skriftlig underrättelse och dagboksnotering",
   "kritisk": true
  },
  {
   "id": "ataClosed",
   "grupp": "Ekonomi",
   "text": "Alla ÄTA är godkända eller formellt avvisade, och lagda i slutfakturan",
   "kritisk": true
  },
  {
   "id": "eac",
   "grupp": "Ekonomi",
   "text": "Slutkostnad (EAC) utfall mot budget är framtagen"
  },
  {
   "id": "invoices",
   "grupp": "Ekonomi",
   "text": "Alla milstolpsfakturor är betalda och bokförda"
  },
  {
   "id": "settlement",
   "grupp": "Ekonomi",
   "text": "Slutreglering är signerad av båda parter",
   "kritisk": true
  },
  {
   "id": "index",
   "grupp": "Ekonomi",
   "text": "Eventuell indexreglering är beräknad"
  },
  {
   "id": "guaranteeRelease",
   "grupp": "Ekonomi",
   "text": "Frigivning av bankgaranti är bevakad till garantitidens slut"
  },
  {
   "id": "ifsClose",
   "grupp": "Internt avslut",
   "text": "Projektet är stängt i IFS och UE-kontrakt är avslutade"
  },
  {
   "id": "reportOut",
   "grupp": "Internt avslut",
   "text": "Projektrapport och redovisning till styrgrupp/ombud är gjord"
  },
  {
   "id": "kickout",
   "grupp": "Erfarenhet",
   "text": "Kick-out är hållen: vad som gick bra, vad som kostade, vad som aldrig ska göras igen",
   "kritisk": true
  },
  {
   "id": "lessonsSent",
   "grupp": "Erfarenhet",
   "text": "Lärdomarna är skickade till närmaste chef och teamet"
  },
  {
   "id": "warrantyOps",
   "grupp": "Garanti",
   "text": "Garantivillkor, kontaktperson och anmälningsrutin är kommunicerade till drift",
   "kritisk": true
  },
  {
   "id": "warrantyInspect",
   "grupp": "Garanti",
   "text": "Garantibesiktning är planerad om kontraktet kräver det"
  }
 ],
 "kickoff": [
  {
   "id": "contractKnown",
   "grupp": "Före startmötet",
   "text": "Kontraktskännedom: vad som ingår och inte ingår, hur, när och vem",
   "kritisk": true
  },
  {
   "id": "flow",
   "grupp": "Före startmötet",
   "text": "Arbetsflödet är beskrivet i en flödesprocess"
  },
  {
   "id": "critLine",
   "grupp": "Före startmötet",
   "text": "Kritiska linjen är känd och planen är realistisk mot riskerna",
   "kritisk": true
  },
  {
   "id": "risksKnown",
   "grupp": "Före startmötet",
   "text": "Riskerna är värderade (undvikna, minimerade, accepterade) och teamet känner till dem",
   "kritisk": true
  },
  {
   "id": "calcGone",
   "grupp": "Före startmötet",
   "text": "Kalkylen är genomgången: var vi går in med förlust och var vi tjänar pengar"
  },
  {
   "id": "profitParts",
   "grupp": "Före startmötet",
   "text": "Lönsamma och olönsamma delar är listade, slöserier och synergier med andra avtal identifierade"
  },
  {
   "id": "commsPlan",
   "grupp": "Före startmötet",
   "text": "Kommunikationsplan finns och byggmöten är bokade med periodicitet"
  },
  {
   "id": "invoiceTemplate",
   "grupp": "Före startmötet",
   "text": "Mall för fakturaunderlag är klar"
  },
  {
   "id": "nextSteps",
   "grupp": "Före startmötet",
   "text": "Nästa steg och inköp inför start är beslutade"
  },
  {
   "id": "kickoffHeld",
   "grupp": "Före startmötet",
   "text": "Uppstartsavstämningen är genomförd med intern beställare före startmötet",
   "tips": "Grind inför uppstarten (G1). Startmötet med kunden hålls efteråt.",
   "kritisk": true
  }
 ]
};

export const ROLLER = [
 {
  "id": "internalClient",
  "namn": "Intern beställare"
 },
 {
  "id": "steering",
  "namn": "Styrgrupp"
 },
 {
  "id": "pl",
  "namn": "Projektledare"
 },
 {
  "id": "site",
  "namn": "Platschef"
 },
 {
  "id": "basP",
  "namn": "BAS-P"
 },
 {
  "id": "basU",
  "namn": "BAS-U"
 },
 {
  "id": "esl",
  "namn": "Elsäkerhetsledare",
  "tips": "Ska vara formellt utsedd och dokumenterad."
 },
 {
  "id": "hse",
  "namn": "HSE / KMA"
 },
 {
  "id": "quality",
  "namn": "Kvalitetsansvarig"
 },
 {
  "id": "environment",
  "namn": "Miljösamordnare"
 },
 {
  "id": "customer",
  "namn": "Kundens representant"
 },
 {
  "id": "ombud",
  "namn": "Ombud",
  "tips": "Kontrollera att fullmakten stämmer."
 }
];
