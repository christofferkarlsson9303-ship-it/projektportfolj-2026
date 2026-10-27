import { VYMETA, ingangFor } from "../../data/vyer.js";
import { useUi } from "../../state/hooks.js";

/** Flikarna i den aktiva ingången (Idag, Projektet, Pengar). Verktyg har ingen flikrad.
 *  Navigering, inte tablist: varje flik byter vy och adress. */
export function Flikrad() {
  const { aktivVy, visa } = useUi();
  const g = ingangFor(aktivVy);
  if (!g) return null;

  return (
    <nav className="flikrad" aria-label={`Flikar i ${g.namn}`}>
      {g.vyer.map((id) => {
        const aktiv = id === aktivVy;
        return (
          <button
            key={id}
            type="button"
            className={aktiv ? "on" : ""}
            aria-current={aktiv ? "page" : undefined}
            onClick={() => visa(id)}
            title={VYMETA[id]?.lead}
          >
            {VYMETA[id]?.namn || id}
          </button>
        );
      })}
    </nav>
  );
}
