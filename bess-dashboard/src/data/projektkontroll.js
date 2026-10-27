import { FASER } from "./bessChecklistData.ts";
import { FALTMALLAR } from "./faltmaterial.js";
export const PROJEKTKONTROLL_REVISION = "2026-10-17.1";
export const PROJEKTKONTROLL_INLEDNING = "Följ projektet från första förberedelse till garantiuppföljning. Kontrollera arbetet mot rätt kontrakt, ritning, kontrollplan och tillverkarmanual. Skriv verkligt resultat, datum, kontrollant och bevis. För leverantörspunkter avser ONE:s kvittens mottaget/granskat underlag; leverantörens utförare och protokoll ska framgå. Öppna ansvarsgränser måste först fastställas skriftligt. STOPP betyder att utsedd ansvarig måste ge klartecken. En ifylld lista ersätter inte provprotokoll, tillstånd eller underskrift.";
/** @type {Array<[string, string[][]]>} */
const steg = [
  ["Förstudie och krav", [
    ["Bestäm anläggningens mål", "Bekräfta effekt, energimängd, användning och beställarens funktionskrav. Ange kravspecifikationens revision.", "Projektledare"],
    ["Kontrollera platsen", "Kontrollera markåtkomst, transporter, utrymme, omgivning och möjlig nätanslutning. Dokumentera begränsningar före val av lösning.", "Projektledare / projektör"],
    ["Samla platsens underlag", "Samla mark- och geotekniskt underlag, ledningsanvisning och tillgängliga ritningar. Markera vad som saknas och vem som tar fram det.", "Projektledare"],
    ["Besluta nästa steg", "Gå igenom kända risker och öppna frågor med beställaren. Dokumentera beslutet att gå vidare och villkoren för nästa steg.", "Projektledare / beställare"],
  ]],
  ["Kontrakt och ansvar", [
    ["Kontrollera kontraktshandlingarna", "Samla undertecknat kontrakt, handlingarnas ordning och projektets avtalade regler. Anteckna vilka ändringar och reservationer som gäller.", "Projektledare"],
    ["Skriv vem som gör vad", "Bekräfta AC2C-gränser mellan ONE/UE, CATL, PE, stationsleverantör, Techinova, FlexGen, IC, Sweco och nätägare. Aktivitetslistans workshopantaganden, IF05 och Customer-ledda prov kräver skriftlig bekräftelse. Fördela mark, fundament, oljegrop, kablar, jordning, stängsel och idrifttagning.", "Projektledare"],
    ["Bestäm kontaktvägar och beslut", "Utse ansvariga för projektering, BAS-P/BAS-U, elarbete, lyft, provning och beställarens beslut. Skriv vem som får beställa ändringar.", "Projektledare"],
    ["Bestäm kontrollplan och tidplan", "Gå igenom kontrollpunkter, stoppunkter, bevittnade prov och leveranser med beställaren. Ange godkänd kontrollplan och planerad överlämning.", "Projektledare / beställare"],
  ]],
  ["Tillstånd och nätanslutning", [
    ["Lista tillstånd och anmälningar", "Gör en projektanpassad lista över tillstånd, markavtal och myndighetsanmälningar. Skriv ansvarig, villkor och beslut/referens för varje ärende.", "Projektledare"],
    ["Bekräfta nätägarens villkor", "Bekräfta anslutningspunkt, kapacitet, nätkrav, skydd, mätning och gränsdragning med nätägaren. Spara skriftligt besked.", "Projektledare / nätägare"],
    ["Samordna brand och omgivning", "Gå igenom brandskydd, räddningsvägar, buller, dagvatten och oljehantering med ansvariga projektörer och berörda parter. Dokumentera projektets lösning.", "Projektledare / projektörer"],
    ["STOPP – kontrollera byggstartsvillkor", "Kontrollera att beslut och villkor för det arbete som ska starta är uppfyllda. Starta inte berört arbete innan utsedd ansvarig har gett klartecken.", "Projektledare"],
  ]],
  ["Projektering och granskning", [
    ["Granska layout och serviceutrymmen", "Kontrollera placering, avstånd, dörröppningar, servicevägar, lyft och framtida utbyte mot godkänd layout och tillverkarens krav.", "Projektör / projektledare"],
    ["Granska mark och fundament", "Kontrollera bärighet, höjder, dränering, fundament, förankring och oljegrop. Säkerställ att ritningarna passar levererad utrustning.", "Mark- och konstruktionsprojektör"],
    ["Granska el och skydd", "Granska enlinjeschema, AC/MV/DC, kabeldimensionering, skydd, jordning, åskskydd, hjälpkraft och nätägarens gränssnitt. Spara granskade beräkningar och inställningar.", "Elprojektör"],
    ["Granska styrning och säkerhetsfunktioner", "Bekräfta kommunikationslista, EMS/SCADA, nödstopp, brandlarm, kylning och signalgränser mellan leverantörer. Spara godkända scheman.", "Styr-/brandprojektör / OEM"],
    ["STOPP – släpp rätt bygghandlingar", "Kontrollera att kritiska frågor är lösta och att rätt revision är godkänd för utförande. Ta bort gamla ritningar från arbetslaget.", "Projekteringsledare"],
  ]],
  ["Inköp och leveransplan", [
    ["Beställ rätt utrustning", "Kontrollera beställningar mot granskade krav och gränsdragning. Bekräfta BESS, PCS/MV-skid, transformator, ställverk och hjälpsystem.", "Projektledare / inköp"],
    ["Bekräfta ledtider och leveransinnehåll", "Bekräfta leveransdatum, mottagningsplats, lossning, lyftdon, lösa delar, säkringar, reservdelar och dokumentation. Skriv vad vi själva måste ordna.", "Projektledare"],
    ["Kontrollera fabriksprov", "Gå igenom avtalade fabriksprov och protokoll. Registrera öppna fel och beslut om leverans. Ange utrustningens serienummer.", "Projektledare / leverantör"],
    ["Planera leverantörens tekniker", "Boka leverantörens insatser för montagekontroll, programvara och idrifttagning. Bekräfta vad som måste vara klart innan de kommer.", "Projektledare / OEM"],
  ]],
  ["Etablering och arbetsmiljö", [
    ["Gör arbetsberedningar", "Gå igenom projektets arbetsmiljöplan och risker. Gör arbetsberedning för schakt, lyft, elarbete och arbete på höjd. Ange ansvarig och räddningsplan.", "BAS-U / arbetsledare"],
    ["Säkra arbetsområdet", "Ordna byggstängsel, avspärrningar, skyltning, gångvägar, byggtrafik och räddningsvägar enligt platsens plan. Kontrollera innan arbetet börjar.", "Arbetsledare / montör"],
    ["Kontrollera personal och resurser", "Kontrollera platsintroduktion, ID06 och kompetens för varje arbete. Fördela arbetet och specialistarbeten. Bestäm verktyg och skydd efter riskbedömning.", "Arbetsledare"],
    ["STOPP – ge startbesked", "Bekräfta att området är säkert, rätt underlag finns och arbetslagen vet vem som gör vad. Signera startbesked för aktuellt arbete.", "Arbetsledare / BAS-U"],
  ]],
  ["Mark, schakt och dagvatten", [
    ["Kontrollera ledningar och utsättning", "Kontrollera ledningsanvisning och utsättning före schakt. Märk arbetsområdet och dokumentera kända ledningar och skyddsåtgärder.", "Markentreprenör / arbetsledare"],
    ["Kontrollera schakt och massor", "Kontrollera schaktbotten, markförhållanden och masshantering mot underlaget. Stoppa berört arbete och dokumentera oväntad betong, ledningar eller avvikande mark.", "Markentreprenör"],
    ["Kontrollera uppbyggnad och packning", "Kontrollera material, lager, höjder och packning enligt bygghandlingen. Spara mätning/prov och foton före nästa lager.", "Markentreprenör / kontrollant"],
    ["Kontrollera vatten och tillfart", "Kontrollera dränering, dagvatten, transportväg och bärighet för leverans/kran. Dokumentera innan tunga leveranser bokas.", "Markentreprenör / arbetsledare"],
  ]],
  ["Fundament, betong och oljegrop", [
    ["Kontrollera före gjutning", "Kontrollera form, armering, ingjutningsgods, kabelhål, jordanslutningar och oljegrop mot rätt ritning. Fotografera sådant som byggs in.", "Betongentreprenör / kontrollant"],
    ["STOPP – godkänn gjutstart", "Kontrollanten granskar arbetet före gjutning. Dokumentera avvikelser och klartecken; gjut inte över ett öppet fel.", "Kontrollant / arbetsledare"],
    ["Dokumentera betongen", "Spara leveransuppgifter, föreskrivna prov, härdning och efterbehandling. Kontrollera att fundamentet får belastas enligt ansvarig konstruktör.", "Betongentreprenör"],
    ["Kontrollera färdigt fundament", "Mät läge, nivå, planhet och höjd. Kontrollera förankring och oljegropens utförande mot ritningen. Lämna mätprotokoll till montaget.", "Kontrollant / montör"],
  ]],
  ["Jordning och åskskydd", [
    ["Kontrollera innan jordningen täcks", "Kontrollera jordledare, skarvar, anslutningar och märkning enligt ritningen. Ta foto och uppdatera relationsunderlaget innan återfyllning.", "Utsedd elpersonal"],
    ["Kontrollera alla enheters jordning", "Kontrollera BESS, PCS, transformator, ställverk och andra föreskrivna delar mot jordningsritningen. Märk och dokumentera anslutningarna.", "Utsedd elpersonal"],
    ["Mät jordningen", "Utför föreskrivna mätningar med rätt metod och instrument. Ange mätpunkter, verkliga värden och acceptanskrav i protokollet.", "Kontrollant"],
    ["Granska jordningsprotokollet", "Ansvarig granskar att resultatet uppfyller projekteringen. Dokumentera åtgärder och ny kontroll där resultatet inte godtas.", "Elprojektör / kontrollant"],
  ]],
  ["Kabelgravar, kanalisation och kablar", [
    ["Kontrollera gravar och rör", "Kontrollera läge, djup, separation, böjar, rör och kabelbädd mot ritningen. Ta foto och mät innan arbetet täcks.", "Mark-/elentreprenör"],
    ["Kontrollera kabeln före och under dragning", "Kontrollera kabeltyp, längd, skador, dragmetod och böjradie. Dokumentera kabel-ID från rulle till slutlig förläggning.", "Utsedd elpersonal"],
    ["Märk och mät kablar", "Märk kablar i båda ändar och utför föreskrivna prov enligt godkänd provplan. Spara mätprotokoll per kabel.", "Utsedd elpersonal / kontrollant"],
    ["STOPP – godkänn före återfyllning", "Kontrollera foton, utsättning, skydd, märkning och kabelprov innan gravar fylls. Spara relationsmått och klartecken.", "Kontrollant / arbetsledare"],
  ]],
  ["Stationshus, transformator och ställverk", [
    ["Kontrollera stationens placering", "Kontrollera hus, ventilation, kabelvägar, åtkomst, hjälpkraft och fuktskydd mot bygghandlingarna. Dokumentera färdigt utförande.", "Stationsentreprenör / kontrollant"],
    ["Kontrollera AC och mellanspänning", "Kontrollera kabelavslut, anslutningar, moment och märkning. Låt utsedd kompetent personal utföra och dokumentera arbetet enligt anvisningar.", "Utsedd elpersonal"],
    ["Ta emot stationsleverantörens prov", "Ta emot leverantörens transformator-, ställverks- och skyddsprotokoll via IC:s SAT-samordning. Granska gränssnitt mot ONE:s externa BoP-anslutningar och dokumentera öppna fel.", "ONE mottagningskontroll / stationsleverantör"],
    ["STOPP – lämna stationen till provledaren", "Samla protokoll, aktuellt enlinjeschema och lista över öppna fel. Utsedd ansvarig ger klartecken för nästa kontrollsteg.", "Provledare / arbetsledare"],
  ]],
  ["Leverans, lyft och placering", [
    ["Gör mottagningskontroll", "Kontrollera levererad utrustning och lösa delar mot leveranslistan. Anteckna serienummer. Fotografera transportskador och meddela ansvarig direkt.", "Montör / arbetsledare"],
    ["Placera och rikta upp", "Placera enligt godkänd layout och lyftplan. Kontrollera nivå, dockning, förankring och tillträde. Lämna över en stabil, säker enhet för anslutning.", "Montör / lyftansvarig"],
  ]],
  ["Anslutningar och säkerhetssystem", [
    ["Kontrollera gränssnitten", "Kontrollera AC/DC, hjälpkraft, styrning, fiber, EMS/SCADA och leverantörens gränser mot aktuella scheman. Dokumentera vem som har utfört varje del.", "Utsedd el-/styrpersonal"],
    ["STOPP – lämna montaget till provning", "Samla förkontroller, momentprotokoll, kabelprov och öppna fel. Provledare/OEM tar emot anläggningen och anger vad som måste åtgärdas före provning.", "Arbetsledare / provledare / OEM"],
  ]],
  ["Provning och idrifttagning", [
    ["Bekräfta provansvar och gränser", "Bekräfta utsedda tekniker, provplan, kopplingsplan, bevittnade prov och acceptanskrav. Separera vårt förarbete från leverantörens programmering/idrifttagning.", "Provledare / OEM / projektledare"],
    ["Granska samlade provresultat", "Samla cold/hot-, skydds-, nät-, signal-, kapacitets- och RTE-protokoll enligt avtalad omfattning. Registrera avvikelser och godkänd omprovning.", "Provledare / OEM / beställare"],
    /* Anläggningsprov före drifttagning (projektmetoden § 5.6, protokoll Anläggningsprov.docx).
       Varje prov: kontrollerad, datum, signatur eller Ej tillämplig med motivering. */
    ["Anläggningsprov: kretsprovning", "Prova kretsarna mot kretsschemat. Markera godkända kretsar i schemat och ange schemats revision som bevis.", "Provledare / elinstallatör"],
    ["Anläggningsprov: isolationsmätning", "Mät isolationen på ställverk, transformatorer och matande kablar före spänningssättning. Ange mätvärden och instrument i protokollet.", "Provledare / elinstallatör"],
    ["Anläggningsprov: strömmätkretsar", "Kontrollera börda, riktning och funktion i strömmätkretsarna.", "Provledare / reläprovare"],
    ["Anläggningsprov: spänningsmätkretsar", "Kontrollera spänningsfall, riktning och funktion i spänningsmätkretsarna.", "Provledare / reläprovare"],
    ["Anläggningsprov: ledningsimpedans", "Mät ledningsimpedansen där utlösningsvillkoret är osäkert. Ej tillämplig kräver motivering.", "Provledare / elinstallatör"],
    ["Anläggningsprov: spänningssättning av matningskretsar", "Spänningssätt matningskretsarna enligt kopplingsplan, med behörig personal och skriftliga arbetsbevis.", "Elsäkerhetsledare / provledare"],
    ["Anläggningsprov: funktionsprov delsystem", "Funktionsprova varje delsystem med utrustningens ägare närvarande. Registrera deltagare.", "Provledare / utrustningsägare"],
    ["Anläggningsprov: övriga prov", "Registrera övriga prov som kontraktet eller nätägaren kräver, eller Ej tillämplig med motivering.", "Provledare"],
    ["Nätanslutningstest med nätägaren", "Genomför överensstämmelseprovning enligt nätägarens krav (projektmetoden § 5.2.1). Ange nätägarens protokoll som bevis.", "Provledare / nätägare"],
    ["Inkopplingstransient och skyddsutlösning", "Verifiera att inrusningsström vid inkoppling (5–10 × märkström) inte ger felutlösning. Ange reläinställningar och protokoll.", "Reläprovare / provledare"],
  ]],
  ["Besiktning och överlämning", [
    ["Kontrollera att anläggningen är färdig", "Kontrollera markytor, vägar, stängsel, grindar, skyltning, åtkomst och städning. Kontrollera att inga tillfälliga skydd döljer öppna arbeten.", "Arbetsledare"],
    ["Samla besiktningsunderlaget", "Samla egenkontroller, provprotokoll, relationsritningar och kvarstående åtgärdslista. Ange omfattning och vilka enheter varje kontroll gäller.", "Projektledare"],
    ["Genomför besiktning och åtgärder", "Registrera besiktningsanmärkningar med ansvarig och datum. Dokumentera rättelse och ny kontroll; ett utskickat dokument stänger inte ett fel.", "Projektledare / ansvarig utförare"],
    ["Dokumentera överlämningen", "Dokumentera utbildning, driftansvar, nycklar, åtkomst, nödlägesrutiner och beställarens mottagande enligt kontraktet.", "Projektledare / beställare"],
  ]],
  ["Slutdokumentation och garanti", [
    ["Gör ett tydligt dokumentindex", "Samla relationsritningar, kabel-/jordnings-/momentprotokoll, brand- och säkerhetsprov, leverantörsmanualer, programversioner och drift-/underhållsanvisningar. Ange dokumentnamn och revision.", "Projektledare / dokumentansvarig"],
    ["Granska egenkontrollrapporten", "Kontrollera alla resultat, datum, kontrollanter och bevis. Motivera Ej tillämplig. Öppna kontroller och avvikelser ska redovisas, inte gömmas.", "Projektledare / granskare"],
    ["Lämna slutdokumentationen", "Lämna avtalad dokumentation och egenkontrollrapport till beställaren. Registrera leveransreferens och mottagningsbesked. Ta underskrifter enligt projektets rutiner.", "Projektledare / beställare"],
    ["Planera garantiuppföljningen", "Bekräfta garantistart, serviceplan, kontaktvägar, reservdelar och tid för uppföljning enligt kontraktet. Lämna över kvarstående frågor till driftorganisationen.", "Projektledare / driftansvarig"],
  ]],
];
/* Arbetssteg som tidigare låg i lagplanen (data/lagplan.js, borttagen 2026-10-27).
   Id:n behålls tills fältmaterialet får checklistans nummer. */
