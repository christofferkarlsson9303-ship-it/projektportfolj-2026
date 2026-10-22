import { useState } from "react";
import { Callout } from "../../components/ds/index.js";
import { TON_KLASS } from "../../lib/status.js";
import {
  ANBUDSFRAGOR,
  ANBUDSLJUS,
  MATRISNIVAER,
  anbudsBedomning,
  anbudsKonsId,
  anbudsSannId,
  anbudsfragaId,
  anbudsljusId,
  matrisFalt,
  matrisPlats,
} from "../../data/anbudsfragor.js";
import { AnbudsDonut } from "./AnbudsDonut.jsx";
import { Riskmatris } from "./Riskmatris.jsx";

/* Steg 3 i Projektstart: anbudsfrågorna som trafikljus (ONE-P:s trafikljusmetod).

   Överst: anbudshjulet (AnbudsDonut), antal gröna, gula, röda och ej bedömda med domen ur
   anbudsBedomning(). En färg som klickas filtrerar matrisen och listan.
   Sedan riskmatrisen (Riskmatris): placeringen i sannolikhet × konsekvens skriver ljuset.
   Under: ett kort per fråga med rubriken på ren svenska, tre ljusknappar, matrisens två
   val och svaret. Allt läser samma utkast, så varje ändring syns direkt överallt.
   Svaret är obligatoriskt (fältet `af_<id>`); ljuset (`af_ljus_<id>`) är frivilligt men
   behövs för att domen ska bli något annat än "inte bedömda". Färgen bär aldrig betydelsen
   ensam: knappen och märket har alltid ordet Grön, Gul eller Röd. */

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

/** Sannolikhet och konsekvens i kortet: samma placering som i matrisen. När båda är valda
 *  skrivs ljuset; tas en bort tas frågan ur matrisen men ljuset står kvar. */
function MatrisVal({ fraga, v, onFalt }) {
  const plats = matrisPlats(v, fraga);
  const ljus = v[anbudsljusId(fraga)] || "";
  const andra = (falt, varde) => {
    const ny = { sannolikhet: Number(v[anbudsSannId(fraga)]) || null, konsekvens: Number(v[anbudsKonsId(fraga)]) || null, [falt]: varde };
    if (ny.sannolikhet && ny.konsekvens) skriv(onFalt, matrisFalt(fraga, ny));
    else onFalt(falt === "sannolikhet" ? anbudsSannId(fraga) : anbudsKonsId(fraga), varde || "");
  };
  const lista = (falt, etikett, faltId) => (
    <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
      {etikett}
      <select
        className="min-h-[30px] rounded-md border border-solid border-hairline-stark bg-surface px-1.5 text-[12px] text-ink"
        value={v[faltId] || ""}
        onChange={(e) => andra(falt, Number(e.target.value) || null)}
      >
        <option value="">–</option>
        {MATRISNIVAER.map((n) => (
          <option key={n.varde} value={n.varde}>
            {n.namn}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      {lista("sannolikhet", "Sannolikhet", anbudsSannId(fraga))}
      {lista("konsekvens", "Konsekvens", anbudsKonsId(fraga))}
      {plats && ljus && plats.ljus !== ljus ? (
        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${TON_KLASS.neutral}`}>Avviker från matrisen ({ANBUDSLJUS[plats.ljus][1]})</span>
      ) : null}
    </div>
  );
}

const skriv = (onFalt, falt) => Object.entries(falt).forEach(([k, x]) => onFalt(k, x));

export function Anbudsfragor({ v, onFalt }) {
  const [filter, setFilter] = useState(null);
  const bedomning = anbudsBedomning(v);
  const platser = Object.fromEntries(ANBUDSFRAGOR.map((f) => [f.id, matrisPlats(v, f)]));
  const placera = (id, plats) => {
    const fraga = ANBUDSFRAGOR.find((f) => f.id === id);
    if (fraga) skriv(onFalt, matrisFalt(fraga, plats));
  };
  const synliga = bedomning.per.map((p, i) => ({ ...p, nr: i + 1 })).filter(({ ljus }) => !filter || (ljus || "obedomd") === filter);

  return (
    <div className="flex flex-col gap-4">
      <AnbudsDonut bedomning={bedomning} filter={filter} onFilter={setFilter} />
      <Riskmatris per={bedomning.per} platser={platser} filter={filter} onPlacera={placera} />
      <Callout ton="info">
        <b className="block">Så fyller du i</b>
        Grön: klart och prissatt. Gul: avvikelse som vi hanterar med reservation eller påslag. Röd: ledningen eller beställaren måste svara innan anbudet lämnas. Placera frågan i matrisen för att få ljuset, eller välj det direkt. Skriv alltid en eller två meningar om vad bedömningen bygger på, och märk antaganden.
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
        {synliga.map(({ fraga, ljus, nr }) => {
          const id = `ps-${anbudsfragaId(fraga)}`;
          return (
            <li key={fraga.id} id={`af-kort-${fraga.id}`} className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-solid border-hairline py-3 pl-5 pr-4">
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${KANT[ljus]}`} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="m-0 font-display text-[15px] font-bold leading-snug">
                  <span className="mr-2 tabular-nums text-ink-soft">{nr}.</span>
                  {fraga.kort}
                </h3>
                <LjusVal fraga={fraga} varde={ljus} onChange={(val) => onFalt(anbudsljusId(fraga), val)} />
              </div>
              <MatrisVal fraga={fraga} v={v} onFalt={onFalt} />
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
