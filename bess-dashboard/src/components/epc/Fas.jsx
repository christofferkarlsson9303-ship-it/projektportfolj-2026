import { memo, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Lightbulb, MessageSquare, MoreHorizontal, RotateCcw } from "lucide-react";
import { usePortfolj, usePortfoljAtgarder, useUi } from "../../state/hooks.js";
import { MILSTOLPAR } from "../../data/bessChecklistData.ts";
import { PUNKT_UNDERLAG } from "../../data/punktUnderlag.js";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { datumKort, idag } from "../../lib/datum.js";
import { fasRad, grindSaknas, mallDatum, planAnkare } from "../../lib/epc.js";
import { FasStatus, Markeringar } from "./Delar.jsx";
import { StatusBadge } from "../ds/StatusBadge.jsx";
import { saknasSammanfattning, tidslage } from "../../lib/momentkort.js";
import { RUBRIKER, visadeSektioner } from "../../data/momentvisning.js";
import { Kommentarer } from "./Punkt.jsx";
import { EgenkontrollLage } from "./EgenkontrollLage.jsx";
import { LosningGrind } from "./LosningGrind.jsx";

/* Ett steg i guiden: vad fasen går ut på, vilken grind som avslutar den och
   vilka kontroll- och hållpunkter som hör till. Varje punkt bockas av för
   valt projekt, kan sättas som ej aktuell och får kommentarer — avvikelser
   och lärdomar blir erfarenhetslistan. En passerad grind bockar inte av
   punkter: det som ingen registrerat visas som "ej registrerad" och kan
   registreras i ett svep. Grindrutan listar exakt vad som saknas för
   klartecknet. Fasen är ett <details> så att den går att fälla med tangentbord
   utan eget skript. */

const GRIND_KALLA = {
  angiven: "Markerad passerad",
  betalplan: "Härledd ur fakturerad milstolpe",
  följd: "Följer av att en senare grind är passerad",
};

/* ---------- Kontrollpunkterna ---------- */

/* En rad tar bara enkla värden och är memorerad: att bocka en punkt ritar om
   den raden, inte guidens 288. Den läser åtgärderna (usePortfoljAtgarder),
   inte portföljen — usePortfolj() skulle rita om varje rad vid varje ändring. */
