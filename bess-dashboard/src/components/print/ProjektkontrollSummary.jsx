import { DocumentHeader } from "./DocumentHeader.jsx";
import { kontrollSummering, rapportStatus } from "../../lib/projektkontroll.js";

export function ProjektkontrollSummary({ dokument: d }) {
  return <section className="field-moment field-report-summary">
    <DocumentHeader dokument={d} titel="Projektets egenkontroll – sammanställning" />
    <h2>{rapportStatus(d)}</h2>
    <p><b>Beställare:</b> {d.projekt.bestallare || "________________"}</p>
    <p><b>Kontrollomfattning:</b> {d.omfattning} · <b>Kontrollplan/revision:</b> {d.kontrollplan || "Ej angiven"}</p>
    <p>{d.visaResultat ? `${d.sammanstallning.klara} kompletta av ${d.antal} kontroller. ${d.sammanstallning.oppna} öppna, varav ${d.sammanstallning.avvikelser} Ej OK.` : "Blank checklista: fyll i verkligt resultat, datum, kontrollant och bevis för varje punkt."}</p>
    <p>Delurval eller ej kontrollerade punkter får inte redovisas som en komplett egenkontroll. Ej tillämplig ska motiveras. Kontrollera att alla berörda enheter och delområden ingår; sammanställningen avser bara angiven omfattning.</p>
    <table className="field-index"><thead><tr><th>Fas</th><th>Kontroller</th><th>Kompletta</th><th>Öppna</th></tr></thead><tbody>{d.moment.map((m) => { const s = kontrollSummering([m], d.revision); return <tr key={m.id}><td>{m.nr}. {m.titel}</td><td>{s.totalt}</td><td>{d.visaResultat ? s.klara : "—"}</td><td>{d.visaResultat ? s.oppna : "—"}</td></tr>; })}</tbody></table>
    <p>Bevis, mätvärden och öppna avvikelser redovisas per kontrollpunkt. Angivna protokoll/foton ska följa med eller vara åtkomliga i slutdokumentationens index. Den här rapporten är en sammanställning, inte ett beslut om slutacceptans.</p>
    <p>Sammanställd av: {d.skapadAv || "________________"} · Datum: {d.datum}</p>
    <p>Granskad av: __________________ · Datum: ______________ · Signatur: ______________</p>
    <p>Beställarens mottagande / referens: ______________________________________________</p>
  </section>;
}
