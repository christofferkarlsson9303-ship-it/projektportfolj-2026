import { ArrowRight } from "lucide-react";

import { Card } from "../ds/Card.jsx";

/* Översiktens rutor är designsystemets Card — samma ram, radie, luft och
   rubrik som resten av appen. Ruta är bara översiktens namn på den, med
   svenska props (titel, under, ikon, atgard, klass). */
export function Ruta({ ikon, ikonTon, titel, under, atgard, klass = "", ...rest }) {
  return <Card icon={ikon} iconTon={ikonTon} title={titel} subtitle={under} action={atgard} className={klass} {...rest} />;
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
