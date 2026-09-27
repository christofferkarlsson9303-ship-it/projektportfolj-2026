import { TON_TEXT } from "../../lib/status.js";

/* Nyckeltal inuti ett kort — samma etikett, tal och förklaring som
   StatTile, men utan egen ram, så att korten inte staplas i varandra.
   En <dl>: etiketten är <dt>, talet och förklaringen <dd>. `ton` färgar
   talet som en liten accent; förklaringen bär betydelsen. */

const KOLUMNER = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" };

export function StatGroup({ items, className = "" }) {
  return (
    <dl className={`m-0 grid grid-cols-1 gap-4 ${KOLUMNER[items.length] || "sm:grid-cols-3"} ${className}`.trim()}>
      {items.map((t) => (
        <div key={t.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t.label}</dt>
          <dd
            className={`m-0 text-2xl font-bold leading-none tabular-nums ${
              TON_TEXT[t.ton] && t.ton !== "neutral" ? TON_TEXT[t.ton] : "text-ink"
            }`}
          >
            {t.value}
          </dd>
          {t.detail ? <dd className="m-0 text-xs leading-snug text-ink-soft">{t.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
