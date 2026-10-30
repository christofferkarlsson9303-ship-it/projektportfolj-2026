import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfoljAtgarder } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { tolkaSnabbrad } from "../../lib/snabbrad.js";
import { datumKort, idag } from "../../lib/datum.js";
import { nyttId } from "../../lib/id.js";

/* Ny punkt direkt i Idag: skriv en mening, Enter lägger till. Ett datum sist i
   raden blir fristen (lib/snabbrad.js); utan datum hamnar punkten under Idag.
   Fältet behåller fokus, så att flera punkter kan skrivas i följd. Esc tömmer
   och lämnar fältet. Moment sätts av reducern (medNyaMoment). */

/** @param {{ pid: string, projektNamn: string, ref?: import("react").Ref<HTMLInputElement> }} props */
export function SnabbRad({ pid, projektNamn, ref }) {
  const { laggTill } = usePortfoljAtgarder();
  const [text, setText] = useState("");
  const [kvitto, setKvitto] = useState("");

  const nu = idag();
  const tolkad = tolkaSnabbrad(text, nu);
  const nar = !tolkad ? "" : tolkad.forfaller ? `frist ${datumKort(tolkad.forfaller)}` : "idag";

  const skapa = () => {
    if (!tolkad || !pid) return;
    laggTill("punkter", {
      id: nyttId("p"),
      projektId: pid,
      titel: tolkad.titel,
      agare: hamtaNamn() || "Christoffer Karlsson",
      forfaller: tolkad.forfaller,
      uppfoljning: tolkad.uppfoljning,
      status: "oppen",
    });
    setKvitto(`Lagd: ${tolkad.titel} · ${nar}`);
    setText("");
  };

  return (
    <div className="flex flex-col gap-1 print:hidden">
      <div className="snabbrad group">
        <Plus size={16} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-ink-faint transition-colors duration-150 ease-one group-focus-within:text-one-bla" />
        <input
          ref={ref}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (kvitto) setKvitto("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              skapa();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setText("");
              e.currentTarget.blur();
            }
          }}
          aria-label="Ny punkt"
          aria-describedby="snabbrad-tips"
          placeholder="Ny punkt — skriv och tryck Enter"
          autoComplete="off"
          className="min-w-0 flex-1 font-body text-ink placeholder:text-ink-faint"
        />
        {tolkad ? (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-soft">{nar}</span>
        ) : null}
      </div>
      {/* En rad: kvittot ersätter tipset tills man skriver igen, så att inget hoppar. */}
      <p aria-hidden="true" className={`m-0 text-[12px] ${kvitto ? "font-semibold text-ok-ink" : "text-ink-faint"}`}>
        {kvitto || `${projektNamn ? `Läggs i ${projektNamn}. ` : ""}Datum sist: idag, imorgon, fre, +3, 5/11.`}
      </p>
      <span id="snabbrad-tips" className="sr-only">
        {projektNamn ? `Läggs i ${projektNamn}. ` : ""}Ett datum sist i raden blir fristen, till exempel fre eller 5/11.
      </span>
      <span role="status" aria-live="polite" className="sr-only">{kvitto}</span>
    </div>
  );
}
