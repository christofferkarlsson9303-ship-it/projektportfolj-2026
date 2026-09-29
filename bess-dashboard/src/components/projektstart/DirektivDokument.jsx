import logotyp from "../../assets/one-nordic-logo.png";
import { DIREKTIV_FALT } from "../../data/projektstart.js";
import { idag } from "../../lib/datum.js";

/* Projektdirektiv som A4. Renderas i utskriftsytan och blir PDF via
   utskriftsdialogen, som skyddsrondsprotokollet.

   Direktivet signeras av intern beställare och projektledare. Står
   signaturerna redan i appen skrivs de ut; annars lämnas ytan tom för
   underskrift på papper. */

const text = (v) => (typeof v === "string" && v.trim() ? v : "—");

export function DirektivDokument({ projekt, lage }) {
  const { rad, triangel, ib, pl } = lage;
  const namn = projekt ? (projekt.nr ? projekt.nr + " " : "") + projekt.namn : "—";
  const sign = (s) => (s.status === "giltig" ? `${s.namn || "—"} · ${s.datum}` : "Namnförtydligande och datum");

  return (
    <>
      <div className="raphead med-logo">
        <img src={logotyp} alt="" className="logo" />
        <div>
          <h1>Projektdirektiv</h1>
          <div className="s">
            {namn} · ONE P · ONE Nordic AB
          </div>
        </div>
      </div>

      {DIREKTIV_FALT.map((f) => (
        <div key={f.id}>
          <div className="delrubrik">{f.rubrik}</div>
          <p style={{ whiteSpace: "pre-wrap", margin: "4pt 0 8pt" }}>{text(rad[f.id])}</p>
        </div>
      ))}

      <div className="delrubrik">Prioritering mellan styrparametrarna</div>
      <table>
        <thead>
          <tr>
            {triangel.varden.map((v) => (
              <th key={v.id}>{v.namn}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {triangel.varden.map((v) => (
              <td key={v.id}>{v.varde === null ? "—" : `${v.varde} %`}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <table className="signaturer">
        <tbody>
          <tr>
            <th>Intern beställare</th>
            <th>Projektledare</th>
          </tr>
          <tr>
            <td className="signatur-yta"> </td>
            <td className="signatur-yta"> </td>
          </tr>
          <tr>
            <td>{sign(ib)}</td>
            <td>{sign(pl)}</td>
          </tr>
        </tbody>
      </table>

      <div className="fot">
        Projektdirektivet tydliggör omfattningen och den interna beställarens styrning. Det signeras innan
        teamet kallas till startmöte — hållpunkt 1.22 i Bygga batteripark.
        <br />
        Utskrivet {idag()} · ONE Nordic AB · one-nordic.se
      </div>
    </>
  );
}
