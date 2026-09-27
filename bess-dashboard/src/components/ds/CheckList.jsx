import { useId } from "react";

/* Avbockningslista — underlag, ronder och kontrollpunkter. En rad per punkt
   med kryssruta i ONE Blå och tunn skiljelinje. En avbockad punkt står kvar
   men dämpad (<s>, utan överstrykning), så att listan fortfarande går att
   läsa som underlag.

   items: [{ id, label, checked, hint? }] · onChange(id, checked) */

export function CheckList({ items, onChange, label, className = "" }) {
  const bas = useId();
  return (
    <ul aria-label={label} className={`m-0 list-none p-0 ${className}`.trim()}>
      {items.map((it) => {
        const id = `${bas}-${it.id}`;
        return (
          <li
            key={it.id}
            className="flex items-start gap-3 border-0 border-t border-solid border-hairline py-2 first:border-t-0"
          >
            <input
              type="checkbox"
              id={id}
              checked={!!it.checked}
              className="m-0 mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-one-bla"
              onChange={(e) => onChange(it.id, e.target.checked)}
            />
            <label htmlFor={id} className="flex-1 cursor-pointer text-[13px] leading-snug text-ink">
              {it.checked ? <s className="text-ink-faint no-underline">{it.label}</s> : it.label}
              {it.hint ? <span className="mt-0.5 block text-xs text-ink-soft">{it.hint}</span> : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
