import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { VART, nyUtanfor, sammanstall } from "../../lib/utanfor.js";
import { exporteraLista } from "../../lib/export.js";

/* "Gick utanför appen" — ett klick på vart, ett valfritt ord om vad.
   Under knapparna står sammanställningen för de senaste 14 dagarna. Det är
   den som svarar på om verktyget räcker. Native <dialog> ger fokusfälla,
   Escape och fokus tillbaka till knappen. */

export function UtanforDialog() {
  const { state, dispatch } = usePortfolj();
  const { utanforOppen, setUtanforOppen, valtProjekt, visaToast } = useUi();
  const ref = useRef(null);
  const [vad, setVad] = useState("");
  const vadId = useId();
  const s = useMemo(() => sammanstall(state.utanfor || []), [state.utanfor]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (utanforOppen && !d.open) d.showModal();
    if (!utanforOppen && d.open) d.close();
  }, [utanforOppen]);

  const logga = (vart) => {
    dispatch({ type: "LAGG_TILL", lista: "utanfor", rad: nyUtanfor({ vart, vad, projektId: valtProjekt || "" }) });
    setVad("");
    visaToast(`Loggat: ${vart}${vad.trim() ? " – " + vad.trim() : ""}`);
  };

  const max = Math.max(1, ...s.perVart.map(([, n]) => n));

  return (
    <dialog
      ref={ref}
      aria-labelledby="utanfor-rubrik"
      onClose={() => setUtanforOppen(false)}
      className="w-[min(560px,calc(100vw-32px))] rounded-xl border border-solid border-hairline bg-surface p-0 text-ink shadow-lg backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="utanfor-rubrik" className="m-0 font-head text-[17px] font-bold">Gick utanför appen</h2>
            <p className="m-0 mt-1 text-[13px] text-ink-soft">Vart fick du gå för att få fram det du behövde?</p>
          </div>
          <button type="button" className="btn sec mini" onClick={() => setUtanforOppen(false)}>
            Stäng
          </button>
        </header>

        <div className="f mb-0">
          <label htmlFor={vadId}>Vad behövde du? (valfritt)</label>
          <input id={vadId} type="text" value={vad} placeholder="t.ex. ÄTA-summa per projekt" onChange={(e) => setVad(e.target.value)} />
        </div>

        <div role="group" aria-label="Vart gick du" className="flex flex-wrap gap-2">
          {VART.map((v) => (
            <button key={v} type="button" className="btn sec" onClick={() => logga(v)}>
              {v}
            </button>
          ))}
        </div>

        <section aria-labelledby="utanfor-summa" className="flex flex-col gap-3 border-0 border-t border-solid border-hairline pt-4">
          <h3 id="utanfor-summa" className="m-0 text-[13px] font-bold uppercase tracking-wider text-ink-soft">
            Senaste 14 dagarna: {s.antal} {s.antal === 1 ? "gång" : "gånger"}
          </h3>
          {s.antal ? (
            <>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Per ställe">
                {s.perVart.map(([v, n]) => (
                  <li key={v} className="grid grid-cols-[90px_minmax(0,1fr)_28px] items-center gap-2 text-[13px]">
                    <span>{v}</span>
                    <span aria-hidden="true" className="h-2.5 rounded-full bg-one-bla" style={{ width: `${(n / max) * 100}%` }} />
                    <span className="text-right font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
              {s.vanligast.length ? (
                <div>
                  <p className="m-0 mb-1 text-[12.5px] font-semibold text-ink-soft">Det du oftast behövde</p>
                  <ol className="m-0 pl-5 text-[13px]">
                    {s.vanligast.map(([v, n]) => (
                      <li key={v}>
                        {v} <span className="text-ink-soft">({n})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div>
                <button type="button" className="btn sec mini" onClick={async () => {
                    const r = await exporteraLista("utanfor-appen", s.rader);
                    if (r && !r.tyst) visaToast(r.txt, r.typ);
                  }}>
                  Exportera CSV
                </button>
              </div>
            </>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inget loggat än. Tryck på ett ställe ovan varje gång du lämnar appen för att få fram något.</p>
          )}
        </section>
      </div>
    </dialog>
  );
}
