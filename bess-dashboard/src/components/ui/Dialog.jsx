import { useEffect, useRef, useState } from "react";
import { useUi } from "../../state/hooks.js";

/* Ersätter prompt()/confirm(), som är blockerade i sandlådan.
   Tillgänglighet: role="dialog" + aria-modal, fokus flyttas in vid öppning och
   tillbaka till utlösaren vid stängning, Escape stänger och Tab fångas i rutan. */
export function Dialog() {
  const { modal, stangModal } = useUi();
  const boxRef = useRef(null);
  const forraFokus = useRef(null);
  const [varden, setVarden] = useState({});

  const falt = modal?.falt || [];

  useEffect(() => {
    if (!modal) return undefined;
    forraFokus.current = document.activeElement;
    setVarden(Object.fromEntries(falt.map((f) => [f.namn, f.varde || ""])));

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

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      stangModal(bekrafta ? false : null);
      return;
    }
    if (e.key !== "Tab") return;
    // Fokusfälla: håll tangentbordet kvar i dialogen.
    const fokuserbara = boxRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!fokuserbara?.length) return;
    const forsta = fokuserbara[0];
    const sista = fokuserbara[fokuserbara.length - 1];
    if (e.shiftKey && document.activeElement === forsta) {
      e.preventDefault();
      sista.focus();
    } else if (!e.shiftKey && document.activeElement === sista) {
      e.preventDefault();
      forsta.focus();
    }
  };

  const skicka = (e) => {
    e.preventDefault();
    stangModal(bekrafta ? true : varden);
  };

  return (
    <div
      className="mdl on"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) stangModal(bekrafta ? false : null);
      }}
      onKeyDown={onKeyDown}
    >
      <form
        className="mbox"
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mdl-titel"
        aria-describedby={modal.lead ? "mdl-lead" : undefined}
        onSubmit={skicka}
      >
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
                ) : (
                  <input
                    id={`mdl-${f.namn}`}
                    type={f.typ || "text"}
                    value={varden[f.namn] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setVarden((v) => ({ ...v, [f.namn]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mfot">
          <button type="button" className="btn sec" onClick={() => stangModal(bekrafta ? false : null)}>
            Avbryt
          </button>
          <button type="submit" className={`btn ${modal.fara ? "fara" : ""}`.trim()}>
            {modal.ok || "OK"}
          </button>
        </div>
      </form>
    </div>
  );
}
