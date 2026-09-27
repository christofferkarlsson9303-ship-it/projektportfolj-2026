import { useId } from "react";
import { TON_TEXT } from "../../lib/status.js";

/* Nyckeltalsrutan — ett tal, vad det är och en rad om vad det betyder.
   Samma ram, radie och luft som Card, så att rutorna står i samma rutnät
   som korten. Etiketten namnger rutan (article + aria-labelledby).

   `ton` färgar talet (warn, bad, ok, info) — en liten accent, aldrig ytan.
   Tonen förstärker; det som står i `hint` eller `badge` bär betydelsen. */

export function StatTile({ label, value, hint, ton = "", badge, className = "", children }) {
  const id = useId();
  return (
    <article
      aria-labelledby={id}
      className={`ds-card flex min-w-0 flex-col gap-2 rounded-xl border border-solid border-hairline bg-surface p-4 shadow-sm md:p-6 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p id={id} className="m-0 min-w-0 text-[11px] font-bold uppercase leading-snug tracking-wider text-ink-soft">
          {label}
        </p>
        {badge}
      </div>
      <p
        className={`m-0 min-h-[1em] font-body text-[28px] font-bold leading-none tracking-tight tabular-nums md:text-[30px] ${
          TON_TEXT[ton] && ton !== "neutral" ? TON_TEXT[ton] : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="m-0 text-xs leading-snug text-ink-soft">{hint}</p> : null}
      {children}
    </article>
  );
}
