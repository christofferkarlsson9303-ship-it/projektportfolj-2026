/* Kontrollunderlag från projektledarens sammanställning 2026-10-01.
   Inte verifierade OEM-manualer. Referenser och avvikelser följer varje
   utskrift/PDF. Punkt-ID:n är stabila; EPC-mappning innebär inte klarmarkering. */
export const FALTMALL_REVISION = "2026-10-01.1";
export const KALLSTATUS = "Projektledarens sammanställning 2026-10-01; OEM-manual och revision ska verifieras.";
export const FALT_FORUTSATTNING = "Elkontroller och idrifttagning utförs av utsedd kompetent personal enligt godkänd arbetsberedning, kopplings-/provplan och tillverkarens anvisningar. Checklistans ordning är ingen kopplingsordning. Registrera faktisk mätning och avvikelse; utskrift innebär inte godkänd kontroll.";

const punkt = (id, titel, instruktion, epc, roll, verifiering = "") => ({ id, titel, instruktion, epc, roll, verifiering });

export const FALTMALLAR = [
  {
    id: "precheck", nr: 1, titel: "Förkontroller & mekanisk/visuell montagekontroll", kort: "Pre-Check",
    utrustning: "CATL Ener X / Power Electronics / MV-skid / RMU", fas: [11, 12],
    punkter: [
      punkt("M1.01", "Containrar och yttre tillstånd", "Okulärbesiktiga samtliga containrar: mekaniska skador, bucklor, lackskador och saknat rostskydd. Dokumentera med foto per enhet.", ["11.7", "11.14"], "Montör"),
      punkt("M1.02", "Infästning och fundament", "Kontrollera förankring av BESS-containrar, PCS, MV-skid/transformator och RMU enligt respektive tillverkares krav. Underlaget anger fastbultning.", ["11.8", "11.9"], "Montör", "Källskillnad: EPC 11.8 anger svetsning för CATL och bult för PE-skid. Fastställ rätt infästningsmetod per enhet mot godkänd bygghandling/OEM-manual innan godkännande."),
      punkt("M1.03", "Fritt utrymme på AC-sidan", "Kontrollera minst 3 m fritt utrymme på AC-sidan för framtida tunga reservdelsleveranser. Ange uppmätt mått.", [], "Montör", "3 m är angivet i projektledarens underlag; verifiera krav för aktuell modell och APD/bygghandling."),
      punkt("M1.04", "Tillgänglighet framför skåp och dörrar", "Kontrollera minst 1,2 m packad/stabil mark framför DC-, AC- och HMI/elektronikskåp samt dörrar. Kontrollera fri öppning.", ["11.13"], "Montör", "Verifiera utrymmeskravet mot aktuell OEM-manual och projektering."),
      punkt("M1.05", "Torkpåsar – gamla", "Ta bort förbrukade/gamla torkpåsar enligt växelriktarens anvisning.", [], "Montör"),
      punkt("M1.06", "Torkpåsar – nya", "Placera färska torkpåsar i växelriktare 1–2 dagar före idrifttagning. Dokumentera placeringsdatum.", [], "Montör", "Verifiera typ, antal och placering mot Power Electronics-manualen."),
      punkt("M1.07", "Ventilation", "Kontrollera att alla till- och frånluftsventiler är rena och helt fria från hinder.", [], "Montör"),
    ],
  },
  {
    id: "elkontroll", nr: 2, titel: "Elektriskt kablage, momentdragning & isolationsprovning", kort: "Elkontroll",
    utrustning: "CATL Ener X / PCS / hjälpkraft", fas: [12, 13],
    punkter: [
      punkt("M2.01", "Hjälpkraft 230 VAC – XT0", "Kontrollera inkoppling och spänning för 230 VAC (XT0) i elrum/battericontainer från extern hjälptransformatormatning. Ange mätvärde.", ["11.5", "13.8"], "Elinstallatör", "Verifiera anslutningsbeteckning, matning och tolerans mot kopplingsschema för aktuell enhet."),
      punkt("M2.02", "Hjälpkraft 400 VAC – XT1", "Kontrollera inkoppling och spänning för 400 VAC (XT1) från extern hjälptransformatormatning. Ange mätvärden.", ["11.5", "13.8"], "Elinstallatör", "Verifiera anslutningsbeteckning, fasföljd och tolerans mot godkänd provplan."),
      punkt("M2.03", "HV DC-kablage", "Kontrollera HV+ och HV− mellan battericontainer och PCS mot godkänt kopplingsschema och märkning.", ["12.2", "12.16"], "Elinstallatör"),
      punkt("M2.04", "Verifiering av spänningslöst tillstånd", "Verifiera spänningslöst tillstånd före slutförande av DC-anslutningar. Underlaget anger 0 V med multimeter; dokumentera mätpunkter och instrument.", ["13.6", "13.15"], "Elinstallatör", "Genomför enligt fastställd säker arbetsmetod/LOTO, urladdningstid och instrumentkrav. En ensam 0 V-avläsning utgör inte hela säkerhetsförfarandet."),
      punkt("M2.05", "Momentdragning DC-kraftanslutningar", "Kontrollera samtliga DC-kraftanslutningar med kalibrerad momentnyckel enligt verifierat OEM-värde. Ange förband, krav och faktiskt moment i protokoll/notering.", ["12.2", "12.10", "12.12"], "Elinstallatör"),
      punkt("M2.06", "Momentmärkning", "Verifiera tydlig momentfärg på samtliga kontrollerade DC-kraftförband efter momentdragning.", ["12.12"], "Montör"),
      punkt("M2.07", "Kabelskor på kundsidan", "Kontrollera förtennade (tin plated) kabelskor som är större än plansbrickan.", ["12.2"], "Elinstallatör", "Verifiera geometri, material och kontaktyta mot aktuell OEM-anvisning."),
      punkt("M2.08", "Monteringsordning kontaktelement", "Underlaget anger: skruv → fjädringsbricka → plansbricka → kabelsko → mutter, med skruvhuvud framåt. Kontrollera mot montagebild för aktuellt förband.", ["12.2"], "Elinstallatör", "Monteringsordningen ska bekräftas mot tillverkarens ritning; får inte generaliseras till andra förband."),
      punkt("M2.09", "Fett/pasta på högströmskontakter", "Verifiera att inget fett eller pasta har använts på de högströmskontakter som omfattas av detta underlag.", ["12.3"], "Elinstallatör", "Källskillnad: EPC 12.3 anger kontaktpasta på AC-kragen. Fastställ skriftligt vilka kontaktytor förbudet gäller och vilka som kräver pasta enligt OEM. Inget generellt förbud för andra kontakttyper."),
      punkt("M2.10", "Resistans busbar + mot chassi", "Underlaget anger >1 MΩ med multimeter mellan + och icke-strömförande chassidelar, med HV-reläer och frånskiljare öppna. Registrera faktiskt värde.", ["13.6"], "Elinstallatör", "Multimeterkontroll ersätter inte föreskriven isolationsprovning. Fastställ mätmetod, provspänning och frånkopplade komponenter mot OEM/provplan; EPC anger även 2500 V isolationsprov."),
      punkt("M2.11", "Resistans busbar − mot chassi", "Underlaget anger >1 MΩ med multimeter mellan − och icke-strömförande chassidelar, med HV-reläer och frånskiljare öppna. Registrera faktiskt värde.", ["13.6"], "Elinstallatör", "Använd verifierad OEM-mätmetod; skilj resistanskontroll från isolationsprovning."),
      punkt("M2.12", "Resistans mellan + och −", "Underlaget anger >1 MΩ mellan + och −, med HV-reläer och frånskiljare öppna. Registrera faktiskt värde och anläggningskonfiguration.", ["13.6"], "Elinstallatör", "Provning genom ansluten elektronik/batterimoduler får inte härledas från detta krav; följ OEM:s isolerings- och provplan."),
      punkt("M2.13", "Kabelklamring", "Kontrollera infästning/klamring av samtliga kraft-, signal- och jordkablar.", ["12.2", "12.5"], "Montör"),
      punkt("M2.14", "Kabelgenomföringar och brandtätning", "Kontrollera att samtliga kabelgenomföringar är tätade med godkänt brandsäkert kitt (firestop putty) eller projekterat tätningssystem. Dokumentera med foto.", ["12.8"], "Montör"),
    ],
  },
  {
    id: "styr-sakerhet", nr: 3, titel: "Styr, kommunikation & säkerhetssystem", kort: "Styr & säkerhet",
    utrustning: "CATL Ener X / PCS / EMS / FSS", fas: [8, 12, 13],
    punkter: [
      punkt("M3.01", "Optofiber och Ethernet", "Verifiera optofiber-/Ethernet-anslutningar mellan containrar och till PCS mot nätverksritning.", ["12.5"], "Tekniker"),
      punkt("M3.02", "CAN-bridge", "Verifiera CAN-bridge-kablar mellan containrar och till PCS enligt kommunikationsritning.", ["12.5"], "Tekniker"),
      punkt("M3.03", "CANH och CANL", "Kontrollera att CANH/CANL är rätt kopplade och märkta.", ["12.5"], "Tekniker"),
      punkt("M3.04", "CAN-terminering", "Verifiera monterade 120 Ω termineringsmotstånd enligt underlaget och dokumentera nätets uppmätta resistans.", ["12.5", "13.6"], "Tekniker", "Skilj 120 Ω per motstånd från total busresistans. EPC anger 60 Ω uppmätt; verifiera nätets topologi och mätpunkter mot OEM innan bedömning."),
      punkt("M3.05", "JX5 pin 1 och 2", "Kontrollera anslutning av JX5 pin 1 & 2 till PCS/kontrollbox enligt underlaget.", ["13.8"], "Elinstallatör", "Pin-numrering, funktion och kontakttyp ska verifieras mot rätt CATL-modell och kopplingsschemarevision."),
      punkt("M3.06", "JX5 pin 3 och 4 / nödstopp", "Kontrollera JX5 pin 3 & 4 till nödstoppskrets samt dokumentera funktionstest enligt godkänd provplan.", ["13.8"], "Elinstallatör", "Verifiera pin-numrering mot schema. Funktionstest kräver fastställd säker provkonfiguration."),
      punkt("M3.07", "Jordning AC-utrustning", "Kontrollera AC-utrustningens jordningsanslutningar till huvudjordsskenan. Ange referens till jordningsprotokoll.", ["8.4", "12.7"], "Elinstallatör"),
      punkt("M3.08", "Jordning DC-utrustning", "Kontrollera DC-utrustningens jordningsanslutningar till huvudjordsskenan. Ange referens till jordningsprotokoll.", ["8.4"], "Elinstallatör"),
      punkt("M3.09", "FSS UPS-batterier", "Kontrollera installation och anslutning av FSS UPS-batterier enligt tillverkarens anvisning.", ["12.6"], "Brandlarmstekniker"),
      punkt("M3.10", "Aerosolkablage", "Kontrollera installation och märkning av aerosolkablage mot godkänt schema och FSS-provplan.", ["12.4", "13.10"], "Brandlarmstekniker", "EPC anger aerosol frånkopplad under montage/cold och återansluten sist vid hot. Funktionstest får inte orsaka oavsiktlig släckmedelsutlösning; anslutningsordning fastställs i provplan."),
      punkt("M3.11", "Rökdetektorer", "Funktionstesta rökdetektorer och dokumentera larm/signal enligt godkänd FSS-provplan.", ["12.6", "13.18"], "Brandlarmstekniker"),
      punkt("M3.12", "Temperaturgivare", "Funktionstesta temperaturgivare och dokumentera larm/signal enligt godkänd FSS-provplan.", ["13.18"], "Brandlarmstekniker"),
    ],
  },
  {
    id: "idrifttagning", nr: 4, titel: "Idrifttagning – kallsamkörning & varmtest", kort: "Cold & Hot Commissioning",
    utrustning: "CATL Ener X / Power Electronics / BMS / EMS", fas: [13],
    punkter: [
      punkt("M4.01", "Förutsättningar och provplan", "Verifiera godkänd cold/hot-provplan, utsedd ansvarig/OEM-personal, arbetsberedning/LOTO och rätt mätutrustning före provning.", ["13.1", "13.3", "13.4", "13.6", "13.15"], "Idrifttagningstekniker"),
      punkt("M4.02", "MSD-installation", "Dokumentera installation av MSD (Manual Service Disconnect) i varje batterimodul samt modul-ID.", ["13.16"], "Idrifttagningstekniker", "EPC anger MSD som sista moment. Detta punktnummer är en dokumentstruktur, inte en instruktion att montera MSD före övriga prov; följ OEM:s kopplings-/provordning."),
      punkt("M4.03", "Chiller – påfyllning och tryck", "Kontrollera kylvätska/påfyllning och tryck i kylsystemet. Registrera vätsketyp, nivå och tryck.", [], "Idrifttagningstekniker", "Vätsketyp, påfyllningsmetod och tryckgränser ska tas från aktuell OEM-manual."),
      punkt("M4.04", "Chiller – differenstryck", "Kontrollera differenstryck och dokumentera mätvärde mot OEM:s acceptansgränser.", [], "Idrifttagningstekniker"),
      punkt("M4.05", "Chiller – värmeläge", "Provkör i värmeläge enligt provplan. Dokumentera drift och att inga larm uppstår.", [], "Idrifttagningstekniker"),
      punkt("M4.06", "Chiller – kylläge", "Provkör i kylläge enligt provplan. Dokumentera drift och att inga larm uppstår.", [], "Idrifttagningstekniker"),
      punkt("M4.07", "BMS/EMS – programvaruversion", "Dokumentera godkänd BMS-programvaruuppdatering, versionsnummer före/efter och kompatibilitet mot EMS.", ["13.8", "13.17"], "Idrifttagningstekniker", "BMS/firmware hanteras inom CATL/OEM:s ansvarsområde enligt EPC; använd godkänd versions- och ändringsplan."),
      punkt("M4.08", "Signaltest cellspänningar", "Verifiera överföring av cellspänningar från BMS till EMS och central styrskärm. Dokumentera signal-/testreferens.", ["13.8"], "Idrifttagningstekniker"),
      punkt("M4.09", "Signaltest SOC", "Verifiera SOC-data mot EMS och central styrskärm. Dokumentera signal-/testreferens.", ["13.8"], "Idrifttagningstekniker"),
      punkt("M4.10", "Signaltest temperatur", "Verifiera temperaturdata mot EMS och central styrskärm. Dokumentera signal-/testreferens.", ["13.8"], "Idrifttagningstekniker"),
      punkt("M4.11", "Polaritet och DC-spänning vid PCS", "Dokumentera polaritet och spänning över PCS-busbar vid föreskrivet kontrollsteg före inkoppling. Underlaget anger ca 1331,2 VDC.", ["13.6", "13.15"], "Idrifttagningstekniker", "1331,2 VDC är ett uppgivet exempel, inte en generell acceptansgräns. Kontrollera modell, SOC, tillåtet spänningsområde och säker mätmetod mot OEM; DC-sidan kan redan vara spänningssatt."),
      punkt("M4.12", "Tillstånd före varmtest", "Verifiera godkänd cold commissioning, Energisation Certificate, erforderliga spänningssättningstillstånd och avgränsat provområde innan hot/provladdning.", ["13.5", "13.19", "13.22"], "Idrifttagningstekniker"),
      punkt("M4.13", "Lågströmsladdning", "Dokumentera provladdning med 0,1 P under 15 min enligt underlaget. Ange faktiskt effekt-/strömvärde och provtid.", ["13.9"], "Idrifttagningstekniker", "Definitionen av P och provgränser ska fastställas i OEM:s godkända provplan."),
      punkt("M4.14", "Lågströmsurladdning", "Dokumentera provurladdning med 0,1 P under 15 min enligt underlaget. Ange faktiskt effekt-/strömvärde och provtid.", ["13.9"], "Idrifttagningstekniker"),
      punkt("M4.15", "Kapacitetstest", "Genomför och dokumentera fullständigt kapacitetstest enligt avtalad provplan. Ange protokoll, energimängd, SOC-fönster och acceptansbedömning.", ["13.9", "13.13"], "Idrifttagningstekniker"),
      punkt("M4.16", "RTE – Round Trip Efficiency", "Dokumentera fullständigt RTE-test: in-/utenergi, mätgräns, hjälpkraft, provförhållanden och acceptanskrav enligt avtalad provplan.", ["13.9", "13.13"], "Idrifttagningstekniker"),
    ],
  },
];
