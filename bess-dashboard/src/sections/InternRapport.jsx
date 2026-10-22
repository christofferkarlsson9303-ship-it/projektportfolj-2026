import { Lock, Plus, Printer } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { InternStatusrapport } from "../components/ui/InternStatusrapport.jsx";
import { Callout, Card, Overline, StatusBadge } from "../components/ds/index.js";
import { Falt, TaBortKnapp } from "../components/ui/Falt.jsx";
import { TON_KLASS } from "../lib/status.js";
import { idag } from "../lib/datum.js";
import { fmtSEK } from "../lib/format.js";
import { nyttId } from "../lib/id.js";
import {
  INTERNA_OMRADEN,
  OMRADEN,
  TONNAMN,
  ljusTillTon,
  nyStatusrapport,
  nyckeltalFor,
  nyckeltalRader,
  periodFor,
  periodNamn,
  rapporterFor,
  statusOmraden,
  toppRisker,
} from "../lib/statusomraden.js";

/* Intern statusrapport per månad, enligt ONE Nordics mall för intern statusrapport.

   Ett utkast per projekt och månad i portfolj/state (statusrapporter). Appen föreslår ett
   ljus per område ur portföljen och säger varför (lib/statusomraden.js); PL sätter sitt
   eget ljus och sin kommentar. Låses rapporten fryses nyckeltalen, och nästa månad visar
   föregående ljus och siffror bredvid. Utskriften är InternStatusrapport.jsx. */

const LJUS = [
  ["gron", "Grön"],
  ["gul", "Gul"],
  ["rod", "Röd"],
];
const FRAGESTATUS = ["Öppen", "Beslutad", "Avslag"];

function LjusKnappar({ omrade, varde, onVal, last }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Ljus: ${OMRADEN[omrade]}`}>
      {LJUS.map(([id, namn]) => {
        const ton = ljusTillTon(id);
        const vald = varde === id;
        return (
          <button
            key={id}
            type="button"
            disabled={last}
            aria-pressed={vald}
            onClick={() => onVal(vald ? "" : id)}
            className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-2.5 py-0.5 text-[12px] font-bold ${vald ? `${TON_KLASS[ton]} border-current` : "border-hairline-stark bg-transparent text-ink-soft enabled:hover:bg-sunken"}`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            {namn}
          </button>
        );
      })}
    </div>
  );
}

