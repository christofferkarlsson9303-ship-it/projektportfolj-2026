import logotyp from "../../assets/one-nordic-logo.png";
import { Kraftkurva } from "../oversikt/Hero.jsx";
import { fmtSEK } from "../../lib/format.js";
import { idag } from "../../lib/datum.js";
import { PILL } from "../../data/konstanter.js";
import { INTERNA_OMRADEN, OMRADEN, TONNAMN, ljusTillTon, nyckeltalFor, nyckeltalRader, periodNamn, statusOmraden, toppRisker } from "../../lib/statusomraden.js";

/* Intern statusrapport till ledning och styrgrupp, enligt ONE Nordics mall
   ("ex. Statusrapport intern"): projektinformation, statussammanställning per område med
   föregående och nuvarande ljus, nyckeltal mot förra rapporten, topprisker, ÄTA och
   eskalerade frågor. Utskriften ritas i utskriftsytan som beställarrapporten.
   Intern: internkalkyl (budget, utfall, prognos) ingår och rapporten ska inte till kunden. */

const KLASS = { ok: "st-ok", warn: "st-warn", bad: "st-bad", neutral: "" };
const ljusText = (l) => (l ? TONNAMN[ljusTillTon(l)] : "—");

export function InternStatusrapport({ state, pid, rad, foregaende }) {
  const p = state.projekt.find((x) => x.id === pid);
  if (!p || !rad) return null;
  const forslag = statusOmraden(state, pid, { egnaFragor: rad.eskalerade });
  const nu = rad.nyckeltal || nyckeltalFor(state, pid);
  const risker = toppRisker(state, pid);
  const ata = (state.ur || []).filter((u) => u.projektId === pid && !["stangd", "utgar"].includes(u.status));
  const fragor = (rad.eskalerade || []).filter((e) => String(e.beskrivning || "").trim());

  return (
    <>
      <div className="raphead med-logo">
        <Kraftkurva className="rap-kurva" />
        <img src={logotyp} alt="" className="logo rap-text" />
        <div className="rap-text">
          <h1>Intern statusrapport</h1>
          <div className="s">
            {p.nr ? `${p.nr} ` : ""}
            {p.namn} · {periodNamn(rad.period)} · {rad.status === "last" ? `Låst ${rad.last?.datum}${rad.last?.av ? ` av ${rad.last.av}` : ""}` : `Utkast ${idag()}`} · INTERN
          </div>
        </div>
      </div>

      <div className="rap-sektion">
        <div className="delrubrik">Projektinformation</div>
        <table>
          <tbody>
            <tr>
              <th>Kund</th>
              <td>{p.bestallare || "—"}</td>
              <th>Projekt</th>
              <td>{p.namn}</td>
            </tr>
            <tr>
              <th>AO-nr</th>
              <td>{p.nr || "—"}</td>
              <th>Föregående rapport</th>
              <td>{foregaende ? `${periodNamn(foregaende.period)}${foregaende.last?.datum ? ` (låst ${foregaende.last.datum})` : ""}` : "Ingen"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rap-sektion">
        <div className="delrubrik">Statussammanställning</div>
        <table>
          <thead>
            <tr>
              <th>Område</th>
              <th>Föregående</th>
              <th>Nuvarande</th>
              <th>Kommentar</th>
            </tr>
          </thead>
          <tbody>
            {INTERNA_OMRADEN.map((o) => {
              const val = rad.omraden?.[o] || {};
              const fore = foregaende?.omraden?.[o]?.ljus;
              return (
                <tr key={o}>
                  <td>{OMRADEN[o]}</td>
                  <td className={KLASS[ljusTillTon(fore)]}>{ljusText(fore)}</td>
                  <td className={KLASS[ljusTillTon(val.ljus)]}>{ljusText(val.ljus)}</td>
                  <td>{val.kommentar || forslag[o].text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="rap-not">Grön: enligt plan. Gul: avvikelse som hanteras i projektet. Röd: kräver hjälp eller beslut av styrgruppen eller högre.</p>
      </div>

      {rad.sammanfattning ? (
        <div className="box">
          <b>Sammanfattning</b>
          {rad.sammanfattning}
        </div>
      ) : null}

      <div className="rap-sektion">
        <div className="delrubrik">Nyckeltal{foregaende ? " mot föregående rapport" : ""}</div>
        <table>
          <thead>
            <tr>
              <th>Nyckeltal</th>
              <th>{periodNamn(rad.period)}</th>
              <th>{foregaende ? periodNamn(foregaende.period) : "Föregående"}</th>
            </tr>
          </thead>
          <tbody>
            {nyckeltalRader(nu, foregaende?.nyckeltal).map(([namn, a, b]) => (
              <tr key={namn}>
                <th>{namn}</th>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
            {rad.eac ? (
              <tr>
                <th>Prognos slutkostnad (EAC), PL</th>
                <td>{fmtSEK(Number(rad.eac))}</td>
                <td>{foregaende?.eac ? fmtSEK(Number(foregaende.eac)) : "—"}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rap-sektion">
        <div className="delrubrik">Topp 3 risker</div>
        {risker.length ? (
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>S × K</th>
                <th>Åtgärd</th>
                <th>Ägare</th>
              </tr>
            </thead>
            <tbody>
              {risker.map((x) => (
                <tr key={x.id}>
                  <td>{x.titel}</td>
                  <td>{x.varde}</td>
                  <td>{x.atgard || "—"}</td>
                  <td>{x.agare || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rap-not">Riskanalys ej framtagen: inga öppna risker i registret.</p>
        )}
      </div>

      <div className="rap-sektion">
        <div className="delrubrik">Ändringar och tillägg, ÄTA (öppna)</div>
        {ata.length ? (
          <table>
            <thead>
              <tr>
                <th>Nr</th>
                <th>Beskrivning</th>
                <th>Värde</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ata.slice(0, 15).map((u) => (
                <tr key={u.id}>
                  <td>{u.nr || "—"}</td>
                  <td>{u.benamning || "—"}</td>
                  <td>{u.belopp ? fmtSEK(Number(u.belopp)) : "Ska aviseras"}</td>
                  <td>{(PILL[u.status] || [null, u.status])[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rap-not">Inga öppna ÄTA.</p>
        )}
      </div>

      <div className="rap-sektion">
        <div className="delrubrik">Eskalerade frågor och beslut</div>
        {fragor.length ? (
          <table>
            <thead>
              <tr>
                <th>Fråga och konsekvens</th>
                <th>Föreslagen åtgärd / beslut</th>
                <th>Ansvarig</th>
                <th>Tillagd</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fragor.map((e) => (
                <tr key={e.id}>
                  <td>{e.beskrivning}</td>
                  <td>{e.atgard || "—"}</td>
                  <td>{e.ansvarig || "—"}</td>
                  <td>{e.datum || "—"}</td>
                  <td>{e.status || "Öppen"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rap-not">Inga frågor kräver beslut över projektnivå.</p>
        )}
      </div>

      <div className="fot">
        Intern rapport ur projektportföljen. Innehåller internkalkyl och ska inte skickas till beställaren.
        Förslagen på ljus räknas ur portföljen; ljusen i rapporten är projektledarens bedömning.
      </div>
    </>
  );
}
