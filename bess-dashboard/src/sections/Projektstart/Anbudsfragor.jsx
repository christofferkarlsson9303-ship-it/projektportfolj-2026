import { useState } from "react";
import { Callout } from "../../components/ds/index.js";
import { TON_KLASS } from "../../lib/status.js";
import {
  ANBUDSFRAGOR,
  ANBUDSLJUS,
  I_MATRIS,
  anbudsBedomning,
  anbudsfragaId,
  anbudsljusId,
  forslagLjus,
  matrisFalt,
  matrisPlats,
} from "../../data/anbudsfragor.js";
import { AnbudsDonut } from "./AnbudsDonut.jsx";
import { AnbudsInmatning } from "./AnbudsInmatning.jsx";
import { Riskmatris } from "./Riskmatris.jsx";

/* Steg 3 i Projektstart: anbudsfrågorna som trafikljus (ONE-P:s trafikljusmetod).

   Överst: anbudshjulet (AnbudsDonut), antal gröna, gula, röda och ej bedömda med domen ur
   anbudsBedomning(). En färg som klickas filtrerar matrisen och listan.
   Sedan riskmatrisen (Riskmatris) med bara de frågor som är osäkra händelser.
   Under: ett kort per fråga med rubriken på ren svenska, tre ljusknappar, frågans egen
   inmatning (AnbudsInmatning: matris, avtalsstatus, nyckelroller …) och svaret. Inmatningen
   föreslår ljuset och skriver det; ljuset kan ändras för hand och visas då som avvikelse.
   Sista frågan är beslutet: inget ljus, den sätter PL:s rekommendation.
   Svaret är obligatoriskt (fältet `af_<id>`). Färgen bär aldrig betydelsen ensam: knappen
   och märket har alltid ordet Grön, Gul eller Röd. */

/* Utskrivna klasser så att Tailwind hittar dem. */
const KANT = { gron: "bg-ok-ink", gul: "bg-warn-ink", rod: "bg-bad-ink", "": "bg-hairline-stark" };

function LjusVal({ fraga, varde, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Trafikljus: ${fraga.kort}`}>
      {Object.entries(ANBUDSLJUS).map(([id, [ton, namn, betyder]]) => (
        <button
          key={id}
          type="button"
          title={betyder}
          aria-pressed={varde === id}
          onClick={() => onChange(varde === id ? "" : id)}
          className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${varde === id ? `${TON_KLASS[ton]} border-current` : "border-hairline-stark bg-transparent text-ink-soft hover:bg-sunken"}`}
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
          {namn}
        </button>
      ))}
    </div>
  );
}

export function Anbudsfragor({ v, rader = {}, onFalt, onRader }) {
  const [filter, setFilter] = useState(null);
  const bedomning = anbudsBedomning(v);
  const nr = Object.fromEntries(ANBUDSFRAGOR.map((f, i) => [f.id, i + 1]));
  const ljusFor = Object.fromEntries(bedomning.per.map((p) => [p.fraga.id, p.ljus]));

  /** Skriver frågans fält och rader och sedan ljuset som valen pekar på, om de pekar någonstans. */
  const andra = (fraga, falt, nyaRader) => {
    const nyV = { ...v, ...(falt || {}) };
    const nyR = { ...rader, ...(nyaRader || {}) };
    Object.entries(falt || {}).forEach(([k, x]) => onFalt(k, x));
    Object.entries(nyaRader || {}).forEach(([k, r]) => onRader?.(k, r));
    const forslag = forslagLjus(fraga, nyV, nyR);
    if (forslag && forslag !== nyV[anbudsljusId(fraga)]) onFalt(anbudsljusId(fraga), forslag);
  };

  const matrisfragor = bedomning.per.filter(({ fraga }) => I_MATRIS.has(fraga.typ)).map((p) => ({ ...p, nr: nr[p.fraga.id] }));
  const platser = Object.fromEntries(matrisfragor.map(({ fraga }) => [fraga.id, matrisPlats(v, fraga)]));
  const placera = (id, plats) => {
    const fraga = ANBUDSFRAGOR.find((f) => f.id === id);
    if (fraga) andra(fraga, matrisFalt(fraga, plats));
  };
  const synliga = ANBUDSFRAGOR.filter((f) => !filter || (f.typ !== "beslut" && (ljusFor[f.id] || "obedomd") === filter));

  return (
    <div className="flex flex-col gap-4">
      <AnbudsDonut bedomning={bedomning} filter={filter} onFilter={setFilter} />
      <Riskmatris per={matrisfragor} platser={platser} filter={filter} onPlacera={placera} />
      <Callout ton="info">
        <b className="block">Så fyller du i</b>
        Grön: klart och prissatt. Gul: avvikelse som vi hanterar med reservation eller påslag. Röd: ledningen eller beställaren måste svara innan anbudet lämnas. Osäkra händelser placeras i matrisen; fakta och status har egna val. Valen föreslår ljuset, och du kan alltid ändra det. Skriv alltid en eller två meningar om vad bedömningen bygger på, och märk antaganden.
      </Callout>
      {filter ? (
        <p className="m-0 text-[13px] text-ink-soft" role="status">
          Visar {synliga.length} av {bedomning.per.length} frågor.{" "}
          <button type="button" className="btn sec mini" onClick={() => setFilter(null)}>
            Visa alla
          </button>
        </p>
      ) : null}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {synliga.map((fraga) => {
          const id = `ps-${anbudsfragaId(fraga)}`;
          const arBeslut = fraga.typ === "beslut";
          const ljus = arBeslut ? "" : ljusFor[fraga.id];
          const forslag = arBeslut ? "" : forslagLjus(fraga, v, rader);
          return (
            <li key={fraga.id} id={`af-kort-${fraga.id}`} className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-solid border-hairline py-3 pl-5 pr-4">
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${arBeslut ? "bg-ink" : KANT[ljus]}`} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="m-0 font-display text-[15px] font-bold leading-snug">
                  <span className="mr-2 tabular-nums text-ink-soft">{nr[fraga.id]}.</span>
                  {fraga.kort}
                </h3>
                {arBeslut ? null : <LjusVal fraga={fraga} varde={ljus} onChange={(val) => onFalt(anbudsljusId(fraga), val)} />}
              </div>
              <AnbudsInmatning fraga={fraga} v={v} rader={rader} andra={(falt, r) => andra(fraga, falt, r)} />
              {forslag && ljus && forslag !== ljus ? (
                <span className={`self-start rounded-full px-2 py-0.5 text-[11.5px] font-bold ${TON_KLASS.neutral}`}>
                  Avviker från {I_MATRIS.has(fraga.typ) ? "matrisen" : "valen"} ({ANBUDSLJUS[forslag][1]})
                </span>
              ) : null}
              <label htmlFor={id} className="text-[12px] text-ink-soft">
                {fraga.fraga}
                <span aria-hidden="true"> *</span>
              </label>
              <textarea id={id} rows={3} value={v[anbudsfragaId(fraga)] ?? ""} placeholder={fraga.hjalp} aria-required="true" onChange={(e) => onFalt(anbudsfragaId(fraga), e.target.value)} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
