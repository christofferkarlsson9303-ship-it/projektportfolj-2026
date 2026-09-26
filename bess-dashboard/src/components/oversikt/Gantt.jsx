import { useMemo, useState } from "react";
import { GanttChart } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { DatumFalt } from "../ui/Falt.jsx";
import { FasStatus } from "../epc/Delar.jsx";
import { dagarTill, datumKort, idag, MANADER } from "../../lib/datum.js";
import { FAS_STATUS, dagarMellan, faslage, milstolpslage, planAnkare } from "../../lib/epc.js";
import { Lank, Ruta } from "./Ruta.jsx";

/* Fasplanen som Gantt-schema: checklistans 16 faser med grindarna G0–G15
   och betalmilstolparna M1–M7 för valt projekt.

   Staplarnas färg är en ton i tre steg (klar → pågår → kommande), samma
   validerade ramp som nyckeltalen; bara försenad bär statusrött. Varje rad
   är en knapp som öppnar fasen i checklistan, och verktygstipset visas på
   både hover och tangentbordsfokus. Milstolparna står även som text under
   schemat, så ingenting hänger på att man hovrar. */

const GRIND_KALLA = { angiven: "angiven", betalplan: "härledd ur betalplanen", följd: "följer av senare grind" };
const MS_TEXT = { fakturerad: "Fakturerad", pagaende: "Pågående", kvar: "Kvar" };
const kortNamn = (p) => (p.nr ? p.nr + " " : "") + (p.ort || p.namn);

