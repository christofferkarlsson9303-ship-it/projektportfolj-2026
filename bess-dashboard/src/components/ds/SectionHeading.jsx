/* Rubrik för en sektion utanför kort — samma typografi överallt: liten
   versal överrubrik i ONE Blågrön, rubrik i Roboto Slab, ingress i Open Sans. */

export function SectionHeading({ as: Tag = "h2", id, eyebrow, title, lead, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {eyebrow ? (
        <span className="text-[11px] font-bold uppercase tracking-wider text-info-ink">{eyebrow}</span>
      ) : null}
      <Tag id={id} className="m-0 font-head text-lg font-bold leading-snug text-ink">
        {title}
      </Tag>
      {lead ? <p className="m-0 max-w-prose text-sm leading-relaxed text-ink-soft">{lead}</p> : null}
      {children}
    </div>
  );
}
