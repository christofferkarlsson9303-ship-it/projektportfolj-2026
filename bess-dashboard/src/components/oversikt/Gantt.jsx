import { useMemo, useState } from "react";
import { ChevronDown, GanttChart } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { DatumFalt } from "../ui/Falt.jsx";
import { FasLage, FasStatus } from "../epc/Delar.jsx";
import { dagarTill, datumKort, idag, MANADER } from "../../lib/datum.js";
import { FAS_LAGE, FAS_STATUS, dagarMellan, faslage, milstolpslage, planAnkare } from "../../lib/epc.js";
import { kritiskLinje } from "../../lib/kritiskLinje.js";
import { Lank, Ruta } from "./Ruta.jsx";
import { StatusBadge } from "../ds/index.js";
import { FasAvvikelse } from "../projekt/FasAvvikelse.jsx";
import { faseInfo } from "../../data/projektfaser.ts";
import { FASSTATUS, fasStatus, grupperaMoment, projektfasForMilstolpe } from "../../lib/fasmappning.js";
import { antalVeckor, fasSammanfattning, flyttaVeckor, utfalldaFor, veckaText } from "../../lib/ganttMeny.js";
import { Vyvaljare } from "../ui/Vyvaljare.jsx";

/* Fasplanen som Gantt-schema: batteriparkens 16 moment (0–15) med grindarna
   G0–G15 och betalmilstolparna M1–M7 för valt projekt. Momenten står under
   projektets fas 1–8 (lib/fasmappning.js), och varje fasrubrik visar samma
   status som projektkortet: klar, pågår eller låst.

   Staplarnas färg är en ton i tre steg (klar → pågår → kommande), samma
   validerade ramp som nyckeltalen; bara försenad bär statusrött. Varje rad
   är en knapp som öppnar fasen i guiden, och verktygstipset visas på
   både hover och tangentbordsfokus. Milstolparna står även som text under
   schemat, så ingenting hänger på att man hovrar.

   En passerad grind betyder inte att fasen är styrkt. Härleds grinden ur en
   fakturerad milstolpe eller en senare grind, eller saknar fasen verifierade
   egenkontroller, får stapeln en randig varningston och raden säger vad som
   saknas. Bara en godkänd fas (verifierade kontroller + angivet grinddatum)
   får den fyllda klar-tonen.

   Klick på ett moment fäller ut en meny under raden (lib/ganttMeny.js): flytta start, slut
   eller hela momentet en vecka i taget, markera grinden passerad eller öppna den igen, eller
   öppna momentet i guiden. Inget dras med musen. Fasrubrikerna fäller ihop sina moment till en
   samlad stapel, och nivåväljaren visar alla faser ihopfällda eller alla moment. */

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


const STATUS_TEXT = { klar: "Klar", pagar: "Pågår", sen: "Försenad", kommande: "Kommande", odaterad: "Ej planerad" };

