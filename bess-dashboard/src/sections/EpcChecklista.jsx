import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note } from "../components/ui/Primitiver.jsx";
import { Fasruta, Sektioner } from "../components/epc/Fas.jsx";
import { Markering } from "../components/epc/Delar.jsx";
import { NuLage, Portfoljlage } from "../components/epc/Lagesbild.jsx";
import { AttVerifiera, Lardomar, Ledtidstabell, Milstolpstabell } from "../components/epc/Tabeller.jsx";
import { LOPANDE, MARKERINGAR, SUMMERING } from "../data/bessChecklistData.ts";
import { projekt } from "../lib/berakningar.js";
import { FAS_STATUS, faslage } from "../lib/epc.js";

/* Bygga batteripark — hur en BESS-anläggning byggs som totalentreprenad
   (ABT 06), steg för steg, och var portföljens projekt står.

   Guiden är densamma för alla projekt: 16 faser som var och en avslutas med
   en grind, med kontroll- och hållpunkterna som referens. Läget följs per
   fas: när grinden är passerad är fasen klar. Det som sparas per projekt är
   passerade grindar, egna fasdatum och anteckningar. */

const MARKFILTER = [
  ["alla", "Alla"],
  ["HP", "Hållpunkter"],
  ["K", "Kontraktskrav"],
  ["L", "Lärdomar"],
];

const LAGEN = ["klar", "pagar", "sen", "kommande", "odaterad"];

/** Faser som pågår eller är sena för projektet — de fälls ut från början. */
const aktuellaFaser = (faser) =>
  faser.filter((f) => f.status === "pagar" || f.status === "sen").map((f) => f.fas.nr);

function Guide({ pid, mal }) {
  const { state } = usePortfolj();
  const p = projekt(state, pid);
  const faser = useMemo(() => faslage(state, pid), [state, pid]);

  const [oppna, setOppna] = useState(() => new Set(aktuellaFaser(faser)));
  const [sok, setSok] = useState("");
  const [mark, setMark] = useState("alla");

  /* Byter man projekt i lägesbilden fälls det projektets pågående faser ut. */
  const [forraPid, setForraPid] = useState(pid);
  if (pid !== forraPid) {
    setForraPid(pid);
    setOppna((o) => new Set([...o, ...aktuellaFaser(faser)]));
  }

  /* Målet är en fas ("fas-7") eller en punkt ("kp-7.3"). Justering under
     render fäller ut fasen, effekten rullar dit. */
  const [utfalld, setUtfalld] = useState(null);
  if (mal && mal.tid !== utfalld) {
    setUtfalld(mal.tid);
    const fas = /lop/.test(mal.id) ? "lop" : Number(mal.id.replace(/^(fas-|kp-)/, "").split(".")[0]);
    if (fas === "lop" || Number.isInteger(fas)) setOppna((o) => new Set([...o, fas]));
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

  const sokord = sok.trim().toLowerCase();
  const filterAktivt = !!sokord || mark !== "alla";
  const filter = (punkt) =>
    (mark === "alla" || punkt.badges.includes(mark)) &&
    (!sokord || `${punkt.id} ${punkt.text} ${punkt.ansvar} ${punkt.nar}`.toLowerCase().includes(sokord));

  const vaxla = (nr, oppen) =>
    setOppna((o) => {
      const n = new Set(o);
      if (oppen) n.add(nr);
      else n.delete(nr);
      return n;
    });

  const lopandeSynliga = LOPANDE.sektioner.some((s) => s.punkter.some(filter));
  const projektnamn = p ? (p.nr ? p.nr + " " : "") + (p.ort || p.namn) : "projektet";

  return (
    <section className="epc-block" aria-labelledby="epc-steg">
      <div className="epc-stegrubrik">
        <h3 id="epc-steg">Steg för steg — från affär till garantitid</h3>
        <p className="lead">
          Varje fas avslutas med en grind: nästa fas startar inte förrän grinden är passerad. Fälls en fas ut syns
          vad som ska vara gjort, vem som äger det och när — och till höger hur det ser ut i {projektnamn}.
        </p>
        <ul className="epc-legend" aria-label="Markeringar">
          {Object.entries(MARKERINGAR).map(([k, m]) => (
            <li key={k}>
              <Markering typ={k} /> {m.beskrivning}
            </li>
          ))}
        </ul>
      </div>

      <div className="epc-filter" role="search">
        <label className="epc-sok">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Sök i guiden</span>
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
            projektnamn={projektnamn}
            oppen={oppna.has(l.fas.nr)}
            onVaxla={vaxla}
            filter={filter}
            tvingaOppen={filterAktivt}
          />
        ))}

        {!filterAktivt || lopandeSynliga ? (
          <details
            className="epc-fas lopande"
            id="fas-lopande"
            open={filterAktivt || oppna.has("lop")}
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
              <div className="epc-guide">
                <Sektioner sektioner={LOPANDE.sektioner} filter={filter} />
              </div>
            </div>
          </details>
        ) : null}

        {filterAktivt && !faser.some((l) => l.fas.sektioner.some((s) => s.punkter.some(filter))) && !lopandeSynliga ? (
          <p className="lead">Inga kontrollpunkter matchar filtret.</p>
        ) : null}
      </div>
    </section>
  );
}

