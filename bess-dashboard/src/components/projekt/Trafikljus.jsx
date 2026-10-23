import { LJUSDELAR, LJUSTEXT } from "../../lib/metodkoll.js";

/* Trafikljusmetoden (projektmetoden § 3.4): grön enligt plan, gul avvikelse
   som hanteras i projektet, röd allvarlig avvikelse som kräver hjälp eller
   beslut. `ljus` kommer från trafikljus() i lib/metodkoll.js. `delar` väljer
   vilka som visas — beställarrapporten visar inte budgeten. Färgen bärs
   alltid också av text, aldrig bara av pricken. */
export function Trafikljus({ ljus, delar = LJUSDELAR.map(([id]) => id), rubrik = "Trafikljus", className = "" }) {
  return (
    <div className={`trafikljus ${className}`.trim()} role="group" aria-label={rubrik}>
      {LJUSDELAR.filter(([id]) => delar.includes(id)).map(([id, namn]) => {
        const l = ljus[id];
        return (
          <div key={id} className="trafikljus-del" data-ton={l.ton} title={l.grund || l.text}>
            <i aria-hidden="true" />
            <span className="trafikljus-namn">{namn}</span>
            <span className="trafikljus-text">
              <span className="sr-only">{LJUSTEXT[l.ton]}: </span>
              {l.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
