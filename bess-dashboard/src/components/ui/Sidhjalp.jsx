import { useState } from "react";
import { SIDHJALP } from "../../data/projektmetod.js";
import { useUi } from "../../state/hooks.js";

/* Sidhjälpen är en ?-knapp bredvid sidrubriken i toppraden. Förut låg den som
   ett kort överst i varje vy och tog plats för den som redan kan appen. */
export function Sidhjalp() {
  const { aktivVy, visa } = useUi();
  const [oppen, setOppen] = useState(false);
  /* Ny vy = ny, stängd hjälp (details får nytt key nedan). */
  const [vy, setVy] = useState(aktivVy);
  if (vy !== aktivVy) {
    setVy(aktivVy);
    setOppen(false);
  }
  const h = SIDHJALP[aktivVy];
  if (!h || aktivVy === "metod" || aktivVy === "site") return null;
  return (
    <details key={aktivVy} className="sidhjalp print:hidden" onToggle={(e) => setOppen(e.currentTarget.open)}>
      <summary title={`Gör så här: ${h[0]}`}>
        <span aria-hidden="true">?</span>
        <span className="sr-only">Gör så här: {h[0]}</span>
      </summary>
      {/* Panelen ritas bara när den är öppen — en stängd details lägger ändå ut
          innehållet, och den absolut placerade panelen gav sidledsrullning på mobil. */}
      {oppen ? (
      <div className="sidhjalp-panel">
        <p className="m-0 text-sm font-bold">Gör så här: {h[0]}</p>
        <ol className="mb-3 mt-2 space-y-2 pl-5 text-sm">{h.slice(1).map((s) => <li key={s}>{s}</li>)}</ol>
        <button type="button" className="btn sec mini" onClick={() => visa("metod")}>Öppna projektmetoden och ordlistan</button>
      </div>
      ) : null}
    </details>
  );
}