/** Menyn under ett moment: veckor, status och genväg till guiden. */
function Momentmeny({ p, f, id, onStang }) {
  const { dispatch } = usePortfolj();
  const { oppnaPost } = useUi();
  const satt = (falt, varde) => dispatch({ type: "EPC_FAS", pid: p.id, fas: f.fas.nr, falt, varde });
  const flytta = (vad, steg) => {
    const ny = flyttaVeckor(f, vad, steg);
    if (!ny) return;
    if (ny.start !== f.start) satt("start", ny.start);
    if (ny.slut !== f.slut) satt("slut", ny.slut);
  };
  const harDatum = f.start && f.slut;
  const angiven = f.grind.passerad && f.grind.kalla === "angiven";
  const harledd = f.grind.passerad && !angiven;
  const steg = (vad, namn) => (
    <div className="ov-gantt-steg" role="group" aria-label={namn}>
      <span>{namn}</span>
      <button type="button" className="btn sec mini" disabled={!harDatum} onClick={() => flytta(vad, -1)} aria-label={`${namn}: en vecka tidigare`}>
        −1 v
      </button>
      <button type="button" className="btn sec mini" disabled={!harDatum} onClick={() => flytta(vad, 1)} aria-label={`${namn}: en vecka senare`}>
        +1 v
      </button>
    </div>
  );
  return (
    <div
      id={id}
      className="ov-gantt-meny"
      role="group"
      aria-label={`Moment ${f.fas.nr} ${f.fas.kort}: veckor och status`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onStang(true);
        }
      }}
    >
      <div className="ov-gantt-meny-del">
        <b>Veckor</b>
        <p className="m-0">
          {harDatum ? (
            <>
              {veckaText(f.start)} – {veckaText(f.slut)} · {antalVeckor(f.start, f.slut)} v{f.egenPlan ? " · egna datum" : " · standardplan"}
            </>
          ) : (
            "Momentet saknar datum. Ange projektets start och slut först."
          )}
        </p>
        <div className="ov-gantt-stegrad">
          {steg("hela", "Flytta momentet")}
          {steg("start", "Start")}
          {steg("slut", "Slut")}
        </div>
      </div>
      <div className="ov-gantt-meny-del">
        <b>Status</b>
        <p className="m-0">
          Nu: {STATUS_TEXT[f.status] || f.status}. Pågår, kommande och försenad följer datumen; klar betyder att grinden {f.fas.grind.kod} är passerad.
        </p>
        <div className="ov-gantt-stegrad" role="radiogroup" aria-label={`Grind ${f.fas.grind.kod}`}>
          <label className="ov-gantt-val">
            <input type="radio" name={`${id}-grind`} checked={!f.grind.passerad} disabled={harledd} onChange={() => satt("grindDatum", "")} />
            Följer datumen
          </label>
          <label className="ov-gantt-val">
            <input type="radio" name={`${id}-grind`} checked={f.grind.passerad} onChange={() => satt("grindDatum", f.grind.datum || idag())} />
            Klar — {f.fas.grind.kod} passerad{angiven && f.grind.datum ? ` ${datumKort(f.grind.datum)}` : " i dag"}
          </label>
        </div>
        {harledd ? (
          <p className="m-0 text-xs">
            Grinden {GRIND_KALLA[f.grind.kalla]}. Den öppnas inte härifrån — ändra i Bygga batteripark.
          </p>
        ) : null}
      </div>
      <div className="ov-gantt-meny-fot">
        <button type="button" className="btn sec mini" onClick={() => oppnaPost("epc", `fas-${f.fas.nr}`)}>
          Öppna i guiden
        </button>
        <button type="button" className="btn sec mini" onClick={() => onStang(true)}>
          Stäng
        </button>
      </div>
    </div>
  );
}

