import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Note, Pill, Prog, SelStatus } from "../components/ui/Primitiver.jsx";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { MILSTOLPE_MODELL } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { betalRad, ekonomi, mUnderlagKlart, mstatusRad, nastaMilstolpe, projekt } from "../lib/berakningar.js";

export function Milstolpar() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid } = useUi();

  const p = projekt(state, pid);
  if (!p) return null;

  const kv = ekonomi(state, pid).kv;
  const nastaKod = (nastaMilstolpe(state, pid) || {}).kod;

  return (
    <>
      <Projektvaljare />

      <div className="card">
        <h3>Betalningsmilstolpar M1–M7 — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
        <div className="lead">
          Kontraktets betalningsplan. Utlösande krav och andelar kommer ur projektmodellen; underlagen
          bockas av här och styr när lyftet kan aviseras.
        </div>

        <ol className="mspine" style={{ listStyle: "none", margin: "14px 0 0", padding: "0 0 4px" }}>
          {MILSTOLPE_MODELL.map((m) => {
            const b = betalRad(state, pid, m.kod);
            const st = b ? b.status : "kvar";
            const u = mUnderlagKlart(state, pid, m);
            const kl = st === "fakturerad" ? "klar" : m.kod === nastaKod ? "nu" : u.allt ? "redo" : "";
            const lage =
              st === "fakturerad" ? "fakturerad" : m.kod === nastaKod ? "nästa lyft" : u.allt ? "redo" : "väntar";
            return (
              <li className={`mstop ${kl}`.trim()} key={m.kod} title={m.namn}>
                <span className="mkod">{m.kod}</span>
                <span className="mandel">{m.andel} %</span>
                <span className="sr-only">
                  {m.namn} — {lage}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {MILSTOLPE_MODELL.map((m) => {
        const b = betalRad(state, pid, m.kod);
        const st = b ? b.status : "kvar";
        const u = mUnderlagKlart(state, pid, m);
        const r = mstatusRad(state, pid, m.kod);
        const belopp = kv ? Math.round((kv * m.andel) / 100) : null;
        const ar = m.kod === nastaKod;

        return (
          <section className={`card ${ar ? "mnu" : ""}`.trim()} style={{ marginTop: 14 }} key={m.kod}>
            <div className="mhead">
              <div>
                <h3>
                  {m.kod} · {m.namn}
                </h3>
                <div className="lead" style={{ margin: "4px 0 0" }}>
                  {m.krav}
                </div>
              </div>
              <div className="mhead-h">
                <span className="mprocent">{m.andel} %</span>
                <span className="mbelopp">{belopp !== null ? fmtSEK(belopp) : "belopp saknas"}</span>
                <Pill status={st} />
              </div>
            </div>

            <div className="mgrid">
              <div>
                <h4 className="mrub">
                  Underlag {u.klara}/{u.av}
                </h4>
                <div style={{ marginBottom: 10 }}>
                  <Prog
                    procent={(u.klara / u.av) * 100}
                    klart={u.allt}
                    etikett={`Underlag klart för ${m.kod}`}
                  />
                </div>

                {m.underlag.map(([n, text]) => {
                  const id = `mu_${pid}_${m.kod}_${n}`;
                  const klar = !!(r.underlag || {})[n];
                  return (
                    <div className="chk" key={n}>
                      <input
                        type="checkbox"
                        id={id}
                        checked={klar}
                        onChange={(e) =>
                          dispatch({
                            type: "UPPD_MUNDERLAG",
                            pid,
                            kod: m.kod,
                            n,
                            varde: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor={id}>{klar ? <s>{text}</s> : text}</label>
                    </div>
                  );
                })}
              </div>

              <div>
                <h4 className="mrub">Fakturering</h4>

                <div className="f">
                  <label htmlFor={`av_${pid}_${m.kod}`}>Förhandsavisering skickad</label>
                  <DatumFalt
                    id={`av_${pid}_${m.kod}`}
                    varde={r.avisering || ""}
                    etikett={`Förhandsavisering för ${m.kod}`}
                    onCommit={(v) =>
                      dispatch({ type: "UPPD_MSTATUS", pid, kod: m.kod, falt: "avisering", varde: v })
                    }
                  />
                </div>

                <div className="f">
                  <label htmlFor={`fa_${pid}_${m.kod}`}>Faktura i IFS</label>
                  <DatumFalt
                    id={`fa_${pid}_${m.kod}`}
                    varde={r.faktura || ""}
                    etikett={`Fakturadatum för ${m.kod}`}
                    onCommit={(v) =>
                      dispatch({ type: "UPPD_MSTATUS", pid, kod: m.kod, falt: "faktura", varde: v })
                    }
                  />
                </div>

                <div className="f">
                  <label htmlFor={`bs_${pid}_${m.kod}`}>
                    Betalstatus <span className="lockbadge">🔒 Administratör</span>
                  </label>
                  {b ? (
                    <SelStatus
                      id={`bs_${pid}_${m.kod}`}
                      alternativ={["fakturerad", "pagaende", "kvar"]}
                      varde={b.status}
                      etikett={`Betalstatus för ${m.kod}`}
                      onChange={(v) => dispatch({ type: "UPPD_BETALPLAN", id: b.id, falt: "status", varde: v })}
                    />
                  ) : (
                    <span className="lead">Ingen betalplansrad för {m.kod} — lägg till den i Ekonomi.</span>
                  )}
                </div>

                {!u.allt && r.avisering ? (
                  <Note>
                    <b>Aviserat med ofullständigt underlag.</b> {u.av - u.klara} punkt
                    {u.av - u.klara > 1 ? "er" : ""} återstår för {m.kod}.
                  </Note>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <Note>
        <b>Rutin.</b> Skicka förhandsavisering på Excel-mallen via e-post för beställarens godkännande först
        — därefter formell faktura i IFS. Kontraktsvärde och betalstatus kan bara ändras av
        administratören; underlagsbockarna är öppna för alla.
      </Note>
    </>
  );
}
