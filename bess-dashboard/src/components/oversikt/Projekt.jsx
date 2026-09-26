import { usePortfolj, useUi } from "../../state/hooks.js";
import { ArrowUpRight, BatteryCharging, MapPin, PlugZap, Zap } from "lucide-react";
import { Falt, NumFalt, DatumFalt } from "../ui/Falt.jsx";
import { SelStatus, Bar, Tabellyta } from "../ui/Primitiver.jsx";
import { PROJEKTSTATUS } from "../../data/konstanter.js";
import { fmtSEK } from "../../lib/format.js";
import { dagarTill, idag } from "../../lib/datum.js";
import { ekonomi, nastaHandelse, oppnaUR, projektKlass, projektUnderlag } from "../../lib/berakningar.js";

/* ---------- Projektkort ---------- */

/* Kortet får bryta rader var som helst utom inuti ett värde. Nyckeltalen
   ligger i ett auto-fit-rutnät i stället för tre fasta kolumner, så ett
   datum som 2026-12-02 aldrig trycks ut ur sin ruta på smala skärmar — rutan
   hoppar ner en rad i stället. Saknade uppgifter visas som text ("Effekt ej
   angiven") och inte som "— MW / — MWh". */

const tonForDagar = (d) => (d === null ? "" : d < 0 ? "bad" : d < 60 ? "warn" : "");

export function Projektkort({ p }) {
  const { state, uppdStatus } = usePortfolj();
  const { setValtProjekt, visa } = useUi();

  const e = ekonomi(state, p.id);
  const d = dagarTill(p.fardigstallande);
  const ur = oppnaUR(state, p.id).length;
  const nasta = nastaHandelse(state, p.id);

  const effekt = p.mw ? `${p.mw} MW / ${p.mwh ?? "—"} MWh` : null;
  const nat = p.natagare ? p.natagare + (p.natkontakt ? ` · ${p.natkontakt}` : "") : null;

  return (
    <article className={`projkort ${projektKlass(state, p.id)}`.trim()}>
      <header className="projkort-topp">
        <span className={`projkort-nr${p.nr ? "" : " saknas"}`}>{p.nr || "AO-nr saknas"}</span>
        <SelStatus
          alternativ={PROJEKTSTATUS}
          varde={p.status || "Planering"}
          etikett={`Status för ${p.namn}`}
          onChange={(v) => uppdStatus("projekt", p.id, "status", v)}
        />
      </header>

      <h3 className="projkort-namn">
        {/* En knapp och inte en länk: den byter vy i appen och nås med tangentbord. */}
        <button
          type="button"
          onClick={() => {
            setValtProjekt(p.id);
            visa("tidplan");
          }}
        >
          <span>{p.namn}</span>
          <ArrowUpRight size={18} aria-hidden="true" className="projkort-pil" />
          <span className="sr-only"> — öppna tidplanen</span>
        </button>
      </h3>

      <ul className="projkort-fakta">
        <li className={effekt ? "" : "tom"}>
          <Zap size={14} aria-hidden="true" />
          {effekt || "Effekt ej angiven"}
        </li>
        <li className={p.ort ? "" : "tom"}>
          <MapPin size={14} aria-hidden="true" />
          {p.ort || "Ort ej angiven"}
        </li>
        <li className={nat ? "" : "tom"}>
          <PlugZap size={14} aria-hidden="true" />
          {nat || "Nätägare ej angiven"}
        </li>
      </ul>

      <dl className="projkort-tal">
        <div>
          {/* Mjukt bindestreck: delas som "Färdig-ställande" bara när rutan är smal. */}
          <dt>Färdig&shy;ställande</dt>
          <dd>{p.fardigstallande || "—"}</dd>
        </div>
        <div className={tonForDagar(d)}>
          <dt>Dagar kvar</dt>
          <dd>{d === null ? "—" : d}</dd>
        </div>
        <div className={ur ? "warn" : ""}>
          <dt>Öppna UR</dt>
          <dd>{ur}</dd>
        </div>
      </dl>

      {nasta ? (
        <div className={`projkort-nasta${nasta.bess ? " bess" : ""}`}>
          <span className="projkort-nasta-d">om {nasta.d} d</span>
          <span className="projkort-nasta-t">
            {nasta.bess ? <BatteryCharging size={14} aria-hidden="true" /> : null}
            {nasta.titel}
            <span className="projkort-nasta-datum">{nasta.datum}</span>
          </span>
        </div>
      ) : null}

      <div className="projkort-ekonomi">
        <Bar procent={e.faktProc} etikett={`Fakturerat av kontraktet för ${p.namn}`} />
        <div className="projkort-ekonomi-rad">
          <div>
            <span>Fakturerat</span>
            <b>
              {e.faktProc} %{e.faktSEK !== null ? ` · ${fmtSEK(e.faktSEK)}` : ""}
            </b>
          </div>
          <div>
            <span>Kvar</span>
            <b>
              {100 - e.faktProc} %{e.kvarSEK !== null ? ` · ${fmtSEK(e.kvarSEK)}` : ""}
            </b>
          </div>
        </div>
        {e.kvarSEK === null ? <div className="projkort-saknas">Kontraktsvärde saknas</div> : null}
      </div>

      {p.anteckning ? <p className="projkort-anteckning">{p.anteckning}</p> : null}
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
  ["startdatum", "Startdatum (NTP)", 150],
  ["fardigstallande", "Färdigställande", 150],
  ["status", "Status", 130],
  ["mapp", "Projektmapp", 180],
  ["underlag", "Underlag — källa och datum", 230],
  ["anteckning", "Anteckning", 180],
];

/** Visas när ett nyare justerat byggmöte går före källfältet i sidfoten. */
function SenasteProtokoll({ u }) {
  if (u?.fran !== "byggmote") return null;
  return (
    <small style={{ display: "block", fontSize: 10.5, color: "var(--ink-faint)", marginTop: 3 }}>
      Sidfoten visar {u.kalla.replace(/^Byggmötesprotokoll /, "")} {u.datum} — senaste justerade byggmöte
    </small>
  );
}

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
                <td data-label="Startdatum">
                  <DatumFalt
                    varde={p.startdatum}
                    etikett={`Startdatum för ${p.namn}`}
                    onCommit={(v) => {
                      uppd("projekt", p.id, "startdatum", v);
                      uppd("projekt", p.id, "startdatumAntagande", false);
                    }}
                  />
                  {p.startdatumAntagande ? <span className="ant">ANTAGANDE</span> : null}
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
                  <SenasteProtokoll u={projektUnderlag(state, p)} />
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
