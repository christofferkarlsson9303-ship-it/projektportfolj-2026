import { SIDHJALP } from "../../data/projektmetod.js";
import { useUi } from "../../state/hooks.js";

export function Sidhjalp() {
  const { aktivVy, visa } = useUi();
  const h = SIDHJALP[aktivVy];
  if (!h || aktivVy === "metod") return null;
  return <details key={aktivVy} className="mb-4 rounded-card border border-solid border-hairline bg-surface p-3">
    <summary className="cursor-pointer text-sm font-semibold">Gör så här: {h[0]}</summary>
    <ol className="mb-3 mt-3 space-y-2 pl-5 text-sm">{h.slice(1).map((s) => <li key={s}>{s}</li>)}</ol>
    <button type="button" className="btn sec mini" onClick={() => visa("metod")}>Öppna projektmetoden och ordlistan</button>
  </details>;
}
