import { Check, Circle, CircleDot, Lock } from "lucide-react";
import { Meter, Overline } from "../../components/ds/index.js";
import { FASER } from "../../data/projektfaser.ts";
import { STEG } from "../../data/projektstartSteg.js";
import { arAvbockad, stegPunkter, stegTillstand } from "../../lib/projektstart.js";

/* Navigeringen i guiden, grupperad efter de åtta faserna. Sidor i en fas som
   inte är upplåst är låsta och går inte att öppna. Den sista sidan, Granska och
   skapa, hör inte till någon fas och är alltid öppen. */

function StegIkon({ tillstand }) {
  const props = { size: 14, "aria-hidden": "true", className: "shrink-0" };
  const text = { klar: "klar", pagar: "pågår", ny: "ej påbörjad", last: "låst" }[tillstand];
  return (
    <span className="inline-flex" title={text}>
      {tillstand === "klar" ? <Check {...props} /> : tillstand === "pagar" ? <CircleDot {...props} /> : tillstand === "last" ? <Lock {...props} className="shrink-0 opacity-50" /> : <Circle {...props} className="shrink-0 opacity-40" />}
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function FasNav({ utkast, faser, aktivtId, onGaTill }) {
  const raknare = (s) => {
    const p = stegPunkter(s);
    if (p.length) return `${p.filter((x) => arAvbockad(utkast, x)).length}/${p.length}`;
    return utkast.besokta.includes(s.id) ? "klar" : "";
  };
  const grupper = [...FASER.map((f) => ({ fas: f, steg: STEG.filter((s) => s.fas === f.nr) })), { fas: null, steg: STEG.filter((s) => s.fas === null) }];
  return (
    <ol className="m-0 hidden list-none flex-col gap-0.5 p-0 lg:flex">
      {grupper.map(({ fas, steg }) => {
        const lage = fas ? faser.find((f) => f.nr === fas.nr) : null;
        const last = lage?.status === "last";
        return (
          <li key={fas?.nr ?? "klart"} className="flex flex-col">
            <div className="flex items-center gap-2 px-2 pb-1 pt-3 first:pt-0">
              <Overline as="span">{fas ? `Fas ${fas.nr} · ${fas.kort}` : "Klart"}</Overline>
              {lage ? <span className="ml-auto text-[11px] tabular-nums text-ink-soft">{last ? "låst" : `${lage.klara}/${lage.totalt}`}</span> : null}
            </div>
            {lage && !last ? <Meter value={lage.klara} max={lage.totalt} size="sm" label={`Fas ${fas.nr}: ${lage.klara} av ${lage.totalt} obligatoriska punkter klara`} className="mx-2 mb-1 [&>span]:transition-[width] [&>span]:duration-500" /> : null}
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
              {steg.map((s) => {
                const aktiv = s.id === aktivtId;
                const tillstand = stegTillstand(utkast, s);
                const laast = tillstand === "last";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={aktiv ? "step" : undefined}
                      disabled={laast}
                      title={laast ? `Låses upp när Fas ${fas.nr - 1} är godkänd` : undefined}
                      onClick={() => onGaTill(s.id)}
                      className={`flex w-full items-center gap-2 rounded-lg border-0 px-2 py-2 text-left text-[13px] transition-[background-color,transform] duration-150 ${aktiv ? "bg-one-djup text-white" : laast ? "cursor-not-allowed bg-transparent text-ink-faint" : "bg-transparent text-ink hover:translate-x-0.5 hover:bg-sunken"}`}
                    >
                      <StegIkon tillstand={tillstand} />
                      <span className="w-4 shrink-0 text-right tabular-nums opacity-70">{STEG.indexOf(s) + 1}</span>
                      <span className="min-w-0 flex-1">{s.titel}</span>
                      <span className="text-[11px] tabular-nums opacity-70">{laast ? "" : raknare(s)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
