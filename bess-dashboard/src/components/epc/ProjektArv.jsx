import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { ARVSDELAR, arvsrader } from "../../lib/projektmall.js";

/* Starta från ett tidigare projekt: välj källprojekt och vad som ska följa
   med till valt projekt (lib/projektmall.js). Inga resultat, ekonomivärden
   eller signaturer kopieras, och samma arv två gånger ger inga dubbletter. */
export function ProjektArv({ pid }) {
  const { state, dispatch } = usePortfolj();
  const { visaToast } = useUi();
  const andra = state.projekt.filter((p) => p.id !== pid && p.status !== "ANBUD_EJ_VUNNET");
  const [fran, setFran] = useState(andra[0]?.id || "");
  const [delar, setDelar] = useState(() => new Set(ARVSDELAR.map(([k]) => k)));
  const rader = useMemo(() => (fran ? arvsrader(state, fran, pid) : null), [state, fran, pid]);
  const mal = state.projekt.find((p) => p.id === pid);
  if (!andra.length || !mal) return null;

  const antal = (k) => rader?.[k]?.length || 0;
  const valda = [...delar].filter((k) => antal(k));
  const vaxla = (k) =>
    setDelar((d) => {
      const n = new Set(d);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const arv = () => {
    dispatch({ type: "PROJEKT_ARV", fran, till: pid, delar: valda });
    const k = state.projekt.find((p) => p.id === fran);
    visaToast(`Ärvt från ${k?.nr || k?.namn}: ${valda.map((v) => `${antal(v)} ${ARVSDELAR.find(([x]) => x === v)[1].toLowerCase()}`).join(", ")}.`);
  };

  return (
    <details className="ds-card rounded-xl border border-solid border-hairline bg-surface p-4 shadow-sm md:px-6">
      <summary className="cursor-pointer font-head text-[15px] font-bold text-ink">
        <Copy size={15} aria-hidden="true" className="mr-2 inline align-[-2px] text-one-djup" />
        Starta från ett tidigare projekt
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-[13px]">
        <p className="m-0 text-ink-soft">
          Låt {mal.nr || mal.namn} ärva det som gick att återanvända från ett tidigare projekt. Inga resultat, ekonomivärden eller signaturer följer
          med, och samma rad ärvs aldrig två gånger.
        </p>
        <label className="flex max-w-md flex-col gap-1 font-semibold">
          Ärv från
          <select value={fran} onChange={(e) => setFran(e.target.value)}>
            {andra.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.nr ? p.nr + " " : "") + p.namn}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1 font-semibold">Vad ska följa med?</legend>
          {ARVSDELAR.map(([k, namn, hjalp]) => (
            <label key={k} className={`flex items-start gap-2 ${antal(k) ? "" : "text-ink-faint"}`}>
              <input type="checkbox" checked={delar.has(k) && antal(k) > 0} disabled={!antal(k)} onChange={() => vaxla(k)} />
              <span>
                <b>{namn}</b> ({antal(k)}) — {hjalp}
                {k === "momentplan" && rader?.forskjutning === null ? " · startdatum saknas i något av projekten" : ""}
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <button type="button" className="btn mini" disabled={!valda.length} onClick={arv}>
            Ärv till {mal.nr || mal.namn}
          </button>
        </div>
      </div>
    </details>
  );
}
