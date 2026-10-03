import { useCallback, useRef, useState } from "react";
import { tolkaCelltal } from "../../lib/cellvarde.js";

export function EditableCell({ varde, visat, etikett, typ = "text", min, onCommit }) {
  const [redigerar, setRedigerar] = useState(false);
  const [utkast, setUtkast] = useState("");
  const [fel, setFel] = useState("");
  const avbruten = useRef(false);
  const fokus = useCallback((el) => { el?.focus(); }, []);
  const commit = () => {
    if (avbruten.current) return;
    const v = typ === "num" || typ === "sek" ? tolkaCelltal(utkast) : utkast;
    if (v === undefined || (v !== null && min !== undefined && v < min)) { setFel("Ange ett giltigt tal" + (min !== undefined ? `, minst ${min}` : "") + "."); return; }
    if (String(v ?? "") !== String(varde ?? "")) onCommit(v);
    setRedigerar(false); setFel("");
  };
  if (!redigerar) return <button type="button" className="w-full cursor-text rounded border-0 bg-transparent p-0 text-[inherit] [text-align:inherit] hover:bg-sunken" aria-label={`Redigera ${etikett}`} onClick={() => { avbruten.current = false; setUtkast(String(varde ?? "")); setRedigerar(true); }}>{visat}</button>;
  return <div>
    <input ref={fokus} type={typ === "datum" ? "date" : "text"} inputMode={typ === "num" || typ === "sek" ? "decimal" : undefined} value={utkast} aria-label={etikett} aria-invalid={!!fel} className="min-w-[90px] w-full !py-1" onChange={(e) => { setUtkast(e.target.value); setFel(""); }} onBlur={commit} onKeyDown={(e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); avbruten.current = true; setRedigerar(false); setFel(""); }
    }} />
    {fel ? <span className="text-xs text-bad-ink" role="alert">{fel}</span> : null}
  </div>;
}
