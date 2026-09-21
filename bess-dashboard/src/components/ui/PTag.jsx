import { usePortfolj } from "../../state/hooks.js";
import { projektKlass } from "../../lib/berakningar.js";

/** Projektetikett som hämtar sin accentfärg ur portföljen själv. */
export function PTag({ pid }) {
  const { state } = usePortfolj();
  if (pid === "bada") return <span className="tag">Båda</span>;
  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return <span className="tag">{pid}</span>;
  return (
    <span className={`tag ${projektKlass(state, pid)}`.trim()}>
      {(p.nr ? p.nr + " " : "") + (p.ort || p.namn)}
    </span>
  );
}
