import { useMemo } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Card, Meter, StatusBadge } from "../ds/index.js";
import { milstolpskrav } from "../../lib/milstolpskrav.js";

/* Betalmilstolparna M1–M7 som räknare mot Bygga batteripark. Skrivskyddad:
   punkterna bockas i momentet, inte här (gemensam checklista §2.4). */

const LAGE = {
  fakturerad: { ton: "ok", text: "Fakturerad" },
  godkand: { ton: "ok", text: "Grind godkänd" },
  klarForGrind: { ton: "info", text: "Klar för grind" },
  kvar: { ton: "neutral", text: "Pågår" },
};

export function MilstolpsKrav({ pid, projektNamn }) {
  const { state } = usePortfolj();
  const { oppnaPost } = useUi();
  const rader = useMemo(() => milstolpskrav(state, pid), [state, pid]);

  return (
    <Card
      id="tp-kriterier"
      title={`Milstolpar → klart-kriterier — ${projektNamn}`}
      subtitle="Varje betalning utlöses av en grind i Bygga batteripark. Räknaren visar momentets punkter; bocka av dem i momentet."
    >
      <ul className="m-0 list-none p-0" aria-label="Milstolpar och grindar">
        {rader.map((r) => {
          const l = LAGE[r.lage];
          return (
            <li
              key={r.kod}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-0 border-t border-solid border-hairline py-3 first:border-t-0"
            >
              <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-one-djup px-1.5 text-xs font-bold text-white">
                {r.kod}
              </span>
              <span className="min-w-0 flex-1 basis-48 text-[14px] font-semibold leading-snug text-ink">
                {r.namn} · {r.andel} %
                <span className="block text-xs font-normal text-ink-soft">
                  {r.grind}
                  {r.moment !== null ? ` · Moment ${r.moment} ${r.momentTitel}` : ""} — {r.utloses}
                  {r.ejRegistrerade ? (
                    <span className="block">
                      Grinden är passerad men {r.ejRegistrerade} punkter är inte registrerade i momentet.
                    </span>
                  ) : null}
                </span>
              </span>
              <Meter value={r.klara} max={r.totalt || 1} size="sm" className="w-16 shrink-0 sm:w-20" label={`${r.kod}: ${r.klara} av ${r.totalt} punkter klara`} />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                {r.klara}/{r.totalt}
              </span>
              <span className="flex w-28 shrink-0 justify-start">
                <StatusBadge ton={l.ton} label={r.lage === "kvar" && r.hpKvar ? `${r.hpKvar} HP kvar` : l.text} />
              </span>
              {r.moment !== null ? (
                <button
                  type="button"
                  className="btn sec mini w-40 shrink-0 justify-center"
                  onClick={() => oppnaPost("epc", `fas-${r.moment}`)}
                  aria-label={`Öppna moment ${r.moment} ${r.momentTitel} i Bygga batteripark`}
                >
                  Öppna moment {r.moment}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
