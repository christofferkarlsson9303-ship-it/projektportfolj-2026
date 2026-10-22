import { useState } from "react";
import { ANBUDSLJUS, MATRISNIVAER, matrisLjus } from "../../data/anbudsfragor.js";
import { TON_KLASS } from "../../lib/status.js";

/* Riskmatrisen: 3 × 3, sannolikhet åt höger och konsekvens uppåt. Frågorna är numrerade
   brickor. Dra en bricka till en ruta, eller klicka på brickan och sedan på rutan (så
   fungerar det även med tangentbord och på mobil). Rutan ger trafikljuset. Dras brickan
   tillbaka till "Inte placerade", eller väljs och klickas där, tas placeringen bort.
   `per` är bara frågorna som hör hemma i matrisen, med sitt nummer i listan (`nr`). */

const NIVA = Object.fromEntries(MATRISNIVAER.map((n) => [n.varde, n.namn]));
const TON = { gron: "ok", gul: "warn", rod: "bad" };

function Bricka({ nr, fraga, vald, nedtonad, onVal }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", fraga.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onVal(fraga.id)}
      aria-pressed={vald}
      aria-label={`${nr}. ${fraga.kort}`}
      title={`${nr}. ${fraga.kort}`}
      className={`inline-flex h-8 min-w-8 cursor-grab items-center justify-center rounded-full border border-solid px-2 text-[12px] font-bold tabular-nums shadow-sm transition-all duration-150 active:cursor-grabbing ${vald ? "border-ink bg-ink text-surface" : "border-hairline-stark bg-surface text-ink hover:-translate-y-0.5"} ${nedtonad ? "opacity-30" : ""}`}
    >
      {nr}
    </button>
  );
}

export function Riskmatris({ per, platser, filter, onPlacera }) {
  const [vald, setVald] = useState(null);
  const [over, setOver] = useState(null);
  const nr = Object.fromEntries(per.map((p) => [p.fraga.id, p.nr]));
  const brickor = (filt) =>
    per
      .filter(({ fraga }) => filt(platser[fraga.id]))
      .map(({ fraga, ljus }) => (
        <Bricka
          key={fraga.id}
          nr={nr[fraga.id]}
          fraga={fraga}
          vald={vald === fraga.id}
          nedtonad={Boolean(filter) && (ljus || "obedomd") !== filter}
          onVal={(id) => setVald((v) => (v === id ? null : id))}
        />
      ));
  const placera = (id, plats) => {
    if (!id) return;
    onPlacera(id, plats);
    setVald(null);
  };
  const malYta = (nyckel, plats) => ({
    onDragOver: (e) => {
      e.preventDefault();
      setOver(nyckel);
    },
    onDragLeave: () => setOver((o) => (o === nyckel ? null : o)),
    onDrop: (e) => {
      e.preventDefault();
      setOver(null);
      placera(e.dataTransfer.getData("text/plain"), plats);
    },
  });
  const ejPlacerade = brickor((p) => !p);

  return (
    <section aria-labelledby="af-matris-rubrik" className="flex flex-col gap-3 rounded-lg border border-solid border-hairline p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="af-matris-rubrik" className="m-0 font-display text-[15px] font-bold">
          Riskmatris
        </h3>
        <span className="text-[12px] text-ink-soft">
          {vald ? `Fråga ${nr[vald]} vald — klicka på en ruta.` : "Dra en fråga till en ruta, eller klicka på frågan och sedan på rutan."}
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div className="flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft [writing-mode:vertical-rl] rotate-180">Konsekvens</span>
        </div>
        <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1.5">
          {[3, 2, 1].map((k) => (
            <div key={k} className="contents">
              <span className="flex items-center pr-1 text-[11px] font-bold text-ink-soft">{NIVA[k]}</span>
              {[1, 2, 3].map((s) => {
                const ljus = matrisLjus(s, k);
                const nyckel = `${s}-${k}`;
                const plats = { sannolikhet: s, konsekvens: k };
                const har = brickor((p) => p?.sannolikhet === s && p?.konsekvens === k);
                return (
                  <div
                    key={s}
                    {...malYta(nyckel, plats)}
                    className={`relative flex min-h-[84px] flex-col gap-1.5 rounded-md p-1.5 transition-shadow duration-150 ${TON_KLASS[TON[ljus]]} ${over === nyckel ? "ring-2 ring-inset ring-current" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={!vald}
                      onClick={() => placera(vald, plats)}
                      aria-label={`Placera fråga ${vald ? nr[vald] : ""} här: sannolikhet ${NIVA[s].toLowerCase()}, konsekvens ${NIVA[k].toLowerCase()} (${ANBUDSLJUS[ljus][1]})`}
                      className="self-start rounded border-0 bg-transparent p-0 text-left text-[10.5px] font-bold uppercase tracking-wide text-current opacity-80 enabled:cursor-pointer enabled:underline disabled:cursor-default"
                    >
                      {ANBUDSLJUS[ljus][1]}
                    </button>
                    <div className="flex flex-wrap gap-1">{har}</div>
                  </div>
                );
              })}
            </div>
          ))}
          <span />
          {[1, 2, 3].map((s) => (
            <span key={s} className="text-center text-[11px] font-bold text-ink-soft">
              {NIVA[s]}
            </span>
          ))}
          <span />
          <span className="col-span-3 text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft">Sannolikhet</span>
        </div>
      </div>

      <div
        {...malYta("ut", null)}
        className={`flex flex-col gap-2 rounded-md border border-dashed p-2 ${over === "ut" ? "border-ink" : "border-hairline-stark"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-ink-soft">Inte placerade ({ejPlacerade.length})</span>
          {vald && platser[vald] ? (
            <button type="button" className="btn sec mini" onClick={() => placera(vald, null)}>
              Ta fråga {nr[vald]} ur matrisen
            </button>
          ) : null}
        </div>
        {ejPlacerade.length ? <div className="flex flex-wrap gap-1.5">{ejPlacerade}</div> : <span className="text-[12px] text-ink-soft">Alla frågor är placerade.</span>}
      </div>
    </section>
  );
}
