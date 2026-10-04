import logotyp from "../../assets/one-nordic-logo.png";
import { ORSAKER } from "../../data/konstanter.js";
import { fmtSEK, fmtTal } from "../../lib/format.js";
import { MOMS_PROCENT, radFaktor, radSumma } from "../../lib/atakalkyl.js";
import "./field-print.css";

/* Avisering av ÄTA-arbete — kalkylen på papper, för beställarens godkännande.

   Samma väg som fältmaterialet: ett field-document i #utskrift, vitt även i
   mörkt läge, med ONE-logotyp och sidnummer från @page field. PDF-versionen
   är AtaPdf med typ "avi" och samma dokumentmodell. */

const decimal = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");
const antal = (n) => fmtTal(Number(n) || 0, Number.isInteger(Number(n) || 0) ? 0 : 2);

export function AtaAvi({ dokument: d }) {
  const { ata: u, projekt: p, rader, summor } = d;
  const orsak = ORSAKER.find((o) => o[0] === u.orsak)?.[1] || "Ej angiven";

  return (
    <article className="field-document" aria-label={`Avisering av ÄTA-arbete ${u.nr}`}>
      <header className="field-document-head">
        <img src={logotyp} alt="ONE Nordic AB" />
        <div>
          <h1>Avisering av ÄTA-arbete</h1>
          <p>
            {u.nr} · {p.nr || p.id} · {p.namn}
          </p>
          <p>
            Datum: {d.datum} · Upprättad av: {d.skapadAv || "________________"}
          </p>
        </div>
      </header>

      <table className="field-index">
        <tbody>
          <tr>
            <th>ÄTA-nummer</th>
            <td>{u.nr}</td>
            <th>Projekt</th>
            <td>
              {p.nr || p.id} · {p.namn}
            </td>
          </tr>
          <tr>
            <th>Beställare</th>
            <td>{p.bestallare || "—"}</td>
            <th>Entreprenör</th>
            <td>ONE Nordic AB</td>
          </tr>
          <tr>
            <th>Orsak</th>
            <td colSpan={3}>{orsak}</td>
          </tr>
          <tr>
            <th>Omfattning</th>
            <td colSpan={3}>{u.benamning || "—"}</td>
          </tr>
        </tbody>
      </table>

      <h2>Kalkyl</h2>
      <table className="field-index field-kalkyl">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Beskrivning</th>
            <th>Resurs</th>
            <th className="num">Antal</th>
            <th className="num">Á-pris</th>
            <th className="num">ÖT %</th>
            <th className="num">Påslag %</th>
            <th className="num">Summa</th>
          </tr>
        </thead>
        <tbody>
          {rader.map((r) => (
            <tr key={r.id}>
              <td>{r.datum || "—"}</td>
              <td>{r.beskrivning || "—"}</td>
              <td>{r.resurs || "—"}</td>
              <td className="num">
                {antal(r.antal)} {r.enhet}
              </td>
              <td className="num">{fmtSEK(r.apris)}</td>
              <td className="num">{decimal((radFaktor(r) - 1) * 100)}</td>
              <td className="num">{decimal(r.paslag)}</td>
              <td className="num">{fmtSEK(Math.round(radSumma(r)))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={7}>Netto</th>
            <td className="num">{fmtSEK(summor.netto)}</td>
          </tr>
          <tr>
            <th colSpan={7}>Moms {MOMS_PROCENT} %</th>
            <td className="num">{fmtSEK(summor.moms)}</td>
          </tr>
          <tr>
            <th colSpan={7}>Att betala</th>
            <td className="num">
              <b>{fmtSEK(summor.attBetala)}</b>
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="field-source">
        Material och UE: faktisk kostnad plus 10 % enligt ABT 06 kap. 6 § 9. Övertid 50 % är faktor 1,5 och 100 % är
        faktor 2. Arbetet utförs först när beställaren skriftligen godkänt avin.
      </p>

      <div className="field-signaturer">
        {["För ONE Nordic AB", "Godkänns — för beställaren"].map((text) => (
          <div className="field-check" key={text}>
            <h3>{text}</h3>
            <p>Signatur: _____________________________</p>
            <p>Namnförtydligande: _____________________</p>
            <p>Datum: ________________________________</p>
          </div>
        ))}
      </div>
    </article>
  );
}
