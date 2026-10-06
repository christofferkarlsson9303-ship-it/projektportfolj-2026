import { laddaNer } from "../../lib/export.js";
import { faltFilnamn } from "../../lib/faltmaterial.js";

/** Skapar PDF:en och laddar ned den. Returnerar true om den skapades, annars false
 *  (då har användaren fått ett meddelande). Används av knappen och av
 *  Projektstart, som laddar ned PDF:en samtidigt som projektet skapas. */
export async function laddaNerPdf(dokument, typ, visaToast) {
  try {
    const [{ pdf }, { EgenkontrollPdf }] = await Promise.all([
      import("@react-pdf/renderer"), import("./EgenkontrollPdf.jsx"),
    ]);
    const Komponent = dokument.ata
      ? (await import("./AtaPdf.jsx")).AtaPdf
      : dokument.projektstart ? (await import("./ProjektstartPdf.jsx")).ProjektstartPdf : EgenkontrollPdf;
    const blob = await pdf(<Komponent dokument={dokument} typ={typ} />).toBlob();
    const r = await laddaNer(faltFilnamn(dokument, dokument.ata ? `${dokument.ata.nr}_${typ}` : typ, "pdf"), blob, "application/pdf");
    if (!r.tyst) visaToast(r.txt, r.typ);
    return true;
  } catch (e) {
    console.error("PDF-generering misslyckades", e);
    visaToast("PDF kunde inte skapas. Du kan fortfarande använda Skriv ut.", "bad");
    return false;
  }
}
