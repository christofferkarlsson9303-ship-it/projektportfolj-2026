/* Grundkortet — tydlig avgränsning med samma ram, radie, skugga och luft
   överallt: rounded-xl, tunn ram i hairline-ton, liten skugga, 16 px luft
   (24 px från md). Tokens i stället för fasta färger, så att kortet är vitt
   i ljust läge och mörkt i mörkt.

   Rubriken namnger regionen (aria-labelledby = id), så varje kort är ett
   landmärke. `badge` och `action` hamnar till höger i huvudet. `icon` ritas
   i en rundad kvadrat som blir orange vid hover, enligt ONE Nordics
   ikonregel. `i` styr i vilken ordning korten glider in. */

export function Card({
  as: Tag = "section",
  id,
  title,
  subtitle,
  badge,
  action,
  icon: Ikon,
  iconTon = "",
  i,
  className = "",
  children,
  ...rest
}) {
  const harHuvud = title || badge || action;
  return (
    <Tag
      className={`ds-card relative flex min-w-0 flex-col gap-4 rounded-xl border border-solid border-hairline bg-surface p-4 shadow-sm md:p-6 ${className}`.trim()}
      aria-labelledby={title && id ? id : undefined}
      style={i !== undefined ? { "--i": i } : undefined}
      {...rest}
    >
      {harHuvud ? (
        <header className="flex min-w-0 flex-wrap items-start gap-3">
          {Ikon ? (
            <span className={`ov-ikon ${iconTon}`.trim()} aria-hidden="true">
              <Ikon size={17} strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-[9rem] flex-1">
            {title ? (
              <h3 id={id} className="m-0 font-head text-base font-bold leading-snug text-ink">
                {title}
              </h3>
            ) : null}
            {subtitle ? <p className="m-0 mt-1 text-[13px] leading-snug text-ink-soft">{subtitle}</p> : null}
          </div>
          {badge || action ? (
            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
              {badge}
              {action}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </Tag>
  );
}
