import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Card } from "../ds/Card.jsx";
import { StatusBadge } from "../ds/StatusBadge.jsx";
import { tidsdom } from "../../lib/tidsdom.js";
import { prognos, prognosLage } from "../../lib/prognos.js";
import { lagesbild, planAnkare } from "../../lib/epc.js";
import { arbetslage } from "../../lib/agenda.js";
import { idag } from "../../lib/datum.js";

/* Läget per projekt — portföljens svar på tre av de fyra frågorna, en rad per
   projekt: blir vi klara i tid (tidsdom), vad kostar det (prognosLage), vad
   blockerar (nästa grind och vad som saknas). Raden leder till Idag för
   projektet, där det som ska göras står. Allt räknas med samma funktioner
   som Idag och Ekonomi; inget räknas om här. */

/** Det som blockerar: nästa grind som inte är passerad och vad som saknas. */
function blockerar(state, pid, nu) {
  if (!planAnkare(state, pid)) return { ton: "warn", text: "Datum saknas" };
  const ng = lagesbild(state, pid, nu).nastaGrind;
  if (!ng) return { ton: "ok", text: "Alla grindar passerade" };
  if (!ng.kvar) return { ton: "ok", text: `${ng.fas.grind.kod} kan passeras` };
  return {
    ton: ng.status === "sen" ? "bad" : "neutral",
    text: `${ng.fas.grind.kod}: ${ng.kvar} ${ng.kvar === 1 ? "punkt" : "punkter"} kvar${ng.hpKvar ? `, ${ng.hpKvar} HP` : ""}`,
  };
}

export function Projektlage({ i }) {
  const { state } = usePortfolj();
  const { setValtProjekt, setLage, visa } = useUi();
  const nu = idag();

  const rader = useMemo(
    () =>
      state.projekt.map((p) => {
        const l = arbetslage(state, 30, p.id);
        return {
          p,
          tid: tidsdom(state, p.id, nu),
          pengar: prognosLage(prognos(state, p.id)),
          block: blockerar(state, p.id, nu),
          attGora: l.frister.length + l.forfallet.length + (l.utanDatum.length ? 1 : 0) + l.idag.length + l.veckan.length,
        };
      }),
    [state, nu]
  );

  const oppna = (pid) => {
    setValtProjekt(pid);
    setLage("projekt");
    visa("idag");
  };

  return (
    <Card id="ov-lage" i={i} title="Läget per projekt" subtitle="Tid, pengar och vad som blockerar. Öppna ett projekt för att se vad du ska göra.">
      <div aria-hidden="true" className="hidden gap-x-3 px-0 text-[11px] font-bold uppercase tracking-wider text-ink-soft md:grid md:grid-cols-[minmax(160px,1.2fr)_repeat(3,minmax(0,1fr))_80px_16px]">
        <span>Projekt</span><span>Tid</span><span>Pengar</span><span>Blockerar</span><span>Att göra</span><span />
      </div>
      <ul className="m-0 flex list-none flex-col p-0" aria-label="Projekt">
        {rader.map(({ p, tid, pengar, block, attGora }) => (
          <li key={p.id} className="border-0 border-t border-solid border-hairline first:border-t-0">
            <button
              type="button"
              onClick={() => oppna(p.id)}
              className="group -mx-2 grid w-[calc(100%+16px)] cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-lg border-0 bg-transparent px-2 py-3 text-left font-body text-ink transition-colors hover:bg-sunken md:grid-cols-[minmax(160px,1.2fr)_repeat(3,minmax(0,1fr))_80px_16px]"
            >
              <span className="min-w-0">
                <span className="sr-only">Öppna Idag för </span>
                <b className="block break-words text-[14px]">{p.nr ? `${p.nr} ` : ""}{p.namn}</b>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="text-ink-faint group-hover:text-one-djup md:order-last" />
              <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1.5 md:contents">
                <Fakta etikett="Tid"><StatusBadge ton={tid.ton} label={tid.text} /></Fakta>
                <Fakta etikett="Pengar"><StatusBadge ton={pengar.ton} label={pengar.text} /></Fakta>
                <Fakta etikett="Blockerar"><StatusBadge ton={block.ton} label={block.text} /></Fakta>
                <Fakta etikett="Att göra">
                  <span className={`text-[13px] font-bold tabular-nums ${attGora ? "text-ink" : "text-ink-faint"}`}>{attGora}</span>
                </Fakta>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Ett faktum i raden: etiketten syns bara på smal skärm, där raden staplas. */
function Fakta({ etikett, children }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft md:sr-only">{etikett}</span>
      {children}
    </span>
  );
}
