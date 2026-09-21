import { VYMETA as META } from "../../data/vyer.js";
import { useUi } from "../../state/hooks.js";

export function Topbar() {
  const { aktivVy, navOppen, setNavOppen, tema, vaxlaTema } = useUi();
  const m = META[aktivVy] || { namn: "", lead: "" };

  const temaEtikett =
    tema === "dark" ? "Byt till ljust läge" : tema === "light" ? "Byt till mörkt läge" : "Byt färgläge";

  return (
    <header className="topbar">
      <button
        type="button"
        className="navtoggle"
        onClick={() => setNavOppen((v) => !v)}
        aria-expanded={navOppen}
        aria-controls="nav"
        aria-label={navOppen ? "Stäng menyn" : "Öppna menyn"}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className="tophead">
        {/* h1 byts med vyn — sidans rubrik ska spegla var användaren är. */}
        <h1 className="pagetitle">{m.namn}</h1>
        {m.lead ? <p className="pagelead">{m.lead}</p> : null}
      </div>

      <button type="button" className="kbd" onClick={vaxlaTema} aria-label={temaEtikett} title={temaEtikett}>
        <span aria-hidden="true">{tema === "dark" ? "☀" : "☾"}</span>
      </button>
    </header>
  );
}
