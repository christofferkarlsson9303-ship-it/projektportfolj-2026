import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card, StatTile } from "../components/ds/index.js";
import { Falt, NumFalt, TaBortKnapp } from "../components/ui/Falt.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import { PRISLISTA_061 } from "../data/konstanter.js";
import { veckaEtikett, veckaForskjut, veckaNu } from "../lib/datum.js";
import { fmtSEK } from "../lib/format.js";
import {
  belaggningsniva,
  bemanningsrad,
  planeratPerson,
  planeratProjekt,
  procent,
  resurslage,
} from "../lib/planering.js";

/* Resurser på designsystemet: kapacitet och beläggning vecka för vecka.
   Beläggningen är en värmekarta i en sekventiell skala — ljust ONE Blå för
   utrymme kvar, djup Blågrön för full beläggning — och rött med
   varningsikon över kapacitet. Nivån står alltid i klartext (timmar och
   procent), aldrig i färgen ensam. */

const NIVA = {
  tom: { klass: "text-ink-faint", text: "" },
  del: { klass: "bg-info-bg text-info-ink", text: "utrymme kvar" },
  full: { klass: "bg-viz-klar text-surface", text: "full beläggning" },
  over: { klass: "bg-bad-bg text-bad-ink", text: "över kapacitet" },
};

const HORISONT = [
  ["4", "4 v"],
  ["6", "6 v"],
  ["8", "8 v"],
  ["12", "12 v"],
];

const kortVecka = (vk) => `v. ${vk.split("-v")[1]}`;

/** Beläggningscell: timmar, procent av kapacitet och nivå. */
function Belaggning({ timmar, kapacitet }) {
  const proc = procent(timmar, kapacitet);
  const niva = belaggningsniva(proc);
  const n = NIVA[niva];
  return (
    <span
      className={`inline-flex min-w-[68px] flex-col items-end rounded-md px-2 py-1 tabular-nums ${n.klass}`}
      title={`${timmar} h planerat av ${kapacitet} h`}
    >
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
        {niva === "over" ? <TriangleAlert size={12} strokeWidth={2.4} aria-hidden="true" /> : null}
        {timmar ? `${timmar} h` : "–"}
      </span>
      {kapacitet && timmar ? <span className="text-[10.5px] font-semibold opacity-90">{proc} %</span> : null}
      {n.text ? <span className="sr-only">, {n.text}</span> : null}
    </span>
  );
}

