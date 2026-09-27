/* Mätaren — andel av en helhet i designsystemets diagramton (viz-klar på
   viz-spar), samma som Gantt-schemat och ProgressSummary.

   Med `label` är den en progressbar för skärmläsare. Utan `label` är den
   dekor (aria-hidden) — då ska talet stå i klartext bredvid. `ton="pagar"`
   ger den ljusare tonen för det som är igång men inte klart. */

export function Meter({ value = 0, max = 100, label, ton = "klar", size = "md", className = "" }) {
  const andel = max ? Math.max(0, Math.min(100, (Number(value) / max) * 100)) : 0;
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuenow": Math.round(andel),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
      }
    : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      className={`block overflow-hidden rounded-full bg-viz-spar ${size === "sm" ? "h-1.5" : "h-2"} ${className}`.trim()}
    >
      <span
        className={`block h-full rounded-full ${ton === "pagar" ? "bg-viz-pagar" : "bg-viz-klar"}`}
        style={{ width: andel + "%" }}
      />
    </span>
  );
}
