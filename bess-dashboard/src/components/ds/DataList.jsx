/* Nyckel–värde-rader: etikett till vänster, värde och detalj till höger.
   För det som annars hamnar i löpande text — nästa grind, nästa betalning,
   datum och belopp.

   items: [{ label, value, detail?, badge? }] */

export function DataList({ items, className = "" }) {
  return (
    <dl className={`m-0 ${className}`.trim()}>
      {items.map((it) => (
        <div
          key={it.label}
          className="grid grid-cols-1 gap-1 border-0 border-t border-solid border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-x-4"
        >
          <dt className="pt-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{it.label}</dt>
          <dd className="m-0 flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold leading-snug text-ink">
              {it.value}
              {it.badge}
            </span>
            {it.detail ? <span className="text-xs leading-snug text-ink-soft">{it.detail}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
