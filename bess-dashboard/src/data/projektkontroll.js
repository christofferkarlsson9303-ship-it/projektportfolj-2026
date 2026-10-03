import { FASER } from "./bessChecklistData.ts";
import { FALTMALLAR } from "./faltmaterial.js";
import { LAGMALLAR } from "./lagplan.js";
export const PROJEKTKONTROLL_REVISION = "2026-10-01.3";
export const PROJEKTKONTROLL_INLEDNING = "Följ projektet från första förberedelse till garantiuppföljning. Kontrollera arbetet mot rätt kontrakt, ritning, kontrollplan och tillverkarmanual. Skriv verkligt resultat, datum, kontrollant och bevis. STOPP betyder att utsedd ansvarig måste ge klartecken. En ifylld lista ersätter inte provprotokoll, tillstånd eller underskrift.";
const steg = [
  ["Förstudie och krav", [
    ["Bestäm anläggningens mål", "Bekräfta effekt, energimängd, användning och beställarens funktionskrav. Ange kravspecifikationens revision.", "Projektledare"],
    ["Kontrollera platsen", "Kontrollera markåtkomst, transporter, utrymme, omgivning och möjlig nätanslutning. Dokumentera begränsningar före val av lösning.", "Projektledare / projektör"],
    ["Samla platsens underlag", "Samla mark- och geotekniskt underlag, ledningsanvisning och tillgängliga ritningar. Markera vad som saknas och vem som tar fram det.", "Projektledare"],
    ["Besluta nästa steg", "Gå igenom kända risker och öppna frågor med beställaren. Dokumentera beslutet att gå vidare och villkoren för nästa steg.", "Projektledare / beställare"],
  ]],
  ["Kontrakt och ansvar", [
    ["Kontrollera kontraktshandlingarna", "Samla undertecknat kontrakt, handlingarnas ordning och projektets avtalade regler. Anteckna vilka ändringar och reservationer som gäller.", "Projektledare"],
    ["Skriv vem som gör vad", "Bekräfta gränser mellan oss, markentreprenör, CATL/PE, ställverksleverantör, beställare och nätägare. Fördela mark, fundament, oljegrop, kablar, jordning, stängsel och idrifttagning.", "Projektledare"],
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
    ["Säkra arbetsområdet", "Ordna byggstängsel, avspärrningar, skyltning, gångvägar, byggtrafik och räddningsvägar enligt platsens plan. Kontrollera innan arbetet börjar.", "Arbetsledare / Lag C"],
    ["Kontrollera personal och resurser", "Kontrollera platsintroduktion, ID06 och kompetens för varje arbete. Fördela Lag A/B/C och specialistarbeten. Bestäm verktyg och skydd efter riskbedömning.", "Arbetsledare"],
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
    ["Kontrollera färdigt fundament", "Mät läge, nivå, planhet och höjd. Kontrollera förankring och oljegropens utförande mot ritningen. Lämna mätprotokoll till montaget.", "Kontrollant / Lag A"],
  ]],
  ["Jordning och åskskydd", [
    ["Kontrollera innan jordningen täcks", "Kontrollera jordledare, skarvar, anslutningar och märkning enligt ritningen. Ta foto och uppdatera relationsunderlaget innan återfyllning.", "Lag C / utsedd elpersonal"],
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
    ["Kontrollera transformator och skydd", "Granska transformatorprov, ställverksprov, reläskydd, förreglingar och inställningar mot projekteringen och nätägarens villkor.", "Skydds-/provtekniker"],
    ["STOPP – lämna stationen till provledaren", "Samla protokoll, aktuellt enlinjeschema och lista över öppna fel. Utsedd ansvarig ger klartecken för nästa kontrollsteg.", "Provledare / arbetsledare"],
  ]],
  ["Leverans, lyft och placering", [
    ["Gör mottagningskontroll", "Kontrollera levererad utrustning och lösa delar mot leveranslistan. Anteckna serienummer. Fotografera transportskador och meddela ansvarig direkt.", "Lag A / arbetsledare"],
    ["Placera och rikta upp", "Placera enligt godkänd layout och lyftplan. Kontrollera nivå, dockning, förankring och tillträde. Lämna över en stabil, säker enhet till Lag B/C.", "Lag A / lyftansvarig"],
  ]],
  ["Anslutningar och säkerhetssystem", [
    ["Kontrollera gränssnitten", "Kontrollera AC/DC, hjälpkraft, styrning, fiber, EMS/SCADA och leverantörens gränser mot aktuella scheman. Dokumentera vem som har utfört varje del.", "Utsedd el-/styrpersonal"],
    ["STOPP – lämna montaget till provning", "Samla förkontroller, momentprotokoll, kabelprov och öppna fel. Provledare/OEM tar emot anläggningen och anger vad som måste åtgärdas före provning.", "Arbetsledare / provledare / OEM"],
  ]],
  ["Provning och idrifttagning", [
    ["Bekräfta provansvar och gränser", "Bekräfta utsedda tekniker, provplan, kopplingsplan, bevittnade prov och acceptanskrav. Separera vårt förarbete från leverantörens programmering/idrifttagning.", "Provledare / OEM / projektledare"],
    ["Granska samlade provresultat", "Samla cold/hot-, skydds-, nät-, signal-, kapacitets- och RTE-protokoll enligt avtalad omfattning. Registrera avvikelser och godkänd omprovning.", "Provledare / OEM / beställare"],
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
const lag = (l, ids) => LAGMALLAR.find((m) => m.lag === l).punkter.filter((p) => ids.includes(p.id));
export const PROJEKTMALLAR = steg.map(([titel, rader], fas) => {
  const egna = rader.map(([rubrik, instruktion, roll], i) => ({ id: `P${fas}.${String(i + 1).padStart(2, "0")}`, titel: rubrik, instruktion, roll, epc: [], verifiering: "Kontrollkrav och gränsdragning fastställs i projektets godkända handlingar. Ange kontrollplan/ritning/protokoll som bevis." }));
  const punkter = fas === 8 ? [...egna.slice(0, 2), ...lag("C", ["C.03", "C.04", "C.05"]), ...egna.slice(2)]
    : fas === 11 ? [egna[0], ...lag("A", ["A.03", "A.04"]), egna[1], ...FALTMALLAR[0].punkter]
      : fas === 12 ? [egna[0], ...lag("B", ["B.02", "B.03"]), ...FALTMALLAR[1].punkter, ...FALTMALLAR[2].punkter, egna[1]]
        : fas === 13 ? [egna[0], ...FALTMALLAR[3].punkter, egna[1]] : egna;
  return ({
  id: `projekt-${fas}`, nr: fas + 1, titel, kort: titel, utrustning: "Projektets avtalade kontrollomfattning",
  flode: `EPC-fas ${fas}: ${FASER[fas].titel}. ${FASER[fas].grind.kod}: ${FASER[fas].grind.text} Dokumentera klartecken enligt godkänd kontrollplan.`,
  punkter,
});
});
