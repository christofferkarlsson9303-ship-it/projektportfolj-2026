import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "./PTag.jsx";
import { fmtLoggTid, idag } from "../../lib/datum.js";

/* Aktivitets- och ändringslogg.

   Datan har alltid funnits i state.andringslogg (reducern skriver dit vid varje
   statusändring), men den saknade gränssnitt helt — händelserna gick bara att
   se genom att exportera tabellen. */

const SPANN = [
  ["alla", "Allt"],
  ["idag", "I dag"],
  ["vecka", "7 dagar"],
];

export function Andringslogg({ kompakt = false, antal = 25, rubrik = "Senaste händelser" }) {
  const { state } = usePortfolj();
  const { valtProjekt } = useUi();
  const [spann, setSpann] = useState("alla");
  const [baraProjekt, setBaraProjekt] = useState(false);
  const [visaAlla, setVisaAlla] = useState(false);

  const poster = useMemo(() => {
    // Jämför på datumsträng i stället för tidsstämpel: posternas ts är ISO, och
    // en strängjämförelse slipper både tidszonsfällor och ett Date-objekt per rad.
    const idagStr = idag();
    const veckaSedan = new Date(idagStr + "T00:00:00");
    veckaSedan.setDate(veckaSedan.getDate() - 7);
    const veckaStr = veckaSedan.toISOString().slice(0, 10);

    return (state.andringslogg || []).filter((p) => {
      if (baraProjekt && p.projektId !== valtProjekt) return false;
      if (spann === "alla") return true;
      const dag = String(p.ts || "").slice(0, 10);
      if (!dag) return false;
      return spann === "idag" ? dag === idagStr : dag >= veckaStr;
    });
  }, [state.andringslogg, spann, baraProjekt, valtProjekt]);

  const visade = visaAlla ? poster : poster.slice(0, antal);

  return (
    <div className={kompakt ? "" : "card"}>
      <div className="kortrad">
        <div style={{ minWidth: 0 }}>
          <h3>{rubrik}</h3>
          <div className="lead" style={{ marginBottom: 0 }}>
            Statusändringar loggas automatiskt med tidpunkt och vem som gjorde dem.
          </div>
        </div>

        <div className="kortverktyg">
          <div className="qfilter" style={{ margin: 0 }} role="group" aria-label="Tidsspann">
            {SPANN.map(([v, namn]) => (
              <button
                key={v}
                type="button"
                className={`qf ${spann === v ? "on" : ""}`.trim()}
                aria-pressed={spann === v}
                onClick={() => setSpann(v)}
              >
                {namn}
              </button>
            ))}
            <button
              type="button"
              className={`qf ${baraProjekt ? "on" : ""}`.trim()}
              aria-pressed={baraProjekt}
              onClick={() => setBaraProjekt((v) => !v)}
            >
              Bara valt projekt
            </button>
          </div>
        </div>
      </div>

      {visade.length ? (
        <>
          <ol className="mt-3 list-none p-0" aria-label="Händelser, senaste först">
            {visade.map((p, i) => (
              <li
                key={`${p.ts}-${i}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hairline py-2.5 last:border-b-0"
              >
                <time
                  dateTime={p.ts}
                  className="w-[104px] shrink-0 font-head text-[12px] font-bold tabular-nums text-ink-soft"
                >
                  {fmtLoggTid(p.ts)}
                </time>

                <span className="min-w-[180px] flex-1 text-[13px] leading-snug text-ink">{p.text}</span>

                {p.projektId ? <PTag pid={p.projektId} /> : null}

                <span className="text-[11.5px] text-ink-faint">{p.anvandare}</span>
              </li>
            ))}
          </ol>

          {poster.length > antal ? (
            <div className="rowbtns">
              <button
                type="button"
                className="btn sec mini"
                onClick={() => setVisaAlla((v) => !v)}
                aria-expanded={visaAlla}
              >
                {visaAlla ? "Visa färre" : `Visa alla ${poster.length}`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="lead mt-3">
          {state.andringslogg?.length
            ? "Inga händelser i det valda spannet."
            : "Inga händelser loggade ännu. Loggen fylls när du ändrar status på en rad."}
        </p>
      )}
    </div>
  );
}
