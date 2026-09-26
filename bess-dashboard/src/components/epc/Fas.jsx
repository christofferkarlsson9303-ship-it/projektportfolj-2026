import { ChevronDown, FilePlus2, RotateCcw } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { MILSTOLPAR } from "../../data/bessChecklistData.ts";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { datumKort, idag } from "../../lib/datum.js";
import { nyAtaPost } from "../../lib/nyaPoster.js";
import { fasRad, mallDatum, planAnkare, punktRad } from "../../lib/epc.js";
import { FasStatus, Markeringar } from "./Delar.jsx";

/* En fas i checklistan: huvud med status, datum, grind och framdrift, och
   under det kontrollpunkterna i sina sektioner. Fasen är ett <details> så
   att den går att fälla med tangentbord utan eget skript. */

const GRIND_KALLA = {
  angiven: "Angiven i checklistan",
  betalplan: "Härledd ur fakturerad milstolpe — ange datum för att bekräfta",
  följd: "Följer av att en senare grind är passerad",
};

/* ---------- En kontrollpunkt ---------- */

function Punktrad({ punkt, pid }) {
  const { state, dispatch, laggTill } = usePortfolj();
  const { fraga, visaToast, oppnaPost } = useUi();
  const rad = punktRad(state, pid, punkt.id);
  const klar = !!rad?.klar;
  const ur = rad?.urId ? state.ur.find((u) => u.id === rad.urId) : null;
  const visningsId = punkt.id.replace("lop.", "∞.");
  const cbId = `epc-${pid}-${punkt.id}`;

  const skapaUr = async () => {
    const sv = await fraga({
      titel: `Ny UR/ÄTA från kontrollpunkt ${visningsId}`,
      lead: "Händelsedatum sätts till idag — underrättelse ska ut inom 24 timmar. Ärendet kopplas till kontrollpunkten.",
      falt: [
        {
          namn: "benamning",
          etikett: "Beskriv avvikelsen",
          typ: "textarea",
          varde: `Avvikelse ${visningsId}: ${punkt.text}`,
        },
      ],
      ok: "Skapa UR/ÄTA",
    });
    if (!sv || !sv.benamning) return;
    const post = nyAtaPost(state, pid, {
      benamning: sv.benamning,
      kalla: `EPC-checklista ${visningsId}`,
      ansvarig: hamtaNamn() || "",
    });
    laggTill("ur", post);
    dispatch({ type: "EPC_KOPPLA_UR", pid, punkt: punkt.id, urId: post.id, urNr: post.nr });
    visaToast(`${post.nr} skapad och kopplad till ${visningsId}`);
  };

  return (
    <li
      id={`kp-${punkt.id}`}
      className={`epc-rad${klar ? " klar" : ""}${punkt.badges.includes("HP") ? " hp" : ""}`}
    >
      <input
        id={cbId}
        type="checkbox"
        checked={klar}
        onChange={(e) => dispatch({ type: "EPC_VAXLA", pid, punkt: punkt.id, klar: e.target.checked })}
      />
      <label htmlFor={cbId} className="epc-radtext">
        <span className="epc-id">{visningsId}</span>
        <span>{punkt.text}</span>
      </label>
      <div className="epc-radmeta">
        <Markeringar badges={punkt.badges} />
        <span className="epc-ansvar">{punkt.ansvar}</span>
        {punkt.nar && punkt.nar !== "—" ? <span className="epc-nar">{punkt.nar}</span> : null}
        {klar && rad.datum ? (
          <span className="epc-klarinfo">
            Klar {datumKort(rad.datum)}
            {rad.av ? ` · ${rad.av}` : ""}
          </span>
        ) : null}
      </div>
      <div className="epc-radatgard">
        {ur ? (
          <button type="button" className="epc-urlank" onClick={() => oppnaPost("ata", ur.id)}>
            {ur.nr}
            <span className="sr-only"> — öppna ärendet</span>
          </button>
        ) : null}
        <button type="button" className="btn sec mini epc-skapa" onClick={skapaUr}>
          <FilePlus2 size={13} aria-hidden="true" />
          Skapa UR/ÄTA
          <span className="sr-only"> för kontrollpunkt {visningsId}</span>
        </button>
      </div>
    </li>
  );
}

