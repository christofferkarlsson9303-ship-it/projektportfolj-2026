import { useRef } from "react";
import { projektPrio } from "../../lib/veckoOversikt.js";

/* Projektflikar för Veckokoll: en flik per projekt med en prick för veckans läge och en liten ring för hur
   många av de nio frågorna som är besvarade. Ersätter den platta knapprader som Projektvaljare ger.

   Prick och ring är dekor — läget står också som text för skärmläsare (sr-only) och i titeln. Fliken är en
   `tab` i en `tablist`: pil-tangenter flyttar och väljer, bara den valda ligger i tabbordningen. Ringen
   ritas med strokeDashoffset (en egenskap som webbläsaren kan animera utan att räkna om layouten).

   Raden scrollar i sidled när flikarna inte ryms. `contain: paint` stoppar att det scrollbara innehållets bredd
   räknas in i sidans bredd — utan det zoomar mobilen ut hela sidan (layoutvyn blev 665 px på en 412 px skärm och
   klick hamnade på fel element). Utfyllnaden ger plats åt fokusring och skugga, som annars klipps. */

const PRIO = {
  bad: { prick: "bg-bad-ink", text: "Avvikelse" },
  warn: { prick: "bg-warn-ink", text: "Varning" },
  ok: { prick: "bg-ok-ink", text: "Allt OK" },
  ingen: { prick: "bg-hairline-stark", text: "Ej genomgången" },
};

const R = 9;
const OMKRETS = 2 * Math.PI * R;

function Ring({ andel }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx="12" cy="12" r={R} fill="none" strokeWidth="3" className="stroke-viz-spar" />
      <circle
        cx="12"
        cy="12"
        r={R}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-one-bla transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        strokeDasharray={OMKRETS}
        strokeDashoffset={OMKRETS * (1 - andel / 100)}
      />
    </svg>
  );
}

export function VeckoProjektflikar({ projekt, valtId, vecka, state, onVal }) {
  const ref = useRef(null);

  const tangent = (e) => {
    const i = projekt.findIndex((p) => p.id === valtId);
    let ny = null;
    if (e.key === "ArrowRight") ny = (i + 1) % projekt.length;
    else if (e.key === "ArrowLeft") ny = (i - 1 + projekt.length) % projekt.length;
    else if (e.key === "Home") ny = 0;
    else if (e.key === "End") ny = projekt.length - 1;
    if (ny === null) return;
    e.preventDefault();
    onVal(projekt[ny].id);
    ref.current?.querySelectorAll('[role="tab"]')[ny]?.focus();
  };

  return (
    <div ref={ref} role="tablist" aria-label="Välj projekt" onKeyDown={tangent} className="mb-3 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-3 pt-1 lg:mb-4" data-roll="veckoflikar" style={{ contain: "paint" }}>
      {projekt.map((p) => {
        const vald = p.id === valtId;
        const s = projektPrio(state, p.id, vecka);
        const prio = PRIO[s.prio];
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={vald}
            tabIndex={vald ? 0 : -1}
            onClick={() => onVal(p.id)}
            title={`${p.nr || ""} ${p.namn}: ${prio.text}, ${s.besvarade} av ${s.totalt} frågor besvarade`.trim()}
            className={`group flex min-w-[11rem] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-solid px-3 py-2 text-left font-body transition-[transform,background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla ${
              vald ? "border-knapp-bla bg-surface shadow-md" : "border-hairline bg-surface hover:-translate-y-px hover:border-hairline-stark hover:shadow-sm"
            }`}
          >
            <Ring andel={s.andel} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-ink-soft">{p.nr || "AO-nr saknas"}</span>
              <span className="block truncate text-[13px] font-semibold text-ink">{p.namn}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${prio.prick}`} />
              <span className="text-[10.5px] font-bold tabular-nums text-ink-soft">{s.besvarade}/{s.totalt}</span>
            </span>
            <span className="sr-only">
              {prio.text}, {s.besvarade} av {s.totalt} besvarade{s.klar ? ", genomgången" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
