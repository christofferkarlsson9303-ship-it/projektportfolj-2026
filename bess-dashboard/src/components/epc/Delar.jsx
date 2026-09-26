import { MARKERINGAR } from "../../data/bessChecklistData.ts";
import { FAS_STATUS, LEDTID_STATUS } from "../../lib/epc.js";

/* Små delar som checklistkapitlet och översikten delar: markeringarna HP/K/L,
   och statusetiketter för faser och ledtider. Status bärs alltid av både
   färg och text — aldrig av färgen ensam. */

/** HP, K eller L som liten etikett. Förklaringen ligger i title och i text för skärmläsare. */
export function Markering({ typ }) {
  const m = MARKERINGAR[typ];
  return (
    <span className={`epc-markering ${typ.toLowerCase()}`} title={`${m.namn} – ${m.beskrivning}`}>
      <span aria-hidden="true">{typ}</span>
      <span className="sr-only">{m.namn}</span>
    </span>
  );
}

export function Markeringar({ badges }) {
  if (!badges.length) return null;
  return (
    <span className="epc-markeringar">
      {badges.map((b) => (
        <Markering key={b} typ={b} />
      ))}
    </span>
  );
}

export function FasStatus({ status }) {
  const [ton, text] = FAS_STATUS[status] || ["", status];
  return <span className={`epc-status ${ton}`.trim()}>{text}</span>;
}

export function LedtidStatus({ status }) {
  const [ton, text] = LEDTID_STATUS[status] || ["", status];
  return <span className={`epc-status ${ton}`.trim()}>{text}</span>;
}
