import { usePortfolj } from "../../state/hooks.js";
import { ATT_VERIFIERA, LARDOMAR } from "../../data/bessChecklistData.ts";
import { Pill, Tabellyta } from "../ui/Primitiver.jsx";
import { datumKort, dagarText } from "../../lib/datum.js";
import { ledtidslage, milstolpslage } from "../../lib/epc.js";
import { LedtidStatus } from "./Delar.jsx";

/* Guidens referensdelar: betalplanen, ledtiderna mot projektets datum,
   lärdomarna och det som källorna inte är överens om. */

const MS_PILL = { fakturerad: "fakturerad", pagaende: "pagaende", kvar: "kvar" };

export function Milstolpstabell({ pid }) {
  const { state } = usePortfolj();
  const rader = milstolpslage(state, pid);
  return (
    <Tabellyta etikett="Betalmilstolpar M1–M7">
      <table>
        <thead>
          <tr>
            <th scope="col">Nr</th>
            <th scope="col">Milstolpe</th>
            <th scope="col">Utlöses av</th>
            <th scope="col">%</th>
            <th scope="col">Grind</th>
            <th scope="col">Planerad</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rader.map((m) => (
            <tr key={m.kod}>
              <td data-label="Nr">
                <b>{m.kod}</b>
              </td>
              <td data-label="Milstolpe">{m.namn}</td>
              <td data-label="Utlöses av">{m.utloses}</td>
              <td data-label="%">{m.andel} %</td>
              <td data-label="Grind">{m.grind}</td>
              <td data-label="Planerad">{m.datum || "—"}</td>
              <td data-label="Status">
                <Pill status={MS_PILL[m.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tabellyta>
  );
}

/** onMarkera(ledtid, klar) markerar en ledtid som klar i förväg, eller ångrar
 *  det. En ledtid vars fas är passerad är klar ändå och går inte att ångra. */
export function Ledtidstabell({ pid, onMarkera }) {
  const { state } = usePortfolj();
  const rader = ledtidslage(state, pid);
  return (
    <Tabellyta etikett="Ledtider för projektet">
      <table>
        <thead>
          <tr>
            <th scope="col">Ärende</th>
            <th scope="col">Ledtid</th>
            <th scope="col">Räknas mot</th>
            <th scope="col">Starta senast</th>
            <th scope="col">Ägare</th>
            <th scope="col">Läge</th>
          </tr>
        </thead>
        <tbody>
          {rader.map((l) => (
            <tr key={l.id} className={`epc-ledrad ${l.status}`}>
              <td data-label="Ärende">
                <b>{l.arende}</b>
                <small className="epc-punktref">
                  Kontrollpunkt {l.punkt}
                  {l.not ? ` · ${l.not}` : ""}
                </small>
              </td>
              <td data-label="Ledtid">{l.ledtid}</td>
              <td data-label="Räknas mot">
                {l.ank ? (
                  <>
                    {l.ank.namn} {l.ank.datum ? datumKort(l.ank.datum) : "—"}
                    <small className="epc-punktref">ur {l.ank.kalla}</small>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td data-label="Starta senast">
                {l.senast ? (
                  <>
                    <b>{l.senast}</b>
                    <small className="epc-punktref">{dagarText(l.dagarKvar)}</small>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td data-label="Ägare">{l.agare}</td>
              <td data-label="Läge">
                <span className="epc-ledlage">
                  <LedtidStatus status={l.status} />
                  {l.markerad ? (
                    <button type="button" className="epc-textknapp" onClick={() => onMarkera(l.id, false)}>
                      Ångra
                      <span className="sr-only">: {l.arende}</span>
                    </button>
                  ) : !l.klar && l.status !== "passerad" ? (
                    <button type="button" className="btn sec mini" onClick={() => onMarkera(l.id, true)}>
                      Klar
                      <span className="sr-only">: {l.arende}</span>
                    </button>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tabellyta>
  );
}

export function Lardomar() {
  return (
    <ol className="epc-lardomar">
      {LARDOMAR.map((l, i) => (
        <li key={l.handelse}>
          <span className="epc-lardomnr" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <b>{l.handelse}</b>
            <p>{l.vadHande}</p>
            <p className="epc-gorsa">
              <span>Gör så här:</span> {l.gorSa}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AttVerifiera() {
  return (
    <dl className="epc-verifiera">
      {ATT_VERIFIERA.map((v) => (
        <div key={v.amne}>
          <dt>{v.amne}</dt>
          <dd>{v.text}</dd>
        </div>
      ))}
    </dl>
  );
}
