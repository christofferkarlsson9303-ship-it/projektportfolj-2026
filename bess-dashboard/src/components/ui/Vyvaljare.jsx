import { useRef } from "react";
import { useUi } from "../../state/hooks.js";

/* Segmenterad vyväljare. Implementerad som radiogroup: piltangenter flyttar
   mellan alternativen och bara det valda ligger i tabbordningen — det är så
   en segmented control ska bete sig. Ett gäng lösa knappar (som i
   standalone-versionen) tvingar användaren att tabba igenom varje alternativ. */
export function Vyvaljare({ alternativ, varde, onValj, etikett }) {
  const ref = useRef(null);

  const onKeyDown = (e) => {
    const i = alternativ.findIndex(([v]) => v === varde);
    let ny = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") ny = (i + 1) % alternativ.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") ny = (i - 1 + alternativ.length) % alternativ.length;
    if (e.key === "Home") ny = 0;
    if (e.key === "End") ny = alternativ.length - 1;
    if (ny === null) return;
    e.preventDefault();
    onValj(alternativ[ny][0]);
    ref.current?.querySelectorAll('[role="radio"]')[ny]?.focus();
  };

  return (
    <div className="lagevaljare" role="radiogroup" aria-label={etikett} ref={ref} onKeyDown={onKeyDown}>
      {alternativ.map(([v, namn, titel]) => {
        const vald = v === varde;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vald}
            tabIndex={vald ? 0 : -1}
            title={titel}
            className={vald ? "pa" : ""}
            onClick={() => onValj(v)}
          >
            {namn}
          </button>
        );
      })}
    </div>
  );
}

/** Kompakt eller normal radhöjd — gäller alla tabeller och listor. */
export function Tathetsvaljare() {
  const { tathet, setTathet } = useUi();
  return (
    <Vyvaljare
      etikett="Radtäthet"
      varde={tathet}
      onValj={setTathet}
      alternativ={[
        ["normal", "Detaljerad", "Luftiga rader"],
        ["kompakt", "Kompakt", "Fler rader på skärmen"],
      ]}
    />
  );
}
