import { useEffect } from "react";
import { createPortal } from "react-dom";

/* Utskriftsyta.

   Vanilla-versionen fyllde <div id="utskrift"> med en HTML-sträng och körde
   window.print(). Här renderas samma yta som en portal, så utskriftsvyerna blir
   vanliga React-komponenter med samma data som skärmen.

   design-system.css sköter formatet: #utskrift är dold på skärm och visas i
   @media print, där sidomeny, topbar och footer göms. data-utskrift på <body>
   döljer dessutom arbetsytan, så bara dokumentet skrivs ut. */

export function Utskriftsyta({ innehall, onKlar }) {
  useEffect(() => {
    if (!innehall) return undefined;

    document.body.dataset.utskrift = "1";

    // Vänta en målning så att portalen hunnit committas innan dialogen öppnas.
    const timer = setTimeout(() => window.print(), 50);

    const efter = () => {
      document.body.removeAttribute("data-utskrift");
      onKlar();
    };
    window.addEventListener("afterprint", efter);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", efter);
      document.body.removeAttribute("data-utskrift");
    };
  }, [innehall, onKlar]);

  if (!innehall) return null;
  return createPortal(<div id="utskrift">{innehall}</div>, document.body);
}

/** Textruta i utskriftsmallarna. Radbrytningar bevaras. */
export function Ruta({ bokstav, rubrik, varde }) {
  return (
    <div className="box">
      <b>
        {bokstav} — {rubrik}
      </b>
      {varde ? varde : " "}
    </div>
  );
}