function manadsstreck(min, max) {
  const ut = [];
  const d = new Date(min + "T00:00:00");
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.toISOString().slice(0, 10) < max) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    ut.push({ iso, namn: MANADER[d.getMonth()] + (d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(2)}` : "") });
    d.setMonth(d.getMonth() + 1);
  }
  return ut;
}

function Projektflikar() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt } = useUi();
  return (
    <div className="ov-flikar" role="group" aria-label="Projekt i Gantt-schemat">
      {state.projekt.map((p) => (
        <button key={p.id} type="button" aria-pressed={valtProjekt === p.id} onClick={() => setValtProjekt(p.id)}>
          {kortNamn(p)}
        </button>
      ))}
    </div>
  );
}

/** Tomt läge: projektet saknar start eller slut — fyll i direkt här. */
function Planfalt({ p }) {
  const { uppd } = usePortfolj();
  return (
    <div className="ov-gantt-tom">
      <p className="m-0">
        Fasplanen räknas fram ur projektets startdatum (NTP), BESS-leverans och färdigställande. Ange start och
        slut för <b>{p.namn}</b> så ritas schemat och ledtiderna.
      </p>
      <div className="epc-projektplan" style={{ border: 0, padding: 0 }}>
        <div className="epc-falt">
          <label htmlFor={`gantt-start-${p.id}`}>Startdatum (NTP)</label>
          <DatumFalt
            id={`gantt-start-${p.id}`}
            varde={p.startdatum || ""}
            etikett={`Startdatum för ${p.namn}`}
            onCommit={(v) => {
              uppd("projekt", p.id, "startdatum", v);
              uppd("projekt", p.id, "startdatumAntagande", false);
            }}
          />
        </div>
        <div className="epc-falt">
          <label htmlFor={`gantt-slut-${p.id}`}>Färdigställande</label>
          <DatumFalt
            id={`gantt-slut-${p.id}`}
            varde={p.fardigstallande || ""}
            etikett={`Färdigställande för ${p.namn}`}
            onCommit={(v) => uppd("projekt", p.id, "fardigstallande", v)}
          />
        </div>
      </div>
    </div>
  );
}

export function Gantt({ i }) {
  const { state } = usePortfolj();
  const { valtProjekt: pid, oppnaPost, visa } = useUi();
  const [doljKlara, setDoljKlara] = useState(false);
  const p = state.projekt.find((x) => x.id === pid);
  const nu = idag();

  const faser = useMemo(() => faslage(state, pid, nu), [state, pid, nu]);
  const ms = useMemo(() => milstolpslage(state, pid, faser), [state, pid, faser]);
  const a = planAnkare(state, pid);

  const daterade = faser.filter((f) => f.start && f.slut);
  const min = daterade.length ? daterade.map((f) => f.start).sort()[0] : null;
  const maxKandidater = [...daterade.map((f) => f.slut), ...ms.map((m) => m.datum).filter(Boolean)];
  const max = maxKandidater.length ? maxKandidater.sort().at(-1) : null;
  const spann = min && max ? Math.max(1, dagarMellan(min, max)) : 1;
  const x = (iso) => Math.max(0, Math.min(100, (dagarMellan(min, iso) / spann) * 100));
  const manader = min ? manadsstreck(min, max) : [];
  const idagSynlig = min && nu >= min && nu <= max;

  const synliga = doljKlara ? faser.filter((f) => f.status !== "klar") : faser;
  const sena = faser.filter((f) => f.status === "sen");
  const passerade = faser.filter((f) => f.grind.passerad).length;

  return (
    <Ruta
      id="ov-gantt"
      i={i}
      ikon={GanttChart}
      titel="Fasplan, grindar och betalningar"
      under={
        p
          ? `${p.nr ? p.nr + " " : ""}${p.namn} · ${passerade} av 16 grindar passerade${
              p.fardigstallande && dagarTill(p.fardigstallande) >= 0
                ? ` · slutbesiktning om ${dagarTill(p.fardigstallande)} d`
                : ""
            }${a?.startAntagande ? " · startdatum antaget" : ""}`
          : "Välj projekt"
      }
      klass="ov-gantt-ruta md:col-span-2 xl:col-span-3"
      atgard={
        <Lank onClick={() => visa("epc")} etikett="Öppna BESS EPC Checklista">
          Checklistan
        </Lank>
      }
    >
      <div className="ov-gantt-verktyg">
        <Projektflikar />
        {daterade.length ? (
          <button
            type="button"
            className="btn sec mini"
            aria-pressed={doljKlara}
            onClick={() => setDoljKlara((v) => !v)}
          >
            {doljKlara ? "Visa alla 16 faser" : "Dölj passerade faser"}
          </button>
        ) : null}
      </div>

      {!p ? null : !daterade.length ? (
        <Planfalt p={p} />
      ) : (
        <>
          <div className="ov-gantt-rull" tabIndex={-1}>
            <div className="ov-gantt">
              {/* Tidsaxel */}
              <div className="ov-gantt-rad ov-gantt-axelrad" aria-hidden="true">
                <span />
                <span className="ov-gantt-spar">
                  {manader
                    // Etiketten "Idag" går före en månad som skulle hamna under den.
                    .filter((m) => !idagSynlig || Math.abs(x(m.iso) - x(nu)) > 3)
                    .map((m) => (
                      <span key={m.iso} className="ov-gantt-manad" style={{ left: x(m.iso) + "%" }}>
                        {m.namn}
                      </span>
                    ))}
                  {idagSynlig ? (
                    <span className="ov-gantt-idagtext" style={{ left: x(nu) + "%" }}>
                      Idag
                    </span>
                  ) : null}
                </span>
              </div>

              {/* Betalningar */}
              <div className="ov-gantt-rad ov-gantt-msrad" aria-hidden="true">
                <span className="ov-gantt-etikett">
                  <span className="ov-gantt-nr">M</span>
                  <span className="ov-gantt-namn">Betalningar</span>
                </span>
                <span className="ov-gantt-spar">
                  {ms
                    .filter((m) => m.datum)
                    .map((m, k) => (
                      <span
                        key={m.kod}
                        className={`ov-gantt-ms ${m.status} ${k % 2 ? "ner" : "upp"}`}
                        style={{ left: x(m.datum) + "%" }}
                      >
                        {m.kod}
                        <span className="ov-gantt-tips under">
                          <b>
                            {m.kod} · {m.namn} · {m.andel} %
                          </b>
                          {m.utloses}. {MS_TEXT[m.status]} · {datumKort(m.datum)} ({m.grind})
                        </span>
                      </span>
                    ))}
                </span>
              </div>

              <div className="ov-gantt-rader">
                {manader.map((m) => (
                  <span key={m.iso} className="ov-gantt-linje" style={{ left: `calc(var(--gantt-etikett) + (100% - var(--gantt-etikett) - var(--gantt-hoger)) * ${x(m.iso) / 100})` }} aria-hidden="true" />
                ))}
                {idagSynlig ? (
                  <span
                    className="ov-gantt-linje idag"
                    style={{ left: `calc(var(--gantt-etikett) + (100% - var(--gantt-etikett) - var(--gantt-hoger)) * ${x(nu) / 100})` }}
                    aria-hidden="true"
                  />
                ) : null}

                {synliga.map((f, rad) => {
                  const harDatum = f.start && f.slut;
                  const vanster = harDatum ? x(f.start) : 0;
                  const bredd = harDatum ? Math.max(0.6, x(f.slut) - vanster) : 0;
                  const sida = (vanster > 62 ? " hoger" : "") + (rad < 3 ? " under" : "");
                  const [, statusText] = FAS_STATUS[f.status];
                  const grindText = f.grind.passerad
                    ? `${f.fas.grind.kod} passerad${f.grind.datum ? " " + f.grind.datum : ""} (${GRIND_KALLA[f.grind.kalla]})`
                    : `${f.fas.grind.kod} ej passerad`;
                  return (
                    <button
                      key={f.fas.nr}
                      type="button"
                      className={`ov-gantt-rad ov-gantt-fas ${f.status}`}
                      onClick={() => oppnaPost("epc", `fas-${f.fas.nr}`)}
                      aria-label={`Fas ${f.fas.nr} ${f.fas.titel}: ${statusText}, ${
                        harDatum ? `${f.start} till ${f.slut}` : "ej planerad"
                      }, ${f.klara} av ${f.totalt} punkter klara, ${grindText}. Öppna i checklistan.`}
                    >
                      <span className="ov-gantt-etikett">
                        <span className="ov-gantt-nr">{f.fas.nr}</span>
                        <span className="ov-gantt-namn">{f.fas.kort}</span>
                        <span className="ov-gantt-antal">
                          {f.klara}/{f.totalt}
                        </span>
                      </span>
                      <span className="ov-gantt-spar">
                        {harDatum ? (
                          <>
                            <span className="ov-gantt-stapel" style={{ left: vanster + "%", width: bredd + "%" }}>
                              {f.status === "pagar" || f.status === "sen" ? (
                                <i style={{ width: Math.round((f.klara / f.totalt) * 100) + "%" }} />
                              ) : null}
                            </span>
                            <span
                              className={`ov-gantt-grind${f.grind.passerad ? " passerad" : ""}${f.fas.milstolpe ? " betalning" : ""}`}
                              style={{ left: vanster + bredd + "%" }}
                            />
                            <span className="ov-gantt-gkod" style={{ left: vanster + bredd + "%" }}>
                              {f.fas.grind.kod}
                            </span>
                            <span className={`ov-gantt-tips${sida}`} style={{ left: vanster + "%" }}>
                              <b>
                                Fas {f.fas.nr} · {f.fas.titel}
                              </b>
                              {datumKort(f.start)} – {datumKort(f.slut)} {f.egenPlan ? "· egna datum" : "· standardplan"}
                              <br />
                              {statusText} · {f.klara}/{f.totalt} punkter
                              {f.hp ? ` · HP ${f.hpKlara}/${f.hp}` : ""}
                              <br />
                              {grindText}
                              {f.fas.milstolpe ? ` · låser ${f.fas.milstolpe}` : ""}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ov-gantt-fot">
            <ul className="ov-legend">
              <li>
                <i className="klar" aria-hidden="true" />
                Grind passerad
              </li>
              <li>
                <i className="pagar" aria-hidden="true" />
                Pågår
              </li>
              <li>
                <i className="kvar" aria-hidden="true" />
                Kommande
              </li>
              <li>
                <i className="sen" aria-hidden="true" />
                Försenad
              </li>
              <li>
                <i className="grind" aria-hidden="true" />
                Grind · orange = låser betalning
              </li>
            </ul>
            <ul className="ov-gantt-mslista" aria-label="Betalmilstolpar">
              {ms.map((m) => (
                <li key={m.kod} className={m.status}>
                  <b>{m.kod}</b> {m.andel} % · {MS_TEXT[m.status]}
                  {m.datum ? ` · ${datumKort(m.datum)}` : ""}
                </li>
              ))}
            </ul>
          </div>

          {sena.length ? (
            <p className="ov-varning m-0">
              <FasStatus status="sen" />
              <span>
                {sena.map((f) => `Fas ${f.fas.nr} ${f.fas.kort}`).join(", ")}{" "}
                har passerat sitt slutdatum utan passerad grind.
              </span>
            </p>
          ) : null}
        </>
      )}
    </Ruta>
  );
}