export function EpcChecklista() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt, setValtProjekt, postFokus } = useUi();
  const pid = projekt(state, valtProjekt) ? valtProjekt : state.projekt[0]?.id;
  const p = projekt(state, pid);

  /* Översikten och paletten pekar ut en fas eller punkt via postFokus,
     lägesbilden via visaFas. */
  const [mal, setMal] = useState(null);
  const [fokusTid, setFokusTid] = useState(null);
  if (postFokus?.vy === "epc" && postFokus.tid !== fokusTid) {
    setFokusTid(postFokus.tid);
    const id = String(postFokus.id);
    setMal({ id: id === "fas-lop" ? "fas-lopande" : id, tid: postFokus.tid });
  }

  if (!p) return <p className="lead">Inga projekt i portföljen.</p>;

  const visaFas = (nr) => setMal({ id: `fas-${nr}`, tid: Date.now() });

  return (
    <>
      <section className="card epc-huvud" aria-labelledby="epc-rubrik">
        <div className="epc-huvudrad">
          <div className="min-w-0">
            <h2 id="epc-rubrik" className="epc-rubrik">
              Så byggs en batteripark
            </h2>
            <p className="lead m-0">
              Totalentreprenad enligt ABT 06 / ABT-U 07 — från anbud och nätanslutning via mark, leverans och
              idrifttagning till slutbesiktning och garantitid. Byggd på erfarenheterna från Batch C.
            </p>
          </div>
          <ul className="epc-tal" aria-label="Guiden i siffror">
            <li>
              <b>{SUMMERING.faser}</b>
              <span>faser med grind</span>
            </li>
            <li>
              <b>{SUMMERING.punkter}</b>
              <span>kontrollpunkter</span>
            </li>
            <li>
              <b>{SUMMERING.hallpunkter}</b>
              <span>hållpunkter</span>
            </li>
            <li>
              <b>{SUMMERING.milstolpar}</b>
              <span>betalmilstolpar</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="card epc-block epc-lagesbild" aria-labelledby="epc-lage">
        <h3 id="epc-lage">Lägesbild — var projekten står</h3>
        <p className="lead">
          En ruta per fas. Välj ett projekt för att se vad som pågår, vad som står näst på tur och vilka ledtider
          som ska startas.
        </p>
        <Portfoljlage valt={pid} onValj={setValtProjekt} />
        <ul className="ov-legend epc-lage-legend" aria-label="Lägen">
          {LAGEN.map((s) => (
            <li key={s}>
              <i className={`epc-lagepunkt ${s}`} aria-hidden="true" />
              {FAS_STATUS[s][1]}
            </li>
          ))}
        </ul>
        <NuLage pid={pid} onVisaFas={visaFas} />
      </section>

      <Guide pid={pid} mal={mal} />

      <section className="card epc-block" aria-labelledby="epc-ledtider">
        <h3 id="epc-ledtider">Ligg steget före – ledtider</h3>
        <p className="lead">
          Sista startdatum för {(p.nr ? p.nr + " " : "") + (p.ort || p.namn)}, räknat mot projektets datum. Kända datum ur
          leveranslistan och tidplanen går före fasplanen. Röd = startdatumet har passerat, gul = inom två veckor. En
          ledtid räknas som klar när dess fas är passerad, eller när du markerar den.
        </p>
        <Ledtidstabell
          pid={pid}
          onMarkera={(ledtid, klar) => dispatch({ type: "EPC_LEDTID", pid, ledtid, klar })}
        />
      </section>

      <section className="card epc-block" aria-labelledby="epc-milstolpar">
        <h3 id="epc-milstolpar">Betalmilstolpar</h3>
        <p className="lead">
          Sju betalningar kopplade till grindarna. Rutin: avisering (Excel) → beställarens OK → faktura i IFS. Faser
          med en betalning har orange kant i guiden.
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
