import { useState } from "react";
import { Ban, CalendarDays, Check, ChevronDown, CircleCheck, Clock3, Flag, Lightbulb, MessageSquare, RotateCcw, Undo2, UserRound } from "lucide-react";
import { usePortfolj } from "../../state/hooks.js";
import { MILSTOLPAR } from "../../data/bessChecklistData.ts";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { datumKort, idag } from "../../lib/datum.js";
import { fasRad, mallDatum, planAnkare } from "../../lib/epc.js";
import { FasStatus, Markeringar } from "./Delar.jsx";
import { Meter } from "../ds/Meter.jsx";
import { Kommentarer } from "./Punkt.jsx";

/* Ett steg i guiden: vad fasen går ut på, vilken grind som avslutar den och
   vilka kontroll- och hållpunkter som hör till. Varje punkt bockas av för
   valt projekt, kan sättas som ej aktuell och får kommentarer — avvikelser
   och lärdomar blir erfarenhetslistan. En passerad grind gör fasens punkter
   klara. Fasen är ett <details> så att den går att fälla med tangentbord
   utan eget skript. */

const GRIND_KALLA = {
  angiven: "Markerad passerad",
  betalplan: "Härledd ur fakturerad milstolpe",
  följd: "Följer av att en senare grind är passerad",
};

/* ---------- Kontrollpunkterna ---------- */