const Punktrad = memo(function Punktrad({ punkt, pid, status, kalla, kontroll, datum, av, nKomm, nTidigare, grind }) {
  const { dispatch } = usePortfoljAtgarder();
  const { oppnaPost } = useUi();
  const [oppen, setOppen] = useState(false);
  const [detaljer, setDetaljer] = useState(false);
  const rubrik = RUBRIKER[punkt.id];
  const underlag = PUNKT_UNDERLAG[punkt.id];
  const lage = { status, kalla, kontroll, datum, av };
  const hp = punkt.badges.includes("HP");
  const ejReg = lage.kalla === "ejregistrerad";
  const styrkt = lage.kalla === "egenkontroll";
  const grindkod = () => grind;
  const satt = (status) => dispatch({ type: "EPC_PUNKT", pid, punkt: punkt.id, status });
  const nr = punkt.id.replace("lop.", "∞.");
  const idCb = `cb-${pid}-${punkt.id}`;

  return (
    <li id={`kp-${punkt.id}`} className={`epc-rad${hp ? " hp" : ""} ${lage.status}`}>
      <input
        id={idCb}
        type="checkbox"
        checked={lage.status === "klar"}
        disabled={styrkt || lage.status === "ejaktuell"}
        onChange={(e) => satt(e.target.checked ? "klar" : "")}
        title={
          styrkt
            ? `Styrkt av egenkontroll ${lage.kontroll}`
            : ejReg
              ? `${grindkod(punkt.id)} är passerad men punkten är inte registrerad`
              : undefined
        }
      />
      <div className="epc-radkropp">
        <label htmlFor={idCb} className="epc-radtext">
          <span className="epc-id">{nr}</span>
          <span>{rubrik || punkt.text}</span>
        </label>
        {/* UX-07: kort rubrik, hela texten med mått och OEM-krav ett klick bort. */}
        {rubrik && detaljer ? <p className="epc-detaljtext" id={`det-${pid}-${punkt.id}`}>{punkt.text}</p> : null}
        <span className="epc-radmeta">
          <Markeringar badges={punkt.badges} />
          {rubrik ? (
            <button
              type="button"
              className="epc-detaljknapp"
              aria-expanded={detaljer}
              aria-controls={detaljer ? `det-${pid}-${punkt.id}` : undefined}
              onClick={() => setDetaljer((v) => !v)}
            >
              {detaljer ? "Dölj detaljer" : "Detaljer"}
              <span className="sr-only"> för {nr}</span>
            </button>
          ) : null}
          <span className="epc-ansvar">{punkt.ansvar}</span>
          {punkt.nar && punkt.nar !== "—" ? <span className="epc-nar">{punkt.nar}</span> : null}
          {lage.status === "klar" ? (
            <span className="epc-klarinfo">
              {styrkt ? `Klar · styrkt av egenkontroll ${lage.kontroll}` : `Klar ${lage.datum || ""}${lage.av ? " · " + lage.av : ""}`}
            </span>
          ) : ejReg ? (
            <span className="epc-ejinfo">Ej registrerad · {grindkod(punkt.id)} passerad</span>
          ) : lage.status === "ejaktuell" ? (
            <span className="epc-ejinfo">Ej aktuell</span>
          ) : null}
        </span>
      </div>
      <div className="epc-radatgard">
        {underlag ? (
          <button type="button" className="epc-textknapp" onClick={() => oppnaPost(underlag.vy, underlag.id)}>
            {underlag.text}
            <span className="sr-only">: underlag för {nr}</span>
          </button>
        ) : null}
        {nTidigare ? (
          <button type="button" className="epc-erfchip" onClick={() => setOppen(true)} title="Andra projekt har avvikelser eller lärdomar på den här punkten">
            <Lightbulb size={13} aria-hidden="true" />
            {nTidigare} {nTidigare === 1 ? "erfarenhet" : "erfarenheter"}
            <span className="sr-only"> från tidigare projekt på {nr}</span>
          </button>
        ) : null}
        {/* UX-03: kommentarsknappen syns bara när det finns kommentarer eller
            panelen är öppen. Kommentera och Ej aktuell ligger i ⋯-menyn. */}
        {nKomm || oppen ? (
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
        ) : null}
        {lage.status === "ejaktuell" ? (
          <button type="button" className="epc-textknapp epc-ejknapp" onClick={() => satt("")}>
            Aktuell igen<span className="sr-only">: {nr}</span>
          </button>
        ) : null}
        <Radmeny
          nr={nr}
          kommentarOppen={oppen}
          onKommentera={() => setOppen(true)}
          ejAktuell={lage.status !== "klar" && lage.status !== "ejaktuell" ? () => satt("ejaktuell") : null}
        />
      </div>
      {oppen ? (
        <div className="epc-radpanel">
          <Kommentarer pid={pid} punkt={punkt} />
        </div>
      ) : null}
    </li>
  );
});

/** ⋯-menyn på en punktrad: Kommentera och Ej aktuell, ett klick bort så att
 *  raden bara har kryssrutan som synlig åtgärd. Stängs med Escape, ett val
 *  eller när fokus lämnar menyn. */