const p = (id, titel, instruktion, roll, verifiering = "") => ({ id, titel, instruktion, roll, verifiering, epc: [] });
const STEG = Object.fromEntries([
  p("A.03", "Förbered lyftet", "Jämför enhetens vikt, tyngdpunkt och lyftpunkter med lyftplanen. Kontrollera lyftdon tillsammans med lyftansvarig. Bestäm vem som signalerar till kranföraren och var styrlinorna används.", "Montör / lyftansvarig", "Använd inte uppgift om 17-tonsschacklar utan godkänd dimensionering. Vindgräns och lyftvinklar tas från aktuell lyftplan/tillverkare."),
  p("A.04", "STOPP – frigör lyftområdet", "Kontrollera att ingen annan finns i riskområdet. Ingen får stå under lasten eller mellan enheten och fundamentet. Lyftansvarig ger klartecken före lyft.", "Lyftansvarig / montör"),
  p("B.02", "STOPP – bekräfta PE:s klartecken före DC-anslutning", "Kontrollera typskylten: PCSK/PCSM (BESS) har inga fältmonterade DC-säkringar – säkringsmontering gäller bara HEM/HEMK (fotnot 1, PE INVG3MHW01). Ta emot PE:s klartecken och följ godkänd montageanvisning före ONE:s externa DC-anslutning. Dokumentera modell, utförare, protokoll och frisläppning.", "Montör / PE / utsedd kontrollant", "Kritisk uppgift från projektunderlaget. Bekräfta ordningen mot rätt PE-modell och arbetsberedning. Inga kablar får anslutas innan denna stoppunkt har frisläppts."),
  p("B.03", "Dra och fördela DC-kablar", "Följ kabellistan från BESS till PCS. Skydda kablarna och håll rätt böjradie. Kontrollera antal, dimension och fördelning per DC-block. Skriv kontrollen i kabellistan.", "Montör", "Underlaget anger högst två kablar och 400 A per terminal samt högst ±20 % avvikelse mellan block. Bekräfta definition, dimensionering och gränser i godkänd projektering/OEM-anvisning."),
  p("C.03", "STOPP – planera arbetet på höjd", "Kontrollera åtkomst, godkänd arbetsplattform och fallskydd enligt arbetsberedningen. Kontrollera utrustning tillsammans, så kallad Buddy Check. Kontrollera räddningsplan och väder. Spärra av området under arbetet.", "Montör / arbetsledare", "Sele och dubbellina väljs utifrån arbetsmetod och godkända förankringar; de är inte en generell lösning för alla tak eller saxliftar. Avbryt vid åskrisk eller överskriden vädergräns."),
  p("C.04", "Montera fångststänger och åskskydd", "Montera på punkterna i åskskyddsritningen. Kontrollera infästning och jordanslutning. Täta genomföringar enligt godkänd lösning. Ta foto.", "Montör"),
  p("C.05", "Montera antennen", "Placera enligt kommunikationsritningen så att metall inte skymmer signalen. Fäst kabeln med UV-tåligt skydd. Väderskydda kontaktstycken enligt tillverkaren och kontrollera tätning genom tak/vägg.", "Montör", "Vulktejp och krympslang används bara där kontakttypens montageanvisning tillåter det."),
].map((x) => [x.id, x]));
const steg_ = (ids) => ids.map((id) => STEG[id]);
export const PROJEKTMALLAR = steg.map(([titel, rader], fas) => {
  const egna = rader.map(([rubrik, instruktion, roll], i) => ({ id: `P${fas}.${String(i + 1).padStart(2, "0")}`, titel: rubrik, instruktion, roll, epc: [], verifiering: "Kontrollkrav och gränsdragning fastställs i projektets godkända handlingar. Ange kontrollplan/ritning/protokoll som bevis." }));
  const punkter = fas === 8 ? [...egna.slice(0, 2), ...steg_(["C.03", "C.04", "C.05"]), ...egna.slice(2)]
    : fas === 11 ? [egna[0], ...steg_(["A.03", "A.04"]), egna[1], ...FALTMALLAR[0].punkter]
      : fas === 12 ? [egna[0], ...steg_(["B.02", "B.03"]), ...FALTMALLAR[1].punkter, ...FALTMALLAR[2].punkter, egna[1]]
        : fas === 13 ? [egna[0], ...FALTMALLAR[3].punkter, ...egna.slice(2), egna[1]] : egna;
  return ({
  id: `projekt-${fas}`, nr: fas + 1, titel, kort: titel, utrustning: "Projektets avtalade kontrollomfattning",
  flode: `Moment ${fas}: ${FASER[fas].titel}. ${FASER[fas].grind.kod}: ${FASER[fas].grind.text} Dokumentera klartecken enligt godkänd kontrollplan.`,
  punkter,
});
});
