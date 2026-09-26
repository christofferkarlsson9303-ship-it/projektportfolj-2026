import { useState } from "react";
import { Check, ChevronDown, Lightbulb, MessageSquare, RotateCcw } from "lucide-react";
import { usePortfolj } from "../../state/hooks.js";
import { MILSTOLPAR } from "../../data/bessChecklistData.ts";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { datumKort, idag } from "../../lib/datum.js";
import { fasRad, mallDatum, planAnkare } from "../../lib/epc.js";
import { FasStatus, Markeringar } from "./Delar.jsx";
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
  const nKomm = antal.get(punkt.id) || 0;
  const nTidigare = tidigare.get(punkt.id) || 0;
  const satt = (status) => dispatch({ type: "EPC_PUNKT", pid, punkt: punkt.id, status });
  const nr = punkt.id.replace("lop.", "∞.");
  const idCb = `cb-${pid}-${punkt.id}`;

  return (
    <li id={`kp-${punkt.id}`} className={`epc-rad${hp ? " hp" : ""} ${lage.status}`}>
      <input
        id={idCb}
        type="checkbox"
        checked={lage.status === "klar"}
        disabled={viaGrind || lage.status === "ejaktuell"}
        onChange={(e) => satt(e.target.checked ? "klar" : "")}
        title={viaGrind ? `Klar via passerad ${grindkod(punkt.id)}` : undefined}
      />
      <div className="epc-radkropp">
        <label htmlFor={idCb} className="epc-radtext">
          <span className="epc-id">{nr}</span>
          <span>{punkt.text}</span>
        </label>
        <span className="epc-radmeta">
          <Markeringar badges={punkt.badges} />
          <span className="epc-ansvar">{punkt.ansvar}</span>
          {punkt.nar && punkt.nar !== "—" ? <span className="epc-nar">{punkt.nar}</span> : null}
          {lage.status === "klar" ? (
            <span className="epc-klarinfo">
              {viaGrind ? `Klar via ${grindkod(punkt.id)}` : `Klar ${lage.datum || ""}${lage.av ? " · " + lage.av : ""}`}
            </span>
          ) : lage.status === "ejaktuell" ? (
            <span className="epc-ejinfo">Ej aktuell</span>
          ) : null}
        </span>
      </div>
      <div className="epc-radatgard">
        {nTidigare ? (
          <button type="button" className="epc-erfchip" onClick={() => setOppen(true)} title="Andra projekt har avvikelser eller lärdomar på den här punkten">
            <Lightbulb size={13} aria-hidden="true" />
            {nTidigare}
            <span className="sr-only"> erfarenheter från tidigare projekt på {nr}</span>
          </button>
        ) : null}
        <button
          type="button"
          className={`epc-kommknapp${nKomm ? " har" : ""}`}
          aria-expanded={oppen}
          onClick={() => setOppen((v) => !v)}
        >
          <MessageSquare size={14} aria-hidden="true" />
          {nKomm || ""}
          <span className="sr-only">Kommentarer på {nr}</span>
        </button>
        {!viaGrind && lage.status !== "klar" ? (
          <button
            type="button"
            className="epc-textknapp epc-ejknapp"
            aria-pressed={lage.status === "ejaktuell"}
            onClick={() => satt(lage.status === "ejaktuell" ? "" : "ejaktuell")}
          >
            {lage.status === "ejaktuell" ? "Aktuell igen" : "Ej aktuell"}
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
    return (
      <div className="epc-sektion" key={s.namn || "lista"}>
        {s.namn ? <h4>{s.namn}</h4> : null}
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

function IProjektet({ lage, pid, projektnamn }) {
  const { state, dispatch } = usePortfolj();
  const f = lage.fas;
  const rad = fasRad(state, pid, f.nr);
  const a = planAnkare(state, pid);
  const satt = (falt, varde) => dispatch({ type: "EPC_FAS", pid, fas: f.nr, falt, varde });

  return (
    <aside className="epc-iprojekt" aria-label={`Fas ${f.nr} i ${projektnamn}`}>
      <div className="epc-iprojekt-huvud">
        <b>I {projektnamn}</b>
        <FasStatus status={lage.status} />
      </div>

      <p className="epc-framsteg">
        <b>
          {lage.klara} av {lage.punkter - lage.ejAktuella}
        </b>{" "}
        punkter klara
        {lage.hp ? ` · HP ${lage.hpKlara}/${lage.hp}` : ""}
        {lage.ejAktuella ? ` · ${lage.ejAktuella} ej aktuella` : ""}
      </p>
      {!lage.grind.passerad && !lage.kvar ? (
        <p className="epc-grindforslag">Alla punkter är klara — {f.grind.kod} kan passeras.</p>
      ) : null}

      <div className="epc-grind">
        {lage.grind.passerad ? (
          <p className="epc-grindlage ok">
            <Check size={15} aria-hidden="true" />
            {f.grind.kod} passerad{lage.grind.datum ? ` ${lage.grind.datum}` : ""} —{" "}
            {GRIND_KALLA[lage.grind.kalla].toLowerCase()}
          </p>
        ) : (
          <button type="button" className="btn mini" onClick={() => satt("grindDatum", idag())}>
            Markera {f.grind.kod} passerad idag
          </button>
        )}
        <div className="epc-falt">
          <label htmlFor={`fg-${pid}-${f.nr}`}>Datum {f.grind.kod} passerad</label>
          <DatumFalt
            id={`fg-${pid}-${f.nr}`}
            varde={rad?.grindDatum || ""}
            etikett={`Datum då grind ${f.grind.kod} passerades`}
            onCommit={(v) => satt("grindDatum", v)}
          />
        </div>
      </div>

      <div className="epc-planering">
        <div className="epc-falt">
          <label htmlFor={`fs-${pid}-${f.nr}`}>Start</label>
          <DatumFalt
            id={`fs-${pid}-${f.nr}`}
            varde={rad?.start || ""}
            etikett={`Start för fas ${f.nr}`}
            onCommit={(v) => satt("start", v)}
          />
        </div>
        <div className="epc-falt">
          <label htmlFor={`fe-${pid}-${f.nr}`}>Slut</label>
          <DatumFalt
            id={`fe-${pid}-${f.nr}`}
            varde={rad?.slut || ""}
            etikett={`Slut för fas ${f.nr}`}
            onCommit={(v) => satt("slut", v)}
          />
        </div>
      </div>
      <p className="epc-plantext">
        {lage.egenPlan ? (
          <>
            Egna datum.{" "}
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
          <>
            Standardplan {datumKort(mallDatum(f.mall.fran, a))} – {datumKort(mallDatum(f.mall.till, a))}.
          </>
        ) : (
          "Ange projektets start och färdigställande i lägesbilden för en standardplan."
        )}
      </p>

      <div className="f epc-anteckning">
        <label htmlFor={`fa-${pid}-${f.nr}`}>Anteckningar</label>
        <Falt
          id={`fa-${pid}-${f.nr}`}
          flerrad
          varde={rad?.anteckning || ""}
          etikett={`Anteckningar för fas ${f.nr}`}
          onCommit={(v) => satt("anteckning", v)}
        />
      </div>
    </aside>
  );
}

/* ---------- Steget ---------- */

export function Fasruta({ lage, pid, projektnamn, oppen, onVaxla, filter, tvingaOppen, ctx }) {
  const f = lage.fas;
  const ms = f.milstolpe ? MILSTOLPAR.find((m) => m.kod === f.milstolpe) : null;
  const synliga = f.sektioner.reduce((n, s) => n + s.punkter.filter(filter).length, 0);
  if (tvingaOppen && !synliga) return null;

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
            <span className="epc-hpchip">
              HP {lage.hpKlara}/{lage.hp}
            </span>
          ) : null}
          <span className="epc-antalchip">
            {lage.klara}/{lage.punkter - lage.ejAktuella} klara
          </span>
        </span>
        <ChevronDown className="epc-pil" size={18} aria-hidden="true" />
      </summary>

      <div className="epc-faskropp">
        <div className="epc-guide">
          <p className="epc-grindtext">
            <b>Klart när:</b> {f.grind.text} <span className="epc-grindkod">({f.grind.kod})</span>
            {ms ? (
              <>
                <br />
                <b>Låser betalning:</b> {ms.kod} · {ms.andel} % — {ms.utloses.toLowerCase()}
              </>
            ) : null}
          </p>
          <Sektioner sektioner={f.sektioner} filter={filter} ctx={ctx} />
        </div>
        <IProjektet lage={lage} pid={pid} projektnamn={projektnamn} />
      </div>
    </details>
  );
}
