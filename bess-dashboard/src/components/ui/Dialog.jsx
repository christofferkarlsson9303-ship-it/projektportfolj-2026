import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUi } from "../../state/hooks.js";

/* Ersätter prompt()/confirm(), som är blockerade i sandlådan.
   Native <dialog> öppnad med showModal() (F1, granskning 2026-10-29): webbläsaren
   ger dialogrollen, gör sidan bakom inert, håller Tab i rutan, lägger den i top
   layer och stänger på Escape och mobilens bakåtgest (cancel). Fokus flyttas in vid
   öppning och tillbaka till utlösaren när rutan tas bort, som förut. */
export function Dialog() {
  const { modal, stangModal } = useUi();
  const dlgRef = useRef(null);
  const boxRef = useRef(null);
  const forraFokus = useRef(null);
  const [varden, setVarden] = useState({});
  const [fel, setFel] = useState("");

  const falt = modal?.falt || [];
  const oppen = !!modal;

  /* Öppnas en gång per visning. Byts frågan mot en ny utan att rutan stängts
     ligger den kvar öppen. Rutan tas bort ur DOM:en när modalen stängs, vilket
     också tar den ur top layer — close() anropas aldrig av oss. */
  useLayoutEffect(() => {
    const d = dlgRef.current;
    // open-kontrollen: StrictMode kör effekten två gånger, och äldre webbläsare kastar då.
    if (!oppen || !d || d.open) return;
    // Före showModal(): den flyttar fokus in i rutan direkt, och då vore utlösaren borta.
    forraFokus.current = document.activeElement;
    d.showModal?.();
  }, [oppen]);
  useEffect(() => {
    if (!modal) return undefined;
    setVarden(Object.fromEntries(falt.map((f) => [f.namn, f.varde || ""])));
    setFel("");

    // Flytta fokus till första fältet, annars till dialogen.
    const t = setTimeout(() => {
      const forsta = boxRef.current?.querySelector("input, textarea, select, button");
      forsta?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      // Lämna tillbaka fokus dit användaren var.
      if (forraFokus.current instanceof HTMLElement) forraFokus.current.focus();
    };
    // falt kommer ur modal — modal som beroende räcker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!modal) return null;

  const bekrafta = modal.typ === "bekrafta";
  const avbryt = () => stangModal(bekrafta ? false : null);

  const skicka = (e) => {
    e.preventDefault();
    const problem = !bekrafta && modal.validera?.(varden);
    if (problem) { setFel(problem); return; }
    stangModal(bekrafta ? true : varden);
  };

  return (
    <dialog
      ref={dlgRef}
      className="mdl"
      aria-labelledby="mdl-titel"
      aria-describedby={modal.lead ? "mdl-lead" : undefined}
      /* Escape och bakåtgest: webbläsaren skickar cancel. Stängningen styrs av
         modal-läget, så standardstängningen stoppas och rutan tas bort i stället. */
      onCancel={(e) => {
        e.preventDefault();
        avbryt();
      }}
      /* Stänger webbläsaren rutan ändå (upprepad Escape utan användaraktivering)
         följer modal-läget med, annars blir en osynlig modal hängande. */
      onClose={avbryt}
      /* Escape ska inte nå lyssnarna på window (Slideover, ÄTA-lådan, Projektstart …),
         som annars stänger panelen bakom samtidigt. Stänger inget själv. */
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
      }}
      /* Klick utanför rutan: ett tryck på ::backdrop har dialogen som mål, eftersom
         formuläret fyller hela dialogen. closedby="any" har ännu begränsat stöd. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) avbryt();
      }}
    >
      <form className="mbox" ref={boxRef} onSubmit={skicka}>
        <div className="mhd">
          <h3 id="mdl-titel">{modal.titel}</h3>
          {modal.lead ? <p id="mdl-lead">{modal.lead}</p> : null}
        </div>

        {falt.length ? (
          <div className="mkropp">
            {falt.map((f) => (
              <div className="f" key={f.namn}>
                <label htmlFor={`mdl-${f.namn}`}>{f.etikett}</label>
                {f.typ === "textarea" ? (
                  <textarea
                    id={`mdl-${f.namn}`}
                    value={varden[f.namn] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setVarden((v) => ({ ...v, [f.namn]: e.target.value }))}
                  />
                ) : f.typ === "select" ? (
                  <select
                    id={`mdl-${f.namn}`}
                    value={varden[f.namn] ?? ""}
                    onChange={(e) => setVarden((v) => ({ ...v, [f.namn]: e.target.value }))}
                  >
                    <option value="">Välj …</option>
                    {f.alternativ.map(([v, n]) => (
                      <option key={v} value={v}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`mdl-${f.namn}`}
                    type={f.typ || "text"}
                    required={f.obligatoriskt}
                    maxLength={f.maxLength}
                    value={varden[f.namn] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setVarden((v) => ({ ...v, [f.namn]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {fel ? <p className="mx-5 text-sm text-bad-ink" role="alert">{fel}</p> : null}
        <div className="mfot">
          <button type="button" className="btn sec" onClick={avbryt}>
            Avbryt
          </button>
          <button type="submit" className={`btn ${modal.fara ? "fara" : ""}`.trim()}>
            {modal.ok || "OK"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
