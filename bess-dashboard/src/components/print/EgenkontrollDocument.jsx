import { kontrollNamn, kontrollBrister } from "../../lib/projektkontroll.js";
import { ProjektkontrollSummary } from "./ProjektkontrollSummary.jsx";
import { DocumentHeader } from "./DocumentHeader.jsx";
import { FALT_FORUTSATTNING } from "../../data/faltmaterial.js";
import "./field-print.css";

export function EgenkontrollDocument({ dokument: d }) {
  return (
    <article className="field-document" aria-label="Egenkontroll för fältet">
      {d.mallpaket === "projekt" ? <ProjektkontrollSummary dokument={d} /> : null}
      {d.moment.map((m) => (
        <section className="field-moment" key={m.id}>
          <DocumentHeader dokument={d} titel="Egenkontroll – BESS" />
          <h2>Moment {m.nr}: {m.titel}</h2>
          {m.flode ? <p className="field-source"><b>Arbetsordning:</b> {m.flode}</p> : null}
          <p className="field-source">{d.kalla} {d.komplett ? "Hela valda mallpaketet." : "Delurval – kontrollera överlämningar och återstående arbete."}</p>
          <p>{d.inledning || FALT_FORUTSATTNING}</p>
          <p><b>Utrustning:</b> {m.utrustning} · <b>Utförare:</b> {m.utforare || "________________"}</p>
          <p><b>Manual/provplan och revision:</b> {m.referens || "EJ ANGIVEN – verifieras före utförande"}</p>
          {m.punkter.map((p) => (
            <section key={p.id} className="field-check">
              <h3>{p.id} · {p.titel}</h3>
              <p>{p.instruktion}</p>
              {p.verifiering ? <p className="field-verification"><b>Verifiering:</b> {p.verifiering}</p> : null}
              <p className="field-reference">Kompetens: {p.roll} · EPC: {p.epc.join(", ") || "Ny detaljpunkt i momentmallen"}</p>
              {d.visaResultat ? <div className="field-recorded">
                <p><b>Resultat:</b> {kontrollNamn(p.kontroll?.resultat)} · <b>Datum:</b> {p.kontroll?.datum || "Ej angivet"}</p>
                <p><b>Kontrollant:</b> {p.kontroll?.kontrollant || "Ej angiven"} · <b>Kontrollerad mallrevision:</b> {p.kontroll?.mallrevision || "Ej angiven"}</p>
                <p><b>Bevis/protokoll:</b> {p.kontroll?.referens || "Ej angivet"}</p>
                <p><b>Mätvärde / avvikelse / åtgärd / motivering:</b> {p.kontroll?.notering || "—"}</p>
                {kontrollBrister(p.kontroll, d.revision).length ? <p className="field-verification"><b>Öppet:</b> {kontrollBrister(p.kontroll, d.revision).join(" · ")}</p> : null}
                <p>Signatur: __________________ (kontrollantens namn ovan är inte en underskrift)</p>
              </div> : <>
              <div className="field-result"><span>Resultat: □ OK　□ Ej OK　□ Ej tillämplig*</span><span>Datum: ______________</span></div>
              <div className="field-writing">Mätvärde / Avvikelse / Notering: ________________________________________</div>
              <div className="field-writing">______________________________________________________________________</div>
              <div className="field-writing">Signatur: __________________　Protokoll/foto/referens: __________________</div>
              </>}
            </section>
          ))}
          <p className="field-foot">* Ej tillämplig motiveras i notering. En blankett per enhet/provomfattning. Kontrollresultat registreras separat från EPC-status. Utskrift ändrar inte status.</p>
        </section>
      ))}
    </article>
  );
}