function Radmeny({ nr, kommentarOppen, onKommentera, ejAktuell }) {
  const [oppen, setOppen] = useState(false);
  const ref = useRef(null);
  const knapp = useRef(null);
  useEffect(() => {
    if (!oppen) return undefined;
    const utanfor = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOppen(false);
    };
    document.addEventListener("pointerdown", utanfor);
    return () => document.removeEventListener("pointerdown", utanfor);
  }, [oppen]);
  const val = (gor) => () => {
    setOppen(false);
    gor();
    knapp.current?.focus();
  };
  return (
    <div
      className="epc-radmeny"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape" && oppen) {
          e.stopPropagation();
          setOppen(false);
          knapp.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOppen(false);
      }}
    >
      <button
        ref={knapp}
        type="button"
        className="epc-menyknapp"
        aria-haspopup="true"
        aria-expanded={oppen}
        aria-label={`Fler val för ${nr}`}
        onClick={() => setOppen((v) => !v)}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {oppen ? (
        <div className="epc-radmeny-lista" role="group" aria-label={`Val för ${nr}`}>
          {!kommentarOppen ? (
            <button type="button" onClick={val(onKommentera)}>
              Kommentera<span className="sr-only"> {nr}</span>
            </button>
          ) : null}
          {ejAktuell ? (
            <button type="button" onClick={val(ejAktuell)}>
              Ej aktuell<span className="sr-only">: {nr}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
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
          {punkter.map((p) => {
            const l = ctx.pl.get(p.id);
            return (
              <Punktrad
                key={p.id}
                punkt={p}
                pid={ctx.pid}
                status={l.status}
                kalla={l.kalla}
                kontroll={l.kontroll}
                datum={l.datum}
                av={l.av}
                nKomm={ctx.antal.get(p.id) || 0}
                nTidigare={ctx.tidigare.get(p.id) || 0}
                grind={ctx.grindkod(p.id)}
              />
            );
          })}
        </ul>
      </div>
    );
  });
}

/* ---------- Det som saknas för klartecknet ---------- */

/** Flyttar fokus till en punkt i listan ovanför och markerar den kort. Appen
 *  routar på #hash, så en vanlig ankarlänk skulle byta vy. */
function visaPunkt(id) {
  const rad = document.getElementById(`kp-${id}`);
  if (!rad) return;
  rad.scrollIntoView({ behavior: "smooth", block: "center" });
  rad.querySelector("input")?.focus({ preventScroll: true });
  rad.classList.remove("epc-markerad");
  void rad.offsetWidth; // starta om animationen vid upprepat klick
  rad.classList.add("epc-markerad");
  setTimeout(() => rad.classList.remove("epc-markerad"), 2400);
}

/* UX-05: det som saknas räknas per typ. Radtexterna står redan i listan och
   upprepas inte här; ett klick hoppar till första öppna raden av typen. */
function Saknas({ saknas, kod }) {
  const { delar, ejRegistrerade } = saknasSammanfattning(saknas);
  if (!delar.length) return null;
  return (
    <div className="epc-saknas" role="group" aria-label={`Det här saknas för ${kod}`}>
      <b>Det här saknas för {kod}</b>
      <ul className="epc-saknas-lista">
        {delar.map((d) => (
          <li key={d.typ}>
            {d.forsta ? (
              <button type="button" className="lankknapp" onClick={() => visaPunkt(d.forsta)}>
                <span className="epc-saknas-antal">{d.antal}</span> {d.etikett}
              </button>
            ) : (
              <span>
                <span className="epc-saknas-antal">{d.antal}</span> {d.etikett}
              </span>
            )}
          </li>
        ))}
      </ul>
      {ejRegistrerade ? (
        <p className="epc-saknas-not">varav {ejRegistrerade} gjorda men inte registrerade</p>
      ) : null}
    </div>
  );
}

/* ---------- Läget i projektet ---------- */

