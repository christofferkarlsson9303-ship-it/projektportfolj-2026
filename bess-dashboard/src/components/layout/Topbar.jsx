import { ClipboardList, Plus, Search } from "lucide-react";
import { VYMETA as META } from "../../data/vyer.js";
import { useUi } from "../../state/hooks.js";
import { Projektrad } from "./Projektrad.jsx";
import { Sidhjalp } from "../ui/Sidhjalp.jsx";

export function Topbar() {
  const { aktivVy, navOppen, setNavOppen, tema, vaxlaTema, oppnaFaltmaterial, setSokOppen, setHandelseOppen } = useUi();
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
        <div className="titelrad">
          <h1 className="pagetitle">{m.namn}</h1>
          <Sidhjalp />
        </div>
        {m.lead ? <p className="pagelead">{m.lead}</p> : null}
      </div>

      {/* På mobil blir knapparna ikoner på titelraden och projekt + händelse en
          egen rad, så att det fasta huvudet tar en tredjedel så mycket höjd.
          Tillgängliga namn är desamma i alla bredder (aria-label). */}
      <div className="topp-rad">
        <Projektrad />
        <button type="button" className="kbd topp-handelse !text-xs !font-bold" onClick={() => setHandelseOppen(true)} aria-haspopup="dialog" aria-label="Registrera händelse">
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" className="topp-ikon" />
          <span className="topp-lang">Registrera händelse</span>
          <span className="topp-kort" aria-hidden="true">Händelse</span>
        </button>
      </div>
      <button type="button" className="kbd topp-knapp !text-xs" onClick={() => setSokOppen(true)} aria-haspopup="dialog" aria-label="Sök" title="Sök sidor, projekt och ÄTA (Ctrl/Cmd+K)">
        <Search size={17} strokeWidth={2.2} aria-hidden="true" className="topp-ikon" />
        <span className="topp-lang">Sök</span>
      </button>
      <button type="button" className="kbd topp-knapp !text-xs" onClick={() => oppnaFaltmaterial()} aria-haspopup="dialog" aria-label="Fältmaterial" title="Fältmaterial">
        <ClipboardList size={17} strokeWidth={2.2} aria-hidden="true" className="topp-ikon" />
        <span className="topp-lang">Fältmaterial</span>
      </button>

      <button type="button" className="kbd topp-knapp" onClick={vaxlaTema} aria-label={temaEtikett} title={temaEtikett}>
        <span aria-hidden="true">{tema === "dark" ? "☀" : "☾"}</span>
      </button>
    </header>
  );
}
