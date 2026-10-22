/* "Så styr appen projektet" — en sammanfattning för ledningen och nya projektledare.

   Den här filen är den enda källan till texten. Den ritas i appen (Projektledarens
   handbok, StyrningsrapportKort.jsx), som PDF (print/StyrningsrapportPdf.jsx) och som
   Markdown (rapportTillMarkdown, docs/sa-styr-appen-projektet.md genereras ur den med
   `npm run docs:styrning`). Ändra här, inte i kopiorna. Ett test larmar om Markdown-filen
   inte är genererad på nytt.

   Texten beskriver appen som den är byggd. Det som saknas står under "Luckor" i stället
   för att skrivas som om det fanns. Underlag: ONE-P (CK_Projektmodell.docx) och ONE
   Nordics mallar för statusrapport, intern och kund (.pptx). */

export const STYRNINGSRAPPORT = {
  titel: "Så styr appen projektet",
  undertitel: "Från projektstart till avslut med ONE-P — beslutsunderlag, uppföljning, lagring och export",
  version: "2026-10-22",
  avsnitt: [
    {
      id: "sammanfattning",
      rubrik: "Sammanfattning",
      block: [
        {
          typ: "stycke",
          text: "Appen är projektledarens arbetsverktyg för BESS-entreprenader. Den följer ONE-P: anbud och initiering, planering, genomförande och avslut, uppdelat i åtta faser med grindar. Varje fas har obligatoriska punkter, och nästa fas låses upp först när de är godkända.",
        },
        {
          typ: "lista",
          punkter: [
            "Ledningen får ett beslutsunderlag ur Projektstart: anbudsfrågornas trafikljus, riskmatrisen, ekonomin och PL:s rekommendation, som PDF.",
            "Under genomförandet styr Idag, tidplanen med kritisk linje, ÄTA-flödet och betalningsmilstolparna M1–M7 det dagliga arbetet.",
            "Beställaren får en statusrapport ur samma data. Inget skrivs in två gånger.",
            "Allt sparas i portföljen (Supabase eller webbläsaren) och kan tas ut som PDF, CSV och säkerhetskopia.",
          ],
        },
      ],
    },
    {
      id: "faser",
      rubrik: "1. Från projektstart till avslut, steg för steg",
      block: [
        {
          typ: "stycke",
          text: "Projektstart är en guide i 19 steg fördelade på åtta faser. Utkastet sparas i webbläsaren medan det skrivs. När fas 1 är genomgången skapas projektet i portföljen med sina risker och milstolpar, och sedan styrs det i de vanliga vyerna.",
        },
        {
          typ: "tabell",
          kolumner: ["Fas (ONE-P)", "Vad appen styr", "Grind innan nästa fas"],
          rader: [
            ["1 · Anbud, kontrakt och uppstart (Initiering)", "Projektkort, avropsacceptans, anbudsfrågor, kontrakt och kassaflöde, projektdirektiv, intressenter.", "Obligatoriska fält, PL:s rekommendation Gå vidare, direktivet signerat av intern beställare och PL, styrparametrarna summerar till 100 %. Fas 2 öppnas först vid Vunnet anbud."],
            ["2 · Projektering och planering", "Organisation och startmöte, riskregister, tidplan och kritisk linje, godkänd lösning med interface-lista, tillstånd och nätägare.", "Namngiven PL, risker med ägare, kritisk linje beskriven, nätägare angiven och fasens kontrollpunkter godkända."],
            ["3 · Etablering", "APD, arbetsplatstavla, HSEQ och fysisk etablering.", "Fasens kontrollpunkter godkända."],
            ["4 · Mark och betong (cBoP)", "Markarbeten, fundament, kabelkanalisation och jordning.", "Fasens kontrollpunkter godkända. En egenkontroll räknas först när varje registrerad omfattning är komplett."],
            ["5 · Leveranser, lyft och montage (eBoP)", "Leveranser, lyft, montage och elektrisk installation.", "Fasens kontrollpunkter godkända."],
            ["6 · Provning och driftsättning", "Anläggningsprov, elsäkerhet och driftsättning.", "Fasens kontrollpunkter godkända."],
            ["7 · Slutbesiktning och överlämning (Avslut)", "Slutbesiktning, punchlista och slutdokumentation mot M6 och M7.", "Fasens kontrollpunkter godkända."],
            ["8 · Ekonomiskt avslut, lärdomar och garanti", "Slutreglering, internt avslut, erfarenhetsåterföring, kick-out och slutrapport.", "Fasens kontrollpunkter godkända."],
          ],
        },
        {
          typ: "rubrik",
          text: "Under genomförandet",
        },
        {
          typ: "lista",
          punkter: [
            "Idag: frister, förfallna punkter och det som är närmast i tiden, för ett projekt eller hela portföljen.",
            "Bygga batteripark: 16 moment med grind G0–G15, egenkontroller och snabbutskrift av arbetslista och fasblankett.",
            "Tidplan: Blir vi klara i tid? Kritisk linje, försening och marginal per fas mot milstolparna M1–M7.",
            "ÄTA: Identifierad, ÄTA-granskning, Godkänd, Fakturerad. Underrättelse inom 24 timmar enligt egen rutin, kontraktets gräns i texten, ÄTA-kalkyl och avi.",
            "Dagbok, byggmöten, veckokoll, HSEQ och risker: dokumentationen som bevisar vad som har hänt.",
            "Milstolpar och faktura: sju betalningar kopplade till grindarna, med förhandsavisering innan faktura i IFS.",
            "Siten i 3D: tomten med enheter, ritningar (PDF, DXF, bild) och IFC-modell, där ÄTA kan kopplas till objekt.",
          ],
        },
      ],
    },
    {
      id: "beslutsunderlag",
      rubrik: "2. Anbudshjulet, riskmatrisen och frågorna: ett beslutsunderlag",
      block: [
        {
          typ: "stycke",
          text: "Steg 3 i Projektstart är tolv frågor inför anbudsbeslutet. Elva bedöms med ONE-P:s trafikljus: grön är klart och prissatt, gul är en avvikelse som hanteras med reservation eller påslag, röd kräver beslut av ledningen eller svar från beställaren. Den tolfte är PL:s rekommendation.",
        },
        {
          typ: "rubrik",
          text: "Varje fråga har den inmatning som passar",
        },
        {
          typ: "tabell",
          kolumner: ["Fråga", "Inmatning", "Föreslår ljuset"],
          rader: [
            ["1. Vad bygger vi – och vad bygger vi inte?", "Gränsdragningslista: del, Ingår / Ingår ej / Oklart, ansvar", "Något oklart ger gul"],
            ["2. Är avtalet tuffare än vanligt?", "Standard / Avvikelse – reservation / Avvikelse – kräver beslut", "Grön / gul / röd"],
            ["3. Hinner vi i tid?", "Anbudsdag, start, färdigställande och risk för försening i matrisen", "Matrisen"],
            ["4, 6, 7, 10, 11. Viten, risker, antaganden, lönsamhet, HSEQ", "Sannolikhet × konsekvens", "Matrisen"],
            ["5. Får vi betalt i takt med att vi bygger?", "Största belopp vi ligger ute med, längsta negativa period", "Sätts av PL"],
            ["8. Har vi folk till jobbet?", "Nyckelroller: Säkrad / Pågår / Saknas", "Saknas ger röd, pågår gul"],
            ["9. Vad har beställaren svarat?", "Logg med datum, fråga, svar och Väntar svar / Besvarad", "Väntar ger gul"],
            ["12. Ska vi lämna anbud?", "Lämna anbud / Kräver ledningens beslut / Lämna inte anbud", "Inget ljus, räknas inte"],
          ],
        },
        {
          typ: "rubrik",
          text: "Så hänger delarna ihop",
        },
        {
          typ: "numrerad",
          punkter: [
            "Riskmatrisen (3 × 3) tar bara de frågor som är osäkra händelser. Frågan dras till en ruta, eller klickas och placeras. Rutan ger ljuset: produkten av sannolikhet och konsekvens 1–2 är grön, 3–4 gul och 6–9 röd.",
            "Fakta- och statusfrågorna har egna val i stället för matrisen. Valen föreslår ljuset på samma sätt.",
            "PL kan alltid ändra ljuset för hand. Kortet visar då att bedömningen avviker från matrisen eller valen, så att ledningen ser var PL har gjort en egen bedömning.",
            "Anbudshjulet räknar gröna, gula, röda och ej bedömda i realtid och ger domen: en röd betyder att ledningen måste ta ställning, obedömda frågor gör aldrig domen grön. En klickad färg filtrerar matrisen och listan.",
            "Varje fråga har ett obligatoriskt svar: en eller två meningar om vad bedömningen bygger på, med antaganden märkta.",
          ],
        },
        {
          typ: "stycke",
          text: "Beslutsunderlaget är PDF:en ur Projektstart. Del 1 Anbud innehåller den samlade bedömningen (antal per färg och domen), varje fråga med sin bedömning före motiveringen, PL:s rekommendation, ekonomin (anbudssumma, kalkyl, riskreserv, kassaflödets lägsta punkt) och kontraktsvillkoren. Obesvarade frågor står kvar som Ej besvarad. Ledningen beslutar i PDF:en; appen registrerar inget ledningsbeslut åt någon.",
        },
      ],
    },
    {
      id: "data",
      rubrik: "3. Hur data sparas",
      block: [
        {
          typ: "tabell",
          kolumner: ["Vad", "Var", "Kommentar"],
          rader: [
            ["Portföljen: projekt, ÄTA, punkter, risker, milstolpar, dagbok m.m.", "Supabase, raden portfolj/state (JSONB)", "Skyddas av inloggning och RLS. Utan Supabase: webbläsarens lagring (lokalt läge)."],
            ["Ekonomi", "Supabase, raden portfolj/ekonomi", "Kontraktssumman ändras bara av administratören."],
            ["Projektstartens utkast", "Webbläsaren tills projektet skapas", "Sparas sedan med projektet i portföljen, med historik."],
            ["Ändringslogg", "Egen tabell i Supabase", "Varje post har en klientnyckel, så att ett återförsök inte ger dubbletter."],
            ["Formella godkännanden", "Egen tabell, registreras via RPC", "Inloggad användare och servertid, inte webbläsarens klocka."],
            ["Ritningar och modeller", "Supabase Storage (ritningar) eller webbläsarens IndexedDB", "I portföljen ligger bara metadata och placering, aldrig själva filen."],
          ],
        },
        {
          typ: "stycke",
          text: "Arbetar man utan nät flaggas ändringarna som osparade och skickas när nätet är tillbaka. Har två personer ändrat samma post slås ändringarna ihop vid uppstart och konflikter visas.",
        },
      ],
    },
    {
      id: "export",
      rubrik: "4. Hur data exporteras",
      block: [
        {
          typ: "tabell",
          kolumner: ["Export", "Innehåll", "Mottagare"],
          rader: [
            ["Beslutsunderlag (PDF, Projektstart)", "Försättsblad, läge till ledningen, anbudsfrågor med trafikljus, ekonomi, projektdirektiv, kontrollpunkter, logg och signaturfält.", "Ledningen, intern beställare"],
            ["Beställarrapport (utskrift till PDF)", "Faser, betalningsmilstolpar M1–M7, anläggning, ekonomi och ÄTA, tidplan, passerade punkter, kräver beslut.", "Beställaren"],
            ["ÄTA (PDF och avi)", "ÄTA-underlag och avisering med belopp och underrättelse.", "Beställaren"],
            ["Arbetslista och fasblankett (PDF)", "Snabbutskrift med ett klick, eller fler val i Fältmaterial.", "Lagen på plats"],
            ["Säkerhetskopia (zip/JSON)", "Hela portföljen med bilagor. Kan läsas tillbaka under Data och backup.", "Arkiv"],
            ["Tabeller (CSV för Excel)", "Varje lista för sig. Redigerad fil kan läsas in igen.", "Uppföljning, ekonomi"],
            ["BCF", "ÄTA kopplade till objekt i IFC-modellen, med kameravy.", "Projektör, BIM-verktyg"],
            ["Den här sammanfattningen", "PDF och Markdown ur Projektledarens handbok.", "Ledningen, nya PL"],
          ],
        },
      ],
    },
    {
      id: "mallar",
      rubrik: "5. Jämfört med ONE Nordics mallar för statusrapport",
      block: [
        {
          typ: "tabell",
          kolumner: ["Mallens rubrik", "I appen", "Läge"],
          rader: [
            ["Tid / tidplan", "Tidplan med kritisk linje; beställarrapportens tidplan", "Finns"],
            ["Ekonomi (budget, prognos, EAC)", "Budget och utfall, Ekonomi; beställarrapportens prognos mot kontraktet", "Finns"],
            ["ÄTA / change requests", "ÄTA-tavlan och beställarrapportens ÄTA-läge", "Finns"],
            ["Risker (topp 3)", "Riskregistret; topprisker i beslutsunderlaget", "Finns"],
            ["Eskalerade frågor och beslut", "Kräver beslut eller åtgärd i beställarrapporten; Beslut som behövs från ledningen i Projektkort", "Finns"],
            ["Resurser (FTE, status OK/NOK)", "Resurser per vecka; inte som egen ruta i rapporterna", "Lucka"],
            ["Kvalitet och leverabler", "Egenkontroller och slutdokumentation; inget samlat statusfält", "Lucka"],
            ["Fakturering (släpande UE-fakturor)", "Milstolpar och faktura; inte i beställarrapporten", "Lucka"],
            ["Intern statusrapport (månadsavstämning)", "Ledningsrapporten i beslutsunderlaget täcker anbud och start, inte månadsrapporten under genomförandet", "Lucka"],
          ],
        },
      ],
    },
    {
      id: "nasta",
      rubrik: "6. Rekommenderade nästa steg",
      block: [
        {
          typ: "numrerad",
          punkter: [
            "Bygg en intern statusrapport per månad ur samma data som beställarrapporten: trafikljus per område (tid, ekonomi, resurser, ÄTA, risker), prognos mot föregående rapport och eskalerade frågor.",
            "Lägg till resurser, kvalitet och fakturering som statusrader i beställarrapporten, så att den täcker kundmallen.",
            "Fastställ ONE Nordics frågelista och färggränser för riskmatrisen; listan är ett utkast från 2026-10-17.",
            "Lägg in en betalplan per månad i steg 4, så att fråga 5 kan visa en kassaflödeskurva och föreslå ljus mot en gräns.",
          ],
        },
      ],
    },
  ],
};

/* ---------- Markdown ---------- */

const cell = (t) => String(t).replace(/\|/g, "\\|");

function blockTillMarkdown(b) {
  if (b.typ === "stycke") return b.text;
  if (b.typ === "rubrik") return `### ${b.text}`;
  if (b.typ === "lista") return b.punkter.map((p) => `- ${p}`).join("\n");
  if (b.typ === "numrerad") return b.punkter.map((p, i) => `${i + 1}. ${p}`).join("\n");
  if (b.typ === "tabell") {
    return [`| ${b.kolumner.map(cell).join(" | ")} |`, `| ${b.kolumner.map(() => "---").join(" | ")} |`, ...b.rader.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
  }
  return "";
}

/** Hela rapporten som Markdown. */
export function rapportTillMarkdown(r = STYRNINGSRAPPORT) {
  const delar = [
    `# ${r.titel}`,
    `_${r.undertitel}. Version ${r.version}._`,
    "<!-- Genererad ur src/data/styrningsrapport.js med `npm run docs:styrning`. Redigera inte här. -->",
    ...r.avsnitt.flatMap((a) => [`## ${a.rubrik}`, ...a.block.map(blockTillMarkdown)]),
  ];
  return delar.join("\n\n") + "\n";
}