export function Gantt({ i }) {
  const { state } = usePortfolj();
  const { valtProjekt: pid, visa } = useUi();
  const [doljKlara, setDoljKlara] = useState(false);
  const [niva, setNiva] = useState("moment");
  const [utfallda, setUtfallda] = useState(null); // null = följer nivån
  const [meny, setMeny] = useState(null); // momentnummer med öppen meny
  const p = state.projekt.find((x) => x.id === pid);
  const nu = idag();

  const faser = useMemo(() => faslage(state, pid, nu), [state, pid, nu]);
  const ms = useMemo(() => milstolpslage(state, pid, faser), [state, pid, faser]);
  const kritiska = useMemo(() => new Set(kritiskLinje(state, pid, nu)?.kritiska || []), [state, pid, nu]);
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
  const grupper = grupperaMoment(synliga);
  const oppna = utfallda ?? utfalldaFor(niva, grupper.map((g) => g.fas.nr));
  const vaxlaFas = (nr) => {
    const ny = new Set(oppna);
    if (ny.has(nr)) ny.delete(nr);
    else ny.add(nr);
    setUtfallda(ny);
  };
  const stangMeny = (fokus) => {
    const nr = meny;
    setMeny(null);
    if (fokus) requestAnimationFrame(() => document.getElementById(`gantt-moment-${nr}`)?.focus());
  };
  const sena = faser.filter((f) => f.status === "sen");
  const passerade = faser.filter((f) => f.grind.passerad).length;
  const godkanda = faser.filter((f) => f.verifiering.lage === "godkand").length;
  // Klara i tid men inte styrkta — det som kan se färdigt ut utan att vara det.
  const ostyrkta = faser.filter((f) => f.grind.passerad && f.verifiering.lage !== "godkand");

  return (
    <Ruta
      id="ov-gantt"
      i={i}
      ikon={GanttChart}
      titel="Fasplan, grindar och betalningar"
      under={
        p
          ? `${p.nr ? p.nr + " " : ""}${p.namn} · ${passerade} av 16 grindar passerade · ${godkanda} godkända${
              p.fardigstallande && dagarTill(p.fardigstallande) >= 0
                ? ` · slutbesiktning om ${dagarTill(p.fardigstallande)} d`
                : ""
            }${a?.startAntagande ? " · startdatum antaget" : ""}`
          : "Välj projekt"
      }
      klass="ov-gantt-ruta md:col-span-2 xl:col-span-3"
      atgard={
        <Lank onClick={() => visa("epc")} etikett="Öppna Bygga batteripark">
          Lägesbild och guide
        </Lank>
      }
    >
      <div className="ov-gantt-verktyg">
        <Projektflikar />
        {daterade.length ? (
          <Vyvaljare
            etikett="Nivå i Gantt-schemat"
            varde={niva}
            onValj={(v) => {
              setNiva(v);
              setUtfallda(null);
              setMeny(null);
            }}
            alternativ={[
              ["moment", "Moment"],
              ["fas", "Faser"],
            ]}
          />
        ) : null}
        {daterade.length ? (
          <button
            type="button"
            className="btn sec mini"
            aria-pressed={doljKlara}
            onClick={() => setDoljKlara((v) => !v)}
          >
            {doljKlara ? "Visa alla 16 moment" : "Dölj passerade moment"}
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
                          Fas {projektfasForMilstolpe(m.kod)} · {faseInfo(projektfasForMilstolpe(m.kod)).kort}
                          <br />
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

                {grupper.flatMap(({ fas, rader }) => {
                  const utfalld = oppna.has(fas.nr);
                  const sum = fasSammanfattning(rader);
                  const sv = sum.start ? x(sum.start) : 0;
                  const sb = sum.start ? Math.max(0.6, x(sum.slut) - sv) : 0;
                  return [
                  <button
                    key={`fas-${fas.nr}`}
                    type="button"
                    className={`ov-gantt-rad ov-gantt-fasrubrik${utfalld ? "" : ` ov-gantt-samlad ${sum.status}`}`}
                    aria-expanded={utfalld}
                    aria-label={`Fas ${fas.nr} ${fas.kort}: ${FASSTATUS[fasStatus(fas.nr, p.fas)].text}, ${sum.klara} av ${sum.antal} moment klara${
                      sum.start ? `, ${veckaText(sum.start)} till ${veckaText(sum.slut)}` : ""
                    }. ${utfalld ? "Fäll ihop" : "Fäll ut"} momenten.`}
                    onClick={() => {
                      vaxlaFas(fas.nr);
                      if (rader.some((f) => f.fas.nr === meny)) setMeny(null);
                    }}
                  >
                    <span className="ov-gantt-etikett">
                      <ChevronDown size={14} aria-hidden="true" className={`ov-gantt-chevron${utfalld ? " oppen" : ""}`} />
                      <span className="ov-gantt-fasnamn">
                        Fas {fas.nr} · {fas.kort}
                      </span>
                      <StatusBadge ton={FASSTATUS[fasStatus(fas.nr, p.fas)].ton} label={FASSTATUS[fasStatus(fas.nr, p.fas)].text} />
                      {utfalld ? null : (
                        <span className="ov-gantt-antal">
                          {sum.klara}/{sum.antal}
                        </span>
                      )}
                    </span>
                    <span className="ov-gantt-spar" aria-hidden="true">
                      {!utfalld && sum.start ? <span className="ov-gantt-stapel" style={{ left: sv + "%", width: sb + "%" }} /> : null}
                    </span>
                  </button>,
                  ...(utfalld ? rader : []).flatMap((f) => {
                  const rad = synliga.indexOf(f);
                  const harDatum = f.start && f.slut;
                  const vanster = harDatum ? x(f.start) : 0;
                  const bredd = harDatum ? Math.max(0.6, x(f.slut) - vanster) : 0;
                  const sida = (vanster > 62 ? " hoger" : "") + (rad < 3 ? " under" : "");
                  const [, statusText] = FAS_STATUS[f.status];
                  const v = f.verifiering;
                  const ostyrkt = f.grind.passerad && v.lage !== "godkand";
                  const lageText = v.lage ? FAS_LAGE[v.lage][1] : "";
                  const saknasText = v.saknas.length ? `Saknas: ${v.saknas.join(", ")}` : "";
                  const grindText = f.grind.passerad
                    ? `${f.fas.grind.kod} passerad${f.grind.datum ? " " + f.grind.datum : ""} (${GRIND_KALLA[f.grind.kalla]})`
                    : `${f.fas.grind.kod} ej passerad`;
                  return [
                    <button
                      key={f.fas.nr}
                      id={`gantt-moment-${f.fas.nr}`}
                      type="button"
                      className={`ov-gantt-rad ov-gantt-fas ${f.status}${ostyrkt ? " ostyrkt" : ""}${kritiska.has(f.fas.nr) ? " kritisk" : ""}`}
                      aria-expanded={meny === f.fas.nr}
                      aria-controls={meny === f.fas.nr ? `gantt-meny-${f.fas.nr}` : undefined}
                      onClick={() => setMeny((m) => (m === f.fas.nr ? null : f.fas.nr))}
                      aria-label={`Moment ${f.fas.nr} ${f.fas.titel}, fas ${f.fas.projektfas}: ${statusText}, ${
                        harDatum ? `${f.start} till ${f.slut}` : "ej planerad"
                      }, ${f.klara} av ${f.punkter} punkter klara, ${grindText}${lageText ? `, ${lageText}` : ""}${
                        saknasText ? `. ${saknasText}` : ""
                      }${kritiska.has(f.fas.nr) ? ", styr slutdatumet" : ""}. Visa veckor och status.`}
                    >
                      <span className="ov-gantt-etikett">
                        <span className="ov-gantt-nr">{f.fas.nr}</span>
                        <span className="ov-gantt-namn">{f.fas.kort}</span>
                        <span className="ov-gantt-antal">
                          {f.klara}/{f.punkter}
                        </span>
                      </span>
                      <span className="ov-gantt-spar">
                        {harDatum ? (
                          <>
                            <span className="ov-gantt-stapel" style={{ left: vanster + "%", width: bredd + "%" }}>
                              {f.status === "pagar" || f.status === "sen" ? (
                                <i style={{ width: Math.round((f.klara / Math.max(1, f.punkter - f.ejAktuella)) * 100) + "%" }} />
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
                                Moment {f.fas.nr} · {f.fas.titel}
                              </b>
                              Fas {f.fas.projektfas} · {faseInfo(f.fas.projektfas).kort}
                              <br />
                              {datumKort(f.start)} – {datumKort(f.slut)} {f.egenPlan ? "· egna datum" : "· standardplan"}
                              <br />
                              {statusText} · {f.klara} av {f.punkter} klara
                              {kritiska.has(f.fas.nr) ? " · styr slutdatumet" : ""}
                              {f.hp ? ` · HP ${f.hpKlara}/${f.hp}` : ""}
                              <br />
                              {grindText}
                              {f.fas.milstolpe ? ` · låser ${f.fas.milstolpe}` : ""}
                              {lageText ? (
                                <>
                                  <br />
                                  {lageText} · egenkontroller {v.kontroll.verifierade}/{v.kontroll.totalt}
                                  {saknasText ? (
                                    <>
                                      <br />
                                      {saknasText}
                                    </>
                                  ) : null}
                                </>
                              ) : null}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </button>,
                    meny === f.fas.nr ? <Momentmeny key={`meny-${f.fas.nr}`} id={`gantt-meny-${f.fas.nr}`} p={p} f={f} onStang={stangMeny} /> : null,
                  ];
                  }),
                ];
                })}
              </div>
            </div>
          </div>

          <div className="ov-gantt-fot">
            <ul className="ov-legend">
              <li>
                <i className="klar" aria-hidden="true" />
                Moment godkänt
              </li>
              <li>
                <i className="ostyrkt" aria-hidden="true" />
                Klar men ej styrkt
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
              {kritiska.size ? (
                <li>
                  <i className="kritisk" aria-hidden="true" />
                  Styr slutdatumet
                </li>
              ) : null}
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

          {ostyrkta.length ? (
            <div className="ov-varning warn m-0" role="note" aria-label="Moment som inte är styrkta">
              <FasLage lage="fardigt" />
              <span>
                {ostyrkta.length} moment räknas som {ostyrkta.length === 1 ? "klart" : "klara"} utan dokumenterat klartecken:{" "}
                {ostyrkta.map((f) => `${f.fas.nr} ${f.fas.kort}`).join(", ")}. Fakturerad milstolpe visar
                betalning, inte utförd kontroll.
              </span>
            </div>
          ) : null}

          <FasAvvikelse p={p} faslage={faser} />

          {sena.length ? (
            <p className="ov-varning m-0">
              <FasStatus status="sen" />
              <span>
                {sena.map((f) => `Moment ${f.fas.nr} ${f.fas.kort}`).join(", ")}{" "}
                har passerat sitt slutdatum utan passerad grind.
              </span>
            </p>
          ) : null}
        </>
      )}
    </Ruta>
  );
}
