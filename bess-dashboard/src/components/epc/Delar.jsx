import { FileCheck2, Lightbulb, OctagonAlert } from "lucide-react";
import { MARKERINGAR } from "../../data/bessChecklistData.ts";
import { FAS_STATUS, LEDTID_STATUS } from "../../lib/epc.js";
import { FAS_TILL_STATUS, LEDTID_TILL_STATUS } from "../../lib/status.js";
import { StatusBadge } from "../ds/StatusBadge.jsx";

/* Små delar som checklistkapitlet och översikten delar: markeringarna HP/K/L,
   och statusmärken för faser och ledtider. Märkena är designsystemets
   StatusBadge med domänens egna ord ("Grind passerad", "Starta nu"). */

const MARK_IKON = { HP: OctagonAlert, K: FileCheck2, L: Lightbulb };

/** HP, K eller L som etikett. Kort ("HP") där det är trångt, lång (ikon +
 *  "Hållpunkt") i guiden — förkortningarna är svåra att läsa av i fält. */
export function Markering({ typ, lang = false }) {
  const m = MARKERINGAR[typ];
  const Ikon = MARK_IKON[typ];
  return (
    <span className={`epc-markering ${typ.toLowerCase()}${lang ? " lang" : ""}`} title={`${m.namn} – ${m.beskrivning}`}>
      {lang ? (
        <>
          <Ikon size={12} strokeWidth={2.4} aria-hidden="true" />
          {m.namn}
        </>
      ) : (
        <>
          <span aria-hidden="true">{typ}</span>
          <span className="sr-only">{m.namn}</span>
        </>
      )}
    </span>
  );
}

export function Markeringar({ badges, lang = false }) {
  if (!badges.length) return null;
  return (
    <span className="epc-markeringar">
      {badges.map((b) => (
        <Markering key={b} typ={b} lang={lang} />
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
