import { useId } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { NyttProjekt } from "../ui/NyttProjekt.jsx";

/* Vyer som kan visa hela portföljen. Övriga arbetar alltid i ett projekt. */
const PORTFOLJVYER = new Set(["idag"]);

const ALLA = "__alla";

/** Det enda stället man väljer projekt på. Visar alltid vad ändringar gäller. */
export function Projektrad() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt, aktivVy, lage, setLage } = useUi();
  const id = useId();

  const kanAlla = PORTFOLJVYER.has(aktivVy);
  const portfolj = kanAlla && lage === "portfolj";
  const vald = state.projekt.some((p) => p.id === valtProjekt) ? valtProjekt : state.projekt[0]?.id || "";

  const byt = (v) => {
    if (v === ALLA) {
      setLage("portfolj");
      return;
    }
    setLage("projekt");
    setValtProjekt(v);
  };

  return (
    <div className="projektrad">
      <label htmlFor={id} className="projektrad-etikett">Projekt</label>
      <select id={id} className="projektrad-val" value={portfolj ? ALLA : vald} onChange={(e) => byt(e.target.value)} aria-label="Välj projekt">
        {kanAlla ? <option value={ALLA}>Alla projekt</option> : null}
        {state.projekt.map((p) => (
          <option key={p.id} value={p.id}>{p.nr ? `${p.nr} ` : ""}{p.namn}</option>
        ))}
      </select>
      <NyttProjekt />
    </div>
  );
}
