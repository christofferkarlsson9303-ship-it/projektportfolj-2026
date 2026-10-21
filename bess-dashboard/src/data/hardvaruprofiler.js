/* Hårdvaruprofiler för siten: vilket batterisystem och vilken MV-utrustning ett projekt bygger med.
   Profilen sätts per projekt (projekt.hardvaruprofil) och styr mått, etiketter, komponentdata,
   KPI:er och standardlayout i 3D-vyn.

   Varje tekniskt värde har en källa. `verifierad: false` betyder att värdet inte är bekräftat mot
   tillverkarens eget datablad eller projektets kontrakt — gränssnittet visar det som "att verifiera".
   Ett värde som saknas är null, aldrig en gissning.

   - catl-pe   CATL EnerX + Power Electronics MV-skid. Batch C (36037 Växjö, 36038 Alvesta).
               Värdena kommer ur appens nyckelvärden (data/bessChecklistData.ts, NYCKELVARDEN),
               som i sin tur bygger på CATL-manualen och Batch C-underlaget.
   - sungrow   Sungrow ST6900UX-4H (PowerTitan 3.0). Vaggeryd och kommande projekt.
               Sungrows produktsida anger kapacitet, effekt, temperatur och höjd. Mått, vikt och
               IP-klass kommer från ENF Solars databladssammanställning och ska stämmas av mot
               Sungrows datablad för just ST6900UX-4H (det PDF-datablad produktsidan länkar till
               gäller ST7140UX-4H-US). */

const SUNGROW_SIDA = "Sungrow produktsida ST6900UX-4H (sungrowpower.com), hämtad 2026-10-13";
const ENF = "ENF Solar databladssammanställning ST6900UX-4H (enfsolar.com/pv/storage-system-datasheet/16907), hämtad 2026-10-13";
const NYCKEL = "Appens nyckelvärden (Bygga batteripark), CATL-manual och Batch C";
const MALL = "Appens standardmall för siten (inte ur datablad)";
const LYFT = "Väljs i lyftplanen: kranens lastdiagram vid aktuell radie och bomkonfiguration mot bruttolast (OEM-intygad vikt + lyftredskap). Kranklass är inte tillåten last.";

const v = (varde, enhet, kalla, verifierad) => ({ varde, enhet, kalla, verifierad });

export const HARDVARUPROFILER = {
  "catl-pe": {
    id: "catl-pe",
    namn: "CATL EnerX + Power Electronics MV-skid",
    kort: "CATL / PE",
    anvands: "Batch C: 36037 Växjö, 36038 Alvesta",
    container: {
      benamning: "CATL EnerX",
      prefix: "BESS",
      matt: { bredd: 6.1, djup: 2.5, hojd: 2.9 },
      mattKalla: v("6,1 × 2,5 × 2,9 m", "", MALL, false),
      data: [
        ["Vikt", v("~43,8", "t", NYCKEL, true)],
        ["Fundament dimensioneras för", v("45", "t", NYCKEL, true)],
        ["Kapacitet per container", v(null, "MWh", "Saknas i appens underlag", false)],
        ["Fritt mellan containrar (sida)", v("≥ 3,0 (rek. 3,5)", "m", NYCKEL, true)],
        ["Kran vid lyft", v("Enligt lyftplan", "", LYFT, false)],
      ],
      mwh: null,
    },
    /* Skyddsavstånd som regelobjekt (F11). Används av lib/siteSakerhet.js. */
    skyddsavstand: [
      { id: "container-container", mellan: ["container", "container"], avstand: 3.0, text: "Fritt mellan batterienheter (sida), rek. 3,5 m", kalla: NYCKEL, verifierad: true },
    ],
    skid: {
      benamning: "Power Electronics MV-skid",
      prefix: "SKID",
      matt: { bredd: 6.1, djup: 2.5, hojd: 2.9 },
      mattKalla: v("6,1 × 2,5 × 2,9 m", "", MALL, false),
      data: [
        ["Vikt", v("13", "t", NYCKEL, true)],
        ["Platta", v("9 700 × 6 020", "mm", NYCKEL, true)],
        ["Kran vid lyft", v("Enligt lyftplan", "", LYFT, false)],
        ["Lutning platta", v("≤ 0,25", "%", NYCKEL, true)],
        ["Effekt per skid", v(null, "MW", "Saknas i appens underlag", false)],
      ],
    },
  },
  sungrow: {
    id: "sungrow",
    namn: "Sungrow ST6900UX-4H (PowerTitan 3.0)",
    kort: "Sungrow",
    anvands: "Vaggeryd och kommande projekt",
    container: {
      benamning: "Sungrow ST6900UX-4H",
      prefix: "BESS",
      matt: { bredd: 6.058, djup: 2.438, hojd: 2.896 },
      mattKalla: v("6 058 × 2 438 × 2 896 mm", "", ENF, false),
      data: [
        ["Kapacitet", v("6 904", "kWh", SUNGROW_SIDA, true)],
        ["AC-effekt", v("450 kVA × 4", "", SUNGROW_SIDA, true)],
        ["Vikt", v("55 000", "kg", ENF, false)],
        ["Cellkemi", v("LFP", "", ENF, false)],
        ["Kapslingsklass", v("IP55", "", ENF, false)],
        ["Drifttemperatur", v("−30 till 45", "°C", SUNGROW_SIDA, true)],
        ["Max höjd över havet", v("4 000", "m", SUNGROW_SIDA, true)],
      ],
      mwh: 6.904,
    },
    skyddsavstand: [
      { id: "container-container", mellan: ["container", "container"], avstand: null, text: "Fritt mellan batterienheter", kalla: "Saknas – hämtas ur Sungrows installationsmanual för ST6900UX-4H", verifierad: false },
    ],
    skid: {
      benamning: "Sungrow MV-station",
      prefix: "MVS",
      matt: { bredd: 6.1, djup: 2.5, hojd: 2.9 },
      mattKalla: v("6,1 × 2,5 × 2,9 m", "", MALL, false),
      data: [
        ["Modell", v(null, "", "Bestäms i Vaggeryd-anbudet", false)],
        ["Effekt per station", v(null, "MVA", "Bestäms i Vaggeryd-anbudet", false)],
        ["Växelriktare", v("Integrerad i batterienheten (4 × 450 kVA)", "", SUNGROW_SIDA, true)],
      ],
    },
  },
};

export const PROFILORDNING = ["catl-pe", "sungrow"];
export const STANDARDPROFIL = "catl-pe";

/** Profilen för ett projekt: projektets eget val, annars Batch C = CATL/PE, Vaggeryd = Sungrow,
 *  övriga CATL/PE (dagens standard). */
export function profilIdFor(p) {
  if (p?.hardvaruprofil && HARDVARUPROFILER[p.hardvaruprofil]) return p.hardvaruprofil;
  if (/vaggeryd/i.test(`${p?.namn || ""} ${p?.ort || ""}`)) return "sungrow";
  return STANDARDPROFIL;
}

export const profilFor = (p) => HARDVARUPROFILER[profilIdFor(p)];

/** "6 904 kWh", "att verifiera" eller "saknas". */
export function vardeText(x) {
  if (x.varde === null || x.varde === undefined || x.varde === "") return "Saknas";
  return `${x.varde}${x.enhet ? " " + x.enhet : ""}`;
}
