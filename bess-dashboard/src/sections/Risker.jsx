import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Callout, Card, StatTile, StatusBadge } from "../components/ds/index.js";
import { PILL_TILL_TON } from "../lib/status.js";
import { Tathetsvaljare, Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Riskvarde, Tabellyta } from "../components/ui/Primitiver.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import { Falt, NumFalt } from "../components/ui/Falt.jsx";
import { RISKAGARE, RISKKATEGORI, RISKSTATUS_NY } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { idag } from "../lib/datum.js";
import {
  gallerFor,
  projekt,
  riskExponering,
  riskMatrisFarg,
  riskNiva,
  riskvarde,
} from "../lib/berakningar.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/** Slår upp etiketten för ett kodvärde i en [kod, namn]-lista. */
const etikettAv = (lista, v, fallback) => {
  const rad = lista.find(([k]) => k === v);
  return rad ? rad[1] : (fallback ?? v ?? "—");
};

const NIVA_TEXT = { rod: "Röd", gul: "Gul", gron: "Grön" };
const NIVA_PILL = { rod: "p-bad", gul: "p-warn", gron: "p-ok" };
const NIVA_ORDNING = { rod: 0, gul: 1, gron: 2 };
/** Riskkortets vänsterkant — nivån som en smal accent, inte som yta. */
const NIVA_KANT = { rod: "border-l-rod", gul: "border-l-orange", gron: "border-l-turkos" };

/* Risker på designsystemet: nyckeltal som StatTile, matrisen och
   miniriskmetoden som kort, registret som kort med vyval i huvudet och
   varje risk som en ruta med nivån i vänsterkanten. */

/* ---------- Riskmatris ---------- */

