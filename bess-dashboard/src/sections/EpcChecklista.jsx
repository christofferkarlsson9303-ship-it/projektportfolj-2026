import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note } from "../components/ui/Primitiver.jsx";
import { Fasruta, Sektioner } from "../components/epc/Fas.jsx";
import { Markering } from "../components/epc/Delar.jsx";
import { NuLage, Portfoljlage } from "../components/epc/Lagesbild.jsx";
import { AttVerifiera, Lardomar, Ledtidstabell, Milstolpstabell, Nyckelvarden } from "../components/epc/Tabeller.jsx";
import { LOPANDE, MARKERINGAR, SUMMERING, VERSION } from "../data/bessChecklistData.ts";
import { projekt } from "../lib/berakningar.js";
import { FAS_STATUS, erfarenheter, faslage, punktlage } from "../lib/epc.js";
import { Summering } from "../components/epc/Summering.jsx";
import { Card, SectionHeading } from "../components/ds/index.js";
import { Erfarenhetslista } from "../components/epc/Erfarenheter.jsx";

/* Bygga batteripark — hur en BESS-anläggning byggs som totalentreprenad
   (ABT 06), steg för steg, och var portföljens projekt står.

   Guiden är densamma för alla projekt: 16 faser som var och en avslutas med
   en grind. Per projekt bockas varje punkt av (eller sätts som ej aktuell),
   och en passerad grind gör fasens punkter klara. Kommentarer på punkterna
   blir erfarenhetslistan, och andra projekts erfarenheter visas på samma
   punkt i nästa projekt. */

const MARKFILTER = [
  ["alla", "Alla"],
  ["HP", "Hållpunkter"],
  ["K", "Kontraktskrav"],
  ["L", "Lärdomar"],
];

