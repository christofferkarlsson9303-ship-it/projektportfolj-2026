/* Överrubrik — liten versal rubrik för ett avsnitt inuti ett kort
   ("Underlag", "Fakturering", "ID06-stickprov"). Samma storlek, vikt och ton
   som etiketterna i StatTile och DataList, så att hierarkin är densamma
   överallt: korttitel → överrubrik → innehåll. */

export function Overline({ as: Tag = "h4", id, children, className = "" }) {
  return (
    <Tag
      id={id}
      className={`m-0 font-body text-[11px] font-bold uppercase leading-snug tracking-wider text-ink-soft ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
