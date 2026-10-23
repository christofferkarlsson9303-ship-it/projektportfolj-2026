import { usePortfolj, useUi } from "../../state/hooks.js";
import { StatusBadge } from "../ds/index.js";
import { losningslage } from "../../lib/metodkoll.js";

/* Godkänd lösning — grind före inköp (projektmetoden § 6.8, hållpunkt mot G4).
   Läser "Grind före inköp" i Projektstart, steget Godkänd lösning: alla
   kritiska punkter ska vara bockade innan större inköp släpps. Visas i
   moment 4 (Inköp & ledtider). */
export function LosningGrind({ pid }) {
  const { state } = usePortfolj();
  const { oppnaProjektstart } = useUi();
  const l = losningslage(state, pid);
  return (
    <div className={`epc-losning ${l.godkand ? "ok" : ""}`.trim()} role="group" aria-label="Godkänd lösning — grind före inköp">
      <div className="flex flex-wrap items-center gap-2">
        <b>Godkänd lösning före inköp</b>
        <StatusBadge ton={l.godkand ? "ok" : "bad"} label={l.godkand ? "Godkänd" : "Inte godkänd — inga större inköp"} />
      </div>
      {!l.godkand ? (
        <ul>
          {l.finns ? l.saknas.map((t) => <li key={t}>{t}</li>) : <li>Projektstartens steg Godkänd lösning är inte påbörjat.</li>}
        </ul>
      ) : null}
      <button type="button" className="lankknapp" onClick={() => oppnaProjektstart(pid)}>
        Öppna Godkänd lösning i Projektstart
      </button>
    </div>
  );
}
