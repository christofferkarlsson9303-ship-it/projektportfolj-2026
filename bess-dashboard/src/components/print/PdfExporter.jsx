import { useState } from "react";
import { useUi } from "../../state/hooks.js";
import { laddaNer } from "../../lib/export.js";
import { faltFilnamn } from "../../lib/faltmaterial.js";

export function PdfExporter({ dokument, typ, disabled, label = "Ladda ned PDF" }) {
  const [arbetar, setArbetar] = useState(false);
  const { visaToast } = useUi();
  const exportera = async () => {
    setArbetar(true);
    try {
      const [{ pdf }, { EgenkontrollPdf }] = await Promise.all([
        import("@react-pdf/renderer"), import("./EgenkontrollPdf.jsx"),
      ]);
      const Komponent = dokument.ata ? (await import("./AtaPdf.jsx")).AtaPdf : EgenkontrollPdf;
      const blob = await pdf(<Komponent dokument={dokument} typ={typ} />).toBlob();
      const r = await laddaNer(faltFilnamn(dokument, dokument.ata ? `${dokument.ata.nr}_${typ}` : typ, "pdf"), blob, "application/pdf");
      if (!r.tyst) visaToast(r.txt, r.typ);
    } catch (e) {
      console.error("PDF-generering misslyckades", e);
      visaToast("PDF kunde inte skapas. Du kan fortfarande använda Skriv ut.", "bad");
    } finally {
      setArbetar(false);
    }
  };
  return <button type="button" className="btn" disabled={disabled || arbetar} aria-busy={arbetar} onClick={exportera}>
    {arbetar ? "Skapar PDF…" : label}
  </button>;
}
