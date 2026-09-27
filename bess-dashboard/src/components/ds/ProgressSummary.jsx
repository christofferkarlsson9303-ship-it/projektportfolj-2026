import { Meter } from "./Meter.jsx";

/* Framdrift i en blick: kontrollpunkter, hållpunkter och grindar som tal
   och mätare. Talet står alltid i klartext — mätaren är dekor för
   skärmläsare. Mätaren är andel av en helhet i designsystemets ton
   (viz-klar på viz-spar), samma som Gantt-schemat.

   "Milestones" i propsnamnen är hållpunkterna (HP) — det projektledaren
   godkänner — och inte betalmilstolparna M1–M7. */

function Matare({ etikett, varde, av }) {
  const andel = av ? Math.round((varde / av) * 100) : 0;
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{etikett}</span>
      <span className="flex items-baseline gap-2">
        <b className="text-2xl font-bold leading-none text-ink tabular-nums">
          {varde}
          <span className="text-base font-semibold text-ink-faint">/{av}</span>
        </b>
        <span className="text-xs font-semibold text-ink-soft tabular-nums">{andel} %</span>
      </span>
      <Meter value={varde} max={av} />
    </li>
  );
}

export function ProgressSummary({
  completedMilestones,
  totalMilestones,
  passedGates,
  totalGates = 16,
  completedPoints,
  totalPoints,
  label = "Framdrift",
  className = "",
}) {
  const rader = [
    totalPoints !== undefined ? { etikett: "Kontrollpunkter klara", varde: completedPoints, av: totalPoints } : null,
    { etikett: "Hållpunkter klara", varde: completedMilestones, av: totalMilestones },
    { etikett: "Grindar passerade", varde: passedGates, av: totalGates },
  ].filter(Boolean);
  return (
    <ul
      aria-label={label}
      className={`m-0 grid list-none grid-cols-1 gap-4 p-0 ${rader.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${className}`.trim()}
    >
      {rader.map((r) => (
        <Matare key={r.etikett} {...r} />
      ))}
    </ul>
  );
}
