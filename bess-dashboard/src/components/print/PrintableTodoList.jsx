import { DocumentHeader } from "./DocumentHeader.jsx";
import { FALT_FORUTSATTNING } from "../../data/faltmaterial.js";
import "./field-print.css";

export function PrintableTodoList({ dokument: d }) {
  return (
    <article className="field-document field-todo" aria-label="Arbetslista för fältet">
      <DocumentHeader dokument={d} titel="Arbetslista – BESS" />
      <p>{d.fran || "Alla datum"} – {d.till || "Alla datum"} · Utförare: {d.utforare || "________________"}</p>
      <p className="field-source">{d.kalla} {d.komplett ? "Alla fyra moment valda." : "Delurval av moment."}</p>
      <p>{FALT_FORUTSATTNING}</p>
      {d.uppgifter.length ? <section>
        <h2>Projektets öppna arbetsuppgifter</h2>
        {d.uppgifter.map((p) => <div className="field-check" key={p.id}>
          <h3>□ {p.titel}</h3><p>{p.instruktion}</p>
          <p>Utförare: {p.utforare || d.utforare || "________________"} · Datum: {p.datum || "________________"}</p>
          <p>Ritning/referens: {p.referens || d.ritning || "________________"}</p>
          <p>Notering/signatur: _____________________________________________________</p>
        </div>)}
      </section> : null}
      {d.moment.map((m) => <section key={m.id}>
        <h2>Moment {m.nr}: {m.titel}</h2>
        <p>Utförare: {m.utforare || "________________"} · Manual/revision: {m.referens || "EJ ANGIVEN – verifieras före utförande"}</p>
        {m.punkter.map((p) => <div className="field-check" key={p.id}>
          <h3>□ {p.id} · {p.titel}</h3><p>{p.instruktion}</p>
          {p.verifiering ? <p className="field-verification"><b>Verifiering:</b> {p.verifiering}</p> : null}
          <p className="field-reference">Kompetens: {p.roll} · EPC: {p.epc.join(", ") || "Ny detaljpunkt"}</p>
          <p>Datum/signatur/notering: _______________________________________________</p>
        </div>)}
      </section>)}
    </article>
  );
}
