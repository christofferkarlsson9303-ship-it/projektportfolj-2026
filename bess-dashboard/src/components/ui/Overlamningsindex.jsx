import logotyp from "../../assets/one-nordic-logo.png";
import { DOKSTATUS, SLUTDOK_MALL } from "../../data/konstanter.js";
import { slutdokIndex, slutdokKritisktKlart } from "../../lib/berakningar.js";
import { fmtProcent } from "../../lib/format.js";
import { idag } from "../../lib/datum.js";

/* Överlämningsindex som A4 — underlaget beställaren får inför slutbesiktning.

   Rapporten säger rakt ut om M6-grinden är spärrad. En överlämningsrapport
   som döljer att kritiska handlingar saknas är värdelös, eftersom bristen
   ändå kommer fram vid besiktningen. */

const STATUSNAMN = Object.fromEntries(DOKSTATUS);

export function Overlamningsindex({ state, pid }) {
  const p = state.projekt.find((x) => x.id === pid) || null;
  const namn = p ? (p.nr ? p.nr + " " : "") + p.namn : "—";
  const ix = slutdokIndex(state, pid);
  const oppen = slutdokKritisktKlart(state, pid);

  return (
    <>
      <div className="raphead med-logo">
        <img src={logotyp} alt="" className="logo" />
        <div>
          <h1>Överlämningsindex — slutdokumentation</h1>
          <div className="s">
            {namn} · {idag()} · ONE Nordic AB
          </div>
        </div>
      </div>

      <table>
        <tbody>
          <tr>
            <th>Projekt</th>
            <td>{namn}</td>
            <th>Färdigställandegrad</th>
            <td>
              {fmtProcent(ix.proc)} ({ix.godkanda} av {ix.av})
            </td>
          </tr>
          <tr>
            <th>M6-grind</th>
            <td colSpan={3}>
              {oppen
                ? "Kritiska kategorier godkända — slutbesiktning kan begäras"
                : "Spärrad — kategori 1–4 är inte kompletta"}
            </td>
          </tr>
        </tbody>
      </table>

      {SLUTDOK_MALL.map(([kat]) => {
        const rader = ix.rader.filter((d) => d.kategori === kat);
        if (!rader.length) return null;

        return (
          <div key={kat}>
            <div className="delrubrik">{kat}</div>
            <table>
              <thead>
                <tr>
                  <th>Handling</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 100 }}>Ansvarig</th>
                  <th style={{ width: 80 }}>Senast</th>
                </tr>
              </thead>
              <tbody>
                {rader.map((d) => (
                  <tr key={d.id}>
                    <td>{d.krav}</td>
                    <td>{STATUSNAMN[d.status] || "—"}</td>
                    <td>{d.ansvarig || "—"}</td>
                    <td>{d.senast || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="fot">
        As-built-dokumentation enligt Appendix 03.7 är krav för slutbetalning.
        <br />
        Utskrivet {idag()} · ONE Nordic AB · one-nordic.se
      </div>
    </>
  );
}
