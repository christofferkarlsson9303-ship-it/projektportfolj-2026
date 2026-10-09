import { useState } from "react";
import { useUi } from "../../state/hooks.js";
import { laddaNerPdf } from "./laddaNerPdf.jsx";

export function PdfExporter({ dokument, typ, disabled, label = "Ladda ned PDF", className = "btn", title }) {
  const [arbetar, setArbetar] = useState(false);
  const { visaToast } = useUi();
  const exportera = async () => {
    setArbetar(true);
    await laddaNerPdf(dokument, typ, visaToast);
    setArbetar(false);
  };
  return <button type="button" className={className} title={title} disabled={disabled || arbetar} aria-busy={arbetar} onClick={exportera}>
    {arbetar ? "Skapar PDF…" : label}
  </button>;
}