function IProjektet({ lage, pid, projektnamn }) {
  const { state, dispatch } = usePortfolj();
  const f = lage.fas;
  const rad = fasRad(state, pid, f.nr);
  const a = planAnkare(state, pid);
  const satt = (falt, varde) => dispatch({ type: "EPC_FAS", pid, fas: f.nr, falt, varde });
  const saknas = grindSaknas(state, pid, f.nr);
  const ejReg = saknas.punkter.filter((p) => p.ejRegistrerad);
  const registreraAlla = () => {
    for (const p of ejReg) dispatch({ type: "EPC_PUNKT", pid, punkt: p.id, status: "klar" });
  };

  return (
    <aside className="epc-iprojekt" aria-label={`Moment ${f.nr} i ${projektnamn}`}>
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

      {ejReg.length ? (
        <div className="epc-ejreg">
          <p className="m-0">
            {f.grind.kod} är passerad men <b>{ejReg.length} punkter</b> är inte registrerade. Bocka dem en och en, eller
            registrera alla som klara om arbetet är gjort.
          </p>
          <button type="button" className="btn sec mini" onClick={registreraAlla}>
            Registrera {ejReg.length} som klara
          </button>
        </div>
      ) : null}

      <Saknas saknas={saknas} kod={f.grind.kod} />

      <EgenkontrollLage key={`${pid}-${f.nr}`} pid={pid} fas={f.nr} />

      {f.nr === 4 ? <LosningGrind pid={pid} /> : null}

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
            etikett={`Start för moment ${f.nr}`}
            onCommit={(v) => satt("start", v)}
          />
        </div>
        <div className="epc-falt">
          <label htmlFor={`fe-${pid}-${f.nr}`}>Slut</label>
          <DatumFalt
            id={`fe-${pid}-${f.nr}`}
            varde={rad?.slut || ""}
            etikett={`Slut för moment ${f.nr}`}
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
          etikett={`Anteckningar för moment ${f.nr}`}
          onCommit={(v) => satt("anteckning", v)}
        />
      </div>
    </aside>
  );
}

/* ---------- Rubrikraden: när och vad som styr (UX-01, UX-02) ---------- */

function Tidslage({ lage }) {
  const t = tidslage(lage);
  return (
    <span className="epc-tidslage">
      {t.datum ? <span className="epc-tidslage-datum">{t.datum}</span> : null}
      <StatusBadge ton={t.ton} label={t.lage} />
      {t.plan ? <span className="epc-tidslage-plan">{t.plan}</span> : null}
    </span>
  );
}

function StyrsAv({ rader }) {
  if (!rader?.length) return null;
  return (
    <span className="epc-styrsav">
      <span className="epc-styrsav-rubrik">Styrs av:</span>
      {rader.map((r) => (
        <StatusBadge
          key={r.id}
          ton={r.ton}
          wrap
          label={`${r.benamning} ${r.datum ? datumKort(r.datum) : "datum saknas"} · ${
            r.forsenarDagar ? `försenar ${r.forsenarDagar} d` : r.statusText
          }`}
        />
      ))}
    </span>
  );
}

/* ---------- Steget ---------- */

export function Fasruta({ lage, pid, projektnamn, oppen, onVaxla, filter, tvingaOppen, ctx }) {
  const f = lage.fas;
  const ms = f.milstolpe ? MILSTOLPAR.find((m) => m.kod === f.milstolpe) : null;
  const sektioner = visadeSektioner(f);
  const synliga = sektioner.reduce((n, s) => n + s.punkter.filter(filter).length, 0);
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
          <span className="sr-only">Moment {f.nr}: </span>
          <b>{f.titel}</b>
          <Tidslage lage={lage} />
          <StyrsAv rader={ctx?.leveranser?.get(f.nr)} />
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

      {/* Innehållet ritas bara i utfällda moment. Infällda moment höll förut
          alla 288 rader i DOM:en (över 8 000 noder), och varje bockning fick
          webbläsaren att räkna om layouten för hela guiden. */}
      {oppen || tvingaOppen ? (
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
          <Sektioner sektioner={sektioner} filter={filter} ctx={ctx} />
          {!synliga && ctx?.visaAlla ? (
            <p className="epc-tomtmoment">
              Inget kvar att göra i momentet.{" "}
              <button type="button" className="lankknapp" onClick={ctx.visaAlla}>
                Visa alla punkter
              </button>
            </p>
          ) : null}
        </div>
        <IProjektet lage={lage} pid={pid} projektnamn={projektnamn} />
      </div>
      ) : null}
    </details>
  );
}
