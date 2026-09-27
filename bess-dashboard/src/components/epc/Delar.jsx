import { MARKERINGAR } from "../../data/bessChecklistData.ts";
import { FAS_STATUS, LEDTID_STATUS } from "../../lib/epc.js";
import { FAS_TILL_STATUS, LEDTID_TILL_STATUS } from "../../lib/status.js";
import { StatusBadge } from "../ds/StatusBadge.jsx";

/* Små delar som checklistkapitlet och översikten delar: markeringarna HP/K/L,
   och statusmärken för faser och ledtider. Märkena är designsystemets
   StatusBadge med domänens egna ord ("Grind passerad", "Starta nu"). */

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
  const [, text] = FAS_STATUS[status] || ["", status];
  return <StatusBadge status={FAS_TILL_STATUS[status]} label={text} />;
}

export function LedtidStatus({ status }) {
  const [, text] = LEDTID_STATUS[status] || ["", status];
  return <StatusBadge status={LEDTID_TILL_STATUS[status]} label={text} />;
}
