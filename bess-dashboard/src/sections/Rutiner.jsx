import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Card, Kpi, Note } from "../components/ui/Primitiver.jsx";
import { RUTINER } from "../data/rutiner.js";
import { rutinAntal, rutinKlar, rutinNyckel } from "../lib/berakningar.js";

/* Projektledarens handbok.

   ONE Nordics rollbeskrivning och entreprenadjuridiska flödesscheman som egna
   kapitel, avbockade separat per projekt. Kapitlen är regelverket — själva
   arbetet registreras i de flikar kapitlen länkar till.

   Ett kapitel i taget är utfällt, som i originalet. Skillnaden mot
   standalone-versionen är att kapitelrubriken är en riktig knapp med
   aria-expanded i stället för en div med onclick: accordionen gick inte att
   fälla ut med tangentbord förut. */

/* Stabilt id per kryssruta. Nyckeln innehåller | och punkter, som inte hör
   hemma i ett DOM-id. */
const kryssId = (pid, nyckel) => `rutin_${pid}_${nyckel.replace(/[|.]/g, "_")}`;

function Punkt({ pid, rutinId, gruppIndex, punkt, klar, onVaxla }) {
  const nyckel = rutinNyckel(rutinId, gruppIndex, punkt.n);
  const id = kryssId(pid, nyckel);

  return (
    <div className="chk">
      <input
        id={id}
        type="checkbox"
        checked={klar}
        onChange={(e) => onVaxla(nyckel, e.target.checked)}
      />
      <label htmlFor={id}>
        {klar ? <s>{punkt.t}</s> : punkt.t}
        {punkt.h ? <span className="hint">{punkt.h}</span> : null}
      </label>
    </div>
  );
}

function Kapitel({ r, pid, state, oppen, onVaxlaKapitel, onVaxlaPunkt, onGaTill }) {
  const { tot, klar } = rutinAntal(state, pid, r);
  const fardigt = tot > 0 && klar === tot;
  const proc = tot ? Math.round((klar / tot) * 100) : 0;

  return (
    <div className={`kap ${oppen ? "oppen" : ""} ${fardigt ? "klar" : ""}`.replace(/\s+/g, " ").trim()}>
      {/* Knapp, inte div med onclick — annars når man inte kapitlet med tangentbord. */}
      <button
        type="button"
        className="kaph"
        aria-expanded={oppen}
        onClick={() => onVaxlaKapitel(r.id)}
      >
        <span className="kapnr">{r.id}</span>
        <span className="kaptxt">
          <b>{r.titel}</b>
          {r.kalla ? <small>{r.kalla}</small> : null}
        </span>
        {tot ? (
          <span className="kapprog">
            <span className={`prog ${fardigt ? "done" : ""}`.trim()} aria-hidden="true">
              <span style={{ width: proc + "%" }} />
            </span>
            <small>
              {klar}/{tot} punkter
            </small>
          </span>
        ) : (
          <span className="pill p-wait">Referens</span>
        )}
        <span className="kappil" aria-hidden="true">
          {oppen ? "▾" : "▸"}
        </span>
      </button>

      {oppen ? (
        <div className="kapb">
          {r.ingress ? <div className="kapingress">{r.ingress}</div> : null}

          {r.lank ? (
            <div className="rowbtns" style={{ margin: "0 0 18px" }}>
              <button type="button" className="btn mini" onClick={() => onGaTill(r.lank[0])}>
                {r.lank[1]} →
              </button>
            </div>
          ) : null}

          {r.grupper.map((g, gi) => (
            <div className="grp" key={g.namn || gi}>
              <h4>{g.namn}</h4>
              {g.info ? <div className="info">{g.info}</div> : null}
              {g.text ? (
                <ul className="kaplista">
                  {g.text.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
              {(g.punkter || []).map((pt) => (
                <Punkt
                  key={pt.n}
                  pid={pid}
                  rutinId={r.id}
                  gruppIndex={gi}
                  punkt={pt}
                  klar={rutinKlar(state, pid, rutinNyckel(r.id, gi, pt.n))}
                  onVaxla={onVaxlaPunkt}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Rutiner() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid, visa } = useUi();
  const [oppet, setOppet] = useState(null);

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const summa = RUTINER.reduce(
    (s, r) => {
      const a = rutinAntal(state, pid, r);
      return { tot: s.tot + a.tot, klar: s.klar + a.klar };
    },
    { tot: 0, klar: 0 }
  );
  const proc = summa.tot ? Math.round((summa.klar / summa.tot) * 100) : 0;

  const medPunkter = RUTINER.filter((r) => rutinAntal(state, pid, r).tot > 0);
  const klaraKap = medPunkter.filter((r) => {
    const a = rutinAntal(state, pid, r);
    return a.klar === a.tot;
  }).length;
  const pabörjade = medPunkter.filter((r) => {
    const a = rutinAntal(state, pid, r);
    return a.klar > 0 && a.klar < a.tot;
  }).length;

  const vaxlaPunkt = (nyckel, klar) => dispatch({ type: "VAXLA_RUTINPUNKT", pid, nyckel, klar });

  return (
    <>
      <Projektvaljare />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Kpi
          label="Genomgånget"
          varde={`${proc} %`}
          hint={`${summa.klar} av ${summa.tot} punkter i ${p.nr || p.namn}`}
          klass={proc >= 80 ? "" : proc >= 40 ? "warn" : "bad"}
        />
        <Kpi
          label="Färdiga kapitel"
          varde={`${klaraKap}/${medPunkter.length}`}
          hint="kapitel med alla punkter avbockade"
        />
        <Kpi label="Påbörjade" varde={pabörjade} hint="kapitel där arbetet är igång" />
        <Kpi label="Kapitel totalt" varde={RUTINER.length} hint="hela projektledarens handbok" />
      </div>

      <Card klass="mb-5">
        <h3>Projektledarens handbok — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
        <div className="lead">
          ONE Nordics rollbeskrivning och entreprenadjuridiska flödesscheman som egna kapitel, avbockade
          separat för varje projekt. Det som sägs om entreprenaden gäller även DUS-avtal. Kapitel med egen
          arbetsflik har en genväg dit.
        </div>
      </Card>

      <div className="kaplist">
        {RUTINER.map((r) => (
          <Kapitel
            key={r.id}
            r={r}
            pid={pid}
            state={state}
            oppen={oppet === r.id}
            onVaxlaKapitel={(id) => setOppet(oppet === id ? null : id)}
            onVaxlaPunkt={vaxlaPunkt}
            onGaTill={visa}
          />
        ))}
      </div>

      <Note>
        <b>Så hänger det ihop:</b> kapitel 2.4 och 2.4.1 arbetas operativt i fliken <b>Störning</b>,
        ÄTA-dokumentationen i <b>Dagbok</b> och <b>ÄTA och hinder</b>, veckogenomgången i{" "}
        <b>Veckokoll</b> och avslutet i <b>Slutdokumentation</b>. Kapitlen här är regelverket och
        avbockningen — flikarna är där arbetet registreras.
      </Note>
    </>
  );
}
