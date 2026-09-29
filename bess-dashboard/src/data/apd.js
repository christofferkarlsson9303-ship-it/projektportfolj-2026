/* APD-PLAN OCH ARBETSPLATSTAVLA — ren data.

   Källa: docs/projektmetod.md avsnitt 5.3.1 (APD-plan) och 5.3.2
   (Arbetsplatstavlan). Hör till fas 5 / grind G5 i EPC-checklistan, där
   5.19 (APD godkänd av beställaren, hållpunkt) och 5.20 (tavlan komplett)
   är grindpunkterna. Den här listan är underlaget bakom dem.

   Id:n ("apd.7", "tavla.3") är nycklar i sparad data och får aldrig
   numreras om. Ny punkt läggs sist med nästa lediga nummer.

   Markeringar som i EPC-checklistan: HP = hållpunkt, K = kontrakts- eller
   lagkrav, L = lärdom från Batch C. */

/** EPC-punkterna i fas 5 som den här listan är underlag för. */
export const APD_EPC = { plan: "5.19", tavla: "5.20", etablering: "5.4" };

/** Områden i APD-planen, i den ordning planen gås igenom. */
export const APD_OMRADEN = [
  {
    namn: "Generellt och flöde",
    punkter: [
      { id: "apd.1", text: "Skalenlig ritning i ca 1:400, färglagd utifrån situationsplanen", badges: [] },
      { id: "apd.2", text: "Material- och personalförflyttningar minimerade — korta avstånd", badges: [] },
      { id: "apd.3", text: "Skydd för träd, buskar och byggnader som ska bevaras inritat", badges: [] },
      { id: "apd.4", text: "Anpassad efter stomme, årstid (snöröjning) och maskinbehov", badges: [] },
      { id: "apd.5", text: "Plan för att minimera buller, damm och onödiga utsläpp", badges: [] },
    ],
  },
  {
    namn: "Markberedning och logistik",
    punkter: [
      { id: "apd.6", text: "Transportvägar dimensionerade för tunga fordon, helst rundkörning eller enkelriktat", badges: [] },
      { id: "apd.7", text: "Säkra in- och utfarter mot allmän väg, TA-plan vid behov", badges: [] },
      { id: "apd.8", text: "Upplagsplatser nära inbyggnad och inom kranradie", badges: [] },
      { id: "apd.9", text: "Lossningsplats tydligt utmärkt och separerad från persontrafik", badges: [] },
      { id: "apd.10", text: "Parkering avsatt för personal och besökare", badges: [] },
      { id: "apd.11", text: "Yta för mellanlagring av schaktmassor — KM-klassade massor hålls åtskilda (jfr UR002)", badges: ["L"] },
    ],
  },
  {
    namn: "Bodar, kontor och stationer",
    punkter: [
      { id: "apd.12", text: "Personalbodar högst 100 m från byggobjektet, VA-anslutna och uppvärmda", badges: [] },
      { id: "apd.13", text: "Arbetsplatskontor nära infart och bodar, inklusive plats för beställarens representanter", badges: ["K"] },
      { id: "apd.14", text: "Varm- och kallförråd invid transportvägar", badges: [] },
      { id: "apd.15", text: "Särskild plats för kemikalier, diesel och gasflaskor — ventilerad och invallad", badges: [] },
      { id: "apd.16", text: "Ergonomiska stationer för armering, sågning och betong/bruk", badges: [] },
      { id: "apd.17", text: "Kranar och hissar: centrum, radie och plushöjd angivna, samordnat med grannkranar", badges: [] },
    ],
  },
  {
    namn: "Avfall och miljö",
    punkter: [
      { id: "apd.18", text: "Miljöstation nära transportväg för enkel tömning", badges: [] },
      { id: "apd.19", text: "Tydliga kärl för de planerade fraktionerna", badges: [] },
    ],
  },
  {
    namn: "Skydd och säkerhet",
    punkter: [
      { id: "apd.20", text: "Stängsel runt hela arbetsområdet från dag 1, behov av vakt bedömt", badges: ["K"] },
      { id: "apd.21", text: "Släckutrustning, utrymningsvägar och återsamlingsplats utmärkta", badges: [] },
      { id: "apd.22", text: "Första hjälpen, ögondusch och saneringsutrustning lättillgängliga", badges: [] },
      { id: "apd.23", text: "Orienteringstavla, arbetsplatstavla och varningsskyltar på plats", badges: [] },
      { id: "apd.24", text: "Tillstånd för bodar, skyltar och utfarter inhämtade", badges: ["K"] },
      { id: "apd.25", text: "Körväg och uppställningsplats för räddningstjänst och tunga transporter utmärkt", badges: [] },
    ],
  },
  {
    namn: "Försörjning",
    punkter: [
      { id: "apd.26", text: "Elcentraler placerade, kablar nedgrävda eller skyddade vid vägövergångar", badges: [] },
      { id: "apd.27", text: "Belysning på transportvägar och nödbelysning installerad", badges: [] },
    ],
  },
];

/** Det som ska vara anslaget på arbetsplatstavlan vid etablering.
 *  `kalla` pekar på data i appen som tavlans exemplar kan bli inaktuellt mot:
 *  då räknas punkten som att den behöver bytas. */
export const ARBETSPLATSTAVLA = [
  { id: "tavla.1", text: "Förhandsanmälan (kopia)", badges: ["K"] },
  { id: "tavla.2", text: "Arbetsmiljöplan (AMP) / KMA-plan", badges: ["K"], kalla: "amp" },
  { id: "tavla.3", text: "Ordnings- och skyddsregler", badges: [] },
  { id: "tavla.4", text: "Riskanalys med specifika åtgärder", badges: [] },
  { id: "tavla.5", text: "Nödnummer och instruktion vid olycka", badges: [] },
  { id: "tavla.6", text: "Aktuell APD-plan", badges: [], kalla: "apd" },
  { id: "tavla.7", text: "Senaste skyddsrondsprotokollet", badges: [], kalla: "rond" },
  { id: "tavla.8", text: "Räddnings- och säkerhetsplan", badges: [] },
];

export const APD_PUNKTER = APD_OMRADEN.flatMap((o) => o.punkter);
