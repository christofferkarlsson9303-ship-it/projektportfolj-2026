import { Meter, StatTile } from "../ds/index.js";
import { fmtTal, parkSumma, socHint } from "../../lib/site.js";

/* Parkens BESS-siffror, summerade ur objekten på siten. Fält som inte är
   angivna räknas som "ej angivet", aldrig som 0 — en tom park visar ett
   streck, inte "0 MWh". */

export function ParkSumma({ objekt, className = "" }) {
  const s = parkSumma(objekt);
  const streck = (n, enhet, d) => (n > 0 ? `${fmtTal(n, d)} ${enhet}` : "—");
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`.trim()} aria-label="Parkens BESS-data" role="group">
      <StatTile label="Energi" value={streck(s.mwh, "MWh", 1)} hint={s.mwh > 0 ? "Summa containrar" : "Ange MWh på containrarna"} />
      <StatTile
        label="Effekt"
        value={streck(s.mw, "MW", 1)}
        hint={s.inverterMw > 0 || s.trafoMva > 0 ? `Inverter ${fmtTal(s.inverterMw, 1)} MW · Trafo ${fmtTal(s.trafoMva, 1)} MVA` : "Summa containrar"}
      />
      <StatTile label="Laddstatus (SoC)" value={s.soc === null ? "—" : `${fmtTal(s.soc, 0)} %`} hint={socHint(s.socUnderlag)}>
        {s.soc === null ? null : <Meter value={s.soc} label="Medel-SoC" />}
      </StatTile>
      <StatTile label="Driftsatta" value={s.antal ? `${s.driftsatta} av ${s.antal}` : "—"} hint="Enheter med BESS-data" />
    </div>
  );
}
