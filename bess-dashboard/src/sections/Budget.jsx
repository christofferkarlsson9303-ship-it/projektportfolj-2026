import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card, Meter, StatTile, StatusBadge } from "../components/ds/index.js";
import { DatumFalt, Falt, NumFalt } from "../components/ui/Falt.jsx";
import { TaBortKnapp } from "../components/ui/Primitiver.jsx";
import { KOSTNADSTYP } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { projekt } from "../lib/berakningar.js";
import {
  aktivitetAnvands,
  budgetAktivitet,
  budgetlage,
  nyAktivitet,
  nyKostnad,
  procent,
  snittpris,
  utfallAktivitet,
} from "../lib/planering.js";

/* Budget och utfall på designsystemet: budget per aktivitet mot utfall i
   timmar och kronor. Utfallet i timmar kommer från tidrapporten, kostnaderna
   från kostnadsraderna. Budgetsiffrorna är projektledarens egna. */

const typText = (typ) => (KOSTNADSTYP.find(([v]) => v === typ) || [typ, typ])[1];

/** Belopp med minustecken när det är negativt — "kvar" kan bli under noll. */
const medTecken = (n) => `${n < 0 ? "−" : ""}${fmtSEK(Math.abs(Math.round(n)))}`;

export function Budget() {
  const { state, uppd, laggTill, taBort } = usePortfolj();
  const { valtProjekt: pid, visaToast, bekrafta } = useUi();
  const p = projekt(state, pid);

  const lage = useMemo(() => budgetlage(state, pid), [state, pid]);
  const kostrader = useMemo(() => state.kostnader.filter((k) => k.projektId === pid), [state.kostnader, pid]);

  if (!p) return null;

  const { bud, utf, kvar, forbrukat } = lage;
  const kv = p.kontraktsvarde;
  const andelKontrakt = kv ? Math.round((utf.kr / kv) * 1000) / 10 : null;
  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;

  const rader = lage.aktiviteter.map((a) => {
    const b = budgetAktivitet(state, a);
    const u = utfallAktivitet(state, a.id);
    return { ...a, b, u, kvar: b.kr - u.kr };
  });

  const taBortAktivitet = async (a) => {
    if (aktivitetAnvands(state, a.id)) {
      visaToast("Aktiviteten har rapporterad tid eller kostnad.", "warn");
      return;
    }
    const ja = await bekrafta(`Aktiviteten ${a.namn} tas bort ur budgeten.`, {
      titel: "Ta bort aktiviteten?",
      ok: "Ta bort",
      fara: true,
    });
    if (ja) taBort("aktiviteter", a.id);
  };

  const taBortKostnad = (k) => {
    if (k.fakturerad) {
      visaToast("Kostnaden ingår i ett fakturaunderlag.", "warn");
      return;
    }
    taBort("kostnader", k.id);
  };

  const kostNamn = (k) => k.benamning || `${typText(k.typ)} ${k.datum}`;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Budget"
            value={bud.kr ? fmtSEK(Math.round(bud.kr)) : "—"}
            hint={`${bud.tim} h arbete plus material och UE`}
          />
          <StatTile label="Utfall" value={fmtSEK(Math.round(utf.kr))} hint={`${utf.tim} h rapporterat`} />
          <StatTile
            label="Kvar"
            value={bud.kr ? medTecken(kvar) : "—"}
            ton={kvar < 0 ? "bad" : forbrukat > 85 ? "warn" : ""}
            hint={bud.kr ? `${forbrukat} % av budget förbrukat` : "sätt budget per aktivitet"}
          />
          <StatTile
            label="Utfall av kontrakt"
            value={andelKontrakt === null ? "—" : `${String(andelKontrakt).replace(".", ",")} %`}
            ton={andelKontrakt !== null && andelKontrakt > 90 ? "bad" : ""}
            hint={kv ? `kontraktsvärde ${fmtSEK(kv)}` : "kontraktsvärde saknas"}
          />
        </div>

        {kvar < 0 && bud.kr ? (
          <Callout ton="bad">
            <b>Budgetöverskridande.</b> Utfallet ligger {fmtSEK(Math.abs(Math.round(kvar)))} över budget.
            Kontrollera om merkostnaden är ÄTA-grundande enligt ABT 06 kap. 2 innan den bärs i entreprenaden.
          </Callout>
        ) : null}

        <Card
          id="budget-aktiviteter"
          title={`Budget mot utfall — ${projektNamn}`}
          subtitle="Utfall i timmar kommer från tidrapporten, kostnader från raderna nedan. Budgetsiffrorna är dina egna — inget är hämtat ur kontraktsunderlaget."
          action={
            <button type="button" className="btn sec mini" onClick={() => laggTill("aktiviteter", nyAktivitet(pid))}>
              + Lägg till aktivitet
            </button>
          }
        >
          <DataTable
            etikett="Budget per aktivitet"
            exportNamn="Budget_och_utfall"
            sokbar={false}
            rader={rader}
            tomText="Inga aktiviteter upplagda."
            kolumner={[
              {
                nyckel: "namn",
                rubrik: "Aktivitet",
                bredd: 230,
                render: (a) => (
                  <Falt
                    varde={a.namn}
                    etikett={`Namn på aktiviteten ${a.namn}`}
                    onCommit={(v) => uppd("aktiviteter", a.id, "namn", v)}
                    className="min-w-[180px]"
                  />
                ),
              },
              {
                nyckel: "budgetTim",
                rubrik: "Bud. h",
                bredd: 96,
                typ: "num",
                summera: true,
                render: (a) => (
                  <NumFalt
                    varde={a.budgetTim || 0}
                    etikett={`Budgeterade timmar för ${a.namn}`}
                    onCommit={(v) => uppd("aktiviteter", a.id, "budgetTim", v ?? 0)}
                    className="max-w-[76px] text-right"
                  />
                ),
              },
              {
                nyckel: "utfallTim",
                rubrik: "Utfall h",
                bredd: 112,
                typ: "num",
                summera: true,
                sortVarde: (a) => a.u.timmar,
                exportVarde: (a) => a.u.timmar,
                render: (a) => {
                  const pr = procent(a.u.timmar, a.b.tim);
                  return (
                    <span className="flex flex-col items-end gap-1">
                      <span>{a.u.timmar} h</span>
                      {a.b.tim ? (
                        <>
                          <Meter value={Math.min(pr, 100)} size="sm" className="w-full min-w-[56px]" />
                          <span className={`text-xs tabular-nums ${pr > 100 ? "font-bold text-bad-ink" : "text-ink-soft"}`}>
                            {pr} %{pr > 100 ? " — över" : ""}
                          </span>
                        </>
                      ) : null}
                    </span>
                  );
                },
              },
              {
                nyckel: "budgetMtrl",
                rubrik: "Bud. mtrl",
                bredd: 116,
                typ: "sek",
                summera: true,
                render: (a) => (
                  <NumFalt
                    varde={a.budgetMtrl || 0}
                    etikett={`Budget för material, ${a.namn}`}
                    onCommit={(v) => uppd("aktiviteter", a.id, "budgetMtrl", v ?? 0)}
                    className="max-w-[100px] text-right"
                  />
                ),
              },
              {
                nyckel: "budgetUE",
                rubrik: "Bud. UE",
                bredd: 116,
                typ: "sek",
                summera: true,
                render: (a) => (
                  <NumFalt
                    varde={a.budgetUE || 0}
                    etikett={`Budget för UE, ${a.namn}`}
                    onCommit={(v) => uppd("aktiviteter", a.id, "budgetUE", v ?? 0)}
                    className="max-w-[100px] text-right"
                  />
                ),
              },
              {
                nyckel: "budgetKr",
                rubrik: "Budget kr",
                bredd: 120,
                typ: "sek",
                summera: true,
                sortVarde: (a) => a.b.kr,
                exportVarde: (a) => Math.round(a.b.kr),
                render: (a) => fmtSEK(Math.round(a.b.kr)),
              },
              {
                nyckel: "utfallKr",
                rubrik: "Utfall kr",
                bredd: 120,
                typ: "sek",
                summera: true,
                sortVarde: (a) => a.u.kr,
                exportVarde: (a) => Math.round(a.u.kr),
                render: (a) => fmtSEK(Math.round(a.u.kr)),
              },
              {
                nyckel: "kvar",
                rubrik: "Kvar",
                bredd: 140,
                typ: "sek",
                summera: true,
                sortVarde: (a) => a.kvar,
                exportVarde: (a) => Math.round(a.kvar),
                render: (a) => (
                  <span className="flex flex-col items-end">
                    <b className={a.kvar < 0 ? "text-bad-ink" : "text-ink"}>{medTecken(a.kvar)}</b>
                    <span className="text-xs font-normal text-ink-soft">
                      {a.b.kr ? `${procent(a.u.kr, a.b.kr)} % förbrukat` : "budget ej satt"}
                    </span>
                  </span>
                ),
              },
              {
                nyckel: "atgard",
                rubrik: "",
                bredd: 56,
                sorterbar: false,
                render: (a) => <TaBortKnapp etikett={`Ta bort aktiviteten ${a.namn}`} onClick={() => taBortAktivitet(a)} />,
              },
            ]}
          />
          <Callout ton="info">
            <b>Antagande:</b> arbetsbudgeten räknas om till kronor med ett snittpris på{" "}
            {fmtSEK(Math.round(snittpris(state)))} per timme (genomsnitt av á-priserna i Resurser). Utfallet
            räknas alltid med respektive persons á-pris.
          </Callout>
        </Card>

        <Card
          id="budget-kostnader"
          title="Kostnader — material, UE och övrigt"
          subtitle="Registrera kostnader mot aktivitet. Debiterbara kostnader går vidare till fakturaunderlaget."
          action={
            <button type="button" className="btn sec mini" onClick={() => laggTill("kostnader", nyKostnad(pid))}>
              + Lägg till kostnad
            </button>
          }
        >
          <DataTable
            etikett="Kostnader"
            exportNamn="Kostnader"
            rader={kostrader}
            tomText="Inga kostnader registrerade."
            kolumner={[
              {
                nyckel: "datum",
                rubrik: "Datum",
                bredd: 150,
                render: (k) =>
                  k.fakturerad ? (
                    k.datum
                  ) : (
                    <DatumFalt varde={k.datum} etikett={`Datum för kostnad ${kostNamn(k)}`} onCommit={(v) => uppd("kostnader", k.id, "datum", v)} />
                  ),
              },
              {
                nyckel: "typ",
                rubrik: "Typ",
                bredd: 170,
                filter: true,
                filterEtikett: typText,
                textVarde: (k) => typText(k.typ),
                render: (k) =>
                  k.fakturerad ? (
                    typText(k.typ)
                  ) : (
                    <select value={k.typ} aria-label={`Typ för kostnad ${kostNamn(k)}`} onChange={(e) => uppd("kostnader", k.id, "typ", e.target.value)}>
                      {KOSTNADSTYP.map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ),
              },
              {
                nyckel: "benamning",
                rubrik: "Benämning",
                render: (k) =>
                  k.fakturerad ? (
                    k.benamning || "—"
                  ) : (
                    <Falt
                      varde={k.benamning || ""}
                      etikett={`Benämning för kostnad ${kostNamn(k)}`}
                      placeholder="Leverantör / vad"
                      onCommit={(v) => uppd("kostnader", k.id, "benamning", v)}
                    />
                  ),
              },
              {
                nyckel: "aktivitetId",
                rubrik: "Aktivitet",
                bredd: 190,
                textVarde: (k) => (state.aktiviteter.find((a) => a.id === k.aktivitetId) || {}).namn || "",
                render: (k) =>
                  k.fakturerad ? (
                    (state.aktiviteter.find((a) => a.id === k.aktivitetId) || {}).namn || "—"
                  ) : (
                    <select
                      value={k.aktivitetId || ""}
                      aria-label={`Aktivitet för kostnad ${kostNamn(k)}`}
                      onChange={(e) => uppd("kostnader", k.id, "aktivitetId", e.target.value)}
                    >
                      <option value="">— välj —</option>
                      {lage.aktiviteter.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.namn}
                        </option>
                      ))}
                    </select>
                  ),
              },
              {
                nyckel: "belopp",
                rubrik: "Belopp",
                bredd: 130,
                typ: "sek",
                summera: true,
                render: (k) =>
                  k.fakturerad ? (
                    fmtSEK(k.belopp || 0)
                  ) : (
                    <NumFalt
                      varde={k.belopp || 0}
                      etikett={`Belopp för kostnad ${kostNamn(k)}`}
                      onCommit={(v) => uppd("kostnader", k.id, "belopp", v ?? 0)}
                      className="max-w-[112px] text-right"
                    />
                  ),
              },
              {
                nyckel: "debiterbar",
                rubrik: "Debiterbar",
                bredd: 130,
                textVarde: (k) => (k.fakturerad ? "Fakturerad" : k.debiterbar ? "Ja" : "Nej"),
                render: (k) =>
                  k.fakturerad ? (
                    <StatusBadge ton="ok" label="Fakturerad" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={!!k.debiterbar}
                      aria-label={`Kostnad ${kostNamn(k)} är debiterbar`}
                      onChange={(e) => uppd("kostnader", k.id, "debiterbar", e.target.checked)}
                    />
                  ),
              },
              {
                nyckel: "atgard",
                rubrik: "",
                bredd: 56,
                sorterbar: false,
                render: (k) =>
                  k.fakturerad ? null : <TaBortKnapp etikett={`Ta bort kostnad ${kostNamn(k)}`} onClick={() => taBortKostnad(k)} />,
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
