import logotyp from "../../assets/one-nordic-logo.png";
import { ataSummering, slutdokIndex } from "../../lib/berakningar.js";
import { berakFlaggor } from "../../lib/flaggor.js";
import { dagarTill, idag } from "../../lib/datum.js";
import { fmtProcent, fmtSEK } from "../../lib/format.js";

/* Statusrapport till beställaren — ett A4-underlag som går att ta med till
   byggmötet eller bifoga i mejl.

   Rapporten säger medvetet också det som är obekvämt: försenade milstolpar,
   öppna ÄTA och punkter som passerat sitt datum. En statusrapport som bara
   visar det som går bra är inte värd att skicka, och beställaren ser ändå
   verkligheten på plats. */

function Huvud({ projekt }) {
  return (
    <div className="raphead med-logo">
      <img src={logotyp} alt="" className="logo" />
      <div>
        <h1>Statusrapport</h1>
        <div className="s">
          {projekt?.namn || "Portföljen"}
          {projekt?.nr ? ` · AO ${projekt.nr}` : ""} · Upprättad {idag()} · ONE Nordic AB
        </div>
      </div>
    </div>
  );
}

function Nyckeltal({ etiketter }) {
  return (
    <div className="rapgrid5">
      {etiketter.map(([namn, varde]) => (
        <div className="c" key={namn}>
          <b>{namn}</b>
          <div>{varde}</div>
        </div>
      ))}
    </div>
  );
}

export function Bestallarrapport({ state, pid }) {
  const projekt = state.projekt.find((p) => p.id === pid) || null;
  const horTill = (r) => !pid || r.projektId === pid;

  const milstolpar = state.milstolpar.filter(horTill);
  const forsenade = milstolpar.filter(
    (m) => m.datum && m.status !== "klar" && dagarTill(m.datum) < 0
  );
  const kommande = milstolpar
    .filter((m) => m.datum && m.status !== "klar" && dagarTill(m.datum) >= 0)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 6);

  const ata = pid ? ataSummering(state, pid) : null;
  const oppnaPunkter = state.punkter.filter((p) => horTill(p) && p.status === "oppen");
  const forfallna = oppnaPunkter.filter((p) => p.forfaller && dagarTill(p.forfaller) < 0);
  const risker = state.risker.filter((r) => horTill(r) && r.status !== "stangd");
  const slutdok = pid ? slutdokIndex(state, pid) : null;
  const hoga = berakFlaggor(state).filter((f) => f.niva === "hog" && (!pid || f.projektId === pid));

  return (
    <>
      <Huvud projekt={projekt} />

      <Nyckeltal
        etiketter={[
          ["Milstolpar kvar", String(milstolpar.filter((m) => m.status !== "klar").length)],
          ["Varav försenade", String(forsenade.length)],
          ["Öppna punkter", String(oppnaPunkter.length)],
          ["Öppna risker", String(risker.length)],
          ["Slutdokumentation", slutdok ? fmtProcent(slutdok.proc) : "—"],
        ]}
      />

      {ata ? (
        <>
          <div className="delrubrik">Ekonomi och ÄTA</div>
          <table>
            <tbody>
              <tr>
                <th>Kontraktsvärde</th>
                <td>{fmtSEK(projekt?.kontraktsvarde)}</td>
                <th>Godkänd ÄTA</th>
                <td>{fmtSEK(ata.godkant)}</td>
              </tr>
              <tr>
                <th>Antal ÄTA-ärenden</th>
                <td>
                  {ata.antal} varav {ata.oppna} öppna
                </td>
                <th>Godkänt men ej fakturerat</th>
                <td>{fmtSEK(ata.ejFakt)}</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}

      <div className="delrubrik">Tidplan</div>
      {forsenade.length ? (
        <table>
          <thead>
            <tr>
              <th>Försenad milstolpe</th>
              <th>Planerat datum</th>
              <th>Dagar över</th>
            </tr>
          </thead>
          <tbody>
            {forsenade.map((m) => (
              <tr key={m.id}>
                <td>{m.titel}</td>
                <td>{m.datum}</td>
                <td>{Math.abs(dagarTill(m.datum))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="box">
          <b>Inga försenade milstolpar</b>
          Samtliga milstolpar med passerat datum är klarmarkerade.
        </div>
      )}

      {kommande.length ? (
        <table>
          <thead>
            <tr>
              <th>Närmast kommande</th>
              <th>Datum</th>
              <th>Dagar kvar</th>
            </tr>
          </thead>
          <tbody>
            {kommande.map((m) => (
              <tr key={m.id}>
                <td>{m.titel}</td>
                <td>{m.datum}</td>
                <td>{dagarTill(m.datum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {forfallna.length ? (
        <>
          <div className="delrubrik">Punkter som passerat sitt datum</div>
          <table>
            <thead>
              <tr>
                <th>Punkt</th>
                <th>Skulle varit klar</th>
                <th>Ansvarig</th>
              </tr>
            </thead>
            <tbody>
              {forfallna.map((p) => (
                <tr key={p.id}>
                  <td>{p.titel}</td>
                  <td>{p.forfaller}</td>
                  <td>{p.ansvarig || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {hoga.length ? (
        <>
          <div className="delrubrik">Kräver beslut eller åtgärd</div>
          <table>
            <tbody>
              {hoga.slice(0, 12).map((f, i) => (
                <tr key={i}>
                  <td>{f.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className="fot">
        Rapporten är genererad ur projektportföljen {idag()} och speglar läget vid utskriftstillfället.
        Belopp avseende ÄTA är de som registrerats i ÄTA-loggen och ersätter inte formell avräkning.
      </div>
    </>
  );
}
