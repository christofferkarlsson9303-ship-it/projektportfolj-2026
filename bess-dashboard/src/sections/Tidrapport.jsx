import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Card, StatTile, StatusBadge } from "../components/ds/index.js";
import { DatumFalt, Falt, NumFalt, TaBortKnapp } from "../components/ui/Falt.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import { OVERTID } from "../data/konstanter.js";
import { DAGNAMN, veckaEtikett, veckaForskjut, veckaNu, veckansDagar } from "../lib/datum.js";
import { fmtSEK } from "../lib/format.js";
import {
  aktivaPersoner,
  aktivitet,
  aktiviteterFor,
  nyTidrad,
  person,
  planeratPerson,
  tidraderVecka,
  timkostnad,
} from "../lib/planering.js";

/* Tidrapport på designsystemet: en vecka för en medarbetare, en rad per dag
   och arbetsmoment. Debiterbar tid går vidare till fakturaunderlaget; en rad
   som redan ligger i ett underlag är låst och visas som text. */

const TIDSLAG = OVERTID.map(([f, t]) => [f, t.split(" (")[0]]);
const tidslagText = (ot) => (TIDSLAG.find(([f]) => Number(f) === Number(ot)) || [0, "Normaltid"])[1];

const dagEtikett = (iso, i) => `${DAGNAMN[i]} ${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;

export function Tidrapport() {
  const { state, uppd, laggTill, taBort } = usePortfolj();
  const { valtProjekt, visaToast } = useUi();
  const [vecka, setVecka] = useState(veckaNu);
  const [valdPerson, setValdPerson] = useState(null);

  const aktiva = aktivaPersoner(state);
  const personId = valdPerson && person(state, valdPerson) ? valdPerson : aktiva[0]?.id || null;
  const m = person(state, personId);
  const dagar = veckansDagar(vecka);
  const nuvarande = vecka === veckaNu();

  const rader = personId
    ? tidraderVecka(state, personId, vecka).sort((a, b) => a.datum.localeCompare(b.datum))
    : [];

  const kap = m ? Number(m.kapacitet) || 0 : 0;
  const summa = rader.reduce((s, r) => s + (Number(r.timmar) || 0), 0);
  const deb = rader.filter((r) => r.debiterbar).reduce((s, r) => s + (Number(r.timmar) || 0), 0);
  const varde = rader.reduce((s, r) => s + timkostnad(state, r), 0);
  const planerat = personId ? planeratPerson(state, personId, vecka) : 0;
  const avvikelse = summa - planerat;

  const perProjekt = state.projekt
    .map((p) => {
      const rr = rader.filter((r) => r.projektId === p.id);
      return {
        id: p.id,
        projekt: p,
        timmar: rr.reduce((s, r) => s + (Number(r.timmar) || 0), 0),
        varde: Math.round(rr.reduce((s, r) => s + timkostnad(state, r), 0)),
      };
    })
    .filter((x) => x.timmar > 0);

  const ny = (datum) => {
    if (!personId) {
      visaToast("Lägg upp en medarbetare under Resurser först.", "warn");
      return;
    }
    laggTill("tidrader", nyTidrad({ datum, personId, projektId: valtProjekt }));
  };

  const taBortRad = (r) => {
    if (r.fakturerad) {
      visaToast("Raden ingår i ett fakturaunderlag.", "warn");
      return;
    }
    taBort("tidrader", r.id);
  };

  const radNamn = (r) => `${r.datum} ${(state.projekt.find((p) => p.id === r.projektId) || {}).nr || ""}`.trim();

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatTile
          label="Rapporterat"
          value={`${summa} h`}
          ton={kap && summa > kap ? "warn" : ""}
          hint={kap ? `av ${kap} h kapacitet` : "kapacitet ej satt"}
        />
        <StatTile
          label="Planerat"
          value={`${planerat} h`}
          hint={`enligt resursplanen${
            planerat && summa ? ` · avvikelse ${avvikelse > 0 ? "+" : ""}${avvikelse} h` : ""
          }`}
        />
        <StatTile
          label="Debiterbart"
          value={`${deb} h`}
          hint={deb ? "går vidare till fakturaunderlaget" : "inget märkt debiterbart"}
        />
        <StatTile label="Värde" value={fmtSEK(Math.round(varde))} hint="á-pris enligt Bilaga 06.1" />
      </div>

      <Card
        id="tid-vecka"
        title={`Tidrapport — ${veckaEtikett(vecka)}${nuvarande ? " (denna vecka)" : ""}`}
        subtitle="En rad per dag och arbetsmoment. Tid märkt debiterbar hamnar i fakturaunderlaget."
        action={
          <>
            <select
              aria-label="Medarbetare"
              value={personId || ""}
              onChange={(e) => setValdPerson(e.target.value)}
              className="w-auto"
            >
              {aktiva.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.namn}
                </option>
              ))}
            </select>
            <button type="button" className="btn sec mini" onClick={() => setVecka(veckaForskjut(vecka, -1))}>
              ‹ Föregående
            </button>
            <button type="button" className="btn sec mini" onClick={() => setVecka(veckaForskjut(vecka, 1))}>
              Nästa ›
            </button>
            {!nuvarande ? (
              <button type="button" className="btn mini" onClick={() => setVecka(veckaNu())}>
                Denna vecka
              </button>
            ) : null}
          </>
        }
      >
        {/* Veckans dagar: timmar per dag och snabbknapp för en ny rad. */}
        <ul aria-label="Veckans dagar" className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4 lg:grid-cols-7">
          {dagar.map((d, i) => {
            const t = rader.filter((r) => r.datum === d).reduce((s, r) => s + (Number(r.timmar) || 0), 0);
            const helg = i > 4;
            return (
              <li
                key={d}
                className={`flex items-center justify-between gap-2 rounded-lg border border-solid px-3 py-2 ${
                  t ? "border-one-bla bg-info-bg" : "border-hairline bg-sunken"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-[11px] font-bold uppercase tracking-wider ${helg ? "text-ink-faint" : "text-ink-soft"}`}>
                    {dagEtikett(d, i)}
                  </span>
                  <span className={`block text-[15px] font-bold tabular-nums ${t ? "text-info-ink" : "text-ink-faint"}`}>
                    {t ? `${t} h` : "–"}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn sec mini !px-2"
                  aria-label={`Ny tidrad ${dagEtikett(d, i)}`}
                  onClick={() => ny(d)}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <DataTable
          etikett={`Tidrader ${m ? m.namn : ""} ${veckaEtikett(vecka)}`.replace(/\s+/g, " ")}
          exportNamn="Tidrapport"
          sokbar={false}
          rader={rader}
          tomText="Ingen tid rapporterad den här veckan."
          verktyg={
            <button type="button" className="btn mini" onClick={() => ny()}>
              + Ny tidrad
            </button>
          }
          kolumner={[
            {
              nyckel: "datum",
              rubrik: "Datum",
              bredd: 150,
              render: (r) =>
                r.fakturerad ? (
                  r.datum
                ) : (
                  <DatumFalt varde={r.datum} etikett={`Datum för tidrad ${radNamn(r)}`} onCommit={(v) => uppd("tidrader", r.id, "datum", v)} />
                ),
            },
            {
              nyckel: "projektId",
              rubrik: "Projekt",
              bredd: 120,
              textVarde: (r) => (state.projekt.find((p) => p.id === r.projektId) || {}).nr || r.projektId,
              render: (r) =>
                r.fakturerad ? (
                  <PTag pid={r.projektId} />
                ) : (
                  <select
                    value={r.projektId}
                    aria-label={`Projekt för tidrad ${radNamn(r)}`}
                    onChange={(e) => {
                      uppd("tidrader", r.id, "projektId", e.target.value);
                      uppd("tidrader", r.id, "aktivitetId", "");
                    }}
                  >
                    {state.projekt.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nr || p.namn}
                      </option>
                    ))}
                  </select>
                ),
            },
            {
              nyckel: "aktivitetId",
              rubrik: "Aktivitet",
              bredd: 220,
              textVarde: (r) => aktivitet(state, r.aktivitetId)?.namn || "",
              render: (r) =>
                r.fakturerad ? (
                  aktivitet(state, r.aktivitetId)?.namn || "—"
                ) : (
                  <select
                    value={r.aktivitetId || ""}
                    aria-label={`Aktivitet för tidrad ${radNamn(r)}`}
                    onChange={(e) => uppd("tidrader", r.id, "aktivitetId", e.target.value)}
                  >
                    <option value="">— välj aktivitet —</option>
                    {aktiviteterFor(state, r.projektId).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.namn}
                      </option>
                    ))}
                  </select>
                ),
            },
            {
              nyckel: "timmar",
              rubrik: "Timmar",
              bredd: 88,
              typ: "num",
              render: (r) =>
                r.fakturerad ? (
                  `${r.timmar} h`
                ) : (
                  <NumFalt
                    varde={r.timmar}
                    etikett={`Timmar för tidrad ${radNamn(r)}`}
                    onCommit={(v) => uppd("tidrader", r.id, "timmar", v ?? 0)}
                    className="max-w-[72px] text-right"
                  />
                ),
            },
            {
              nyckel: "ot",
              rubrik: "Tidslag",
              bredd: 150,
              textVarde: (r) => tidslagText(r.ot),
              render: (r) =>
                r.fakturerad ? (
                  tidslagText(r.ot)
                ) : (
                  <select
                    value={String(Number(r.ot) || 1)}
                    aria-label={`Tidslag för tidrad ${radNamn(r)}`}
                    onChange={(e) => uppd("tidrader", r.id, "ot", Number(e.target.value))}
                  >
                    {TIDSLAG.map(([f, t]) => (
                      <option key={f} value={String(f)}>
                        {t}
                      </option>
                    ))}
                  </select>
                ),
            },
            {
              nyckel: "ataRef",
              rubrik: "ÄTA/UR",
              bredd: 104,
              render: (r) =>
                r.fakturerad ? (
                  r.ataRef || "—"
                ) : (
                  <Falt
                    varde={r.ataRef || ""}
                    etikett={`ÄTA-referens för tidrad ${radNamn(r)}`}
                    placeholder="UR00x"
                    onCommit={(v) => uppd("tidrader", r.id, "ataRef", v)}
                  />
                ),
            },
            {
              nyckel: "varde",
              rubrik: "Värde",
              bredd: 110,
              typ: "sek",
              sortVarde: (r) => timkostnad(state, r),
              exportVarde: (r) => Math.round(timkostnad(state, r)),
              render: (r) => fmtSEK(Math.round(timkostnad(state, r))),
            },
            {
              nyckel: "debiterbar",
              rubrik: "Debiterbar",
              bredd: 112,
              textVarde: (r) => (r.fakturerad ? "Fakturerad" : r.debiterbar ? "Ja" : "Nej"),
              render: (r) =>
                r.fakturerad ? (
                  <StatusBadge ton="ok" label="Fakturerad" />
                ) : (
                  <input
                    type="checkbox"
                    checked={!!r.debiterbar}
                    aria-label={`Tidrad ${radNamn(r)} är debiterbar`}
                    onChange={(e) => uppd("tidrader", r.id, "debiterbar", e.target.checked)}
                  />
                ),
            },
            {
              nyckel: "atgard",
              rubrik: "",
              bredd: 56,
              sorterbar: false,
              render: (r) =>
                r.fakturerad ? null : <TaBortKnapp etikett={`Ta bort tidrad ${radNamn(r)}`} onClick={() => taBortRad(r)} />,
            },
          ]}
        />
      </Card>

      <Card
        id="tid-projekt"
        title="Veckan per projekt"
        subtitle={`Summering av ${m ? m.namn : "vald medarbetare"}s tid ${veckaEtikett(vecka)}.`}
      >
        <DataTable
          etikett="Veckan per projekt"
          sokbar={false}
          rader={perProjekt}
          tomText="Ingen tid registrerad."
          kolumner={[
            {
              nyckel: "projekt",
              rubrik: "Projekt",
              textVarde: (x) => `${x.projekt.nr || ""} ${x.projekt.namn}`,
              render: (x) => <PTag pid={x.id} />,
            },
            { nyckel: "timmar", rubrik: "Timmar", typ: "num", summera: true, render: (x) => `${x.timmar} h` },
            { nyckel: "varde", rubrik: "Värde", typ: "sek", summera: true },
          ]}
        />
      </Card>
    </div>
  );
}
