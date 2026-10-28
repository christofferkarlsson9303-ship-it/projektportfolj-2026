import { useState } from "react";
import { kontrollNr } from "../../data/kontrollnummer.js";
import { KONTROLLRESULTAT, UE_GRANSKNING, foreslagenUtforare, kontrollBrister } from "../../lib/projektkontroll.js";
import { idag } from "../../lib/datum.js";

/* Två lägen (2026-10-28):
   - egen: ONE kontrollerar själv – resultat, datum, kontrollant, bevis.
   - ue:   UE gör egenkontrollen. ONE tar emot, granskar och skickar den till
           beställaren. Samma fält används men betyder mottaget datum, granskare
           och UE:s protokoll. */
export function KontrollResultat({ punkt, rad, revision, onSpara }) {
  const [utkast, setUtkast] = useState(rad || {});
  const [forraRad, setForraRad] = useState(rad);
  /* Ny rad (eget sparat fält eller synk): ta in den, men behåll fält som
     användaren skrivit i och ännu inte lämnat – annars töms de. */
  if (rad !== forraRad) {
    const osparat = Object.fromEntries(Object.entries(utkast).filter(([k, v]) => typeof v === "string" && v !== (forraRad?.[k] || "")));
    setForraRad(rad);
    setUtkast({ ...(rad || {}), ...osparat });
  }
  const lage = rad?.utforsAv || foreslagenUtforare(punkt);
  const ue = lage === "ue";
  const brister = rad ? kontrollBrister({ ...rad, utforsAv: lage }, revision) : kontrollBrister({ utforsAv: lage }, revision);
  const nr = kontrollNr(punkt.id);
  const textfalt = (falt, namn, { langt = false, datum = false, placeholder = "" } = {}) => <label className={`flex flex-col gap-1 text-xs font-semibold ${langt ? "sm:col-span-2" : ""}`}>
    {namn} – {nr}
    <input type={datum ? "date" : "text"} max={datum ? idag() : undefined} maxLength={langt ? 1000 : 160} value={utkast[falt] || ""} placeholder={placeholder}
      onChange={(e) => setUtkast((v) => ({ ...v, [falt]: e.target.value }))}
      onBlur={(e) => { if ((rad?.[falt] || "") !== e.target.value) onSpara(falt, e.target.value); }} />
  </label>;
  const resultatNamn = ue ? { "": "Ej granskad", ok: "OK – godkänd", "ej-ok": "Ej OK – åter till UE", "ej-tillamplig": "Ej tillämplig" } : null;

  return <div className="mt-3 rounded-sm bg-sunken p-3" aria-label={`Kontrollresultat ${nr}`}>
    <fieldset className="m-0 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-0 p-0 text-xs">
      <legend className="mb-1 p-0 font-semibold">Vem gör egenkontrollen – {nr}</legend>
      <label className="flex items-center gap-1"><input type="radio" name={`utfor-${punkt.id}`} checked={!ue} onChange={() => onSpara("utforsAv", "egen")} />Vi själva</label>
      <label className="flex items-center gap-1"><input type="radio" name={`utfor-${punkt.id}`} checked={ue} onChange={() => onSpara("utforsAv", "ue")} />UE – vi tar emot, granskar och skickar till beställaren</label>
    </fieldset>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">{ue ? "Granskning av UE:s egenkontroll" : "Resultat"} – {nr}<select value={rad?.resultat || ""} onChange={(e) => onSpara("resultat", e.target.value)}>{KONTROLLRESULTAT.map(([v, n]) => <option key={v} value={v}>{resultatNamn ? resultatNamn[v] : n}</option>)}</select></label>
      {ue ? <>
        {textfalt("ue", "UE (företag)", { placeholder: "T.ex. A-Bygg i Sölvesborg AB" })}
        {textfalt("referens", "UE:s egenkontroll (dokument)", { placeholder: "Filnamn / dokumentnummer" })}
        {textfalt("datum", "Mottagen datum", { datum: true })}
        {textfalt("kontrollant", "Granskad av (ONE)")}
        {textfalt("skickadBestallare", "Skickad till beställaren", { datum: true })}
      </> : <>
        {textfalt("datum", "Kontrolldatum", { datum: true })}{textfalt("kontrollant", "Kontrollant (namn)")}{textfalt("referens", "Bevis / protokoll och revision")}
      </>}
      {textfalt("notering", ue ? "Brister i UE:s protokoll / åtgärd / motivering" : "Mätvärde / avvikelse / åtgärd / motivering", { langt: true })}
    </div>
    {ue ? <fieldset className="m-0 mt-3 border-0 p-0 text-xs">
      <legend className="mb-1 p-0 font-semibold">Granska UE:s protokoll</legend>
      {UE_GRANSKNING.map(([k, n]) => <label key={k} className="flex items-center gap-2 py-0.5"><input type="checkbox" checked={!!rad?.[k]} onChange={(e) => onSpara(k, e.target.checked)} />{n}</label>)}
    </fieldset> : null}
    {brister.length
      ? <p className="mb-0 mt-2 text-xs text-ink-soft">{brister.join(" · ")}</p>
      : <p className="mb-0 mt-2 text-xs font-bold text-ok-ink">✓ Klar{ue ? " – mottagen, granskad och skickad till beställaren." : "."}</p>}
    {rad && rad.mallrevision !== revision ? <button type="button" className="btn sec mini mt-2" onClick={() => onSpara("bekrafta", "")}>Bekräfta ny kontroll mot aktuell mall</button> : null}
  </div>;
}
