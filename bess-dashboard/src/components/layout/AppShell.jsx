import { useEffect, useRef } from "react";
import { FaltmaterialPanel } from "../field/FaltmaterialPanel.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { Dialog } from "../ui/Dialog.jsx";
import { Toast } from "../ui/Toast.jsx";
import { Kommandopalett } from "../ui/Kommandopalett.jsx";
import { Utskriftsyta } from "../ui/Utskrift.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { underlagsstampel } from "../../lib/berakningar.js";
import { Sidhjalp } from "../ui/Sidhjalp.jsx";

export function AppShell({ children }) {
  const { state } = usePortfolj();
  const { aktivVy, fokus, utskrift, rensaUtskrift, valtProjekt, setValtProjekt, faltmaterial, stangFaltmaterial } = useUi();
  const mainRef = useRef(null);

  /* Rulla till toppen vid vybyte — annars landar man mitt i den nya vyn.
     Flaggöppning hanterar sin egen markering och rullning nedan. */
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [aktivVy]);

  /* Markera och rulla till det som en öppnad flagga pekar ut. */
  useEffect(() => {
    if (!fokus) return undefined;
    const t = setTimeout(() => {
      const mal =
        (fokus.extra === "projektdata" && document.querySelector(".projektred")) ||
        document.querySelector("main .card");
      if (!mal) return;
      mal.scrollIntoView({ behavior: "smooth", block: "start" });
      mal.classList.add("puls");
      setTimeout(() => mal.classList.remove("puls"), 1400);
    }, 80);
    return () => clearTimeout(t);
  }, [fokus]);

  return (
    <div className="appshell">
      <a className="skiplink" href="#innehall">
        Hoppa till innehållet
      </a>

      <Sidebar />

      <div className="appmain">
        <Topbar />
        {/* tabIndex=-1 gör att hopplänken kan flytta fokus hit. */}
        <main id="innehall" ref={mainRef} tabIndex={-1}>
          <Sidhjalp />
          {children}
        </main>

        <footer>
          <div className="fwrap">
            <span>{underlagsstampel(state)}</span>
            <span>ONE Nordic · Projektportfölj BESS</span>
          </div>
        </footer>
      </div>

      <Toast />
      <Dialog />
      <Kommandopalett />
      {faltmaterial && state.projekt.length ? <FaltmaterialPanel
        key={valtProjekt}
        projekt={state.projekt.find((p) => p.id === valtProjekt) || state.projekt[0]}
        urval={faltmaterial}
        onValjProjekt={setValtProjekt}
        onStang={stangFaltmaterial}
      /> : null}
      <Utskriftsyta innehall={utskrift} onKlar={rensaUtskrift} />
    </div>
  );
}