function Punktrad({ punkt, ctx }) {
  const { dispatch } = usePortfolj();
  const [oppen, setOppen] = useState(false);
  const { pid, pl, antal, tidigare, grindkod } = ctx;
  const lage = pl.get(punkt.id);
  const hp = punkt.badges.includes("HP");
  const viaGrind = lage.kalla === "grind";
  const klar = lage.status === "klar";
  const ej = lage.status === "ejaktuell";
  const nKomm = antal.get(punkt.id) || 0;
  const nTidigare = tidigare.get(punkt.id) || 0;
  const satt = (status) => dispatch({ type: "EPC_PUNKT", pid, punkt: punkt.id, status });
  const nr = punkt.id.replace("lop.", "∞.");
  const idCb = `cb-${pid}-${punkt.id}`;

  return (
    <li id={`kp-${punkt.id}`} className={`epc-rad${hp ? " hp" : ""} ${lage.status}`}>
      {/* Etiketten runt rutan ger en träffyta på hela radens höjd — lätt att
          pricka med tummen eller med handske. */}
      <label className="epc-bock">
        <input
          id={idCb}
          type="checkbox"
          checked={klar}
          disabled={viaGrind || ej}
          onChange={(e) => satt(e.target.checked ? "klar" : "")}
          title={viaGrind ? `Klar via passerad ${grindkod(punkt.id)}` : undefined}
        />
        <Check className="epc-bock-ikon" size={15} strokeWidth={3.2} aria-hidden="true" />
      </label>
      <div className="epc-radkropp">
        <label htmlFor={idCb} className="epc-radtext">
          <span className="epc-id">{nr}</span>
          <span>{punkt.text}</span>
        </label>
        <span className="epc-radmeta">
          <Markeringar badges={punkt.badges} lang />
          <span className="epc-ansvar">
            <UserRound size={13} aria-hidden="true" />
            {punkt.ansvar}
          </span>
          {punkt.nar && punkt.nar !== "—" ? (
            <span className="epc-nar">
              <Clock3 size={13} aria-hidden="true" />
              {punkt.nar}
            </span>
          ) : null}
          {klar ? (
            <span className="epc-klarinfo">
              <CircleCheck size={13} aria-hidden="true" />
              {viaGrind ? `Klar via ${grindkod(punkt.id)}` : `Klar ${lage.datum || ""}${lage.av ? " · " + lage.av : ""}`}
            </span>
          ) : ej ? (
            <span className="epc-ejinfo">Ej aktuell</span>
          ) : null}
        </span>
      </div>
      <div className="epc-radatgard">
        {nTidigare ? (
          <button type="button" className="epc-erfchip" onClick={() => setOppen(true)} title="Andra projekt har avvikelser eller lärdomar på den här punkten">
            <Lightbulb size={14} aria-hidden="true" />
            {nTidigare}
            <span className="sr-only"> erfarenheter från tidigare projekt på {nr}</span>
          </button>
        ) : null}
        <button
          type="button"
          className={`epc-kommknapp${nKomm ? " har" : ""}`}
          aria-expanded={oppen}
          onClick={() => setOppen((v) => !v)}
          title="Kommentera: avvikelse, lärdom eller notering"
        >
          <MessageSquare size={15} aria-hidden="true" />
          {nKomm || ""}
          <span className="sr-only">Kommentarer på {nr}</span>
        </button>
        {!viaGrind && !klar ? (
          <button type="button" className="epc-ejknapp" aria-pressed={ej} onClick={() => satt(ej ? "" : "ejaktuell")}>
            {ej ? <Undo2 size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
            {ej ? "Aktuell igen" : "Ej aktuell"}
            <span className="sr-only">: {nr}</span>
          </button>
        ) : null}
      </div>
      {oppen ? (
        <div className="epc-radpanel">
          <Kommentarer pid={pid} punkt={punkt} />
        </div>
      ) : null}
    </li>
  );
}

/** ctx: { pid, pl (punktlage), antal (kommentarer per punkt), tidigare
 *  (andra projekts erfarenheter per punkt), grindkod(punktId) }. */
export function Sektioner({ sektioner, filter, ctx }) {
  return sektioner.map((s) => {
    const punkter = s.punkter.filter(filter);
    if (!punkter.length) return null;
    // Räknas på hela sektionen, inte bara det filtret visar.
    const aktuella = s.punkter.filter((p) => ctx.pl.get(p.id).status !== "ejaktuell");
    const klara = aktuella.filter((p) => ctx.pl.get(p.id).status === "klar").length;
    return (
      <div className="epc-sektion" key={s.namn || "lista"}>
        {s.namn ? (
          <h4>
            {s.namn}
            <span className="epc-sektion-antal">
              {klara} av {aktuella.length} klara
            </span>
          </h4>
        ) : null}
        <ul className="epc-lista">
          {punkter.map((p) => (
            <Punktrad key={p.id} punkt={p} ctx={ctx} />
          ))}
        </ul>
      </div>
    );
  });
}

/* ---------- Läget i projektet ---------- */

/** Andel klara med talet i klartext — mätaren är dekor bredvid. */
function Framsteg({ etikett, klara, av }) {
  return (
    <div className="epc-framsteg">
      <span className="epc-framsteg-rad">
        <span>{etikett}</span>
        <b>
          {klara} av {av}
        </b>
      </span>
      <Meter value={klara} max={av} size="sm" />
    </div>
  );
}

function IProjektet({ lage, pid, projektnamn }) {
  const { state, dispatch } = usePortfolj();
  const f = lage.fas;
  const rad = fasRad(state, pid, f.nr);
  const a = planAnkare(state, pid);
  const satt = (falt, varde) => dispatch({ type: "EPC_FAS", pid, fas: f.nr, falt, varde });
  /* Planering och anteckningar används sällan jämfört med grinden — de står
     infällda, men utfällda från början när det finns något att se. */
  const [visaPlan, setVisaPlan] = useState(() => !!(lage.egenPlan || rad?.anteckning));
  const standardplan = a ? `${datumKort(mallDatum(f.mall.fran, a))} – ${datumKort(mallDatum(f.mall.till, a))}` : "";
  const period = lage.egenPlan
    ? `${rad?.start ? datumKort(rad.start) : "…"} – ${rad?.slut ? datumKort(rad.slut) : "…"}`
    : standardplan;

  return (
    <aside className="epc-iprojekt" aria-label={`Fas ${f.nr} i ${projektnamn}`}>
      <div className="epc-iprojekt-huvud">
        <span className="epc-iprojekt-namn">
          <span className="epc-overline">Fas {f.nr} i projektet</span>
          <b>{projektnamn}</b>
        </span>
        <FasStatus status={lage.status} />
      </div>

      <div className="epc-iprojekt-block">
        <Framsteg etikett="Kontrollpunkter" klara={lage.klara} av={lage.punkter - lage.ejAktuella} />
        {lage.hp ? <Framsteg etikett="Hållpunkter" klara={lage.hpKlara} av={lage.hp} /> : null}
        {lage.ejAktuella ? <p className="epc-plantext">{lage.ejAktuella} ej aktuella räknas inte.</p> : null}
      </div>

      <div className="epc-iprojekt-block epc-grind">
        <h5 className="epc-overline">
          <Flag size={13} aria-hidden="true" /> Grind {f.grind.kod}
        </h5>
        {!lage.grind.passerad && !lage.kvar ? (
          <p className="epc-grindforslag">Alla punkter är klara — {f.grind.kod} kan passeras.</p>
        ) : null}
        {lage.grind.passerad ? (
          <p className="epc-grindlage ok">
            <Check size={16} aria-hidden="true" />
            <span>
              {f.grind.kod} passerad{lage.grind.datum ? ` ${lage.grind.datum}` : ""} —{" "}
              {GRIND_KALLA[lage.grind.kalla].toLowerCase()}
            </span>
          </p>
        ) : (
          <button type="button" className="btn epc-grindknapp" onClick={() => satt("grindDatum", idag())}>
            <Check size={16} strokeWidth={2.6} aria-hidden="true" />
            Markera {f.grind.kod} passerad idag
          </button>
        )}
        <div className="epc-falt">
          <label htmlFor={`fg-${pid}-${f.nr}`}>{lage.grind.passerad ? "Datum passerad" : "…eller ange datum"}</label>
          <DatumFalt
            id={`fg-${pid}-${f.nr}`}
            varde={rad?.grindDatum || ""}
            etikett={`Datum då grind ${f.grind.kod} passerades`}
            platshallare="Inte passerad"
            onCommit={(v) => satt("grindDatum", v)}
          />
        </div>
      </div>

      <details className="epc-iprojekt-plan" open={visaPlan} onToggle={(e) => setVisaPlan(e.currentTarget.open)}>
        <summary>
          <CalendarDays size={15} aria-hidden="true" />
          <span className="epc-iprojekt-plan-titel">
            Planering och anteckningar
            {period ? <span className="epc-iprojekt-plan-period">{lage.egenPlan ? "Egna datum" : "Standardplan"} {period}</span> : null}
          </span>
          <ChevronDown className="epc-pil" size={16} aria-hidden="true" />
        </summary>
        <div className="epc-iprojekt-plan-kropp">
          <div className="epc-planering">
            <div className="epc-falt">
              <label htmlFor={`fs-${pid}-${f.nr}`}>Start</label>
              <DatumFalt
                id={`fs-${pid}-${f.nr}`}
                varde={rad?.start || ""}
                etikett={`Start för fas ${f.nr}`}
                platshallare="Standardplan"
                onCommit={(v) => satt("start", v)}
              />
            </div>
            <div className="epc-falt">
              <label htmlFor={`fe-${pid}-${f.nr}`}>Slut</label>
              <DatumFalt
                id={`fe-${pid}-${f.nr}`}
                varde={rad?.slut || ""}
                etikett={`Slut för fas ${f.nr}`}
                platshallare="Standardplan"
                onCommit={(v) => satt("slut", v)}
              />
            </div>
          </div>
          <p className="epc-plantext">
            {lage.egenPlan ? (
              <>
                Egna datum{standardplan ? ` (standardplan ${standardplan})` : ""}.{" "}
                <button
                  type="button"
                  className="epc-textknapp"
                  onClick={() => {
                    satt("start", "");
                    satt("slut", "");
                  }}
                >
                  <RotateCcw size={12} aria-hidden="true" /> Återställ standardplan
                </button>
              </>
            ) : a ? (
              <>Standardplan {standardplan}. Ange egna datum om fasen avviker.</>
            ) : (
              "Ange projektets start och färdigställande i lägesbilden för en standardplan."
            )}
          </p>
          <div className="epc-falt epc-anteckning">
            <label htmlFor={`fa-${pid}-${f.nr}`}>Anteckningar</label>
            <Falt
              id={`fa-${pid}-${f.nr}`}
              flerrad
              varde={rad?.anteckning || ""}
              etikett={`Anteckningar för fas ${f.nr}`}
              placeholder="Beslut, avvikelser eller sådant nästa person behöver veta…"
              onCommit={(v) => satt("anteckning", v)}
            />
          </div>
        </div>
      </details>
    </aside>
  );
}

/* ---------- Steget ---------- */

export function Fasruta({ lage, pid, projektnamn, oppen, onVaxla, filter, tvingaOppen, ctx }) {
  const f = lage.fas;
  const ms = f.milstolpe ? MILSTOLPAR.find((m) => m.kod === f.milstolpe) : null;
  const synliga = f.sektioner.reduce((n, s) => n + s.punkter.filter(filter).length, 0);
  if (tvingaOppen && !synliga) return null;
  const aktuella = lage.punkter - lage.ejAktuella;

  return (
    <details
      id={`fas-${f.nr}`}
      className={`epc-fas ${lage.status}${ms ? " betalning" : ""}`}
      open={oppen || tvingaOppen}
      onToggle={(e) => {
        if (!tvingaOppen && e.currentTarget.open !== oppen) onVaxla(f.nr, e.currentTarget.open);
      }}
    >
      <summary>
        <span className="epc-fasnr" aria-hidden="true">
          {f.nr}
        </span>
        <span className="epc-fastitel">
          <span className="sr-only">Fas {f.nr}: </span>
          <b>{f.titel}</b>
          <span className="epc-fasdatum">{f.syfte}</span>
        </span>
        <span className="epc-fasinfo">
          <FasStatus status={lage.status} />
          {ms ? (
            <span className="epc-mschip" title={`${ms.namn}: ${ms.utloses}`}>
              {ms.kod} · {ms.andel} %
            </span>
          ) : null}
          {lage.hp ? (
            <span className="epc-hpchip" title="Hållpunkter klara">
              HP {lage.hpKlara}/{lage.hp}
            </span>
          ) : null}
          <span className="epc-antalchip">
            <Meter value={lage.klara} max={aktuella} size="sm" className="epc-antalmatare" />
            {lage.klara}/{aktuella} klara
          </span>
        </span>
        <ChevronDown className="epc-pil" size={18} aria-hidden="true" />
      </summary>

      <div className="epc-faskropp">
        <div className="epc-guide">
          <div className="epc-grindtext">
            <Flag size={18} aria-hidden="true" />
            <div>
              <p>
                <b>Klart när</b> <span className="epc-grindkod">{f.grind.kod}</span>
              </p>
              <p>{f.grind.text}</p>
              {ms ? (
                <p className="epc-grindtext-ms">
                  <b>Låser betalning:</b> {ms.kod} · {ms.andel} % — {ms.utloses.toLowerCase()}
                </p>
              ) : null}
            </div>
          </div>
          <Sektioner sektioner={f.sektioner} filter={filter} ctx={ctx} />
        </div>
        {/* key: byter man projekt börjar rutan om, med projektets egna utgångsläge. */}
        <IProjektet key={pid} lage={lage} pid={pid} projektnamn={projektnamn} />
      </div>
    </details>
  );
}
