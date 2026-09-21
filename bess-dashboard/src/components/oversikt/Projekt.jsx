import { usePortfolj, useUi } from "../../state/hooks.js";
import { Falt, NumFalt, DatumFalt } from "../ui/Falt.jsx";
import { SelStatus, Bar, Tabellyta } from "../ui/Primitiver.jsx";
import { PROJEKTSTATUS } from "../../data/konstanter.js";
import { fmtSEK } from "../../lib/format.js";
import { dagarTill, idag } from "../../lib/datum.js";
import { ekonomi, nastaHandelse, oppnaUR, projektKlass } from "../../lib/berakningar.js";

/* ---------- Projektkort ---------- */

export function Projektkort({ p }) {
  const { state, uppdStatus } = usePortfolj();
  const { setValtProjekt, visa } = useUi();

  const e = ekonomi(state, p.id);
  const d = dagarTill(p.fardigstallande);
  const ur = oppnaUR(state, p.id).length;
  const nasta = nastaHandelse(state, p.id);

  return (
    <article className={`pcard ${projektKlass(state, p.id)}`.trim()}>
      <div className="pctop">
        <div className="pnr">{p.nr || "AO-NR SAKNAS"}</div>
        <SelStatus
          alternativ={PROJEKTSTATUS}
          varde={p.status || "Planering"}
          etikett={`Status för ${p.namn}`}
          onChange={(v) => uppdStatus("projekt", p.id, "status", v)}
        />
      </div>

      <h2>
        {/* Var en <a href="javascript:void(0)"> — en knapp är rätt element för
            något som byter vy i appen, och den nås med tangentbord. */}
        <button
          type="button"
          onClick={() => {
            setValtProjekt(p.id);
            visa("tidplan");
          }}
          style={{
            background: "none", border: 0, padding: 0, font: "inherit",
            color: "inherit", cursor: "pointer", textAlign: "left",
          }}
        >
          {p.namn}
        </button>
      </h2>

      <div className="pmeta">
        {p.mw ?? "—"} MW / {p.mwh ?? "—"} MWh · {p.ort || "—"} · Nät: {p.natagare || "—"}
        {p.natkontakt ? ` (${p.natkontakt})` : ""}
      </div>

      <div className="pstats">
        <div className="pstat">
          <div className="l">Färdigställande</div>
          <div className="v">{p.fardigstallande || "—"}</div>
        </div>
        <div className="pstat">
          <div className="l">Dagar kvar</div>
          <div className="v">{d === null ? "—" : d}</div>
        </div>
        <div className="pstat">
          <div className="l">Öppna UR</div>
          <div className="v">{ur}</div>
        </div>
      </div>

      {nasta ? (
        <div className={`pnext${nasta.bess ? " bess" : ""}`}>
          <span className="pnext-d">{nasta.d} d</span>
          <span>
            {nasta.bess ? <span aria-hidden="true">🔋 </span> : null}
            {nasta.titel} · {nasta.datum}
          </span>
        </div>
      ) : null}

      <Bar procent={e.faktProc} etikett={`Fakturerat av kontraktet för ${p.namn}`} />
      <div className="barlab">
        <span>
          Fakturerat {e.faktProc} % {e.faktSEK !== null ? `· ${fmtSEK(e.faktSEK)}` : ""}
        </span>
        <span>
          Kvar {100 - e.faktProc} % {e.kvarSEK !== null ? `· ${fmtSEK(e.kvarSEK)}` : "· belopp saknas"}
        </span>
      </div>

      {p.anteckning ? (
        <div className="lead" style={{ marginTop: 10 }}>
          {p.anteckning}
        </div>
      ) : null}
    </article>
  );
}

/* ---------- Projektuppgifter (redigerbar tabell) ---------- */

const KOLUMNER = [
  ["nr", "AO-nr", 90],
  ["namn", "Namn", 170],
  ["ort", "Ort", 120],
  ["mw", "MW", 70],
  ["mwh", "MWh", 70],
  ["kontraktsvarde", "Kontraktssumma 🔒", 130],
  ["natagare", "Nätägare", 150],
  ["natkontakt", "Nätkontakt", 150],
  ["fardigstallande", "Färdigställande", 150],
  ["status", "Status", 130],
  ["mapp", "Projektmapp", 180],
  ["underlag", "Underlag — källa och datum", 230],
  ["anteckning", "Anteckning", 180],
];

