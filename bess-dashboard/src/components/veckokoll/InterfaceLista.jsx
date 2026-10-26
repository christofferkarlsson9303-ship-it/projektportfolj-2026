import { usePortfolj, useUi } from "../../state/hooks.js";
import { Card, StatusBadge } from "../ds/index.js";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { interfacelage } from "../../lib/metodkoll.js";
import { idag } from "../../lib/datum.js";

/* Interface-listan (projektmetoden § 6.7) i veckans genomgång. Listan bor i
   Projektstart (steget Godkänd lösning) — här stäms den av varje vecka utan
   att guiden behöver öppnas. Ett gränssnitt kräver åtgärd när det är Oklart,
   inte bedömt eller inte avstämt på sju dagar. Oklart gränssnitt = risk och
   ÄTA-möjlighet. */

const STATUS = ["Ej bedömd", "Klart", "Pågår", "Oklart"];
const LAGE = {
  ok: ["ok", "Avstämd"],
  gammal: ["warn", "Stäm av"],
  ejbedomd: ["warn", "Ej bedömd"],
  oklart: ["bad", "Oklart"],
};

export function InterfaceLista({ pid }) {
  const { state, dispatch } = usePortfolj();
  const { oppnaProjektstart } = useUi();
  const l = interfacelage(state, pid);
  const satt = (rad, falt, varde) => dispatch({ type: "PROJEKTSTART_RAD", pid, tabell: "interface", radId: rad.id, falt, varde });

  return (
    <Card
      id="vk-interface"
      title="Interface-lista"
      subtitle="Gränssnitten mellan mark, el, leverantör, nätägare, kommunikation och brand. Stäm av varje vecka — ett oklart gränssnitt är en risk och en ÄTA-möjlighet."
      badge={l.finns ? (l.atgard ? <StatusBadge ton="warn" label={`${l.atgard} att stämma av`} /> : <StatusBadge ton="ok" label="Avstämd" />) : null}
    >
      {!l.finns ? (
        <div className="flex flex-col items-start gap-2 text-[13px]">
          <p className="m-0">Projektet har ingen interface-lista än. Den skapas med metodens fem gränssnitt och följer med till Projektstart.</p>
          <button type="button" className="btn mini" onClick={() => dispatch({ type: "PROJEKTSTART_SKAPA", pid })}>
            Skapa interface-lista
          </button>
        </div>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col p-0" aria-label="Gränssnitt">
            {l.rader.map((r) => {
              const [ton, text] = LAGE[r.lage];
              return (
                <li key={r.id} className="flex flex-col gap-2 border-0 border-t border-solid border-hairline py-3 first:border-t-0 md:flex-row md:items-start md:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[13.5px] text-ink">{r.granssnitt || "Gränssnitt"}</b>
                      <StatusBadge ton={ton} label={text} />
                    </div>
                    <p className="m-0 mt-0.5 text-[12.5px] text-ink-soft">{r.innehall}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:w-[36rem] md:shrink-0">
                    <Falt varde={r.agare || ""} etikett={`Ägare för ${r.granssnitt}`} placeholder="Ägare" onCommit={(v) => satt(r, "agare", v)} />
                    <select value={r.status} aria-label={`Veckostatus för ${r.granssnitt}`} onChange={(e) => satt(r, "status", e.target.value)}>
                      {STATUS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <DatumFalt varde={r.avstamd || ""} etikett={`Senast avstämd för ${r.granssnitt}`} onCommit={(v) => satt(r, "avstamd", v)} />
                      {r.avstamd !== idag() ? (
                        <button type="button" className="btn sec mini shrink-0" onClick={() => satt(r, "avstamd", idag())} aria-label={`Avstämd idag: ${r.granssnitt}`}>
                          Idag
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div>
            <button type="button" className="lankknapp text-[12.5px]" onClick={() => oppnaProjektstart(pid)}>
              Lägg till eller ändra gränssnitt i Projektstart
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
