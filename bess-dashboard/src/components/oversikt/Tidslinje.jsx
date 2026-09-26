import { useMemo, useState } from "react";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { idag, kortDatum, MANADER } from "../../lib/datum.js";
import { klustra, kommandeFonster } from "../../lib/oversikt.js";
import { Lank, Ruta } from "./Ruta.jsx";

/* Kommande 90 dagar som en bana per projekt. Form bär typen (cirkel =
   leverans, romb = grind) och ONE Blå lyfter BESS-leveranserna — färgen är
   aldrig ensam om att säga något. Listan under är samma data i text, så inget
   hänger på att man hovrar över en punkt. */

const FONSTER = 90;
const I_LISTAN = 5;
const kortNamn = (p) => p.nr || p.ort || p.namn;
const nar = (d) => (d === 0 ? "idag" : `om ${d} ${d === 1 ? "dag" : "dagar"}`);
const typNamn = (r) => (r.typ === "ms" ? "grind" : "leverans");
const datumKort = (iso) => {
  const k = kortDatum(iso);
  return `${k.dag} ${k.man}`;
};

function manadsstreck() {
  const start = new Date(idag() + "T00:00:00");
  const ut = [];
  for (let m = 1; m <= 4; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const dagar = Math.round((d - start) / 86400000);
    if (dagar > 0 && dagar < FONSTER) ut.push({ dagar, namn: MANADER[d.getMonth()] });
  }
  return ut;
}

export function Tidslinje({ i }) {
  const { state } = usePortfolj();
  const { visa, setValtProjekt } = useUi();
  const [visaAlla, setVisaAlla] = useState(false);

  const k = useMemo(() => kommandeFonster(state, FONSTER), [state]);
  const manader = useMemo(() => manadsstreck(), []);
  const baner = state.projekt.filter((p) => k.daterade.some((r) => r.pid === p.id));
  const x = (d) => (d / FONSTER) * 100;

  const oppna = (pid) => {
    if (state.projekt.some((p) => p.id === pid)) setValtProjekt(pid);
    visa("tidplan");
  };

  const lista = visaAlla ? k.daterade : k.daterade.slice(0, I_LISTAN);

  return (
    <Ruta
      id="ov-kommande"
      i={i}
      ikon={CalendarRange}
      titel={`Kommande ${FONSTER} dagar`}
      under={`${k.daterade.length} leveranser och grindar i alla projekt`}
      klass="md:col-span-2"
      atgard={
        <Lank onClick={() => visa("tidplan")} etikett="Öppna tidplanen">
          Tidplan
        </Lank>
      }
    >
      {baner.length ? (
        <div className="ov-tl">
          <div className="ov-tl-axel" aria-hidden="true">
            <span className="start" style={{ left: 0 }}>
              Idag
            </span>
            {manader
              .filter((m) => x(m.dagar) >= 12)
              .map((m) => (
                <span key={m.namn} style={{ left: x(m.dagar) + "%" }}>
                  {m.namn}
                </span>
              ))}
          </div>

          {baner.map((p) => (
            <div className="ov-tl-bana" key={p.id}>
              <span className="ov-tl-namn">{kortNamn(p)}</span>
              <div className="ov-tl-spar">
                <span className="ov-tl-linje idag" style={{ left: 0 }} aria-hidden="true" />
                {manader.map((m) => (
                  <span key={m.namn} className="ov-tl-linje" style={{ left: x(m.dagar) + "%" }} aria-hidden="true" />
                ))}
                {klustra(k.daterade.filter((r) => r.pid === p.id)).map((g) => {
                  const pos = x(g.d);
                  const sida = pos < 18 ? " vanster" : pos > 82 ? " hoger" : "";
                  const forsta = g.poster[0];
                  // Formen följer gruppen: romb bara om allt i den är grindar.
                  const typ = g.poster.every((r) => r.typ === "ms") ? "ms" : "lev";
                  const bess = g.poster.some((r) => r.bess);
                  const text = g.poster.map((r) => `${r.titel}, ${r.datum}, ${nar(r.d)}, ${typNamn(r)}`);
                  return (
                    <button
                      key={forsta.id}
                      type="button"
                      className={`ov-tl-punkt ${typ}${bess ? " bess" : ""}${sida}`}
                      style={{ left: pos + "%" }}
                      onClick={() => oppna(p.id)}
                      aria-label={`${kortNamn(p)}: ${text.join("; ")}`}
                    >
                      <i aria-hidden="true" />
                      {g.poster.length > 1 ? (
                        <span className="ov-tl-antal" aria-hidden="true">
                          {g.poster.length}
                        </span>
                      ) : null}
                      <span className="ov-tl-tips" aria-hidden="true">
                        {g.poster.map((r) => (
                          <b key={r.id}>{r.titel}</b>
                        ))}
                        {g.poster.length === 1
                          ? `${datumKort(forsta.datum)} · ${nar(forsta.d)} · ${typNamn(forsta)}`
                          : `${datumKort(forsta.datum)} – ${datumKort(g.poster[g.poster.length - 1].datum)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <ul className="ov-legend mt-1">
            <li>
              <i className="lev" aria-hidden="true" />
              Leverans
            </li>
            <li>
              <i className="ms" aria-hidden="true" />
              Grind
            </li>
            <li>
              <i className="bess" aria-hidden="true" />
              BESS-leverans
            </li>
          </ul>
        </div>
      ) : (
        <p className="lead m-0">Inga daterade leveranser eller grindar de kommande {FONSTER} dagarna.</p>
      )}

      {lista.length ? (
        <ol className="ov-tl-lista" aria-label="Närmast i tid">
          {lista.map((r) => {
            const kd = kortDatum(r.datum);
            return (
              <li key={r.id}>
                <time className="ov-tl-datum" dateTime={r.datum}>
                  <b>{kd.dag}</b>
                  <span>{kd.man}</span>
                </time>
                <div className="ov-tl-titel">
                  <span>{r.titel}</span>
                  <small>
                    <PTag pid={r.pid} />
                    {r.typ === "ms" ? "Grind" : "Leverans"}
                  </small>
                </div>
                <span className={`ov-tl-kvar${r.d <= 7 ? " snart" : ""}`}>
                  {r.d === 0 ? "Idag" : `om ${r.d} d`}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {k.daterade.length > I_LISTAN ? (
        <div>
          <button type="button" className="btn sec mini" onClick={() => setVisaAlla((v) => !v)} aria-expanded={visaAlla}>
            {visaAlla ? "Visa färre" : `Visa alla ${k.daterade.length}`}
          </button>
        </div>
      ) : null}

      {k.utanDatum.length ? (
        <p className="ov-varning m-0">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>
            <b>
              {k.utanDatum.length} leverans{k.utanDatum.length > 1 ? "er" : ""} saknar bekräftat datum
            </b>{" "}
            — {[...new Set(k.utanDatum.map((r) => r.titel))].join(", ")}
          </span>
        </p>
      ) : null}
    </Ruta>
  );
}
