import { TON_KLASS } from "../../lib/status.js";

/* Riskvärde (sannolikhet × konsekvens) som litet märke. Nivån följer
   riskregistrets gränser — 15 och uppåt hög, 8–14 medel, under 8 låg — och
   står alltid i text för skärmläsare och som verktygstips, inte bara i
   färgen. Tonade ytor i stället för vit text på turkos och orange, som inte
   klarade kontrastkraven. `label` visar en annan text än talet, t.ex. ett
   spann ("15–25") där `value` är spannets nedre gräns. */

const NIVA = [
  { min: 15, ton: "bad", text: "hög" },
  { min: 8, ton: "warn", text: "medel" },
  { min: 0, ton: "ok", text: "låg" },
];

export function RiskScore({ value, label, className = "" }) {
  const n = NIVA.find((x) => (Number(value) || 0) >= x.min);
  return (
    <span
      title={`Riskvärde ${label ?? value} — ${n.text}`}
      className={`inline-flex h-6 min-w-[30px] items-center justify-center rounded-md px-1.5 text-[13px] font-bold tabular-nums ${TON_KLASS[n.ton]} ${className}`.trim()}
    >
      {label ?? value}
      <span className="sr-only"> riskvärde, {n.text}</span>
    </span>
  );
}
