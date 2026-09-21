import logotyp from "../../assets/one-nordic-logo.png";
import { ATA_KLASS, ORSAKER, PRISGRUND } from "../../data/konstanter.js";
import { fmtSEK } from "../../lib/format.js";
import { idag } from "../../lib/datum.js";
import { underrattelseLage } from "../../lib/berakningar.js";

/* A4-dokument för ÄTA-processen enligt ABT 06. Renderas i utskriftsytan och
   blir PDF via webbläsarens utskriftsdialog, med samma typografi och logotyp
   som byggmötesprotokollen.

   Tre dokument, tre roller i processen:
     Underrättelse    — steg 2, ska vara ute inom 24 timmar
     Prisgodkännande  — steg 4, ska vara påskrivet innan arbetet startar
     Underlag         — steg 5, det som följer fakturan

   Alla tre bär AffärsID, AO-nummer och UR-nummer, för det är de referenserna
   beställaren matchar mot. */

const KLASSNAMN = Object.fromEntries(ATA_KLASS);
const PRISNAMN = Object.fromEntries(PRISGRUND);

function Huvud({ titel, lagrum, projekt }) {
  return (
    <div className="raphead med-logo">
      <img src={logotyp} alt="" className="logo" />
      <div>
        <h1>{titel}</h1>
        <div className="s">
          {lagrum} · ONE Nordic AB · {projekt?.namn || "—"}
          {projekt?.nr ? ` (${projekt.nr})` : ""}
        </div>
      </div>
    </div>
  );
}

function Rad({ rubrik, varde, rubrik2, varde2 }) {
  return (
    <tr>
      <th>{rubrik}</th>
      <td>{varde || "—"}</td>
      {rubrik2 !== undefined ? <th>{rubrik2}</th> : null}
      {rubrik2 !== undefined ? <td>{varde2 || "—"}</td> : null}
    </tr>
  );
}

function Grunddata({ u, projekt }) {
  return (
    <table>
      <tbody>
        <Rad rubrik="UR/ÄTA-nummer" varde={u.nr} rubrik2="AffärsID" varde2={projekt?.affarsId || projekt?.nr} />
        <Rad rubrik="Projekt" varde={projekt?.namn} rubrik2="AO-nummer" varde2={projekt?.nr} />
        <Rad rubrik="Beställare" varde={projekt?.bestallare} rubrik2="Klassificering" varde2={KLASSNAMN[u.klass]} />
        <tr>
          <th>Benämning</th>
          <td colSpan={3}>{u.benamning || "—"}</td>
        </tr>
      </tbody>
    </table>
  );
}

/* Två undertecknandefält sida vid sida. Höjden är satt så att raden inte
   hamnar ensam på en andra sida vid utskrift. */
function Signaturer({ vanster, hoger }) {
  return (
    <table className="signaturer">
      <tbody>
        <tr>
          <th>{vanster}</th>
          <th>{hoger}</th>
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
  );
}

/* ---------- Steg 2: underrättelse ---------- */

export function AtaUnderrattelse({ u, projekt }) {
  const orsak = ORSAKER.find((o) => o[0] === u.orsak);
  const lage = underrattelseLage(u);

  return (
    <>
      <Huvud
        titel="Underrättelse om ÄTA-arbete"
        lagrum="ABT 06 kap. 2 § 6–7 och kap. 5 § 4"
        projekt={projekt}
      />
      <Grunddata u={u} projekt={projekt} />

      <table>
        <tbody>
          <Rad
            rubrik="Datum för omständigheten"
            varde={(u.handelseDatum || "").slice(0, 10)}
            rubrik2="Underrättelse avsänd"
            varde2={(u.underrattelseDatum || idag()).slice(0, 10)}
          />
        </tbody>
      </table>

      <div className="box">
        <b>Omständigheten</b>
        {u.benamning || " "}
      </div>

      <div className="box">
        <b>Grund för ÄTA eller hinder</b>
        {orsak ? orsak[1] : "Ej angiven"}
      </div>

      <div className="box">
        <b>Bedömd påverkan</b>
        {u.belopp
          ? `Bedömd kostnadspåverkan ${fmtSEK(u.belopp)}. Slutligt belopp regleras enligt angiven prisgrund.`
          : "Kostnads- och tidspåverkan är ännu inte fastställd. ONE återkommer med prissättning."}
        {u.prisgrund ? ` Prisgrund: ${PRISNAMN[u.prisgrund]}.` : ""}
      </div>

      {lage && !lage.ok ? (
        <div className="box">
          <b>Anmärkning om frist</b>
          {lage.txt}
        </div>
      ) : null}

      <div className="fot">
        Underrättelsen lämnas utan dröjsmål enligt ABT 06 kap. 2 § 6 och kap. 5 § 4. ONE förbehåller sig
        rätten att återkomma med specificerad kostnadssammanställning samt specifikation av övriga
        konsekvenser. Arbetet påbörjas först efter beställarens skriftliga godkännande, om inte annat
        skriftligen överenskommits.
      </div>

      <Signaturer vanster="För ONE Nordic AB" hoger="Mottaget av beställaren" />
    </>
  );
}

