import { Cell, Pie, PieChart } from "recharts";
import { Overline, StatusBadge } from "../../components/ds/index.js";
import { TON_KLASS } from "../../lib/status.js";

/* Anbudshjulet: sammanställningen av frågornas trafikljus som en donut (Recharts).
   Ett klick på en del, eller på en rad i förklaringen, filtrerar frågelistan och
   matrisen; samma igen tar bort filtret. Varje del står också i text, så att färgen
   aldrig bär betydelsen ensam. Färgerna är designsystemets ton-färger. */

const DELAR = [
  { id: "rod", namn: "Röda", en: "röd", ton: "bad", farg: "var(--bad-ink)" },
  { id: "gul", namn: "Gula", en: "gul", ton: "warn", farg: "var(--warn-ink)" },
  { id: "gron", namn: "Gröna", en: "grön", ton: "ok", farg: "var(--ok-ink)" },
  { id: "obedomd", namn: "Ej bedömda", en: "ej bedömd", ton: "neutral", farg: "var(--hairline-stark)" },
];

export function AnbudsDonut({ bedomning, filter, onFilter }) {
  const { per, antal, dom } = bedomning;
  const data = DELAR.filter((d) => antal[d.id] > 0).map((d) => ({ ...d, varde: antal[d.id] }));
  const vald = DELAR.find((d) => d.id === filter);
  const bedomda = per.length - antal.obedomd;
  const vaxla = (id) => onFilter(filter === id ? null : id);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-solid border-hairline p-4 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="relative h-[168px] w-[168px] shrink-0"
        role="img"
        aria-label={`Anbudshjulet: ${antal.gron} gröna, ${antal.gul} gula, ${antal.rod} röda, ${antal.obedomd} inte bedömda`}
      >
        <PieChart width={168} height={168} aria-hidden="true">
          <Pie
            data={data}
            dataKey="varde"
            nameKey="namn"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={data.length > 1 ? 3 : 0}
            stroke="none"
            animationDuration={400}
            onClick={(d) => vaxla(d?.payload?.id ?? d?.id)}
          >
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={d.farg}
                fillOpacity={filter && filter !== d.id ? 0.3 : 1}
                style={{ cursor: "pointer", transition: "fill-opacity .2s", outline: "none" }}
              />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-[26px] font-bold leading-none tabular-nums text-ink">
            {vald ? antal[vald.id] : `${bedomda}/${per.length}`}
          </span>
          <span className="mt-1 text-[11px] text-ink-soft">{vald ? vald.namn.toLowerCase() : "bedömda"}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Overline as="span">Anbudshjulet</Overline>
        <StatusBadge label={dom.text} ton={dom.ton} wrap />
        <div className="flex flex-wrap gap-2 text-[12px]" role="group" aria-label="Filtrera frågorna">
          {DELAR.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={filter === d.id}
              onClick={() => vaxla(d.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-2.5 py-1 font-bold transition-opacity duration-150 ${TON_KLASS[d.ton]} ${filter === d.id ? "border-current" : "border-transparent"} ${filter && filter !== d.id ? "opacity-50" : ""}`}
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              {antal[d.id]} {antal[d.id] === 1 ? d.en : d.namn.toLowerCase()}
            </button>
          ))}
          {filter ? (
            <button type="button" className="btn sec mini" onClick={() => onFilter(null)}>
              Visa alla
            </button>
          ) : null}
        </div>
        <span className="text-[12px] text-ink-soft">Klicka på en färg för att bara se de frågorna.</span>
      </div>
    </div>
  );
}
