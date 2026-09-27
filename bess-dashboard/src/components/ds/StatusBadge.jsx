import { STATUS, TON_KLASS } from "../../lib/status.js";

/* Statuskapseln — samma form, storlek och avstånd överallt i appen.

   `status` väljer ton och text ur lib/status.js (forsenad, starta_nu, pagar,
   kommande, klar …). `label` skriver över texten och `ton` tonen, för
   domänens egna ord ("Grind passerad", "Fakturerad"). `wrap` låter en lång
   text brytas i stället för att hållas på en rad. Punkten är dekor; texten
   bär betydelsen. */

export function StatusBadge({ status, label, ton, wrap = false, className = "" }) {
  const s = STATUS[status] || {};
  const t = ton || s.ton || "neutral";
  return (
    <span
      data-ton={t}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[11px] font-bold ${
        wrap ? "leading-tight" : "whitespace-nowrap leading-none"
      } ${TON_KLASS[t]} ${className}`.trim()}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="min-w-0">{label ?? s.text ?? status}</span>
    </span>
  );
}
