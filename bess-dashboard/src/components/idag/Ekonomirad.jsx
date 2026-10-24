import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { StatGroup, StatusBadge } from "../ds/index.js";
import { fmtKompakt } from "../../lib/format.js";
import { ataSummering } from "../../lib/berakningar.js";
import { prognos, prognosLage } from "../../lib/prognos.js";

/* "Vad kostar det?" på Idag — samma prognos som Ekonomi (lib/prognos.js),
   bara de fyra talen och en väg vidare. Saknas budget säger raden det och
   leder dit; den visar aldrig ett påhittat resultat. */
export function Ekonomirad({ pid }) {
  const { state } = usePortfolj();
  const { visa } = useUi();
  const pr = useMemo(() => prognos(state, pid), [state, pid]);
  const ata = useMemo(() => ataSummering(state, pid), [state, pid]);
  const lage = prognosLage(pr);
  const faktProc = pr.intakt ? Math.round((pr.fakturerat / pr.intakt) * 100) : null;

  return (
    <section
      aria-label="Vad kostar det"
      className="flex flex-col gap-3 rounded-xl border border-solid border-hairline bg-surface px-5 py-4 shadow-sm print:hidden md:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Wallet size={16} aria-hidden="true" className="text-one-djup" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">Vad kostar det</span>
        <StatusBadge ton={lage.ton} label={lage.text} />
      </div>
      <StatGroup
        className="!grid-cols-2 lg:!grid-cols-4"
        items={[
          { label: "Ni får betalt", value: fmtKompakt(pr.intakt), detail: "kontrakt + godkända ÄTA" },
          {
            label: "Fakturerat",
            value: fmtKompakt(pr.fakturerat),
            detail: faktProc === null ? "kontraktsvärde saknas" : `${faktProc} % av intäkten`,
          },
          {
            label: "ÄTA att fakturera",
            value: fmtKompakt(ata.ejFakt),
            ton: ata.ejFakt ? "warn" : "",
            detail: ata.ejFakt ? "godkänt men inte fakturerat" : "inget väntar",
          },
          pr.budget
            ? {
                label: "Beräknad vinst",
                value: pr.tb === null ? "—" : fmtKompakt(pr.tb),
                ton: pr.tb !== null && pr.tb < 0 ? "bad" : "",
                detail: `kostnad ${fmtKompakt(pr.slutkostnad)} mot budget ${fmtKompakt(pr.budget)}`,
              }
            : { label: "Beräknad vinst", value: "—", ton: "warn", detail: "budget per aktivitet saknas" },
        ]}
      />
      <nav aria-label="Vyer för ekonomin" className="flex flex-wrap gap-2">
        {!pr.budget ? (
          <button type="button" className="btn mini" onClick={() => visa("budget")}>
            Sätt budget
          </button>
        ) : null}
        <button type="button" className="btn sec mini" onClick={() => visa("ekonomi")}>
          Prognos och fakturering
        </button>
        {ata.ejFakt ? (
          <button type="button" className="btn sec mini" onClick={() => visa("faktura")}>
            Fakturaunderlag
          </button>
        ) : null}
      </nav>
    </section>
  );
}
