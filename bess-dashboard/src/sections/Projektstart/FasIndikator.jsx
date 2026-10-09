import { Check, Lock } from "lucide-react";

/* De sex faserna som en rad i guidens huvud: godkända, aktuell och låsta.
   Visas på mörk bakgrund. Status står också i text för skärmläsare. */

const TEXT = { klar: "godkänd", upplast: "upplåst", aktuell: "pågår", last: "låst" };
const STAPEL = {
  klar: "bg-one-bla",
  upplast: "bg-one-bla/60",
  aktuell: "bg-white",
  last: "bg-white/20",
};

export function FasIndikator({ faser, visadFas }) {
  return (
    <ol aria-label="Faser i projektet" className="m-0 grid list-none grid-cols-3 gap-x-2 gap-y-2 p-0 sm:grid-cols-6">
      {faser.map((f) => (
        <li key={f.nr} aria-current={f.status === "aktuell" ? "step" : undefined} className="min-w-0">
          <span aria-hidden="true" className={`block h-1.5 rounded-full transition-colors duration-500 ${STAPEL[f.status]}`} />
          <span className={`mt-1 flex items-center gap-1 text-[11px] leading-tight ${f.status === "last" ? "opacity-60" : ""} ${f.nr === visadFas ? "font-bold" : ""}`}>
            {f.status === "last" ? <Lock size={11} aria-hidden="true" className="shrink-0" /> : f.status === "klar" ? <Check size={11} aria-hidden="true" className="shrink-0" /> : null}
            <span className="truncate">{f.nr}. {f.kort}</span>
            <span className="sr-only"> ({TEXT[f.status]})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
