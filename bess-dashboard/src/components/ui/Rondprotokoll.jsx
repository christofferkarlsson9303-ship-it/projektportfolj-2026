import logotyp from "../../assets/one-nordic-logo.png";
import { AVVIKELSENIVA, RONDPUNKTER } from "../../data/konstanter.js";
import { idag } from "../../lib/datum.js";

/* Skyddsrondsprotokoll som A4. Renderas i utskriftsytan och blir PDF via
   utskriftsdialogen, som ÄTA-dokumenten och byggmötesprotokollen.

   Protokollet är underlaget — ENIA är registret. Undertecknandefälten för
   BAS-U och skyddsombud finns med eftersom ronden ska kunna skrivas under på
   plats. */

const NIVANAMN = Object.fromEntries(AVVIKELSENIVA);

export function Skyddsrondsprotokoll({ rond, projekt }) {
  const namn = projekt ? (projekt.nr ? projekt.nr + " " : "") + projekt.namn : "—";
  const checklista = rond.checklista || {};
  const avvikelser = rond.avvikelser || [];

  return (
    <>
      <div className="raphead med-logo">
        <img src={logotyp} alt="" className="logo" />
        <div>
          <h1>Skyddsrondsprotokoll</h1>
          <div className="s">
            {namn} · {rond.datum} · BAS-U ONE Nordic AB
          </div>
        </div>
      </div>

      <table>
        <tbody>
          <tr>
            <th>Projekt</th>
            <td>{namn}</td>
            <th>Datum</th>
            <td>{rond.datum || "—"}</td>
          </tr>
          <tr>
            <th>Utförd av</th>
            <td>{rond.utfordAv || "—"}</td>
            <th>ENIA-referens</th>
            <td>{rond.enia || "—"}</td>
          </tr>
        </tbody>
      </table>

      <div className="delrubrik">Kontrollpunkter</div>
      <table>
        <thead>
          <tr>
            <th>Punkt</th>
            <th style={{ width: 90 }}>Kontrollerad</th>
          </tr>
        </thead>
        <tbody>
          {RONDPUNKTER.map(([n, txt]) => (
            <tr key={n}>
              <td>{txt}</td>
              <td>{checklista[n] ? "Ja" : "Nej"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="delrubrik">Avvikelser</div>
      <table>
        <thead>
          <tr>
            <th>Avvikelse</th>
            <th style={{ width: 80 }}>Nivå</th>
            <th style={{ width: 110 }}>Ansvarig</th>
            <th style={{ width: 90 }}>Senast</th>
            <th style={{ width: 80 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {avvikelser.length ? (
            avvikelser.map((a) => (
              <tr key={a.id}>
                <td>{a.text || "—"}</td>
                <td>{NIVANAMN[a.niva] || "—"}</td>
                <td>{a.ansvarig || "—"}</td>
                <td>{a.senast || "—"}</td>
                <td>{a.status === "atgardad" ? "Åtgärdad" : "Öppen"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>Inga avvikelser noterade.</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="signaturer">
        <tbody>
          <tr>
            <th>BAS-U</th>
            <th>Skyddsombud</th>
          </tr>
          <tr>
            <td className="signatur-yta"> </td>
            <td className="signatur-yta"> </td>
          </tr>
          <tr>
            <td>Namnförtydligande och datum</td>
            <td>Namnförtydligande och datum</td>
          </tr>
        </tbody>
      </table>

      <div className="fot">
        Skyddsrond ska genomföras minst varannan vecka och dokumenteras i ENIA. Brott mot
        arbetsmiljöplanen är vitesgrundande enligt kontraktet.
        <br />
        Utskrivet {idag()} · ONE Nordic AB · one-nordic.se
      </div>
    </>
  );
}