/* ---------- Steg 4: prisgodkännande ---------- */

export function AtaPrisgodkannande({ u, projekt }) {
  return (
    <>
      <Huvud titel="Begäran om skriftligt prisgodkännande" lagrum="ABT 06 kap. 6 § 6–9" projekt={projekt} />
      <Grunddata u={u} projekt={projekt} />

      <table>
        <tbody>
          <Rad rubrik="Prisgrund" varde={PRISNAMN[u.prisgrund]} rubrik2="Offererat belopp" varde2={fmtSEK(u.belopp)} />
          <Rad
            rubrik="Underrättelse avsänd"
            varde={(u.underrattelseDatum || "").slice(0, 10)}
            rubrik2="Begäran utfärdad"
            varde2={idag()}
          />
        </tbody>
      </table>

      <div className="box">
        <b>Omfattning som prissatts</b>
        {u.benamning || " "}
      </div>

      <div className="box">
        <b>Villkor</b>
        Beloppet avser arbetet i den omfattning som beskrivs i underrättelsen med samma UR-nummer.
        Arbetet startar när denna handling är undertecknad av beställaren. Startar arbetet utan
        undertecknat godkännande regleras ersättningen enligt självkostnadsprincipen i ABT 06 kap. 6 § 9.
      </div>

      <div className="box">
        <b>Beställarens beslut</b>
        ☐ Godkänns i sin helhet ☐ Godkänns med ändring enligt nedan ☐ Avslås
      </div>

      <Signaturer vanster="För ONE Nordic AB" hoger="Godkännes — för beställaren" />
    </>
  );
}

/* ---------- Steg 5: underlag ---------- */

export function AtaUnderlag({ u, projekt, dagbok = [] }) {
  const timmar = dagbok.reduce((s, d) => s + (Number(d.faktiskTid) || 0), 0);

  return (
    <>
      <Huvud titel="ÄTA-underlag" lagrum="ABT 06 kap. 6 · underlag för fakturering" projekt={projekt} />
      <Grunddata u={u} projekt={projekt} />

      <table>
        <tbody>
          <Rad rubrik="Status" varde={u.status} rubrik2="Prisgrund" varde2={PRISNAMN[u.prisgrund]} />
          <Rad
            rubrik="Omständigheten inträffade"
            varde={(u.handelseDatum || "").slice(0, 10)}
            rubrik2="Underrättelse avsänd"
            varde2={(u.underrattelseDatum || "").slice(0, 10)}
          />
          <Rad
            rubrik="Pris godkänt"
            varde={(u.godkantDatum || "").slice(0, 10)}
            rubrik2="Fakturerat"
            varde2={(u.fakturaDatum || "").slice(0, 10)}
          />
          <Rad rubrik="Belopp" varde={fmtSEK(u.belopp)} rubrik2="Nedlagd tid" varde2={timmar ? `${timmar} h` : "—"} />
        </tbody>
      </table>

      <div className="box">
        <b>Utfört arbete</b>
        {u.benamning || " "}
      </div>

      {dagbok.length ? (
        <>
          <div className="delrubrik">Dagboksutdrag</div>
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Omfattning</th>
                <th>Timmar</th>
              </tr>
            </thead>
            <tbody>
              {dagbok.map((d) => (
                <tr key={d.id}>
                  <td>{d.startdatum || "—"}</td>
                  <td>{d.omfattning || "—"}</td>
                  <td>{d.faktiskTid || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="box">
          <b>Dagboksutdrag</b>
          Inga dagboksrader är kopplade till {u.nr}. Underlaget är ofullständigt tills tid och omfattning
          är dokumenterade per dag.
        </div>
      )}

      <div className="fot">
        Underlaget avser ÄTA-arbete med UR-nummer {u.nr}. Fakturering sker med samma referens.
      </div>

      <Signaturer vanster="Upprättat av" hoger="Granskat av" />
    </>
  );
}