const STATUSFILTER = [
  ["alla", "Alla"],
  ["kvar", "Kvar"],
  ["klara", "Klara"],
  ["kommenterade", "Kommenterade"],
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
  const [statusfilter, setStatusfilter] = useState("alla");

  /* Det raderna behöver, räknat en gång per render i stället för per rad. */
  const ctx = useMemo(() => {
    const pl = punktlage(state, pid, faser.map((f) => f.grind));
    const antal = new Map();
    for (const k of state.epcKommentarer || [])
      if (k.projektId === pid) antal.set(k.punkt, (antal.get(k.punkt) || 0) + 1);
    const tidigare = new Map();
    for (const k of erfarenheter(state))
      if (k.projektId !== pid) tidigare.set(k.punkt, (tidigare.get(k.punkt) || 0) + 1);
    const grindkod = (id) => "G" + id.split(".")[0];
    return { pid, pl, antal, tidigare, grindkod };
  }, [state, pid, faser]);

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
  const filterAktivt = !!sokord || mark !== "alla" || statusfilter !== "alla";
  const statusOk = (punkt) => {
    const st = ctx.pl.get(punkt.id).status;
    if (statusfilter === "kvar") return st === "oppen";
    if (statusfilter === "klara") return st === "klar";
    if (statusfilter === "kommenterade") return ctx.antal.has(punkt.id) || ctx.tidigare.has(punkt.id);
    return true;
  };
  const filter = (punkt) =>
    (mark === "alla" || punkt.badges.includes(mark)) &&
    statusOk(punkt) &&
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
    <section className="flex flex-col gap-4" aria-labelledby="epc-steg">
      <SectionHeading
        as="h3"
        id="epc-steg"
        eyebrow="Guiden"
        title="Steg för steg — från affär till garantitid"
        lead={`Varje fas avslutas med en grind: nästa fas startar inte förrän grinden är passerad. Bocka av punkterna för ${projektnamn} allt eftersom, sätt det som inte gäller som ej aktuellt och kommentera avvikelser och lärdomar direkt på punkten — de blir erfarenhetslistan.`}
      >
        <ul className="epc-legend" aria-label="Markeringar">
          {Object.entries(MARKERINGAR).map(([k, m]) => (
            <li key={k}>
              <Markering typ={k} lang /> {m.beskrivning}
            </li>
          ))}
        </ul>
      </SectionHeading>

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
        <div className="ov-flikar" role="group" aria-label="Visa status">
          {STATUSFILTER.map(([id, namn]) => (
            <button key={id} type="button" aria-pressed={statusfilter === id} onClick={() => setStatusfilter(id)}>
              {namn}
            </button>
          ))}
        </div>
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
            ctx={ctx}
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
                <Sektioner sektioner={LOPANDE.sektioner} filter={filter} ctx={ctx} />
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

  const visaFas = (nr) => setMal({ id: nr === "lop" ? "fas-lopande" : `fas-${nr}`, tid: Date.now() });

  const projektnamn = (p.nr ? p.nr + " " : "") + (p.ort || p.namn);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Card aria-labelledby="epc-rubrik">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <SectionHeading
            id="epc-rubrik"
            className="min-w-0 max-w-2xl flex-1"
            title="Så byggs en batteripark"
            lead="Totalentreprenad enligt ABT 06 / ABT-U 07 — från anbud och nätanslutning via mark, leverans och idrifttagning till slutbesiktning och garantitid. Byggd på erfarenheterna från Batch C, leverantörsmanualer och kontraktsunderlag."
          >
            <p className="m-0 text-xs font-semibold text-ink-faint">
              Version {VERSION.nr} · {VERSION.datum} — samtliga källor i åtta NotebookLM-böcker genomgångna
            </p>
          </SectionHeading>
          <ul aria-label="Guiden i siffror" className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-4">
            {[
              [SUMMERING.faser, "faser med grind"],
              [SUMMERING.punkter, "kontrollpunkter"],
              [SUMMERING.hallpunkter, "hållpunkter"],
              [SUMMERING.motsagelser, "motsägelser att reda ut"],
            ].map(([v, t]) => (
              <li key={t} className="flex min-w-[6.5rem] flex-col gap-1">
                <b className="text-2xl font-bold leading-none text-ink tabular-nums">{v}</b>
                <span className="text-xs text-ink-soft">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card
        id="epc-lage"
        title="Lägesbild — var projekten står"
        subtitle="En ruta per fas. Välj ett projekt för att se läget nu, status per fas och guiden för just det projektet."
      >
        <Portfoljlage valt={pid} onValj={setValtProjekt} />
        <ul className="ov-legend epc-lage-legend" aria-label="Lägen">
          {LAGEN.map((s) => (
            <li key={s}>
              <i className={`epc-lagepunkt ${s}`} aria-hidden="true" />
              {FAS_STATUS[s][1]}
            </li>
          ))}
        </ul>
      </Card>

      <section className="flex flex-col gap-4" aria-labelledby="epc-nu">
        <SectionHeading as="h3" id="epc-nu" eyebrow="Valt projekt" title={`Läget nu — ${projektnamn}`} />
        <NuLage pid={pid} onVisaFas={visaFas} />
      </section>

      <Card
        id="epc-summering"
        title={`Status — ${projektnamn}`}
        subtitle="Exakt vad som är gjort och vad som återstår, per fas. En punkt är klar när den bockats av eller när fasens grind är passerad; det som inte gäller projektet räknas inte."
      >
        <Summering pid={pid} onVisaFas={visaFas} />
      </Card>

      <Guide pid={pid} mal={mal} />

      <Card
        id="epc-erfarenheter"
        title="Erfarenhetsåterföring — topp 10"
        subtitle="Byggs automatiskt av avvikelser och lärdomar som kommenterats på punkterna, vassast först: påverkan, om samma punkt gett problem i flera projekt, och kostnad. Samma erfarenheter visas på punkten i nästa projekt."
      >
        <Erfarenhetslista pid={pid} onVisaPunkt={(id) => setMal({ id: `kp-${id}`, tid: Date.now() })} />
      </Card>

      <Card
        id="epc-nyckelvarden"
        title="Nyckelvärden — snabbreferens"
        subtitle="Gränsvärden och frister ur kontrakt, leverantörsmanualer och EBR som oftast avgör om en hållpunkt passeras. Där källorna säger olika står det under Att verifiera längst ned."
      >
        <Nyckelvarden />
      </Card>

      <Card
        id="epc-ledtider"
        title="Ligg steget före – ledtider"
        subtitle={`Sista startdatum för ${projektnamn}, räknat mot projektets datum. Kända datum ur leveranslistan och tidplanen går före fasplanen. Röd = startdatumet har passerat, orange = inom två veckor. En ledtid är klar när dess punkt är klar, eller när du markerar den.`}
      >
        <Ledtidstabell pid={pid} onMarkera={(ledtid, klar) => dispatch({ type: "EPC_LEDTID", pid, ledtid, klar })} />
      </Card>

      <Card
        id="epc-milstolpar"
        title="Betalmilstolpar"
        subtitle="Sju betalningar kopplade till grindarna. Rutin: avisering (Excel) → beställarens OK → faktura i IFS. Faser med en betalning har orange kant i guiden."
      >
        <Milstolpstabell pid={pid} />
      </Card>

      <Card id="epc-lardomar" title="Lärdomar från Batch C — de 10 som kostat mest">
        <Lardomar />
      </Card>

      <Card
        id="epc-verifiera"
        title="Att verifiera — källorna säger olika"
        subtitle={`${SUMMERING.motsagelser} motsägelser i källorna. Dimensionera för det strängaste värdet och få skriftligt besked innan det byggs på.`}
      >
        <AttVerifiera />
      </Card>

      <Note>
        Värden, frister och procentsatser är hämtade från Batch C-kontrakten och leverantörsmanualer.
        Kontrollera alltid mot aktuellt projekts kontrakt och bilagor. Standardplanens fasdatum är en
        utgångspunkt, inte en tidplan.
      </Note>
    </div>
  );
}
