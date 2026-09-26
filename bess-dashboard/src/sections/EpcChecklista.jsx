import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { Note } from "../components/ui/Primitiver.jsx";
import { Fasruta, Sektioner } from "../components/epc/Fas.jsx";
import { Markering } from "../components/epc/Delar.jsx";
import { AttVerifiera, Lardomar, Ledtidstabell, Milstolpstabell } from "../components/epc/Tabeller.jsx";
import { LOPANDE, MARKERINGAR, SUMMERING } from "../data/bessChecklistData.ts";
import { projekt } from "../lib/berakningar.js";
import { datumKort } from "../lib/datum.js";
import { checklistlage, faslage, planAnkare } from "../lib/epc.js";

/* BESS EPC Checklista — "Bygga batteripark som totalentreprenad".

   Checklistan är densamma för alla projekt; det som skiljer är vad som är
   avbockat, fasernas datum och passerade grindar. Allt sparas per projekt i
   portföljen och delas som resten av datan. Varje fas avslutas med en grind:
   nästa fas startar inte förrän grinden är passerad. */

const MARKFILTER = [
  ["alla", "Alla"],
  ["HP", "Hållpunkter"],
  ["K", "Kontraktskrav"],
  ["L", "Lärdomar"],
];

/** Faser som är öppna från början: det man arbetar med nu. */
const oppnaFranBorjan = (faser) =>
  new Set(faser.filter((f) => ["pagar", "sen", "redo"].includes(f.status)).map((f) => f.fas.nr));