export function Sektioner({ sektioner, pid, filter }) {
  return sektioner.map((s) => {
    const punkter = s.punkter.filter(filter);
    if (!punkter.length) return null;
    return (
      <div className="epc-sektion" key={s.namn || "lista"}>
        {s.namn ? <h4>{s.namn}</h4> : null}
        <ul className="epc-lista">
          {punkter.map((p) => (
            <Punktrad key={p.id} punkt={p} pid={pid} />
          ))}
        </ul>
      </div>
    );
  });
}

/* ---------- Fasens huvud: datum och grind ---------- */

function Fasplanering({ lage, pid }) {
  const { state, dispatch } = usePortfolj();
  const f = lage.fas;
  const rad = fasRad(state, pid, f.nr);
  const a = planAnkare(state, pid);
  const mallStart = a ? mallDatum(f.mall.fran, a) : null;
  const mallSlut = a ? mallDatum(f.mall.till, a) : null;
  const satt = (falt, varde) => dispatch({ type: "EPC_FAS", pid, fas: f.nr, falt, varde });

  return (
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
        ) : mallStart ? (
          <>
            Standardplan {datumKort(mallStart)} – {datumKort(mallSlut)}. Ange datum för att avvika.
          </>
        ) : (
          "Ange projektets startdatum och färdigställande överst för en standardplan."
        )}
      </p>

      <div className="epc-grind">
        <div className="epc-falt">
          <label htmlFor={`fg-${pid}-${f.nr}`}>
            {f.grind.kod} passerad
          </label>
          <DatumFalt
            id={`fg-${pid}-${f.nr}`}
            varde={rad?.grindDatum || ""}
            etikett={`Datum då grind ${f.grind.kod} passerades`}
            onCommit={(v) => satt("grindDatum", v)}
          />
        </div>
        {!lage.grind.passerad ? (
          <button type="button" className="btn mini" onClick={() => satt("grindDatum", idag())}>
            Markera {f.grind.kod} passerad idag
          </button>
        ) : (
          <p className="epc-plantext">{GRIND_KALLA[lage.grind.kalla]}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Fasrutan ---------- */

export function Fasruta({ lage, pid, oppen, onVaxla, filter, tvingaOppen }) {
  const { state, dispatch } = usePortfolj();
  const f = lage.fas;
  const rad = fasRad(state, pid, f.nr);
  const ms = f.milstolpe ? MILSTOLPAR.find((m) => m.kod === f.milstolpe) : null;
  const proc = Math.round((lage.klara / lage.totalt) * 100);
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
          <span className="epc-fasdatum">
            {lage.start ? `${datumKort(lage.start)} – ${datumKort(lage.slut)}` : "Ej planerad"}
          </span>
        </span>
        <span className="epc-fasinfo">
          <FasStatus status={lage.status} />
          {ms ? (
            <span className="epc-mschip" title={`${ms.namn}: ${ms.utloses}`}>
              {ms.kod} · {ms.andel} %
            </span>
          ) : null}
          {lage.hp ? (
            <span className="epc-hpchip" title="Godkända hållpunkter">
              HP {lage.hpKlara}/{lage.hp}
              <span className="sr-only"> hållpunkter godkända</span>
            </span>
          ) : null}
          <span className="epc-framdrift" title={`${lage.klara} av ${lage.totalt} kontrollpunkter klara`}>
            <span className="epc-spar" aria-hidden="true">
              <i style={{ width: proc + "%" }} />
            </span>
            <span>
              {lage.klara}/{lage.totalt}
              <span className="sr-only"> kontrollpunkter klara</span>
            </span>
          </span>
        </span>
        <ChevronDown className="epc-pil" size={18} aria-hidden="true" />
      </summary>

      <div className="epc-faskropp">
        <p className="epc-syfte">{f.syfte}</p>
        <p className="epc-grindtext">
          <b>Grind {f.grind.kod}</b> · {f.grind.text}
          {ms ? <span> — låser betalning {ms.kod} ({ms.andel} %)</span> : null}
        </p>

        <Fasplanering lage={lage} pid={pid} />

        <Sektioner sektioner={f.sektioner} pid={pid} filter={filter} />

        <div className="f epc-anteckning">
          <label htmlFor={`fa-${pid}-${f.nr}`}>Anteckningar / avvikelser / UR-nr</label>
          <Falt
            id={`fa-${pid}-${f.nr}`}
            flerrad
            varde={rad?.anteckning || ""}
            etikett={`Anteckningar för fas ${f.nr}`}
            onCommit={(v) => dispatch({ type: "EPC_FAS", pid, fas: f.nr, falt: "anteckning", varde: v })}
          />
        </div>
      </div>
    </details>
  );
}
