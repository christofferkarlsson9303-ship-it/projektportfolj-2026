import { MARKERINGAR } from "../../data/bessChecklistData.ts";
import { FAS_LAGE, FAS_STATUS, LEDTID_STATUS } from "../../lib/epc.js";
import { FAS_TILL_STATUS, LEDTID_TILL_STATUS } from "../../lib/status.js";
import { StatusBadge } from "../ds/StatusBadge.jsx";

/* Små delar som checklistkapitlet och översikten delar: markeringarna HP/K/L,
   och statusmärken för faser och ledtider. Märkena är designsystemets
   StatusBadge med domänens egna ord ("Grind passerad", "Starta nu"). */

/** HP, K eller L som liten etikett med ordet utskrivet (UX-04): "Hållpunkt",
 *  "Kontraktskrav", "Lärdom". Beskrivningen ligger i title. */
export function Markering({ typ }) {
  const m = MARKERINGAR[typ];
  return (
    <span className={`epc-markering ${typ.toLowerCase()}`} title={`${m.namn} – ${m.beskrivning}`}>
      {m.namn}
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

/** Verifieringsläget för en fas (arbete färdigt / kontroll verifierad / fas
 *  godkänd). Ingenting renderas för en fas som inte kommit så långt. */
export function FasLage({ lage }) {
  if (!FAS_LAGE[lage]) return null;
  const [ton, text] = FAS_LAGE[lage];
  return <StatusBadge ton={ton} label={text} />;
}

export function LedtidStatus({ status }) {
  const [, text] = LEDTID_STATUS[status] || ["", status];
  return <StatusBadge status={LEDTID_TILL_STATUS[status]} label={text} />;
}
