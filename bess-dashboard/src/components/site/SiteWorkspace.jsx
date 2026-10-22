import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./site-workspace.css";

/** Samma projektscen under alla verktyg. Paneler överlappar, de krymper aldrig canvasen. */
export function SiteWorkspace({ titel, sammanfattning, sparstatus, panel, onPanel, children, verktyg, paneler, onInset }) {
  const rot = useRef(null);
  const dock = useRef(null);
  const [hel, setHel] = useState(false);
  const [visar, setVisar] = useState(true);

  useEffect(() => {
    const el = dock.current;
    if (!el || !onInset) return undefined;
    const rapportera = () => onInset(visar && window.innerWidth > 700 ? el.getBoundingClientRect().width + 24 : 0);
    const ro = new ResizeObserver(rapportera);
    ro.observe(el);
    rapportera();
    return () => ro.disconnect();
  }, [visar, onInset]);
  const helskarm = () => setHel(v => !v);
  useEffect(() => {
    if (!hel) return undefined;
    const ned = e => { if (e.key === "Escape") setHel(false); };
    window.addEventListener("keydown", ned);
    return () => window.removeEventListener("keydown", ned);
  }, [hel]);

  return <section ref={rot} id="site-scen" aria-label={titel} className={`site-workspace${hel ? " site-workspace--full" : ""}`}>
    <div className="site-workspace__scene">{children}</div>
    <header className="site-workspace__identity">
      <span className="site-workspace__eyebrow">Batteripark · 3D</span>
      <h2>{titel}</h2>
      <p>{sammanfattning}</p>
      <span className="site-workspace__save" role="status">{sparstatus}</span>
    </header>
    <div className="site-workspace__toptools">
      <button type="button" className="btn sec mini" onClick={helskarm} aria-label={hel ? "Lämna helskärm" : "Visa parken i helskärm"}>
        {hel ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span>{hel ? "Återgå" : "Helskärm"}</span>
      </button>
      <button type="button" className="btn sec mini" onClick={() => setVisar(v => !v)} aria-expanded={visar} aria-controls="site-dock">
        {visar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}<span>{visar ? "Fäll in verktyg" : "Visa verktyg"}</span>
      </button>
    </div>
    <aside ref={dock} id="site-dock" aria-label="Parkens verktyg" className="site-workspace__dock" hidden={!visar}>
      <nav aria-label="Verktyg i 3D-vyn" className="site-workspace__tabs">
        {paneler.map(p => <button key={p.id} type="button" aria-pressed={panel === p.id} onClick={() => onPanel(p.id)}>{p.namn}</button>)}
      </nav>
      <div className="site-workspace__panel">{verktyg}</div>
    </aside>
  </section>;
}
