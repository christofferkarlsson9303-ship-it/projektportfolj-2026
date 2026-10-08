import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card } from "../../components/ds/index.js";
import { riskFordelning } from "../../lib/projektstart.js";

/* Fördelningen av riskerna i guiden: låg, medel, hög. Räknar bara rader med
   risktext, alltså de som blir risker i projektet. Färgerna är designsystemets
   ton-färger och varje nivå står också i text, så att diagrammet inte bara
   bärs av färg. Håll eller fokusera en nivå i förklaringen så markeras den. */

const NIVAER = [
  { id: "lag", namn: "Låg", spann: "1–6", farg: "var(--ok-ink)" },
  { id: "medel", namn: "Medel", spann: "7–14", farg: "var(--warn-ink)" },
  { id: "hog", namn: "Hög", spann: "15–25", farg: "var(--bad-ink)" },
];

export function RiskDonut({ rader }) {
  const f = riskFordelning(rader);
  const [aktiv, setAktiv] = useState(null);
  const data = NIVAER.filter((n) => f[n.id] > 0).map((n) => ({ ...n, varde: f[n.id] }));
  const vald = NIVAER.find((n) => n.id === aktiv);
  const beskrivning = `Riskfördelning: ${NIVAER.map((n) => `${f[n.id]} ${n.namn.toLowerCase()}`).join(", ")}`;

  return (
    <Card id="ps-riskfordelning" title="Fördelning av risker" subtitle="Räknar rader med risktext. Uppdateras när du ändrar sannolikhet eller konsekvens.">
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-[168px] w-[168px] shrink-0" role="img" aria-label={beskrivning}>
          <PieChart width={168} height={168} aria-hidden="true">
            {f.totalt ? (
              <Pie
                data={data}
                dataKey="varde"
                nameKey="namn"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={data.length > 1 ? 3 : 0}
                stroke="none"
                animationDuration={500}
                onMouseEnter={(_, i) => setAktiv(data[i]?.id ?? null)}
                onMouseLeave={() => setAktiv(null)}
              >
                {data.map((d) => (
                  <Cell key={d.id} fill={d.farg} fillOpacity={aktiv && aktiv !== d.id ? 0.35 : 1} style={{ transition: "fill-opacity .2s" }} />
                ))}
              </Pie>
            ) : (
              <Pie data={[{ v: 1 }]} dataKey="v" innerRadius={52} outerRadius={78} stroke="none" isAnimationActive={false}>
                <Cell fill="var(--sunken)" />
              </Pie>
            )}
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-head text-[26px] leading-none tabular-nums text-ink">{vald ? f[vald.id] : f.totalt}</span>
            <span className="mt-1 text-[11px] text-ink-soft">{vald ? `${vald.namn.toLowerCase()} risk` : f.totalt === 1 ? "risk" : "risker"}</span>
          </div>
        </div>

        <ul className="m-0 flex min-w-[180px] flex-1 list-none flex-col gap-2 p-0" aria-label="Förklaring">
          {NIVAER.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-lg border-0 px-3 py-2 text-left text-[13px] text-ink transition-all duration-150 hover:translate-x-0.5 hover:bg-sunken focus-visible:bg-sunken ${aktiv === n.id ? "bg-sunken" : "bg-transparent"}`}
                onMouseEnter={() => setAktiv(n.id)}
                onMouseLeave={() => setAktiv(null)}
                onFocus={() => setAktiv(n.id)}
                onBlur={() => setAktiv(null)}
              >
                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: n.farg }} />
                <span className="flex-1">{n.namn} <span className="text-ink-soft">({n.spann})</span></span>
                <span className="font-bold tabular-nums">{f[n.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
