import logotyp from "../../assets/one-nordic-logo.png";
import { kontrollNr } from "../../data/kontrollnummer.js";
import { SA_HAR_GOR_DU, VID_FARA, arbetsSteg, momentBorja, momentRubrik, momentVar, sidfot } from "../../lib/arbetslista.js";
import "./field-print.css";

/* Arbetslista – BESS, i klartext. Reglerna och texthanteringen ligger i
   lib/arbetslista.js och delas med PDF:en. */

function Steg({ steg }) {
  const { p, titel, gor, tank, vem, matt, stopp } = steg;
  return (
    <div className={`field-check field-steg${stopp ? " field-stopp" : ""}`}>
      <div className="field-steg-huvud">
        <span className="field-ruta" aria-hidden="true" />
        <span className="field-steg-id">{kontrollNr(p.id)}</span>
        <h3>
          {stopp ? <span className="field-stopp-marke">STOPP</span> : null}
          {titel}
        </h3>
      </div>
      {gor.length > 1 ? (
        <ol className="field-gor">{gor.map((r) => <li key={r}>{r}</li>)}</ol>
      ) : (
        <p className="field-gor-en">{gor[0]}</p>
      )}
      {tank ? <p className="field-tank"><b>Tänk på:</b> {tank}</p> : null}
      {matt ? <p className="field-matt"><b>Skriv:</b> {matt}</p> : null}
      {vem ? <p className="field-reference"><b>Vem:</b> {vem}</p> : null}
      {stopp ? (
        <p className="field-sign">Arbetsledaren ger klartecken. Datum: __________ Namn: ______________________</p>
      ) : (
        <p className="field-sign">Klart. Datum: __________ Namn: ______________________</p>
      )}
    </div>
  );
}

export function PrintableTodoList({ dokument: d }) {
  return (
    <article className="field-document field-todo" aria-label="Arbetslista för fältet">
      <header className="field-document-head field-todo-head">
        <img src={logotyp} alt="ONE Nordic AB" />
        <div>
          <h1>Arbetslista – BESS</h1>
          <p className="field-todo-projekt">{d.projekt.nr || d.projekt.id} · {d.projekt.namn}</p>
          <p className="field-todo-vem">Utförare: {d.utforare || "________________"} · Datum: {d.datum}</p>
          {d.fran || d.till ? <p>Period: {d.fran || "Alla datum"} – {d.till || "Alla datum"}</p> : null}
        </div>
      </header>

      <section className="field-regler" aria-label="Så här gör du">
        <h2>Så här gör du</h2>
        <ol>{SA_HAR_GOR_DU.map((r) => <li key={r}>{r}</li>)}</ol>
        <p className="field-fara">{VID_FARA}</p>
        {!d.komplett && d.moment.length > 1 ? <p className="field-delurval">Delurval: listan har bara en del av momenten.</p> : null}
      </section>

      {d.uppgifter.length ? (
        <section>
          <h2>Uppgifter i projektet</h2>
          {d.uppgifter.map((p) => (
            <div className="field-check field-steg" key={p.id}>
              <div className="field-steg-huvud">
                <span className="field-ruta" aria-hidden="true" />
                <h3>{p.titel}</h3>
              </div>
              {p.instruktion && p.instruktion !== p.titel ? <p className="field-gor-en">{p.instruktion}</p> : null}
              <p className="field-vem">
                <b>Vem:</b> {p.utforare || d.utforare || "________________"}
                {p.datum ? <> · <b>Klart senast:</b> {p.datum}</> : null}
                {p.referens || d.ritning ? <> · <b>Ritning:</b> {p.referens || d.ritning}</> : null}
              </p>
              <p className="field-sign">Klart. Datum: __________ Namn: ______________________</p>
            </div>
          ))}
        </section>
      ) : null}

      {d.moment.map((m) => (
        <section key={m.id} className="field-moment-todo">
          <h2>{momentRubrik(m)}</h2>
          {m.utforare ? <p className="field-todo-vem">Utförare: {m.utforare}</p> : null}
          {momentBorja(m) ? <p className="field-borja"><b>Börja när:</b> {momentBorja(m)}</p> : null}
          {momentVar(m) ? <p className="field-var"><b>Var:</b> {momentVar(m)}{m.referens ? <> · <b>Manual:</b> {m.referens}</> : null}</p> : null}
          {arbetsSteg(m).map((st) => <Steg key={st.p.id} steg={st} />)}
        </section>
      ))}

      <p className="field-foot">{sidfot(d)}</p>
    </article>
  );
}
