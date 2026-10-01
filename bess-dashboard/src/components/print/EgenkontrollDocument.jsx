import { DocumentHeader } from "./DocumentHeader.jsx";
import { FALT_FORUTSATTNING } from "../../data/faltmaterial.js";
import "./field-print.css";

export function EgenkontrollDocument({ dokument: d }) {
  return (
    <article className="field-document" aria-label="Egenkontroll för fältet">
      {d.moment.map((m) => (
        <section className="field-moment" key={m.id}>
          <DocumentHeader dokument={d} titel="Egenkontroll – BESS" />
          <h2>Moment {m.nr}: {m.titel}</h2>
          <p className="field-source">{d.kalla} {d.komplett ? "Alla fyra moment valda." : "Delurval av moment – ingen komplett idrifttagningschecklista."}</p>
          <p>{FALT_FORUTSATTNING}</p>
          <p><b>Utrustning:</b> {m.utrustning} · <b>Utförare:</b> {m.utforare || "________________"}</p>
          <p><b>Manual/provplan och revision:</b> {m.referens || "EJ ANGIVEN – verifieras före utförande"}</p>
          {m.punkter.map((p) => (
            <section key={p.id} className="field-check">
              <h3>{p.id} · {p.titel}</h3>
              <p>{p.instruktion}</p>
              {p.verifiering ? <p className="field-verification"><b>Verifiering:</b> {p.verifiering}</p> : null}
              <p className="field-reference">Kompetens: {p.roll} · EPC: {p.epc.join(", ") || "Ny detaljpunkt i momentmallen"}</p>
              <div className="field-result"><span>Resultat: □ OK　□ Ej OK　□ Ej tillämplig*</span><span>Datum: ______________</span></div>
              <div className="field-writing">Mätvärde / Avvikelse / Notering: ________________________________________</div>
              <div className="field-writing">______________________________________________________________________</div>
              <div className="field-writing">Signatur: __________________　Protokoll/foto/referens: __________________</div>
            </section>
          ))}
          <p className="field-foot">* Ej tillämplig motiveras i notering. En blankett per enhet/provomfattning. Utförda kontroller återrapporteras separat; EPC-status ändras inte av utskrift.</p>
        </section>
      ))}
    </article>
  );
}
