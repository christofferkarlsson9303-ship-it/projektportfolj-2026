/* Projektledarens veckorutin, måndag–fredag (docs/projektmetod.md § 3.2).
   Ren data: dagens fokus, vad som ska göras och vyerna där det görs.
   Index är JavaScripts veckodag (1 = måndag … 5 = fredag). */

export const VECKORUTIN = {
  1: {
    dag: "Måndag",
    fokus: "Styrning och ekonomi",
    tid: "45–60 min",
    gora: [
      "Uppdatera prognosen: kostnad, intäkt och ÄTA.",
      "Stäm av betalplanen mot verkligheten.",
      "Gå igenom de 1–2 största riskerna. Vad kan bli dyrt om två veckor?",
    ],
    vyer: [
      ["budget", "Budget och utfall"],
      ["milstolpar", "Milstolpar"],
      ["risker", "Risker"],
    ],
  },
  2: {
    dag: "Tisdag",
    fokus: "Produktion och gränssnitt",
    tid: "",
    gora: [
      "Uppdatera tvåveckors produktionsplan.",
      "Rensa hinder nu: leveranser, beslut och tillstånd.",
      "Interface-check mark ↔ el ↔ leverantör.",
    ],
    vyer: [
      ["tidplan", "Tidplan"],
      ["vecka", "Interface-listan i Veckokoll"],
    ],
  },
  3: {
    dag: "Onsdag",
    fokus: "Leverantörer och UE",
    tid: "",
    gora: [
      "Bekräfta leveranser och montagefönster.",
      "Se till att UE vet vad som är klart innan de kommer.",
      "Stäm av timmar mot kalkyl.",
    ],
    vyer: [
      ["tidplan", "Leveransspårning"],
      ["tid", "Tidrapport"],
    ],
  },
  4: {
    dag: "Torsdag",
    fokus: "HSE och kvalitet",
    tid: "",
    gora: ["Gå platsrond: lyft, tillträde och ordning.", "För in dokumentation och egenkontroller löpande."],
    vyer: [
      ["hseq", "HSEQ / BAS-U"],
      ["epc", "Egenkontroller i Bygga batteripark"],
    ],
  },
  5: {
    dag: "Fredag",
    fokus: "Framåtblick",
    tid: "30 min",
    gora: [
      "Vad måste vara klart nästa fredag?",
      "Vad behöver beställarbeslut?",
      "Vad ska faktureras eller ÄTA-anmälas?",
      "Gå igenom veckochecklistan.",
    ],
    vyer: [
      ["vecka", "Veckokoll"],
      ["ata", "ÄTA"],
      ["faktura", "Fakturaunderlag"],
    ],
  },
};

/** Dagens rutin, eller null en helgdag. */
export const rutinFor = (datum = new Date()) => VECKORUTIN[datum.getDay()] || null;
