import { ArrowRight } from "lucide-react";

/* Grundrutan i översiktens rutnät: ikon i rundad kvadrat, rubrik och en
   valfri åtgärd i huvudet. Rubriken namnger regionen, så varje ruta är ett
   eget landmärke för skärmläsare. `i` styr i vilken ordning rutorna glider in. */
export function Ruta({ id, ikon: Ikon, ikonTon = "", titel, under, atgard, klass = "", i = 0, children, ...rest }) {
  return (
    <section
      className={`ov-ruta ${klass}`.trim()}
      aria-labelledby={id}
      style={{ "--i": i }}
      {...rest}
    >
      <header className="ov-ruta-huvud">
        {Ikon ? (
          <span className={`ov-ikon ${ikonTon}`.trim()} aria-hidden="true">
            <Ikon size={17} strokeWidth={2} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 id={id} className="ov-ruta-titel">
            {titel}
          </h3>
          {under ? <p className="ov-ruta-under">{under}</p> : null}
        </div>
        {atgard}
      </header>
      {children}
    </section>
  );
}

/** Textlänk som byter vy — en knapp, eftersom den inte leder till en adress. */
export function Lank({ children, onClick, etikett }) {
  return (
    <button type="button" className="ov-lank" onClick={onClick} aria-label={etikett}>
      {children}
      <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
}