export function Resurser() {
  const { state, dispatch, uppd, laggTill, sattLista } = usePortfolj();
  const { visaToast, bekrafta } = useUi();
  const [start, setStart] = useState(veckaNu);
  const [horisont, setHorisont] = useState("6");

  const veckor = useMemo(
    () => Array.from({ length: Number(horisont) }, (_, i) => veckaForskjut(start, i)),
    [start, horisont]
  );
  const lage = useMemo(() => resurslage(state, veckor), [state, veckor]);
  const pers = lage.personer;
  const nuvarande = start === veckaNu();

  const satt = (personId, projektId, timmar) =>
    dispatch({ type: "SATT_BEMANNING", personId, projektId, vecka: start, timmar });

  const sattRoll = (m, roll) => {
    uppd("medarbetare", m.id, "roll", roll);
    const pris = PRISLISTA_061.find(([r]) => r === roll);
    if (pris) uppd("medarbetare", m.id, "apris", pris[1]);
  };

  const nyMedarbetare = () =>
    laggTill("medarbetare", {
      id: "me" + Date.now(),
      namn: "Ny medarbetare",
      roll: "Montör",
      kapacitet: 40,
      apris: 945,
      aktiv: true,
    });

  const taBortMedarbetare = async (m) => {
    if (state.tidrader.some((t) => t.personId === m.id)) {
      visaToast("Personen har rapporterad tid — avaktivera i stället.", "warn");
      return;
    }
    const ja = await bekrafta(`${m.namn} och personens planerade tid tas bort.`, {
      titel: "Ta bort medarbetaren?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    sattLista(
      "medarbetare",
      state.medarbetare.filter((x) => x.id !== m.id)
    );
    sattLista(
      "bemanning",
      state.bemanning.filter((b) => b.personId !== m.id)
    );
  };

  const fordelning = state.projekt
    .map((p) => {
      const rad = { id: p.id, projekt: p };
      veckor.forEach((vk) => {
        rad[vk] = planeratProjekt(state, p.id, vk);
      });
      rad.summa = veckor.reduce((s, vk) => s + rad[vk], 0);
      return rad;
    })
    .filter((r) => r.summa > 0);

  const kapSumma = pers.reduce((s, m) => s + (Number(m.kapacitet) || 0), 0);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatTile
          label="Beläggning"
          value={`${lage.belaggning} %`}
          ton={lage.belaggning > 100 ? "bad" : ""}
          hint={`${lage.planTot} h planerat av ${lage.kapTot} h över ${veckor.length} veckor`}
        />
        <StatTile
          label="Ledig kapacitet"
          value={`${lage.ledigt} h`}
          ton={lage.ledigt ? "" : "bad"}
          hint={lage.ledigt ? "utrymme för ÄTA och tillkommande arbeten" : "ingen buffert kvar"}
        />
        <StatTile
          label="Överbelastningar"
          value={lage.overbelastningar.length}
          ton={lage.overbelastningar.length ? "bad" : ""}
          hint={lage.overbelastningar.length ? "person och vecka över kapacitet" : "ingen över kapacitet"}
        />
        <StatTile label="Medarbetare" value={pers.length} hint="aktiva i planeringen" />
      </div>

      {lage.overbelastningar.length ? (
        <Callout ton="bad">
          <b>Över kapacitet:</b>{" "}
          {lage.overbelastningar
            .slice(0, 6)
            .map((o) => `${o.person.namn} ${veckaEtikett(o.vecka)} (${o.planerat}/${o.kapacitet} h)`)
            .join(" · ")}
          {lage.overbelastningar.length > 6 ? ` … och ${lage.overbelastningar.length - 6} till` : ""}
        </Callout>
      ) : null}

      {/* ---------- Beläggning per vecka ---------- */}
      <Card
        id="res-belaggning"
        title="Beläggning per vecka"
        subtitle="Planerade timmar mot kapacitet, från den vecka du planerar och framåt."
        action={
          <>
            <button type="button" className="btn sec mini" onClick={() => setStart(veckaForskjut(start, -1))}>
              ‹ Tidigare
            </button>
            <button type="button" className="btn sec mini" onClick={() => setStart(veckaForskjut(start, 1))}>
              Senare ›
            </button>
            {!nuvarande ? (
              <button type="button" className="btn mini" onClick={() => setStart(veckaNu())}>
                Denna vecka
              </button>
            ) : null}
            <Vyvaljare etikett="Antal veckor" varde={horisont} onValj={setHorisont} alternativ={HORISONT} />
          </>
        }
      >
        <div className="tscroll rounded-sm border border-solid border-hairline" role="region" aria-label="Beläggningsmatris" tabIndex={0}>
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="min-w-[180px]">
                  Medarbetare
                </th>
                <th scope="col" className="w-[88px] text-right">
                  Kap. h/v
                </th>
                {veckor.map((vk) => (
                  <th key={vk} scope="col" className="w-[88px] text-right">
                    {kortVecka(vk)}
                  </th>
                ))}
                <th scope="col" className="w-[88px] text-right">
                  Snitt
                </th>
              </tr>
            </thead>
            <tbody>
              {pers.length ? (
                pers.map((m) => {
                  const k = Number(m.kapacitet) || 0;
                  const snitt = Math.round(
                    veckor.reduce((s, vk) => s + planeratPerson(state, m.id, vk), 0) / veckor.length
                  );
                  return (
                    <tr key={m.id}>
                      <td data-label="Medarbetare">
                        <b className="text-ink">{m.namn}</b>
                        <span className="block text-xs text-ink-soft">{m.roll}</span>
                      </td>
                      <td data-label="Kapacitet h/vecka" className="num">
                        <NumFalt
                          varde={k}
                          etikett={`Kapacitet för ${m.namn}, timmar per vecka`}
                          onCommit={(v) => uppd("medarbetare", m.id, "kapacitet", v ?? 0)}
                          className="max-w-[72px] text-right"
                        />
                      </td>
                      {veckor.map((vk) => (
                        <td key={vk} data-label={veckaEtikett(vk)} className="num">
                          <Belaggning timmar={planeratPerson(state, m.id, vk)} kapacitet={k} />
                        </td>
                      ))}
                      <td data-label="Snitt" className="num">
                        <Belaggning timmar={snitt} kapacitet={k} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={veckor.length + 3} className="lead">
                    Inga aktiva medarbetare. Lägg till eller aktivera under Medarbetare och á-pris.
                  </td>
                </tr>
              )}
            </tbody>
            {pers.length ? (
              <tfoot>
                <tr className="sumrad font-bold">
                  <td>Summa planerat</td>
                  <td data-label="Kapacitet h/vecka" className="num">
                    {kapSumma} h
                  </td>
                  {veckor.map((vk) => {
                    const p = pers.reduce((s, m) => s + planeratPerson(state, m.id, vk), 0);
                    return (
                      <td key={vk} data-label={veckaEtikett(vk)} className="num">
                        {p} h
                        <span className="block text-xs font-normal text-ink-soft">{procent(p, kapSumma)} %</span>
                      </td>
                    );
                  })}
                  <td data-label="Snitt" className="num">
                    {lage.belaggning} %
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <ul aria-label="Teckenförklaring" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs text-ink-soft">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-solid border-info-ink bg-info-bg" />
            Utrymme kvar
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-viz-klar" />
            85–100 %
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-flex h-3 w-3 items-center justify-center rounded-sm border border-solid border-bad-ink bg-bad-bg text-bad-ink">
              <TriangleAlert size={8} strokeWidth={3} />
            </span>
            Över kapacitet
          </li>
        </ul>
      </Card>

      {/* ---------- Planera veckan ---------- */}
      <Card
        id="res-planera"
        title={`Planera ${veckaEtikett(start)}`}
        subtitle="Timmar per medarbetare och projekt. Summan uppdaterar beläggningen direkt."
      >
        <DataTable
          etikett={`Planering ${veckaEtikett(start)}`}
          sokbar={false}
          rader={pers}
          tomText="Inga aktiva medarbetare."
          kolumner={[
            {
              nyckel: "namn",
              rubrik: "Medarbetare",
              render: (m) => <b className="text-ink">{m.namn}</b>,
            },
            ...state.projekt.map((p) => ({
              nyckel: `p-${p.id}`,
              rubrik: p.nr || p.namn,
              bredd: 120,
              typ: "num",
              sortVarde: (m) => bemanningsrad(state, m.id, p.id, start)?.timmar || 0,
              textVarde: (m) => String(bemanningsrad(state, m.id, p.id, start)?.timmar || ""),
              render: (m) => (
                <NumFalt
                  varde={bemanningsrad(state, m.id, p.id, start)?.timmar ?? ""}
                  etikett={`Timmar för ${m.namn} i ${p.nr || p.namn} ${veckaEtikett(start)}`}
                  placeholder="0"
                  onCommit={(v) => satt(m.id, p.id, v ?? 0)}
                  className="max-w-[80px] text-right"
                />
              ),
            })),
            {
              nyckel: "summa",
              rubrik: "Summa",
              bredd: 100,
              typ: "num",
              sortVarde: (m) => planeratPerson(state, m.id, start),
              render: (m) => (
                <Belaggning timmar={planeratPerson(state, m.id, start)} kapacitet={Number(m.kapacitet) || 0} />
              ),
            },
            {
              nyckel: "kapacitet",
              rubrik: "Kapacitet",
              bredd: 100,
              typ: "num",
              render: (m) => `${Number(m.kapacitet) || 0} h`,
            },
          ]}
        />
      </Card>

      {/* ---------- Fördelning per projekt ---------- */}
      <Card id="res-fordelning" title="Fördelning per projekt" subtitle="Planerade timmar per projekt och vecka.">
        <DataTable
          etikett="Fördelning per projekt"
          sokbar={false}
          rader={fordelning}
          tomText="Ingen tid planerad ännu."
          kolumner={[
            {
              nyckel: "projekt",
              rubrik: "Projekt",
              sortVarde: (r) => r.projekt.nr || r.projekt.namn,
              textVarde: (r) => `${r.projekt.nr || ""} ${r.projekt.namn}`,
              render: (r) => <PTag pid={r.id} />,
            },
            ...veckor.map((vk) => ({
              nyckel: vk,
              rubrik: kortVecka(vk),
              typ: "num",
              summera: true,
              render: (r) => (r[vk] ? `${r[vk]} h` : "–"),
            })),
            { nyckel: "summa", rubrik: "Summa", typ: "num", summera: true, render: (r) => <b>{r.summa} h</b> },
          ]}
        />
      </Card>

      {/* ---------- Medarbetare och á-pris ---------- */}
      <Card
        id="res-medarbetare"
        title="Medarbetare och á-pris"
        subtitle="Á-pris enligt Bilaga 06.1. Kapacitet och prissättning är antaganden tills du bekräftat dem."
        action={
          <button type="button" className="btn sec mini" onClick={nyMedarbetare}>
            + Lägg till medarbetare
          </button>
        }
      >
        <DataTable
          etikett="Medarbetare"
          sokbar={false}
          rader={state.medarbetare}
          tomText="Inga medarbetare upplagda."
          kolumner={[
            {
              nyckel: "namn",
              rubrik: "Namn",
              render: (m) => (
                <Falt
                  varde={m.namn}
                  etikett={`Namn för ${m.namn}`}
                  onCommit={(v) => uppd("medarbetare", m.id, "namn", v)}
                />
              ),
            },
            {
              nyckel: "roll",
              rubrik: "Roll",
              bredd: 260,
              render: (m) => (
                <select
                  value={m.roll}
                  aria-label={`Roll för ${m.namn}`}
                  onChange={(e) => sattRoll(m, e.target.value)}
                >
                  {PRISLISTA_061.some(([r]) => r === m.roll) ? null : <option value={m.roll}>{m.roll}</option>}
                  {PRISLISTA_061.map(([r]) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              nyckel: "apris",
              rubrik: "Á-pris",
              bredd: 120,
              typ: "sek",
              exportVarde: (m) => m.apris,
              render: (m) => (
                <NumFalt
                  varde={m.apris ?? ""}
                  etikett={`Á-pris för ${m.namn}, kronor per timme`}
                  title={fmtSEK(m.apris)}
                  onCommit={(v) => uppd("medarbetare", m.id, "apris", v ?? 0)}
                  className="max-w-[96px] text-right"
                />
              ),
            },
            {
              nyckel: "aktiv",
              rubrik: "Aktiv",
              bredd: 72,
              sortVarde: (m) => (m.aktiv !== false ? 1 : 0),
              textVarde: (m) => (m.aktiv !== false ? "Ja" : "Nej"),
              render: (m) => (
                <input
                  type="checkbox"
                  checked={m.aktiv !== false}
                  aria-label={`${m.namn} är aktiv i planeringen`}
                  onChange={(e) => uppd("medarbetare", m.id, "aktiv", e.target.checked)}
                />
              ),
            },
            {
              nyckel: "atgard",
              rubrik: "",
              bredd: 56,
              sorterbar: false,
              render: (m) => <TaBortKnapp etikett={`Ta bort ${m.namn}`} onClick={() => taBortMedarbetare(m)} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
