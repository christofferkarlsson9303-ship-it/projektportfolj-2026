import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card, DataList, StatTile, StatusBadge } from "../components/ds/index.js";
import { KOSTNADSTYP } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { projekt } from "../lib/berakningar.js";
import { ARVODE_PROCENT, FAKTURASTATUS, aktivitet, ofakturerat, person, timkostnad } from "../lib/planering.js";
import { SelStatus } from "../components/ui/Falt.jsx";

/* Fakturaunderlag på designsystemet: debiterbar tid och kostnad som ännu
   inte lagts i ett underlag, och de underlag som skapats. Löpande räkning —
   självkostnad plus entreprenadarvode enligt ABT 06 kap. 6 § 9. Ett underlag
   låser sina rader; ångra öppnar dem igen så länge det inte är fakturerat. */

const typText = (typ) => (KOSTNADSTYP.find(([v]) => v === typ) || [typ, typ])[1];

export function Faktura() {
  const { state, dispatch, uppdStatus } = usePortfolj();
  const { valtProjekt: pid, visaToast, bekrafta } = useUi();
  const p = projekt(state, pid);

  const o = useMemo(() => ofakturerat(state, pid), [state, pid]);
  const fakturor = useMemo(() => state.fakturor.filter((f) => f.projektId === pid), [state.fakturor, pid]);

  if (!p) return null;

  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;
  const fakturerat = fakturor.filter((f) => f.status === "fakturerad").reduce((s, f) => s + (f.summa || 0), 0);
  const iUnderlag = fakturor.reduce((s, f) => s + (f.summa || 0), 0);
  const tomt = !o.tid.length && !o.kost.length;

  /* Tid och kostnader i samma lista, i datumordning. */
  const poster = [
    ...o.tid.map((t) => ({
      id: t.id,
      datum: t.datum,
      post: (person(state, t.personId) || {}).namn || "—",
      typ: Number(t.ot) > 1 ? "Övertid" : "Arbete",
      aktivitet: aktivitet(state, t.aktivitetId)?.namn || "",
      ataRef: t.ataRef || "",
      timmar: Number(t.timmar) || 0,
      belopp: Math.round(timkostnad(state, t)),
    })),
    ...o.kost.map((k) => ({
      id: k.id,
      datum: k.datum,
      post: k.benamning || "—",
      typ: typText(k.typ),
      aktivitet: aktivitet(state, k.aktivitetId)?.namn || "",
      ataRef: "",
      timmar: null,
      belopp: Number(k.belopp) || 0,
    })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));

  const skapa = () => {
    if (tomt) {
      visaToast("Inget ofakturerat att sammanställa.", "warn");
      return;
    }
    const nr = "FU" + String(fakturor.length + 1).padStart(3, "0");
    dispatch({ type: "SKAPA_FAKTURAUNDERLAG", pid });
    visaToast(`Fakturaunderlag ${nr} skapat.`);
  };

  const angra = async (f) => {
    if (f.status === "fakturerad") {
      visaToast("Underlaget är fakturerat och kan inte ångras.", "warn");
      return;
    }
    const ja = await bekrafta(`Underlaget ${f.nr} tas bort och dess rader blir ofakturerade igen.`, {
      titel: `Ångra ${f.nr}?`,
      ok: "Ångra underlaget",
    });
    if (ja) dispatch({ type: "ANGRA_FAKTURAUNDERLAG", id: f.id });
  };

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Ofakturerat"
            value={fmtSEK(Math.round(o.summa))}
            ton={o.summa > 0 ? "warn" : ""}
            hint={`${o.timmar} h plus kostnader`}
          />
          <StatTile label="Arbete" value={fmtSEK(Math.round(o.arbete))} hint={`${o.timmar} h debiterbar tid`} />
          <StatTile
            label="Kostnad + arvode"
            value={fmtSEK(Math.round(o.netto + o.arvode))}
            hint={`självkostnad plus ${ARVODE_PROCENT} % entreprenadarvode`}
          />
          <StatTile
            label="I underlag"
            value={fmtSEK(iUnderlag)}
            hint={`${fakturor.length} underlag · ${fmtSEK(fakturerat)} fakturerat`}
          />
        </div>

        <Card
          id="faktura-ofakturerat"
          title={`Ofakturerat underlag — ${projektNamn}`}
          subtitle={`Debiterbar tid och kostnad som ännu inte lagts i ett underlag. Löpande räkning: självkostnad plus ${ARVODE_PROCENT} % entreprenadarvode enligt ABT 06 kap. 6 § 9.`}
          action={
            <button type="button" className="btn" onClick={skapa} disabled={tomt}>
              Skapa underlag
            </button>
          }
        >
          <DataTable
            etikett="Ofakturerade poster"
            sokbar={false}
            rader={poster}
            tomText="Allt debiterbart är redan sammanställt. Märk tid som debiterbar i Tidrapport och kostnader i Budget och utfall."
            kolumner={[
              { nyckel: "datum", rubrik: "Datum", bredd: 120 },
              { nyckel: "post", rubrik: "Person / post" },
              {
                nyckel: "typ",
                rubrik: "Typ",
                bredd: 150,
                filter: true,
                render: (r) => <StatusBadge ton={r.typ === "Övertid" ? "warn" : r.timmar === null ? "neutral" : "info"} label={r.typ} />,
              },
              { nyckel: "aktivitet", rubrik: "Aktivitet" },
              { nyckel: "ataRef", rubrik: "ÄTA/UR", bredd: 100 },
              {
                nyckel: "timmar",
                rubrik: "Timmar",
                bredd: 96,
                typ: "num",
                summera: true,
                render: (r) => (r.timmar === null ? "—" : `${r.timmar} h`),
              },
              { nyckel: "belopp", rubrik: "Belopp", bredd: 130, typ: "sek", summera: true },
            ]}
          />
          {!tomt ? (
            <DataList
              items={[
                {
                  label: "Självkostnad",
                  value: fmtSEK(Math.round(o.arbete + o.netto)),
                  detail: `arbete ${fmtSEK(Math.round(o.arbete))} och kostnader ${fmtSEK(Math.round(o.netto))}`,
                },
                {
                  label: `Arvode ${ARVODE_PROCENT} %`,
                  value: fmtSEK(Math.round(o.arvode)),
                  detail: "entreprenadarvode på kostnaderna",
                },
                { label: "Att fakturera", value: fmtSEK(Math.round(o.summa)) },
              ]}
            />
          ) : null}
        </Card>

        <Card
          id="faktura-underlag"
          title="Skapade underlag"
          subtitle="Ett underlag låser de rader det innehåller. Ångra för att öppna dem igen — så länge underlaget inte är fakturerat."
        >
          <DataTable
            etikett="Fakturaunderlag"
            exportNamn="Fakturaunderlag"
            sokbar={false}
            rader={fakturor}
            tomText="Inga underlag skapade ännu."
            kolumner={[
              {
                nyckel: "nr",
                rubrik: "Nr",
                bredd: 112,
                render: (f) => (
                  <span>
                    <b className="text-ink">{f.nr}</b>
                    <span className="block text-xs text-ink-soft">{f.skapad}</span>
                  </span>
                ),
              },
              {
                nyckel: "period",
                rubrik: "Period",
                bredd: 220,
                render: (f) => <span className="whitespace-nowrap tabular-nums">{f.period}</span>,
              },
              { nyckel: "atan", rubrik: "ÄTA/UR", bredd: 100 },
              { nyckel: "timmar", rubrik: "Tim", bredd: 72, typ: "num", summera: true, render: (f) => `${f.timmar} h` },
              { nyckel: "arbete", rubrik: "Arbete", typ: "sek", summera: true },
              {
                nyckel: "kostnad",
                rubrik: "Kostn. + arvode",
                typ: "sek",
                summera: true,
                sortVarde: (f) => (f.kostnadNetto || 0) + (f.arvode || 0),
                exportVarde: (f) => (f.kostnadNetto || 0) + (f.arvode || 0),
                render: (f) => fmtSEK((f.kostnadNetto || 0) + (f.arvode || 0)),
              },
              { nyckel: "summa", rubrik: "Summa", typ: "sek", summera: true, render: (f) => <b>{fmtSEK(f.summa)}</b> },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 190,
                filter: true,
                filterEtikett: (v) => (FAKTURASTATUS.find(([k]) => k === v) || [v, v])[1],
                textVarde: (f) => (FAKTURASTATUS.find(([k]) => k === f.status) || [f.status, f.status])[1],
                render: (f) => (
                  <SelStatus
                    alternativ={FAKTURASTATUS}
                    varde={f.status}
                    etikett={`Status för ${f.nr}`}
                    onChange={(v) => uppdStatus("fakturor", f.id, "status", v)}
                  />
                ),
              },
              {
                nyckel: "atgard",
                rubrik: "",
                bredd: 84,
                sorterbar: false,
                render: (f) =>
                  f.status === "fakturerad" ? null : (
                    <button type="button" className="btn sec mini" aria-label={`Ångra ${f.nr}`} onClick={() => angra(f)}>
                      Ångra
                    </button>
                  ),
              },
            ]}
          />
          <Callout ton="warn">
            <b>Observera:</b> underlaget ersätter inte ÄTA-hanteringen. Tid som hör till en ÄTA ska vara anmäld
            och godkänd enligt ABT 06 kap. 2 innan den faktureras — se ÄTA och hinder.
          </Callout>
        </Card>
      </div>
    </>
  );
}
