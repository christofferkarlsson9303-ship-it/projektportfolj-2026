import { useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { Card, Overline } from "../ds/index.js";
import { useUi } from "../../state/hooks.js";
import { STYRNINGSRAPPORT, rapportTillMarkdown } from "../../data/styrningsrapport.js";
import { laddaNer } from "../../lib/export.js";
import { idag } from "../../lib/datum.js";

/* "Så styr appen projektet" i Projektledarens handbok: avsnitten som utfällbara rader,
   och samma text som PDF eller Markdown. Texten ligger i data/styrningsrapport.js. */

function Block({ b }) {
  if (b.typ === "stycke") return <p className="m-0 text-[13.5px] leading-relaxed">{b.text}</p>;
  if (b.typ === "rubrik") return <h4 className="m-0 mt-1 text-[13.5px] font-bold text-ink">{b.text}</h4>;
  if (b.typ === "lista" || b.typ === "numrerad") {
    const Lista = b.typ === "numrerad" ? "ol" : "ul";
    return (
      <Lista className="m-0 flex flex-col gap-1.5 pl-5 text-[13.5px] leading-relaxed">
        {b.punkter.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </Lista>
    );
  }
  if (b.typ === "tabell") {
    return (
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={b.kolumner.join(", ")}>
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              {b.kolumner.map((k) => (
                <th key={k} scope="col" className="border-0 border-b border-solid border-hairline px-2 py-1.5 text-left">
                  <Overline as="span">{k}</Overline>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rader.map((r) => (
              <tr key={r[0]}>
                {r.map((c, j) => (
                  <td key={j} className={`border-0 border-b border-solid border-hairline px-2 py-1.5 align-top ${j === 0 ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export function StyrningsrapportKort() {
  const { visaToast } = useUi();
  const [skapar, setSkapar] = useState(false);
  const r = STYRNINGSRAPPORT;
  const filnamn = (typ) => `Sa_styr_appen_projektet_${r.version}.${typ}`;

  const pdf = async () => {
    setSkapar(true);
    try {
      const [{ pdf: rendera }, { StyrningsrapportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("../print/StyrningsrapportPdf.jsx")]);
      const blob = await rendera(<StyrningsrapportPdf datum={idag()} />).toBlob();
      const svar = await laddaNer(filnamn("pdf"), blob, "application/pdf");
      if (!svar.tyst) visaToast(svar.txt, svar.typ);
    } catch (e) {
      console.error("PDF-generering misslyckades", e);
      visaToast("PDF:en kunde inte skapas. Ladda ned Markdown i stället.", "bad");
    } finally {
      setSkapar(false);
    }
  };
  const markdown = async () => {
    const svar = await laddaNer(filnamn("md"), rapportTillMarkdown(r), "text/markdown;charset=utf-8");
    if (!svar.tyst) visaToast(svar.txt, svar.typ);
  };

  return (
    <Card
      id="handbok-styrning"
      title={r.titel}
      subtitle={`${r.undertitel}. Version ${r.version}.`}
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn mini" onClick={pdf} disabled={skapar} aria-busy={skapar || undefined}>
            <FileDown size={14} aria-hidden="true" /> {skapar ? "Skapar PDF …" : "Ladda ned PDF"}
          </button>
          <button type="button" className="btn sec mini" onClick={markdown}>
            <FileText size={14} aria-hidden="true" /> Markdown
          </button>
        </div>
      }
    >
      <div className="flex flex-col">
        {r.avsnitt.map((a, i) => (
          <details key={a.id} open={i === 0} className="border-0 border-t border-solid border-hairline py-2 first:border-t-0">
            <summary className="cursor-pointer py-1 text-[14px] font-semibold text-ink">{a.rubrik}</summary>
            <div className="flex flex-col gap-3 pb-2 pt-2">
              {a.block.map((b, j) => (
                <Block key={j} b={b} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}