export function Projektredigering() {
  const { state, uppd, uppdNum, uppdStatus, dispatch } = usePortfolj();

  return (
    <div className="card projektred" style={{ marginBottom: 20 }}>
      <h3>Projektuppgifter</h3>
      <div className="lead">Grunddata per projekt. Ändringar sparas direkt.</div>

      <Tabellyta etikett="Projektuppgifter">
        <table>
          <caption className="sr-only">
            Redigerbara grunduppgifter per projekt. Kontraktssumman kan bara ändras av administratören.
          </caption>
          <thead>
            <tr>
              {KOLUMNER.map(([k, t, w]) => (
                <th key={k} scope="col" style={{ width: w }}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.projekt.map((p) => (
              <tr key={p.id}>
                <td data-label="AO-nr">
                  <Falt varde={p.nr || ""} etikett={`AO-nr för ${p.namn}`} onCommit={(v) => uppd("projekt", p.id, "nr", v)} />
                </td>
                <td data-label="Namn">
                  <Falt varde={p.namn} etikett={`Namn på ${p.namn}`} onCommit={(v) => uppd("projekt", p.id, "namn", v)} />
                </td>
                <td data-label="Ort">
                  <Falt varde={p.ort || ""} etikett={`Ort för ${p.namn}`} onCommit={(v) => uppd("projekt", p.id, "ort", v)} />
                </td>
                <td data-label="MW">
                  <NumFalt varde={p.mw} etikett={`MW för ${p.namn}`} onCommit={(v) => uppdNum("projekt", p.id, "mw", v)} />
                </td>
                <td data-label="MWh">
                  <NumFalt varde={p.mwh} etikett={`MWh för ${p.namn}`} onCommit={(v) => uppdNum("projekt", p.id, "mwh", v)} />
                </td>
                <td data-label="Kontraktssumma" title="Endast administratör kan ändra">
                  <NumFalt
                    varde={p.kontraktsvarde}
                    etikett={`Kontraktssumma för ${p.namn} — endast administratör`}
                    onCommit={(v) => dispatch({ type: "UPPD_KONTRAKT", pid: p.id, varde: v })}
                  />
                </td>
                <td data-label="Nätägare">
                  <Falt varde={p.natagare || ""} etikett={`Nätägare för ${p.namn}`} onCommit={(v) => uppd("projekt", p.id, "natagare", v)} />
                </td>
                <td data-label="Nätkontakt">
                  <Falt varde={p.natkontakt || ""} etikett={`Nätkontakt för ${p.namn}`} onCommit={(v) => uppd("projekt", p.id, "natkontakt", v)} />
                </td>
                <td data-label="Färdigställande">
                  <DatumFalt
                    varde={p.fardigstallande}
                    etikett={`Färdigställande för ${p.namn}`}
                    onCommit={(v) => uppd("projekt", p.id, "fardigstallande", v)}
                  />
                </td>
                <td data-label="Status">
                  <SelStatus
                    alternativ={PROJEKTSTATUS}
                    varde={p.status || "Planering"}
                    etikett={`Status för ${p.namn}`}
                    onChange={(v) => uppdStatus("projekt", p.id, "status", v)}
                  />
                </td>
                <td data-label="Projektmapp">
                  <Falt
                    varde={p.mapp || ""}
                    placeholder="mappnamn"
                    etikett={`Projektmapp för ${p.namn}`}
                    onCommit={(v) => uppd("projekt", p.id, "mapp", v)}
                  />
                </td>
                <td data-label="Underlag">
                  <Falt
                    varde={(p.underlag && p.underlag.kalla) || ""}
                    placeholder="t.ex. Byggmötesprotokoll BM9"
                    etikett={`Underlagskälla för ${p.namn}`}
                    style={{ marginBottom: 4 }}
                    onCommit={(v) =>
                      dispatch({ type: "UPPD_UNDERLAG", pid: p.id, falt: "kalla", varde: v, datum: idag() })
                    }
                  />
                  <DatumFalt
                    varde={(p.underlag && p.underlag.datum) || ""}
                    etikett={`Underlagsdatum för ${p.namn}`}
                    onCommit={(v) =>
                      dispatch({ type: "UPPD_UNDERLAG", pid: p.id, falt: "datum", varde: v, datum: idag() })
                    }
                  />
                  {p.underlag && p.underlag.infort ? (
                    <small style={{ display: "block", fontSize: 10.5, color: "var(--ink-faint)", marginTop: 3 }}>
                      infört {p.underlag.infort}
                      {p.underlag.av ? ` av ${p.underlag.av}` : ""}
                    </small>
                  ) : null}
                </td>
                <td data-label="Anteckning">
                  <Falt
                    varde={p.anteckning || ""}
                    etikett={`Anteckning för ${p.namn}`}
                    onCommit={(v) => uppd("projekt", p.id, "anteckning", v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tabellyta>
    </div>
  );
}
