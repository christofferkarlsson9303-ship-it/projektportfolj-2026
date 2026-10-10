import { Callout } from "../../components/ds/index.js";
import { FASER, FAS_ANTAL } from "../../data/projektfaser.ts";
import { Meter } from "../../components/ds/index.js";

/* Vad som återstår för att låsa upp nästa fas. Varje punkt är en knapp som går
   till sidan där den hör hemma. */

export function FasKrav({ krav, onGaTill, ejVunnet = false }) {
  const nasta = FASER[krav.nr] ?? null;
  const fas = FASER[krav.nr - 1];
  const oppna = krav.falt.length + krav.tabeller.length + krav.punkter.length;

  if (ejVunnet && !oppna) {
    return (
      <Callout ton="info">
        <b className="block">Förlorat anbud: flyttas till arkivet</b>
        Fas 2–8 gäller inte. När du {"skapar eller sparar"} flyttas anbudet till arkivet med den angivna orsaken och räknas inte med i planering, resurser eller kassaflöde.
      </Callout>
    );
  }
  if (!oppna) {
    return nasta ? null : (
      <Callout ton="ok">
        <b className="block">Alla {FAS_ANTAL} faser är godkända</b>
        Projektet har gått igenom hela flödet.
      </Callout>
    );
  }

  /* Obligatoriska fält och tabeller först, sedan kritiska kontrollpunkter grupperade per sida. */
  const sidor = new Map();
  for (const x of [...krav.falt, ...krav.tabeller]) (sidor.get(x.stegId) ?? sidor.set(x.stegId, { titel: x.stegTitel, falt: [], punkter: 0 }).get(x.stegId)).falt.push(x.etikett);
  for (const p of krav.punkter) (sidor.get(p.stegId) ?? sidor.set(p.stegId, { titel: p.stegTitel, falt: [], punkter: 0 }).get(p.stegId)).punkter++;

  return (
    <Callout ton="info">
      <b className="block">
        Fas {krav.nr} · {fas.kort}: {oppna} {oppna === 1 ? "obligatorisk punkt" : "obligatoriska punkter"} kvar
        {ejVunnet ? " för att flytta anbudet till arkivet" : nasta ? ` för att låsa upp Fas ${nasta.nr} (${nasta.kort})` : " för att godkänna sista fasen"}
      </b>
      <div className="mt-2 flex items-center gap-3 text-[12.5px]">
        <Meter value={krav.klara} max={krav.totalt} size="sm" label={`Obligatoriskt i fas ${krav.nr}: ${krav.klara} av ${krav.totalt}`} className="max-w-[240px] flex-1 [&>span]:transition-[width] [&>span]:duration-500" />
        <span className="tabular-nums">{krav.klara} av {krav.totalt}</span>
      </div>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
        {[...sidor].map(([stegId, s]) => (
          <li key={stegId} className="text-[13px]">
            <button type="button" className="btn sec mini" onClick={() => onGaTill(stegId)}>{s.titel}</button>
            <span className="ml-2">
              {[s.falt.length ? s.falt.join(", ") : "", s.punkter ? `${s.punkter} ${s.punkter === 1 ? "kritisk kontrollpunkt" : "kritiska kontrollpunkter"}` : ""].filter(Boolean).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </Callout>
  );
}
