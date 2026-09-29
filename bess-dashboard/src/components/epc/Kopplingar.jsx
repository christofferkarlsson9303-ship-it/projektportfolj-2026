import { usePortfolj, useUi } from "../../state/hooks.js";
import { PUNKT_FOR_ID } from "../../data/bessChecklistData.ts";
import { punktlage } from "../../lib/epc.js";
import { Overline, StatusBadge } from "../ds/index.js";

/* Kontrollpunkter i EPC-checklistan som en annan vy är underlag för.

   Används där underlaget fylls i (HSEQ:s APD-kort, Projektstart). Varje rad
   visar punktens status och, när underlaget är klart men punkten öppen, en
   knapp som bockar den. Punkt-id:t är en länk tillbaka till checklistan.
   En passerad grind gör fasens punkter klara — det sägs ut ("Klar via G5"),
   så att ingen letar efter en bock som inte behövs.

   rader: [{ punktId, text, redo }] */

const EPC_TEXT = { klar: "Klar", ejaktuell: "Ej aktuell", oppen: "Öppen" };
const EPC_TON = { klar: "ok", ejaktuell: "neutral", oppen: "warn" };

export function EpcKopplingar({ pid, rader, rubrik = "I Bygga batteripark" }) {
  const { state, dispatch } = usePortfolj();
  const { oppnaPost } = useUi();
  const pl = punktlage(state, pid);

  return (
    <div className="flex flex-col gap-1">
      <Overline>{rubrik}</Overline>
      <ul className="m-0 list-none p-0" aria-label="Kopplade punkter i EPC-checklistan">
        {rader.map(({ punktId, text, redo }) => {
          const lage = pl.get(punktId);
          const st = lage?.status || "oppen";
          const etikett =
            st === "klar" && lage.kalla === "grind" ? `Klar via G${PUNKT_FOR_ID.get(punktId).fas}` : EPC_TEXT[st];
          return (
            <li
              key={punktId}
              className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-hairline py-2 first:border-t-0"
            >
              <span className="text-[13px] text-ink">
                <button type="button" className="lankknapp" onClick={() => oppnaPost("epc", `kp-${punktId}`)}>
                  {punktId}
                </button>{" "}
                {text}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge ton={EPC_TON[st]} label={etikett} />
                {st === "oppen" && redo ? (
                  <button
                    type="button"
                    className="btn mini"
                    onClick={() => dispatch({ type: "EPC_PUNKT", pid, punkt: punktId, status: "klar" })}
                  >
                    Markera klar
                    <span className="sr-only"> {punktId}</span>
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
