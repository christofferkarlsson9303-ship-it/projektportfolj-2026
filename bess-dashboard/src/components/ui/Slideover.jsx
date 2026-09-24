import { useEffect, useRef } from "react";

/* Sidopanel som glider in från höger.

   Medvetet INTE en modal: ingen mörk overlay och ingen fokusfälla, för
   poängen är att innehållet bakom ska gå att läsa medan panelen är öppen.
   Escape och Stäng-knappen stänger, och fokus flyttas in när den öppnas.

   role="region" sätts explicit — Chrome exponerar inte ett <aside> med enbart
   aria-label som landmärke, och då hoppar skärmläsaren över panelen. */
export function Slideover({ titel, etikett, verktyg, onStang, children }) {
  const panelRef = useRef(null);

  /* Fokus flyttas bara när panelen öppnas. Låg det i samma effekt som
     tangentlyssnaren skulle varje ny onStang-referens — en inline-pil hos
     anroparen, alltså varje rendering — rycka fokus från fältet man skriver i. */
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const vidTangent = (e) => {
      if (e.key === "Escape") onStang();
    };
    window.addEventListener("keydown", vidTangent);
    return () => window.removeEventListener("keydown", vidTangent);
  }, [onStang]);

  return (
    <aside className="slideover" role="region" aria-label={etikett} tabIndex={-1} ref={panelRef}>
      <header className="slideover-topp">
        <h3 className="slideover-titel">{titel}</h3>
        <div className="slideover-verktyg">
          {verktyg}
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng
          </button>
        </div>
      </header>
      <div className="slideover-kropp">{children}</div>
    </aside>
  );
}
