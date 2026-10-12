import { useRef } from "react";
import { Check } from "lucide-react";
import { FASER, FAS_ANTAL, arFasNr, faseInfo, statusEtikett } from "../../data/projektfaser.ts";

/* Fasmätaren: projektets åtta faser som en rad med ett fyllt spår. Visar vilken fas projektet ligger
   i, och låter projektledaren flytta det — till exempel från Anbud till Planering när anbudet är
   vunnet. Statusen följer fasen (se SATT_PROJEKTFAS).

   Tillgänglighet: en radiogroup. Piltangenter flyttar fokus och Enter/Mellanslag väljer, som i
   Vyvaljare. Det valda värdet är aria-checked; fasens namn och status står som text, aldrig bara
   som färg. Bara transform och opacity animeras, och inget alls vid prefers-reduced-motion. */

export function FasMatare({ fas, onVal, disabled = false, etikett = "Projektets fas", kompakt = false }) {
  const aktuell = arFasNr(fas) ? fas : 1;
  const ref = useRef(null);
  const info = faseInfo(aktuell);
  const andel = ((aktuell - 0.5) / FAS_ANTAL) * 100;

  const fokusera = (nr) => ref.current?.querySelectorAll('[role="radio"]')[nr - 1]?.focus();
  const tangent = (e) => {
    const i = FASER.findIndex((f) => f.nr === aktuell);
    let ny = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") ny = Math.min(FAS_ANTAL, i + 2);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ny = Math.max(1, i);
    else if (e.key === "Home") ny = 1;
    else if (e.key === "End") ny = FAS_ANTAL;
    if (ny === null) return;
    e.preventDefault();
    fokusera(ny);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{etikett}</span>
        <span className="text-[12.5px] text-ink">
          <b>
            Fas {aktuell} av {FAS_ANTAL}
          </b>{" "}
          · {info.kort} · <span className="text-ink-soft">{statusEtikett(info.status)}</span>
        </span>
      </div>

      <div className="relative">
        {/* Spåret: grått, med en fylld del upp till aktuell fas. */}
        <span aria-hidden="true" className="absolute left-0 right-0 top-[9px] h-1.5 rounded-full bg-viz-spar" />
        <span
          aria-hidden="true"
          className="absolute left-0 top-[9px] h-1.5 origin-left rounded-full bg-viz-klar transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${andel}%` }}
        />
        <div ref={ref} role="radiogroup" aria-label={etikett} onKeyDown={tangent} className="relative grid grid-cols-8 gap-0">
          {FASER.map((f) => {
            const vald = f.nr === aktuell;
            const passerad = f.nr < aktuell;
            return (
              <button
                key={f.nr}
                type="button"
                role="radio"
                aria-checked={vald}
                aria-label={`Fas ${f.nr}, ${f.kort}, status ${statusEtikett(f.status)}${vald ? ", aktuell" : passerad ? ", passerad" : ""}`}
                tabIndex={vald ? 0 : -1}
                disabled={disabled}
                onClick={() => !vald && onVal(f.nr)}
                title={`${f.nr}. ${f.titel}`}
                className="group flex min-w-0 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 font-body focus-visible:outline-none disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-solid text-[10px] font-bold transition-[transform,background-color,border-color] duration-200 motion-reduce:transition-none group-hover:scale-110 group-active:scale-95 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-one-bla ${
                    vald
                      ? "scale-110 border-knapp-bla bg-knapp-bla text-white shadow-md"
                      : passerad
                        ? "border-viz-klar bg-viz-klar text-white"
                        : "border-hairline-stark bg-surface text-ink-soft"
                  }`}
                >
                  {passerad ? <Check size={11} strokeWidth={3} /> : f.nr}
                </span>
                {kompakt ? null : (
                  <span className={`hidden w-full truncate text-center text-[10.5px] leading-tight sm:block ${vald ? "font-bold text-ink" : "text-ink-soft"}`}>{f.kort}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
