import { useState } from "react";
import { KONTROLLRESULTAT, kontrollBrister } from "../../lib/projektkontroll.js";
import { idag } from "../../lib/datum.js";

export function KontrollResultat({ punkt, rad, revision, onSpara }) {
  const [utkast, setUtkast] = useState(rad || {});
  const [forraRad, setForraRad] = useState(rad);
  if (rad !== forraRad) { setForraRad(rad); setUtkast(rad || {}); }
  const brister = kontrollBrister(rad, revision);
  const textfalt = (falt, namn, langt = false) => <label className={`flex flex-col gap-1 text-xs font-semibold ${langt ? "sm:col-span-2" : ""}`}>
    {namn} – {punkt.id}
    <input type={falt === "datum" ? "date" : "text"} max={falt === "datum" ? idag() : undefined} maxLength={langt ? 1000 : 160} value={utkast[falt] || ""}
      onChange={(e) => setUtkast((v) => ({ ...v, [falt]: e.target.value }))}
      onBlur={(e) => { if ((rad?.[falt] || "") !== e.target.value) onSpara(falt, e.target.value); }} />
  </label>;
  return <div className="mt-3 rounded-sm bg-sunken p-3" aria-label={`Kontrollresultat ${punkt.id}`}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">Resultat – {punkt.id}<select value={rad?.resultat || ""} onChange={(e) => onSpara("resultat", e.target.value)}>{KONTROLLRESULTAT.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      {textfalt("datum", "Kontrolldatum")}{textfalt("kontrollant", "Kontrollant (namn)")}{textfalt("referens", "Bevis / protokoll och revision")}
      {textfalt("notering", "Mätvärde / avvikelse / åtgärd / motivering", true)}
    </div>
    <p className="mb-0 text-xs text-ink-soft">{brister.length ? brister.join(" · ") : "Kontrollen har resultat, datum, kontrollant och bevis. Namnet är inte en elektronisk underskrift."}</p>
    {rad && rad.mallrevision !== revision ? <button type="button" className="btn sec mini mt-2" onClick={() => onSpara("bekrafta", "")}>Bekräfta ny kontroll mot aktuell mall</button> : null}
  </div>;
}
