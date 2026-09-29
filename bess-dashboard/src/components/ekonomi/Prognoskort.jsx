import { useMemo } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, DataList, Meter, StatTile, StatusBadge } from "../ds/index.js";
import { fmtSEK } from "../../lib/format.js";
import { veckaEtikett, veckaNu } from "../../lib/datum.js";
import { prognos, prognosLage, prognosrad, prognostrend } from "../../lib/prognos.js";

/* Ekonomiprognosen för valt projekt: intäkt, slutkostnad, TB och om
   faktureringen ligger före eller efter det som är upparbetat. Veckans
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
    visaToast(`Prognosen för ${veckaEtikett(vecka)} är sparad`);
  };

  return (
    <Card
      id="ek-prognos"
      title="Prognos"
      subtitle="Slutkostnad = utfall + kvar per aktivitet. Intäkt = kontrakt + godkända ÄTA. Räknas ur Budget, Tidrapport, ÄTA och betalplanen."
      badge={<StatusBadge ton={lage.ton} label={lage.text} />}
      action={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn sec mini" onClick={() => visa("budget")}>
            Justera kvar per aktivitet
          </button>
          <button type="button" className="btn mini" onClick={sparaVecka}>
            {sparadDennaVecka ? "Uppdatera veckans prognos" : "Spara veckans prognos"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Intäkt"
            value={kr(pr.intakt)}
            hint={pr.ataVantande ? `${kr(pr.intaktMedVantande)} med väntande ÄTA` : "kontrakt + godkända ÄTA"}
          />
          <StatTile
            label="Prognos slutkostnad"
            value={pr.budget ? kr(pr.slutkostnad) : "—"}
            ton={pr.kostnadsavvikelse !== null && pr.kostnadsavvikelse < 0 ? "bad" : ""}
            hint={
              pr.kostnadsavvikelse === null
                ? pr.utfall
                  ? `budget saknas · utfall hittills ${kr(pr.utfall)}`
                  : "budget saknas"
                : pr.kostnadsavvikelse < 0
                  ? `${kr(-pr.kostnadsavvikelse)} över budget`
                  : `${kr(pr.kostnadsavvikelse)} under budget`
            }
          />
          <StatTile
            label="Prognos TB"
            value={kr(pr.tb)}
            ton={pr.tb !== null && pr.tb < 0 ? "bad" : pr.tg !== null && pr.tg < 5 ? "warn" : ""}
            hint={
              pr.tg === null
                ? pr.kontrakt === null
                  ? "kräver kontraktsvärde"
                  : "kräver budget per aktivitet"
                : `TG ${pct(pr.tg)}${pr.kalkylTb !== null ? ` · kalkyl ${kr(pr.kalkylTb)}` : ""}`
            }
          />
          <StatTile
            label={pr.overUnder === null ? "Fakturering mot upparbetat" : pr.overUnder < 0 ? "Underfakturerat" : "Överfakturerat"}
            value={kr(pr.overUnder === null ? null : Math.abs(pr.overUnder))}
            ton={pr.overUnder !== null && pr.overUnder < 0 && pr.intakt && -pr.overUnder > 0.02 * pr.intakt ? "warn" : ""}
            hint={
              pr.overUnder === null
                ? "kräver budget och kontraktsvärde"
                : pr.overUnder < 0
                  ? "utfört men inte fakturerat"
                  : "fakturerat före upparbetat"
            }
          />
        </div>

        {pr.brister.length ? (
          <Callout ton="warn">
            <b>Prognosen är ofullständig.</b>
            <ul className="m-0 mt-1 pl-5">
              {pr.brister.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        <DataList
          items={[
            { label: "Kontrakt", value: kr(pr.kontrakt) },
            { label: "Godkända ÄTA", value: kr(pr.ataGodkant) },
            { label: "Väntande ÄTA", value: kr(pr.ataVantande), detail: "ingår inte i intäkten förrän de är godkända" },
            { label: "Budget", value: kr(pr.budget || null) },
            {
              label: "Utfall",
              value: kr(pr.utfall),
              detail: pr.ovrigtUtfall ? `varav ${kr(pr.ovrigtUtfall)} utan aktivitet` : null,
            },
            { label: "Kvar", value: kr(pr.kvar), detail: "din bedömning där den är satt, annars budget minus utfall" },
            {
              label: "Färdigställt",
              value: (
                <span className="flex w-full max-w-[260px] items-center gap-2">
                  <Meter value={pr.grad} size="sm" className="flex-1" />
                  <span className="tabular-nums">{pct(pr.grad)}</span>
                </span>
              ),
              detail: "kostnadsbaserat: utfall / prognos slutkostnad",
            },
            { label: "Upparbetad intäkt", value: kr(pr.upparbetat) },
            { label: "Fakturerat", value: kr(pr.fakturerat), detail: "betalplanens fakturerade lyft + fakturerade ÄTA" },
          ]}
        />

        <div>
          <h4 className="m-0 mb-2 text-[13px] font-bold text-ink">Veckoprognoser</h4>
          {trend.length ? (
            <table className="w-full text-[13px] tabular-nums" aria-label="Sparade veckoprognoser">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th scope="col">Vecka</th>
                  <th scope="col" className="text-right">Intäkt</th>
                  <th scope="col" className="text-right">Slutkostnad</th>
                  <th scope="col" className="text-right">TB</th>
                  <th scope="col" className="text-right">Ändring TB</th>
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
              Ingen prognos sparad än. Spara en varje vecka så syns trenden här.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