function Checklista({ pid }) {
  const { state, uppd } = usePortfolj();
  const { postFokus } = useUi();
  const p = projekt(state, pid);
  const faser = useMemo(() => faslage(state, pid), [state, pid]);
  const sum = useMemo(() => checklistlage(state, pid), [state, pid]);
  const a = planAnkare(state, pid);

  const [oppna, setOppna] = useState(() => oppnaFranBorjan(faser));
  const [sok, setSok] = useState("");
  const [mark, setMark] = useState("alla");
  const [doljKlara, setDoljKlara] = useState(false);

  /* Översikten och ledtiderna pekar ut en fas ("fas-7") eller en punkt
     ("kp-7.3"). Justering under render öppnar fasen, effekten rullar dit. */
  const [mal, setMal] = useState(null);
  if (postFokus?.vy === "epc" && postFokus.tid !== mal?.tid) {
    const id = String(postFokus.id);
    const fas = /lop/.test(id) ? "lop" : Number(id.replace(/^(fas-|kp-)/, "").split(".")[0]);
    if (fas === "lop" || Number.isInteger(fas)) setOppna((o) => new Set([...o, fas]));
    setMal({ id: id === "fas-lop" ? "fas-lopande" : id, tid: postFokus.tid });
  }
  useEffect(() => {
    const el = mal && document.getElementById(mal.id);
    if (!el) return undefined;
    // Rullningen startar efter den här committen, så att annat som flyttar
    // fokus i samma svep (en stängd dialog eller palett) inte avbryter den.
    const start = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    el.classList.add("epc-markerad");
    const slut = setTimeout(() => el.classList.remove("epc-markerad"), 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(slut);
    };
  }, [mal]);

  const klaraId = useMemo(
    () => new Set((state.epcStatus || []).filter((r) => r.projektId === pid && r.klar).map((r) => r.punkt)),
    [state.epcStatus, pid]
  );

  const sokord = sok.trim().toLowerCase();
  const filterAktivt = !!sokord || mark !== "alla" || doljKlara;
  const filter = (punkt) =>
    (mark === "alla" || punkt.badges.includes(mark)) &&
    (!doljKlara || !klaraId.has(punkt.id)) &&
    (!sokord || `${punkt.id} ${punkt.text} ${punkt.ansvar} ${punkt.nar}`.toLowerCase().includes(sokord));

  const vaxla = (nr, oppen) =>
    setOppna((o) => {
      const n = new Set(o);
      if (oppen) n.add(nr);
      else n.delete(nr);
      return n;
    });

  const aktuell = faser.find((f) => ["sen", "pagar", "redo"].includes(f.status));
  const passerade = faser.filter((f) => f.grind.passerad).length;
  const procent = Math.round((sum.klara / sum.totalt) * 100);
  const lopandeSynliga = LOPANDE.sektioner.some((s) => s.punkter.some(filter));

  return (
    <>
      <section className="card epc-huvud" aria-labelledby="epc-rubrik">
        <div className="epc-huvudrad">
          <div className="min-w-0">
            <h2 id="epc-rubrik" className="epc-rubrik">
              {(p.nr ? p.nr + " " : "") + p.namn}
            </h2>
            <p className="lead m-0">
              {SUMMERING.faser} faser med grind · {SUMMERING.punkter} kontrollpunkter · {SUMMERING.hallpunkter}{" "}
              hållpunkter · {SUMMERING.milstolpar} betalmilstolpar. ABT 06 / ABT-U 07, version 1.0.
            </p>
          </div>
          <ul className="epc-tal" aria-label="Läget i checklistan">
            <li>
              <b>{procent} %</b>
              <span>
                {sum.klara} av {sum.totalt} punkter
              </span>
            </li>
            <li>
              <b>
                {sum.hpKlara}/{sum.hp}
              </b>
              <span>hållpunkter godkända</span>
            </li>
            <li>
              <b>{passerade}/16</b>
              <span>grindar passerade</span>
            </li>
            <li>
              <b>{aktuell ? `Fas ${aktuell.fas.nr}` : "—"}</b>
              <span>{aktuell ? aktuell.fas.kort : "ingen fas pågår"}</span>
            </li>
          </ul>
        </div>

        <div className="epc-projektplan">
          <div className="epc-falt">
            <label htmlFor={`epc-start-${pid}`}>
              Startdatum (NTP)
              {p.startdatumAntagande ? <span className="ant">ANTAGANDE</span> : null}
            </label>
            <DatumFalt
              id={`epc-start-${pid}`}
              varde={p.startdatum || ""}
              etikett={`Startdatum för ${p.namn}`}
              onCommit={(v) => {
                uppd("projekt", pid, "startdatum", v);
                uppd("projekt", pid, "startdatumAntagande", false);
              }}
            />
          </div>
          <div className="epc-falt">
            <label htmlFor={`epc-slut-${pid}`}>Färdigställande / slutbesiktning</label>
            <DatumFalt
              id={`epc-slut-${pid}`}
              varde={p.fardigstallande || ""}
              etikett={`Färdigställande för ${p.namn}`}
              onCommit={(v) => uppd("projekt", pid, "fardigstallande", v)}
            />
          </div>
          <p className="epc-plantext">
            {a ? (
              <>
                Standardplanen räknas från start, {a.mittKalla === "leverans" ? "BESS-leveransen" : "en antagen leverans"}{" "}
                {datumKort(a.mitt)} och slutbesiktningen. Varje fas kan få egna datum.
                {a.startAntagande
                  ? " Startdatumet är antaget ur kontraktets milstolpar (feb–sep 2026) — ange det rätta."
                  : ""}
              </>
            ) : (
              "Ange startdatum och färdigställande så räknas fasplan, Gantt-schema och ledtider fram."
            )}
          </p>
        </div>

        <ul className="epc-legend" aria-label="Markeringar">
          {Object.entries(MARKERINGAR).map(([k, m]) => (
            <li key={k}>
              <Markering typ={k} /> {m.beskrivning}
            </li>
          ))}
        </ul>
      </section>

      <div className="epc-filter" role="search">
        <label className="epc-sok">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Sök i checklistan</span>
          <input
            type="search"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            placeholder="Sök kontrollpunkt, ansvar eller tidpunkt…"
          />
        </label>
        <div className="ov-flikar" role="group" aria-label="Visa markering">
          {MARKFILTER.map(([id, namn]) => (
            <button key={id} type="button" aria-pressed={mark === id} onClick={() => setMark(id)}>
              {namn}
            </button>
          ))}
        </div>
        <label className="epc-dolj">
          <input type="checkbox" checked={doljKlara} onChange={(e) => setDoljKlara(e.target.checked)} />
          Dölj klara
        </label>
        {!filterAktivt ? (
          <div className="epc-fallknappar">
            <button type="button" className="btn sec mini" onClick={() => setOppna(new Set(faser.map((f) => f.fas.nr)))}>
              Fäll ut alla
            </button>
            <button type="button" className="btn sec mini" onClick={() => setOppna(new Set())}>
              Fäll ihop
            </button>
          </div>
        ) : null}
      </div>

      <div className="epc-faser">
        {faser.map((l) => (
          <Fasruta
            key={l.fas.nr}
            lage={l}
            pid={pid}
            oppen={oppna.has(l.fas.nr)}
            onVaxla={vaxla}
            filter={filter}
            tvingaOppen={filterAktivt}
          />
        ))}

        {!filterAktivt || lopandeSynliga ? (
          <details className="epc-fas lopande" id="fas-lopande" open={filterAktivt || oppna.has("lop")}
            onToggle={(e) => {
              if (!filterAktivt && e.currentTarget.open !== oppna.has("lop")) vaxla("lop", e.currentTarget.open);
            }}
          >
            <summary>
              <span className="epc-fasnr" aria-hidden="true">
                ∞
              </span>
              <span className="epc-fastitel">
                <b>{LOPANDE.titel}</b>
                <span className="epc-fasdatum">{LOPANDE.syfte}</span>
              </span>
            </summary>
            <div className="epc-faskropp">
              <Sektioner sektioner={LOPANDE.sektioner} pid={pid} filter={filter} />
            </div>
          </details>
        ) : null}

        {filterAktivt && !faser.some((l) => l.fas.sektioner.some((s) => s.punkter.some(filter))) && !lopandeSynliga ? (
          <p className="lead">Inga kontrollpunkter matchar filtret.</p>
        ) : null}
      </div>
    </>
  );
}

