import { STATUS, TON_TEXT } from "../../lib/status.js";
import { StatusBadge } from "./StatusBadge.jsx";

/* Åtgärdslista på radnivå: status och titel till vänster, datum och
   förskjutning linjerade till höger. Samma rad för ledtider, hållpunkter och
   allt annat som har ett "senast".

   items: [{ id, status, statusLabel?, title, meta?, tag?, dueDate?,
             delayText?, action? }]
   `tag` hamnar bredvid statusmärket (t.ex. projektetikett), `action` under
   datumet (t.ex. en Klar-knapp). */

export function LeadTimeList({ items, label, empty = null, className = "" }) {
  if (!items.length) return empty;
  return (
    <ul
      aria-label={label}
      className={`m-0 list-none p-0 ${className}`.trim()}
    >
      {items.map((it) => {
        const ton = STATUS[it.status]?.ton || "neutral";
        return (
          <li
            key={it.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 border-0 border-t border-solid border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={it.status} label={it.statusLabel} />
                {it.tag}
              </div>
              <span data-roll="titel" className="text-sm font-semibold leading-snug text-ink">
                {it.title}
              </span>
              {it.meta ? <span className="text-xs leading-snug text-ink-soft">{it.meta}</span> : null}
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              {it.dueDate ? (
                <span className="whitespace-nowrap text-sm font-bold text-ink tabular-nums">{it.dueDate}</span>
              ) : null}
              {it.delayText ? (
                <span className={`whitespace-nowrap text-xs font-semibold tabular-nums ${TON_TEXT[ton]}`}>
                  {it.delayText}
                </span>
              ) : null}
              {it.action}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
