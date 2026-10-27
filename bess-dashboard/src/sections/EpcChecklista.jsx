import { useEffect, useMemo, useState } from "react";
import { Lightbulb, MoreHorizontal, Search } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Fasruta, Sektioner } from "../components/epc/Fas.jsx";
import { Markering } from "../components/epc/Delar.jsx";
import { NuLage, Portfoljlage } from "../components/epc/Lagesbild.jsx";
import { AttVerifiera, Lardomar, Ledtidstabell, Milstolpstabell, Nyckelvarden } from "../components/epc/Tabeller.jsx";
import { LOPANDE, MARKERINGAR, SUMMERING, VERSION } from "../data/bessChecklistData.ts";
import { projekt } from "../lib/berakningar.js";
import { FAS_STATUS, erfarenheter, faslage, punktlage } from "../lib/epc.js";
import { styrandeLeveranser } from "../lib/momentkort.js";
import { RUBRIKER } from "../data/momentvisning.js";
import { senastDatum } from "../lib/narDatum.js";
import { idag } from "../lib/datum.js";
import { Summering } from "../components/epc/Summering.jsx";
import { Callout, Card, SectionHeading } from "../components/ds/index.js";
import { Erfarenhetslista } from "../components/epc/Erfarenheter.jsx";
import { HeroBild } from "../components/oversikt/Hero.jsx";
import { useMedia } from "../lib/useMedia.js";
import { ProjektArv } from "../components/epc/ProjektArv.jsx";

/* Bygga batteripark — hur en BESS-anläggning byggs som totalentreprenad
   (ABT 06), steg för steg, och var portföljens projekt står.

   Guiden är densamma för alla projekt: 16 moment som vart och ett avslutas med
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
  ["kvar", "Kvar"],
  ["alla", "Alla"],
  ["klara", "Klara"],
  ["kommenterade", "Kommenterade"],
];

const LAGEN = ["klar", "pagar", "sen", "kommande", "odaterad"];

/** Faser som pågår eller är sena för projektet — de fälls ut från början.
 *  Pågår inget fälls nästa kommande moment ut (UX-11), så att det alltid finns
 *  ett aktuellt moment att arbeta i. */
const aktuellaFaser = (faser) => {
  const nu = faser.filter((f) => f.status === "pagar" || f.status === "sen").map((f) => f.fas.nr);
  if (nu.length) return nu;
  const nasta = faser.find((f) => f.status === "kommande");
  return nasta ? [nasta.fas.nr] : [];
};

/** En infälld referensdel. Fälls ut av användaren eller av en länk (mal) hit. */
function Referensdel({ id, mal, titel, text, start = false, children }) {
  const [oppen, setOppen] = useState(start);
  const [sedd, setSedd] = useState(null);
  if (mal && mal.id === id && mal.tid !== sedd) {
    setSedd(mal.tid);
    setOppen(true);
  }
  return (
    <details id={id} className="epc-referensdel" open={oppen} onToggle={(e) => setOppen(e.currentTarget.open)}>
      <summary>
        <b>{titel}</b>
        {text ? <span>{text}</span> : null}
      </summary>
      {/* Innehållet ritas först när delen är utfälld — tabellerna är stora. */}
      {oppen ? <div className="epc-referenskropp" role="region" aria-label={titel}>{children}</div> : null}
    </details>
  );
}

