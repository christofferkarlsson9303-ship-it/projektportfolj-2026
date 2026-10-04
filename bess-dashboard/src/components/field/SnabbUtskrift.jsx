import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { arbetslistaDokument, fasblankettDokument, utforareMedUppgifter } from "../../lib/snabbutskrift.js";
import { PrintableTodoList } from "../print/PrintableTodoList.jsx";
import { EgenkontrollDocument } from "../print/EgenkontrollDocument.jsx";
import { PdfExporter } from "../print/PdfExporter.jsx";

/* Snabbvägen till papper: ett klick från vyn du står i. Fältmaterialpanelen
   finns kvar för fler val (mallpaket, moment, enhet, signaturfält). */

const VAL_NYCKEL = (pid) => `bess-snabbutskrift-v1-${pid}`;
function lasUtforare(pid) {
  try { return localStorage.getItem(VAL_NYCKEL(pid)) || ""; } catch { return ""; }
}
function sparaUtforare(pid, namn) {
  try { localStorage.setItem(VAL_NYCKEL(pid), namn); } catch { /* valet gäller bara nu */ }
}

/** Utskrift utan panel. Returnerar funktioner som skriver ut direkt. */
export function useSnabbUtskrift() {
  const { state } = usePortfolj();
  const { skrivUt, visaToast } = useUi();
  const projektFor = (pid) => state.projekt.find((p) => p.id === pid);
  return {
    arbetslista(pid, { utforare = "", ids } = {}) {
      const p = projektFor(pid);
      if (!p) return;
      const d = arbetslistaDokument(state, p, { utforare, ids, skapadAv: hamtaNamn() });
      if (!d.uppgifter.length) {
        visaToast(utforare ? `${utforare} har inga öppna uppgifter i projektet.` : "Inga öppna uppgifter att skriva ut.", "warn");
        return;
      }
      skrivUt(<PrintableTodoList dokument={d} />);
    },
    fasblankett(pid, fas, { enhet = "" } = {}) {
      const p = projektFor(pid);
      const d = p ? fasblankettDokument(p, fas, { enhet, skapadAv: hamtaNamn() }) : null;
      if (d) skrivUt(<EgenkontrollDocument dokument={d} />);
    },
  };
}

/** Verktygsrad i Öppna punkter: välj montör och skriv ut med ett klick. */
export function ArbetslistaSnabb({ pid }) {
  const { state } = usePortfolj();
  const { oppnaFaltmaterial } = useUi();
  const snabb = useSnabbUtskrift();
  const namn = utforareMedUppgifter(state, pid);
  const [utforare, setUtforare] = useState(() => {
    const sparat = lasUtforare(pid);
    return namn.includes(sparat) ? sparat : "";
  });
  const p = state.projekt.find((x) => x.id === pid);
  const dokument = p ? arbetslistaDokument(state, p, { utforare, skapadAv: hamtaNamn() }) : null;
  const valj = (v) => { setUtforare(v); sparaUtforare(pid, v); };
  return <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Skriv ut arbetslista">
    <label className="flex flex-col gap-1 text-xs font-semibold">Arbetslista för
      <select value={utforare} onChange={(e) => valj(e.target.value)}>
        <option value="">Alla utförare</option>
        {namn.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
    <button type="button" className="btn" disabled={!dokument?.uppgifter.length} onClick={() => snabb.arbetslista(pid, { utforare })}>Skriv ut arbetslista</button>
    {dokument?.uppgifter.length ? <PdfExporter dokument={dokument} typ="arbetslista" label="Ladda ned PDF" className="btn sec" /> : null}
    <button type="button" className="btn sec mini" onClick={() => oppnaFaltmaterial()}>Fler val…</button>
  </div>;
}
