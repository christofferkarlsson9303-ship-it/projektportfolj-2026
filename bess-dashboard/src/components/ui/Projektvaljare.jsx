import { usePortfolj, useUi } from "../../state/hooks.js";

/* Projektväljare. Tillgänglighet: knapparna skiljde sig bara på färg förut.
   Nu är det en radiogrupp där det valda projektet annonseras som markerat. */
export function Projektvaljare() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt } = useUi();

  return (
    <div
      role="group"
      aria-label="Välj projekt"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
    >
      {state.projekt.map((p) => {
        const vald = valtProjekt === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={`btn ${vald ? "" : "sec"}`.trim()}
            aria-pressed={vald}
            onClick={() => setValtProjekt(p.id)}
          >
            {p.nr} {p.namn}
          </button>
        );
      })}
    </div>
  );
}
