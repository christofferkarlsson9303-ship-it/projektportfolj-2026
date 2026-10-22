import { useEffect, useRef } from "react";
import { Callout, Card, Overline, StatusBadge } from "../../components/ds/index.js";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { fmtSEK } from "../../lib/format.js";
import { KALKYL_KATEGORIER } from "../../lib/planering.js";
import { MOMS_PROCENT } from "../../lib/atakalkyl.js";
import { KalkylTabell } from "./KalkylTabell.jsx";
import { useAtaKalkyl } from "./useAtaKalkyl.jsx";

const tal = "text-right tabular-nums";

/* ÄTA-kalkylen — rader på en befintlig ÄTA.

   Öppnas från registret eller ÄTA-panelen ("Öppna i kalkyl"); numret och
   benämningen kommer från posten. Raderna sparas på posten (kalkyl.rader)
   precis som alla andra fält. Beloppet på posten ändras först när
   användaren sparar kalkylen — då skrivs nettot, exkl. moms.

   Chips lägger en rad med en resurs: högst fyra per kategori, plus en tom
   rad. Enter i beskrivningen lägger en ny rad med samma resurs. Avi och PDF
   går samma väg som fältmaterialet (#utskrift och @react-pdf). */

const chip =
  "cursor-pointer rounded-full border border-solid border-hairline-stark bg-surface px-3 py-1 font-body text-[12.5px] font-semibold text-ink transition-colors hover:bg-sunken";

export function AtaKalkyl({ u, onStang }) {
  const ref = useRef(null);
  const k = useAtaKalkyl(u);
  const { resurser, rader, summor, franTid, sparat, laggTill, nyRad, spara, exporteraCsv, avi, skrivUtAvi } = k;

  /* Kortet öppnas en bit ner i vyn — rulla dit. */
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [u.id]);

  const perKategori = KALKYL_KATEGORIER.map(([k, namn]) => [namn, resurser.filter((r) => r.kategori === k).slice(0, 4)]);

  return (
    <div ref={ref} className="scroll-mt-4">
      <Card
        id="ata-kalkyl"
        title={`ÄTA-kalkyl — ${u.nr}${u.benamning ? ` ${u.benamning}` : ""}`}
        subtitle="Raderna sparas på ÄTA:n. Spara skriver nettot på ÄTA:ns belopp. Material och UE: faktisk kostnad + 10 % (ABT 06 kap. 6 § 9)."
        badge={sparat ? <StatusBadge ton="ok" label="Belopp sparat" /> : rader.length ? <StatusBadge ton="warn" label="Ej sparat på ÄTA:n" /> : null}
        action={
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng kalkylen
          </button>
        }
      >
        {/* ---------- Chips ---------- */}
        <div className="flex flex-col gap-2" role="group" aria-label="Lägg till rad">
          {perKategori.map(([namn, lista]) => (
            <div key={namn} className="flex flex-wrap items-center gap-2">
              <Overline as="span" className="w-32 shrink-0">
                {namn}
              </Overline>
              {lista.map((r) => (
                <button key={r.id} type="button" className={chip} onClick={() => nyRad(r)} title={`${fmtSEK(r.apris)} per ${r.enhet} · ${r.kalla}`}>
                  + {r.namn}
                </button>
              ))}
            </div>
          ))}
          <div>
            <button type="button" className={chip} onClick={() => nyRad(null)}>
              + Tom rad
            </button>
          </div>
        </div>

        {franTid.length ? (
          <Callout ton="info">
            <b>
              {franTid.length} tidrad{franTid.length > 1 ? "er" : ""} i tidrapporten är märkta {u.nr}.
            </b>{" "}
            De räknas med tidrapportens tidslag, inte med ett eget övertidsfält.
            <div className="mt-2">
              <button type="button" className="btn sec mini" onClick={() => laggTill(franTid)}>
                Hämta tid ur tidrapporten
              </button>
            </div>
          </Callout>
        ) : null}

        {/* ---------- Raderna ---------- */}
        <KalkylTabell u={u} k={k} />

        {/* ---------- Summering ---------- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="m-0 max-w-[46ch] text-[12.5px] leading-snug text-ink-soft">
            Beloppet på ÄTA:n är {u.belopp === null || u.belopp === undefined || u.belopp === "" ? "inte satt" : fmtSEK(u.belopp)}
            {sparat ? "." : rader.length ? `. Kalkylens netto är ${fmtSEK(summor.netto)} — spara för att föra över det.` : "."}
          </p>
          <dl aria-label="Summering" className="m-0 grid min-w-[260px] grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[13.5px]">
            <dt className="text-ink-soft">Netto</dt>
            <dd className={`m-0 ${tal} font-semibold text-ink`}>{fmtSEK(summor.netto)}</dd>
            <dt className="text-ink-soft">Moms {MOMS_PROCENT} %</dt>
            <dd className={`m-0 ${tal} text-ink`}>{fmtSEK(summor.moms)}</dd>
            <dt className="border-0 border-t border-solid border-hairline-stark pt-1 font-bold text-ink">Att betala</dt>
            <dd className={`m-0 border-0 border-t border-solid border-hairline-stark pt-1 ${tal} text-[16px] font-bold text-ink`}>
              {fmtSEK(summor.attBetala)}
            </dd>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={spara} disabled={!rader.length}>
            Spara belopp på ÄTA:n
          </button>
          <button
            type="button"
            className="btn sec"
            disabled={!rader.length}
            onClick={skrivUtAvi}
          >
            Skriv ut avi
          </button>
          <PdfExporter
            dokument={avi}
            typ="avi"
            disabled={!rader.length}
            label="Ladda ned avi (PDF)"
            className="btn sec"
          />
          <button type="button" className="btn sec" onClick={exporteraCsv} disabled={!rader.length}>
            Exportera CSV
          </button>
        </div>
      </Card>
    </div>
  );
}