export function EpcChecklista() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid } = useUi();
  const p = projekt(state, pid);

  if (!p) {
    return (
      <>
        <Projektvaljare />
        <p className="lead">Välj ett projekt.</p>
      </>
    );
  }

  const bockaAv = (punkt) => dispatch({ type: "EPC_VAXLA", pid, punkt, klar: true });

  return (
    <>
      <Projektvaljare />
      {/* key: fällda faser och filter börjar om när man byter projekt. */}
      <Checklista key={pid} pid={pid} />

      <section className="card epc-block" aria-labelledby="epc-ledtider">
        <h3 id="epc-ledtider">Ligg steget före – ledtider</h3>
        <p className="lead">
          Sista startdatum räknat mot projektets datum. Kända datum ur leveranslistan och tidplanen går före
          fasplanen. Röd = startdatumet har passerat, gul = inom två veckor.
        </p>
        <Ledtidstabell pid={pid} onBockaAv={bockaAv} />
      </section>

      <section className="card epc-block" aria-labelledby="epc-milstolpar">
        <h3 id="epc-milstolpar">Betalmilstolpar (Batch C)</h3>
        <p className="lead">
          Rutin: avisering (Excel) → beställarens OK → faktura i IFS. Faser med en betalning har orange
          kant — de låser en milstolpe.
        </p>
        <Milstolpstabell pid={pid} />
      </section>

      <section className="card epc-block" aria-labelledby="epc-lardomar">
        <h3 id="epc-lardomar">Lärdomar från Batch C — de 10 som kostat mest</h3>
        <Lardomar />
      </section>

      <section className="card epc-block" aria-labelledby="epc-verifiera">
        <h3 id="epc-verifiera">Att verifiera — källorna säger olika</h3>
        <AttVerifiera />
      </section>

      <Note>
        Värden, frister och procentsatser är hämtade från Batch C-kontrakten och leverantörsmanualer.
        Kontrollera alltid mot aktuellt projekts kontrakt och bilagor. Standardplanens fasdatum är en
        utgångspunkt, inte en tidplan.
      </Note>
    </>
  );
}