export function InternRapport() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid, skrivUt, bekrafta, visaToast } = useUi();
  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return <Projektvaljare />;

  const period = periodFor();
  const { aktuell, foregaende, alla } = rapporterFor(state, pid, period);
  const rad = aktuell || nyStatusrapport(state, pid, period);
  const last = rad.status === "last";
  const forslag = statusOmraden(state, pid, { egnaFragor: rad.eskalerade });
  const nu = rad.nyckeltal || nyckeltalFor(state, pid);
  const spara = (andring) => dispatch({ type: "STATUSRAPPORT_SPARA", rad: { ...rad, ...andring } });
  const omrade = (o, andring) => spara({ omraden: { ...rad.omraden, [o]: { ...rad.omraden[o], ...andring } } });
  const fraga = (id, andring) => spara({ eskalerade: rad.eskalerade.map((e) => (e.id === id ? { ...e, ...andring } : e)) });

  const las = async () => {
    if (!(await bekrafta(`Lås rapporten för ${periodNamn(period)}? Ljus, kommentarer och nyckeltal sparas och kan inte ändras efteråt.`, { titel: "Lås rapporten", ok: "Lås" }))) return;
    if (!aktuell) dispatch({ type: "STATUSRAPPORT_SPARA", rad });
    dispatch({ type: "STATUSRAPPORT_LAS", id: rad.id, nyckeltal: nyckeltalFor(state, pid), datum: idag() });
    visaToast(`Rapporten för ${periodNamn(period)} är låst.`);
  };

  const avvikerFran = (o) => {
    const t = ljusTillTon(rad.omraden[o]?.ljus);
    return rad.omraden[o]?.ljus && forslag[o].ton !== "neutral" && t !== forslag[o].ton;
  };

  return (
    <>
      <Projektvaljare />
      <div className="flex flex-col gap-4 lg:gap-6">
        <Card
          id="intern-rubrik"
          title={`Intern statusrapport — ${p.nr ? `${p.nr} ` : ""}${p.namn}`}
          subtitle={`${periodNamn(period)}. ${foregaende ? `Jämförs med ${periodNamn(foregaende.period)}.` : "Ingen tidigare rapport att jämföra med."}`}
          badge={<StatusBadge ton={last ? "ok" : "info"} label={last ? `Låst ${rad.last?.datum}` : aktuell ? "Utkast" : "Inte påbörjad"} />}
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn sec mini" onClick={() => skrivUt(<InternStatusrapport state={state} pid={pid} rad={rad} foregaende={foregaende} />)}>
                <Printer size={14} aria-hidden="true" /> Skriv ut som PDF
              </button>
              {last ? null : (
                <button type="button" className="btn mini" onClick={las}>
                  <Lock size={14} aria-hidden="true" /> Lås rapporten
                </button>
              )}
            </div>
          }
        >
          <Callout ton="info">
            Intern rapport till ledning och styrgrupp: internkalkyl ingår, så den ska inte till beställaren (använd Beställarrapport). Appen föreslår ljuset per område och skriver regeln; ditt ljus och din kommentar är det som gäller.
          </Callout>
        </Card>

        <Card id="intern-status" title="Statussammanställning" subtitle="Föregående ljus, appens förslag och ditt ljus per område.">
          <ul className="m-0 flex list-none flex-col p-0" aria-label="Områden">
            {INTERNA_OMRADEN.map((o) => {
              const f = forslag[o];
              const fore = foregaende?.omraden?.[o]?.ljus;
              return (
                <li key={o} className="grid grid-cols-1 gap-2 border-0 border-t border-solid border-hairline py-3 first:border-t-0 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1">
                    <b className="text-[14px] text-ink">{OMRADEN[o]}</b>
                    <span className="text-[12px] text-ink-soft">Förra: {fore ? TONNAMN[ljusTillTon(fore)] : "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-[13px]">
                      <StatusBadge ton={f.ton} label={`Förslag: ${TONNAMN[f.ton]}`} />
                      {avvikerFran(o) ? <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${TON_KLASS.neutral}`}>Avviker från förslaget</span> : null}
                    </span>
                    <span className="text-[13px] text-ink">{f.text}</span>
                    <span className="text-[11.5px] text-ink-soft">{f.regel}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <LjusKnappar omrade={o} varde={rad.omraden[o]?.ljus || ""} last={last} onVal={(ljus) => omrade(o, { ljus })} />
                    <Falt etikett={`Kommentar: ${OMRADEN[o]}`} varde={rad.omraden[o]?.kommentar || ""} disabled={last} placeholder="Kommentar till ledningen" onCommit={(kommentar) => omrade(o, { kommentar })} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card id="intern-sammanfattning" title="Sammanfattning till ledningen" subtitle="Läget i två eller tre meningar, och din prognos för slutkostnaden.">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
              Sammanfattning
              <Falt flerrad etikett="Sammanfattning" varde={rad.sammanfattning} disabled={last} onCommit={(sammanfattning) => spara({ sammanfattning })} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
              Prognos slutkostnad, EAC (kr)
              <Falt etikett="Prognos slutkostnad, EAC (kr)" inputMode="decimal" varde={rad.eac} disabled={last} onCommit={(v) => spara({ eac: String(v).replace(/\s/g, "").replace(",", ".") })} />
            </label>
          </Card>

          <Card id="intern-nyckeltal" title="Nyckeltal" subtitle={last ? "Frysta när rapporten låstes." : "Räknas nu; fryses när du låser rapporten."}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className="px-1 pb-1 text-left"><Overline as="span">Nyckeltal</Overline></th>
                  <th scope="col" className="px-1 pb-1 text-left"><Overline as="span">{periodNamn(period)}</Overline></th>
                  <th scope="col" className="px-1 pb-1 text-left"><Overline as="span">{foregaende ? periodNamn(foregaende.period) : "Föregående"}</Overline></th>
                </tr>
              </thead>
              <tbody>
                {nyckeltalRader(nu, foregaende?.nyckeltal).map(([namn, a, b]) => (
                  <tr key={namn} className="border-0 border-t border-solid border-hairline">
                    <th scope="row" className="px-1 py-1.5 text-left font-semibold text-ink">{namn}</th>
                    <td className="px-1 py-1.5 tabular-nums">{a}</td>
                    <td className="px-1 py-1.5 tabular-nums text-ink-soft">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <Card
          id="intern-fragor"
          title="Eskalerade frågor och beslut"
          subtitle="Frågor som kräver beslut eller åtgärd över projektnivå."
          action={
            last ? null : (
              <button type="button" className="btn sec mini" onClick={() => spara({ eskalerade: [...rad.eskalerade, { id: nyttId(), beskrivning: "", atgard: "", ansvarig: "", datum: idag(), status: "Öppen" }] })}>
                <Plus size={14} aria-hidden="true" /> Ny fråga
              </button>
            )
          }
        >
          {rad.eskalerade.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Eskalerade frågor">
              {rad.eskalerade.map((e, i) => (
                <li key={e.id} className="grid grid-cols-1 gap-1.5 rounded-md border border-solid border-hairline p-2 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_130px_auto]">
                  <Falt etikett={`Fråga ${i + 1}: fråga och konsekvens`} placeholder="Fråga och konsekvens" varde={e.beskrivning} disabled={last} onCommit={(beskrivning) => fraga(e.id, { beskrivning })} />
                  <Falt etikett={`Fråga ${i + 1}: föreslagen åtgärd eller beslut`} placeholder="Föreslagen åtgärd / beslut" varde={e.atgard} disabled={last} onCommit={(atgard) => fraga(e.id, { atgard })} />
                  <Falt etikett={`Fråga ${i + 1}: ansvarig`} placeholder="Ansvarig" varde={e.ansvarig} disabled={last} onCommit={(ansvarig) => fraga(e.id, { ansvarig })} />
                  <select aria-label={`Fråga ${i + 1}: status`} value={e.status} disabled={last} onChange={(ev) => fraga(e.id, { status: ev.target.value })}>
                    {FRAGESTATUS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {last ? null : <TaBortKnapp etikett={`Ta bort fråga ${i + 1}`} onClick={() => spara({ eskalerade: rad.eskalerade.filter((x) => x.id !== e.id) })} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inga eskalerade frågor inlagda.{forslag.eskalerat.ton === "warn" ? ` ${forslag.eskalerat.text}` : ""}</p>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card id="intern-risker" title="Topp 3 risker" subtitle="Öppna risker med högst riskvärde.">
            {toppRisker(state, pid).length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
                {toppRisker(state, pid).map((x) => (
                  <li key={x.id}>
                    <b>{x.titel}</b> <span className="text-ink-soft">· S × K {x.varde}{x.agare ? ` · ${x.agare}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[13px] text-ink-soft">Riskanalys ej framtagen: inga öppna risker.</p>
            )}
          </Card>
          <Card id="intern-historik" title="Tidigare rapporter" subtitle="Låsta rapporter ändras inte.">
            {alla.length ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
                {alla.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2">
                    <b className="min-w-[130px]">{periodNamn(x.period)}</b>
                    <StatusBadge ton={x.status === "last" ? "ok" : "info"} label={x.status === "last" ? `Låst ${x.last?.datum}` : "Utkast"} />
                    {x.eac ? <span className="text-ink-soft">EAC {fmtSEK(Number(x.eac))}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[13px] text-ink-soft">Ingen rapport sparad än. Den första sparas när du ändrar något här.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