function Guide({ pid, mal }) {
  const { state } = usePortfolj();
  const p = projekt(state, pid);
  const faser = useMemo(() => faslage(state, pid), [state, pid]);

  const [oppna, setOppna] = useState(() => new Set(aktuellaFaser(faser)));
  const [sok, setSok] = useState("");
  const [mark, setMark] = useState("alla");
  /* UX-06: "Kvar" är förvalt. Valet sparas inte, så en omladdning börjar om. */
  const [statusfilter, setStatusfilter] = useState("kvar");

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
    const leveranser = styrandeLeveranser(state, pid);
    const nu = idag();
    const senast = senastDatum(state, pid, nu, faser);
    const visaAlla = statusfilter === "kvar" ? () => setStatusfilter("alla") : null;
    return { pid, pl, antal, tidigare, grindkod, leveranser, visaAlla, senast, nu };
  }, [state, pid, faser, statusfilter]);

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
  /* "Kvar" är standardläget och fäller inte ut alla moment; övriga filter gör det. */
  const filterAktivt = !!sokord || mark !== "alla" || (statusfilter !== "alla" && statusfilter !== "kvar");

  /* En punkt som bockas av försvinner inte direkt ur "Kvar" — den stryks och
     ligger kvar tills filtret väljs igen eller projektet byts. Ögonblicksbilden
     är de punkter som var kvar när "Kvar" valdes. */
  const [kvarBild, setKvarBild] = useState(null);
  if (statusfilter === "kvar" && (!kvarBild || kvarBild.pid !== pid)) {
    const ids = new Set();
    for (const [id, l] of ctx.pl) if (l.status === "oppen") ids.add(id);
    setKvarBild({ pid, ids });
  }
  const valjStatus = (id) => {
    if (id === "kvar") setKvarBild(null);
    setStatusfilter(id);
  };

  const statusOk = (punkt) => {
    const st = ctx.pl.get(punkt.id).status;
    if (statusfilter === "kvar") return st === "oppen" || !!kvarBild?.ids.has(punkt.id);
    if (statusfilter === "klara") return st === "klar";
    if (statusfilter === "kommenterade") return ctx.antal.has(punkt.id) || ctx.tidigare.has(punkt.id);
    return true;
  };
  const filter = (punkt) =>
    (mark === "alla" || punkt.badges.includes(mark)) &&
    statusOk(punkt) &&
    (!sokord || `${punkt.id} ${RUBRIKER[punkt.id] || ""} ${punkt.text} ${punkt.ansvar} ${punkt.nar}`.toLowerCase().includes(sokord));

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
        lead={`Varje moment avslutas med en grind: nästa moment startar inte förrän grinden är passerad. Bocka av punkterna för ${projektnamn} allt eftersom, sätt det som inte gäller som ej aktuellt och kommentera avvikelser och lärdomar direkt på punkten — de blir erfarenhetslistan.`}
      >
        <ul className="epc-legend" aria-label="Markeringar">
          {Object.entries(MARKERINGAR).map(([k, m]) => (
            <li key={k}>
              <Markering typ={k} /> {m.beskrivning}
              {k === "HP" ? " · röd kant på raden" : ""}
            </li>
          ))}
          <li>
            <span className="epc-legend-ikon" aria-hidden="true">
              <Lightbulb size={13} />
            </span>{" "}
            Erfarenheter från andra projekt på samma punkt
          </li>
          <li>
            <span className="epc-legend-ikon" aria-hidden="true">
              <MoreHorizontal size={14} />
            </span>{" "}
            Kommentera eller sätt ej aktuell
          </li>
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
            <button key={id} type="button" aria-pressed={statusfilter === id} onClick={() => valjStatus(id)}>
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
  const bred = useMedia("(min-width: 768px)");

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
      <Card aria-labelledby="epc-rubrik" className="hero-med-bild hero-svag overflow-hidden">
        <HeroBild fil="bess-lyft.jpg" lage="ljus" position="55% 40%" />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <SectionHeading
            id="epc-rubrik"
            className="min-w-[16rem] max-w-2xl flex-1"
            title="Så byggs en batteripark"
            lead="Välj projekt. Öppna rätt moment och följ upp arbetet. Spara verkliga provresultat i momentets egenkontroller. En grind är ett dokumenterat klartecken att gå vidare."
          >
            <p className="m-0 text-xs font-semibold text-ink-faint">
              Mallversion {VERSION.nr} · {VERSION.datum}. Bygger på Batch C-underlag. Kontrollera mot ditt projekts kontrakt och tillverkarmanualer.
            </p>
          </SectionHeading>
          <ul aria-label="Guiden i siffror" className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-4">
            {[
              [SUMMERING.faser, "moment med grind"],
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

      <ProjektArv key={pid} pid={pid} />

      <Card
        id="epc-lage"
        title="Lägesbild — var projekten står"
        subtitle="En ruta per moment. Välj ett projekt för att se läget nu, status per moment och guiden för just det projektet."
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

      {/* Status per moment är en lång tabell. På bred skärm är den utfälld,
          på mobil infälld — Läget nu ovanför säger det viktigaste. */}
      <Referensdel
        key={bred ? "bred" : "smal"}
        id="epc-summering"
        mal={mal}
        start={bred}
        titel={`Status — ${projektnamn}`}
        text="Exakt vad som är gjort och vad som återstår, per moment. En punkt är klar när den bockats av eller när momentets grind är passerad; det som inte gäller projektet räknas inte."
      >
        <Summering pid={pid} onVisaFas={visaFas} />
      </Referensdel>

      <Guide pid={pid} mal={mal} />

      {/* Referensdelarna är infällda: de slås upp, de arbetas inte i varje vecka.
          En länk hit (t.ex. "epc-ledtider" från Översikt) fäller ut rätt del. */}
      <section className="flex flex-col gap-3" aria-labelledby="epc-referens">
        <SectionHeading as="h3" id="epc-referens" eyebrow="Slå upp" title="Referens" />
        <Referensdel id="epc-ledtider" mal={mal} titel="Ligg steget före – ledtider"
          text={`Sista startdatum för ${projektnamn}, räknat mot projektets datum. Kända datum ur leveranslistan och tidplanen går före momentplanen. Röd = startdatumet har passerat, orange = inom två veckor. En ledtid är klar när dess punkt är klar, eller när du markerar den.`}>
          <Ledtidstabell pid={pid} onMarkera={(ledtid, klar) => dispatch({ type: "EPC_LEDTID", pid, ledtid, klar })} />
        </Referensdel>
        <Referensdel id="epc-milstolpar" mal={mal} titel="Betalmilstolpar"
          text="Sju betalningar kopplade till grindarna. Rutin: avisering (Excel) → beställarens OK → faktura i IFS. Moment med en betalning har orange kant i guiden.">
          <Milstolpstabell pid={pid} />
        </Referensdel>
        <Referensdel id="epc-erfarenheter" mal={mal} titel="Erfarenhetsåterföring — topp 10"
          text="Lär av tidigare fel. Kommentarer på kontrollpunkter samlas här och visas också i nästa projekt.">
          <Erfarenhetslista pid={pid} onVisaPunkt={(id) => setMal({ id: `kp-${id}`, tid: Date.now() })} />
        </Referensdel>
        <Referensdel id="epc-nyckelvarden" mal={mal} titel="Nyckelvärden — snabbreferens"
          text="Gränsvärden och frister ur kontrakt, leverantörsmanualer och EBR som oftast avgör om en hållpunkt passeras. Där källorna säger olika står det under Att verifiera.">
          <Nyckelvarden />
        </Referensdel>
        <Referensdel id="epc-lardomar" mal={mal} titel="Lärdomar från Batch C — de 10 som kostat mest">
          <Lardomar />
        </Referensdel>
        <Referensdel id="epc-verifiera" mal={mal} titel={`Att verifiera — ${SUMMERING.motsagelser} frågor där källorna säger olika`}
          text="Låt ansvarig projektör eller tillverkare reda ut kravet skriftligt före berört arbete.">
          <AttVerifiera />
        </Referensdel>
      </section>

      <Callout ton="info">
        Värden, frister och procentsatser är hämtade från Batch C-kontrakten och leverantörsmanualer.
        Kontrollera alltid mot aktuellt projekts kontrakt och bilagor. Standardplanens fasdatum är en
        utgångspunkt, inte en tidplan.
      </Callout>
    </div>
  );
}