function Riskmatris({ risker }) {
  const rutor = [];
  for (let k = 5; k >= 1; k--) {
    const rad = [];
    for (let s = 1; s <= 5; s++) {
      const traffar = risker.filter(
        (r) => r.status !== "stangd" && Number(r.sannolikhet) === s && Number(r.konsekvens) === k
      );
      rad.push(
        <td
          className={`mtx ${riskMatrisFarg(s, k)}`}
          key={s}
          title={`Sannolikhet ${s} × konsekvens ${k} = ${s * k}`}
        >
          {traffar.length ? <b>{traffar.length}</b> : null}
          <span className="sr-only">
            {traffar.length
              ? `${traffar.length} risker vid sannolikhet ${s} och konsekvens ${k}`
              : `inga risker vid sannolikhet ${s} och konsekvens ${k}`}
          </span>
        </td>
      );
    }
    rutor.push(
      <tr key={k}>
        <th className="mtxax" scope="row">
          {k}
        </th>
        {rad}
      </tr>
    );
  }

  return (
    <table className="matris self-start">
      <caption className="sr-only">
        Riskmatris. Rader är konsekvens 5 till 1, kolumner är sannolikhet 1 till 5.
      </caption>
      <tbody>
        {rutor}
        <tr>
          <th />
          {[1, 2, 3, 4, 5].map((s) => (
            <th className="mtxax" key={s} scope="col">
              {s}
            </th>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/* ---------- Riskkort ---------- */

function Riskkort({ r }) {
  const { state, uppd, uppdStatus } = usePortfolj();
  const rv = riskvarde(r);
  const niva = riskNiva(r);
  const satt = (falt, varde) =>
    falt === "status" ? uppdStatus("risker", r.id, falt, varde) : uppd("risker", r.id, falt, varde);

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border border-l-[3px] border-solid border-hairline bg-sunken p-3 md:p-4 ${
        NIVA_KANT[niva] || ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Riskvarde varde={rv} klass={rv >= 15 ? "h" : rv >= 8 ? "m" : "l"} />
        <div className="min-w-[220px] flex-1">
          <Falt
            varde={r.titel || ""}
            etikett="Riskens benämning"
            className="font-semibold"
            onCommit={(v) => satt("titel", v)}
          />
        </div>
        <PTag pid={r.projektId} />
        <StatusBadge ton={PILL_TILL_TON[NIVA_PILL[niva]]} label={NIVA_TEXT[niva]} />
        <select
          className="w-auto"
          value={r.status || "oppen"}
          onChange={(e) => satt("status", e.target.value)}
          aria-label={`Status för risken ${r.titel}`}
        >
          {RISKSTATUS_NY.map(([v, n]) => (
            <option value={v} key={v}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="frow c5">
          <div className="f">
            <label htmlFor={`kat-${r.id}`}>Kategori</label>
            <select id={`kat-${r.id}`} value={r.kategori || ""} onChange={(e) => satt("kategori", e.target.value)}>
              <option value="">— välj —</option>
              {RISKKATEGORI.map(([v, n]) => (
                <option value={v} key={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="f">
            <label htmlFor={`ag-${r.id}`}>Riskägare</label>
            <select id={`ag-${r.id}`} value={r.agarskap || ""} onChange={(e) => satt("agarskap", e.target.value)}>
              <option value="">— välj —</option>
              {RISKAGARE.map(([v, n]) => (
                <option value={v} key={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="f">
            <label htmlFor={`s-${r.id}`}>Sannolikhet 1–5</label>
            <NumFalt
              id={`s-${r.id}`}
              typ="number"
              min={1}
              max={5}
              varde={r.sannolikhet || 3}
              etikett="Sannolikhet 1 till 5"
              onCommit={(v) => satt("sannolikhet", Math.max(1, Math.min(5, Number(v) || 3)))}
            />
          </div>

          <div className="f">
            <label htmlFor={`k-${r.id}`}>Konsekvens 1–5</label>
            <NumFalt
              id={`k-${r.id}`}
              typ="number"
              min={1}
              max={5}
              varde={r.konsekvens || 3}
              etikett="Konsekvens 1 till 5"
              onCommit={(v) => satt("konsekvens", Math.max(1, Math.min(5, Number(v) || 3)))}
            />
          </div>

          <div className="f">
            <label htmlFor={`kost-${r.id}`}>Est. finansiell påverkan (SEK)</label>
            <NumFalt
              id={`kost-${r.id}`}
              typ="number"
              min={0}
              step={1000}
              placeholder="0"
              varde={r.estimeradKostnadSEK || ""}
              etikett="Estimerad finansiell påverkan i kronor"
              onCommit={(v) => satt("estimeradKostnadSEK", Number(v) || 0)}
            />
          </div>
        </div>

        <div className="frow c2">
          <div className="f">
            <label htmlFor={`fore-${r.id}`}>Förebyggande åtgärd — minskar sannolikheten</label>
            <Falt
              id={`fore-${r.id}`}
              flerrad
              placeholder="Vad gör vi nu?"
              varde={r.forebygg || r.atgard || ""}
              etikett="Förebyggande åtgärd"
              onCommit={(v) => satt("forebygg", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`hant-${r.id}`}>Hanterande åtgärd — om risken utlöses</label>
            <Falt
              id={`hant-${r.id}`}
              flerrad
              placeholder="Vad gör vi då?"
              varde={r.hantera || ""}
              etikett="Hanterande åtgärd"
              onCommit={(v) => satt("hantera", v)}
            />
          </div>
        </div>

        <div className="frow c2 items-end">
          <div className="f mb-0">
            <label htmlFor={`ansv-${r.id}`}>Ansvarig</label>
            <Falt
              id={`ansv-${r.id}`}
              varde={r.agare || ""}
              etikett="Ansvarig för risken"
              onCommit={(v) => satt("agare", v)}
            />
          </div>
          <div className="text-[13px] leading-snug">
            {r.arendeId ? (
              <span className="text-ink">
                Utlöst — ärende {(state.ur.find((u) => u.id === r.arendeId) || {}).nr || ""} skapat.
              </span>
            ) : r.status === "utlost" ? (
              r.agarskap === "bestallare" ? (
                <RiskTillArende r={r} />
              ) : (
                <span className="text-ink-faint">
                  Utlöst men ägs av ONE Nordic — hanteras internt, ingen ÄTA-anmälan mot beställaren.
                </span>
              )
            ) : (
              <span className="text-ink-faint">
                Markera risken som "Utlöst" ovan för att kunna öppna en hinder-/ÄTA-anmälan.
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Utlöst risk som ligger hos beställaren blir ett hinderärende med 24-timmarsklocka. */
function RiskTillArende({ r }) {
  const { state, laggTill, uppd } = usePortfolj();
  const { visaToast } = useUi();

  const skapa = () => {
    const antal = state.ur.filter((u) => u.projektId === r.projektId).length + 1;
    const id = "u" + Date.now();
    laggTill("ur", {
      id,
      projektId: r.projektId,
      nr: "UR" + String(antal).padStart(3, "0"),
      benamning: r.titel,
      status: "oppen",
      klass: "hinder",
      handelseDatum: idag(),
      underrattelseDatum: "",
      prisgrund: "lopande",
      belopp: null,
      godkantDatum: "",
      fakturaDatum: "",
      arbeteStartat: false,
      orsak: "risk",
      ansvarig: hamtaNamn() || "",
    });
    uppd("risker", r.id, "arendeId", id);
    visaToast("Hinderärende skapat — 24-timmarsfristen räknas från idag");
  };

  return (
    <button type="button" className="btn sec" onClick={skapa}>
      Omvandla till hinder/ÄTA-anmälan
    </button>
  );
}

/* ---------- Sektionen ---------- */

export function Risker() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga } = useUi();
  const [vy, setVy] = useState("kort");

  const p = projekt(state, pid);

  const n = useMemo(() => {
    const risker = state.risker.filter((r) => gallerFor(r, pid));
    const aktiva = risker.filter((r) => r.status !== "stangd");
    const kritiska = aktiva.filter((r) => riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod");
    return {
      risker,
      aktiva,
      kritiska,
      utanForebygg: kritiska.filter((r) => !r.forebygg && !r.atgard),
      exponering: aktiva.reduce((s, r) => s + riskExponering(r), 0),
      bestallarens: aktiva.filter((r) => r.agarskap === "bestallare").length,
    };
  }, [state.risker, pid]);

  if (!p) return null;

  const nyRisk = async () => {
    const sv = await fraga({
      titel: "Ny risk",
      lead: "Beskriv risken kort — sannolikhet och konsekvens sätts på kortet efteråt.",
      falt: [
        { namn: "titel", etikett: "Risk", typ: "textarea", placeholder: "t.ex. Försenad leverans av PCS" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.titel) return;
    laggTill("risker", {
      id: "r" + Date.now(),
      projektId: pid,
      titel: sv.titel,
      sannolikhet: 3,
      konsekvens: 3,
      atgard: "",
      agare: hamtaNamn() || "Christoffer Karlsson",
      status: "oppen",
    });
  };

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
          <StatTile label="Identifierade risker" value={n.risker.length} hint={`${n.aktiva.length} aktiva`} />
          <StatTile
            label="Kritiska risker"
            value={n.kritiska.length}
            hint="röda enligt riskmatrisen"
            ton={n.kritiska.length ? "bad" : ""}
          />
          <StatTile label="Exponentiellt Riskvärde" value={fmtSEK(n.exponering)} hint="RV × est. finansiell påverkan" />
          <StatTile label="Beställarens risker" value={n.bestallarens} hint="lyfts i beställarrapporten" />
          <StatTile
            label="Utan förebyggande åtgärd"
            value={n.utanForebygg.length}
            hint="av de kritiska"
            ton={n.utanForebygg.length ? "warn" : ""}
          />
        </div>

        {n.utanForebygg.length ? (
          <Callout ton="bad">
            <b>{n.utanForebygg.length} röd risk saknar förebyggande åtgärd.</b> Miniriskmetoden kräver att
            röda risker (enligt riskmatrisen) har en konkret åtgärdsplan.
          </Callout>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card
            id="risk-matris"
            title="Riskmatris"
            subtitle="Konsekvens lodrätt, sannolikhet vågrätt. Siffran är antal aktiva risker i rutan."
          >
            <Riskmatris risker={n.risker} />
            <ul aria-label="Förklaring till riskmatrisen" className="matleg m-0 list-none p-0">
              <li>
                <i className="gron" />
                Grön — acceptabel
              </li>
              <li>
                <i className="gul" />
                Gul — kräver bevakning
              </li>
              <li>
                <i className="rod" />
                Röd — kräver omedelbar åtgärd
              </li>
            </ul>
          </Card>

          <Card
            id="risk-metod"
            title="Miniriskmetoden"
            subtitle="Identifiera → värdera → reagera → följ upp."
            action={
              <button type="button" className="btn sec mini" onClick={() => window.print()}>
                Riskregister (A4)
              </button>
            }
          >
            <Tabellyta etikett="Miniriskmetoden">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Riskvärde</th>
                    <th scope="col">Prioritet</th>
                    <th scope="col">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["h", "15–25", "Kritisk", "Omedelbar åtgärdsplan, eskalera till ledning"],
                    ["m", "8–14", "Hög", "Konkret åtgärdsplan inom en vecka"],
                    ["l", "4–7", "Medium", "Bevakas aktivt"],
                    ["l", "1–3", "Låg", "Registreras utan aktiv åtgärd"],
                  ].map(([kl, spann, prio, atgard]) => (
                    <tr key={spann}>
                      <td data-label="Riskvärde">
                        <span className={`rv ${kl}`}>{spann}</span>
                      </td>
                      <td data-label="Prioritet">{prio}</td>
                      <td data-label="Åtgärd">{atgard}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tabellyta>
          </Card>
        </div>

        <Card
          id="risk-register"
          title={`Riskregister — ${(p.nr ? p.nr + " " : "") + p.namn}`}
          subtitle="Riskägaren avgör vem som bär konsekvensen enligt kontraktet."
          action={
            <>
              {vy === "tabell" ? <Tathetsvaljare /> : null}
              <Vyvaljare
                etikett="Vy för riskregistret"
                varde={vy}
                onValj={setVy}
                alternativ={[
                  ["kort", "Kort", "Fullständig redigering per risk"],
                  ["tabell", "Tabell", "Sortera, filtrera och exportera"],
                ]}
              />
              {vy === "kort" ? (
                <button type="button" className="btn mini" onClick={nyRisk}>
                  + Ny risk
                </button>
              ) : null}
            </>
          }
        >
          {vy === "tabell" ? (
            <DataTable
              etikett="Riskregister"
              exportNamn="Riskregister"
              rader={n.risker}
              tomText="Inga risker registrerade."
              verktyg={
                <button type="button" className="btn sec mini" onClick={nyRisk}>
                  + Ny risk
                </button>
              }
              kolumner={[
                {
                  nyckel: "rv",
                  rubrik: "RV",
                  bredd: 70,
                  typ: "num",
                  sortVarde: (r) => riskvarde(r),
                  textVarde: (r) => String(riskvarde(r)),
                  exportVarde: (r) => riskvarde(r),
                  render: (r) => (
                    <Riskvarde
                      varde={riskvarde(r)}
                      klass={riskvarde(r) >= 15 ? "h" : riskvarde(r) >= 8 ? "m" : "l"}
                    />
                  ),
                },
                { nyckel: "titel", rubrik: "Risk" },
                {
                  nyckel: "niva",
                  rubrik: "Nivå",
                  bredd: 90,
                  filter: true,
                  sortVarde: (r) => NIVA_ORDNING[riskNiva(r)],
                  textVarde: (r) => NIVA_TEXT[riskNiva(r)],
                  exportVarde: (r) => NIVA_TEXT[riskNiva(r)],
                  render: (r) => (
                    <StatusBadge ton={PILL_TILL_TON[NIVA_PILL[riskNiva(r)]]} label={NIVA_TEXT[riskNiva(r)]} />
                  ),
                },
                {
                  nyckel: "kategori",
                  rubrik: "Kategori",
                  bredd: 170,
                  filter: true,
                  filterEtikett: (v) => etikettAv(RISKKATEGORI, v),
                  textVarde: (r) => etikettAv(RISKKATEGORI, r.kategori, "—"),
                  render: (r) => etikettAv(RISKKATEGORI, r.kategori, "—"),
                },
                {
                  nyckel: "agarskap",
                  rubrik: "Riskägare",
                  bredd: 160,
                  filter: true,
                  filterEtikett: (v) => etikettAv(RISKAGARE, v),
                  textVarde: (r) => etikettAv(RISKAGARE, r.agarskap, "—"),
                  render: (r) => etikettAv(RISKAGARE, r.agarskap, "—"),
                },
                {
                  nyckel: "estimeradKostnadSEK",
                  rubrik: "Est. påverkan",
                  bredd: 130,
                  typ: "sek",
                  summera: true,
                },
                {
                  nyckel: "exponering",
                  rubrik: "Exponering",
                  bredd: 140,
                  typ: "sek",
                  summera: true,
                  sortVarde: (r) => riskExponering(r),
                  exportVarde: (r) => riskExponering(r),
                  render: (r) => fmtSEK(riskExponering(r)),
                },
                {
                  nyckel: "status",
                  rubrik: "Status",
                  bredd: 130,
                  filter: true,
                  filterEtikett: (v) => etikettAv(RISKSTATUS_NY, v),
                  textVarde: (r) => etikettAv(RISKSTATUS_NY, r.status),
                  render: (r) => etikettAv(RISKSTATUS_NY, r.status),
                },
                { nyckel: "agare", rubrik: "Ansvarig", bredd: 150, filter: true },
              ]}
            />
          ) : n.risker.length ? (
            <ul aria-label="Risker" className="m-0 flex list-none flex-col gap-3 p-0">
              {n.risker.map((r) => (
                <Riskkort r={r} key={r.id} />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inga risker registrerade.</p>
          )}
        </Card>
      </div>
    </>
  );
}
