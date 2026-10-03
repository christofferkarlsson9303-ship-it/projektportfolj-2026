import { useMemo } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, DataList, Meter, StatTile, StatusBadge } from "../ds/index.js";
import { fmtSEK } from "../../lib/format.js";
import { veckaEtikett, veckaNu } from "../../lib/datum.js";
import { prognos, prognosLage, prognosrad, prognostrend } from "../../lib/prognos.js";

/* Hur projektet går ekonomiskt: vad ni får betalt, vad allt beräknas kosta,
   vinsten och om faktureringen ligger efter utfört arbete. Vanliga ord i
   gränssnittet; uträkningen finns bakom "Så räknas det". Veckans
   prognos kan sparas så att trenden syns vecka för vecka ("Prognos varje
   vecka", projektmetoden § 13). */

const kr = (n) => (n === null || n === undefined ? "—" : `${n < 0 ? "−" : ""}${fmtSEK(Math.abs(Math.round(n)))}`);
const pct = (n) => (n === null || n === undefined ? "—" : `${String(Math.round(n * 10) / 10).replace(".", ",")} %`);
const andring = (n) => (n === null || n === undefined || n === 0 ? "" : `${n > 0 ? "+" : "−"}${fmtSEK(Math.abs(n))}`);

export function Prognoskort({ pid }) {
  const { state, dispatch } = usePortfolj();
  const { visa, visaToast } = useUi();
  const pr = useMemo(() => prognos(state, pid), [state, pid]);
  const trend = useMemo(() => prognostrend(state, pid).slice(-8), [state, pid]);
  const lage = prognosLage(pr);
  const vecka = veckaNu();
  const sparadDennaVecka = trend.some((r) => r.vecka === vecka);

  const sparaVecka = () => {
    dispatch({ type: "SPARA_PROGNOS", rad: prognosrad(state, pid, vecka) });
    visaToast(`Läget för ${veckaEtikett(vecka)} är sparat`);
  };

  return (
    <Card
      id="ek-prognos"
      title="Hur projektet går ekonomiskt"
      subtitle="Beräknat ur budget, rapporterad tid och kostnad, ÄTA och betalplanen. Spara en gång i veckan så syns utvecklingen."
      badge={<StatusBadge ton={lage.ton} label={lage.text} />}
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn sec mini" onClick={() => visa("budget")}>
            Ändra kostnad kvar
          </button>
          <button type="button" className="btn mini" onClick={sparaVecka}>
            {sparadDennaVecka ? "Uppdatera veckans läge" : "Spara veckans läge"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Ni får betalt"
            value={kr(pr.intakt)}
            hint={pr.ataVantande ? `kontrakt + godkända ÄTA. ${kr(pr.intaktMedVantande)} om väntande ÄTA godkänns` : "kontrakt + godkända ÄTA"}
          />
          <StatTile
            label="Beräknad kostnad totalt"
            value={pr.budget ? kr(pr.slutkostnad) : "—"}
            ton={pr.kostnadsavvikelse !== null && pr.kostnadsavvikelse < 0 ? "bad" : ""}
            hint={
              pr.kostnadsavvikelse === null
                ? pr.utfall
                  ? `budget saknas. Kostnad hittills ${kr(pr.utfall)}`
                  : "budget saknas"
                : pr.kostnadsavvikelse < 0
                  ? `${kr(-pr.kostnadsavvikelse)} över budget`
                  : `${kr(pr.kostnadsavvikelse)} under budget`
            }
          />
          <StatTile
            label="Beräknad vinst"
            value={kr(pr.tb)}
            ton={pr.tb !== null && pr.tb < 0 ? "bad" : pr.tg !== null && pr.tg < 5 ? "warn" : ""}
            hint={
              pr.tg === null
                ? pr.kontrakt === null
                  ? "kräver kontraktssumma"
                  : "kräver budget per aktivitet"
                : `marginal ${pct(pr.tg)}${pr.kalkylTb !== null ? `. Kalkylerat ${kr(pr.kalkylTb)}` : ""}`
            }
          />
          <StatTile
            label={pr.overUnder === null ? "Fakturerat mot utfört" : pr.overUnder < 0 ? "Utfört, inte fakturerat" : "Fakturerat i förväg"}
            value={kr(pr.overUnder === null ? null : Math.abs(pr.overUnder))}
            ton={pr.overUnder !== null && pr.overUnder < 0 && pr.intakt && -pr.overUnder > 0.02 * pr.intakt ? "warn" : ""}
            hint={
              pr.overUnder === null
                ? "kräver budget och kontraktssumma"
                : pr.overUnder < 0
                  ? "arbete ni kan fakturera"
                  : "fakturerat mer än utfört arbete"
            }
          />
        </div>

        {pr.brister.length ? (
          <Callout ton="warn">
            <b>Beräkningen saknar uppgifter.</b>
            <ul className="m-0 mt-1 pl-5">
              {pr.brister.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-ink">Så räknas det</summary>
          <div className="mt-3">
        <DataList
          items={[
            { label: "Kontraktssumma", value: kr(pr.kontrakt) },
            { label: "Godkända ÄTA", value: kr(pr.ataGodkant) },
            { label: "Väntande ÄTA", value: kr(pr.ataVantande), detail: "ingår inte i intäkten förrän de är godkända" },
            { label: "Budget", value: kr(pr.budget || null) },
            {
              label: "Kostnad hittills",
              value: kr(pr.utfall),
              detail: pr.ovrigtUtfall ? `varav ${kr(pr.ovrigtUtfall)} utan aktivitet` : null,
            },
            { label: "Kostnad kvar", value: kr(pr.kvar), detail: "din bedömning där den är satt, annars budget minus kostnad hittills" },
            {
              label: "Färdigställt",
              value: (
                <span className="flex w-full max-w-[260px] items-center gap-2">
                  <Meter value={pr.grad} size="sm" className="flex-1" />
                  <span className="tabular-nums">{pct(pr.grad)}</span>
                </span>
              ),
              detail: "kostnad hittills delat med beräknad kostnad totalt",
            },
            { label: "Intäkt för utfört arbete", value: kr(pr.upparbetat) },
            { label: "Fakturerat", value: kr(pr.fakturerat), detail: "fakturerade betalningar + fakturerade ÄTA" },
          ]}
        />
          </div>
        </details>

        <div>
          <h4 className="m-0 mb-2 text-[13px] font-bold text-ink">Vecka för vecka</h4>
          {trend.length ? (
            <table className="w-full text-[13px] tabular-nums" aria-label="Sparat läge vecka för vecka">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th scope="col">Vecka</th>
                  <th scope="col" className="text-right">Får betalt</th>
                  <th scope="col" className="text-right">Kostnad totalt</th>
                  <th scope="col" className="text-right">Vinst</th>
                  <th scope="col" className="text-right">Ändring</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((r) => (
                  <tr key={r.id}>
                    <td>{veckaEtikett(r.vecka)}</td>
                    <td className="text-right">{kr(r.intakt)}</td>
                    <td className="text-right">{kr(r.slutkostnad)}</td>
                    <td className="text-right">{kr(r.tb)}</td>
                    <td className={`text-right ${r.tbAndring < 0 ? "font-bold text-bad-ink" : ""}`}>{andring(r.tbAndring)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">
              Inget sparat än. Klicka på Spara veckans läge en gång i veckan så syns utvecklingen här.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
