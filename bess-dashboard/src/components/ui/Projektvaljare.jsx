import { Check } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";

/* Projektväljare. Tillgänglighet: knapparna skiljde sig bara på färg förut.
   Nu är det en radiogrupp där det valda projektet annonseras som markerat. */
export function Projektvaljare() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt } = useUi();

  const valdId = state.projekt.some((p) => p.id === valtProjekt) ? valtProjekt : state.projekt[0]?.id;

  return (
    <div
      role="group"
      aria-label="Välj projekt"
      className="projektvaljare"
    >
      {state.projekt.map((p) => {
        const vald = valdId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={`btn projektval ${vald ? "valt" : "sec"}`.trim()}
            aria-pressed={vald}
            onClick={() => setValtProjekt(p.id)}
          >
            {vald ? <Check size={15} aria-hidden="true" /> : null}<span>{p.nr} {p.namn}</span>
          </button>
        );
      })}
    </div>
  );
}

