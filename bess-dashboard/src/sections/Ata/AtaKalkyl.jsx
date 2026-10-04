import { useEffect, useMemo, useRef } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, Overline, StatusBadge, TableRegion } from "../../components/ds/index.js";
import { DatumFalt, Falt, NumFalt, TaBortKnapp } from "../../components/ui/Falt.jsx";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { AtaAvi } from "../../components/print/AtaAvi.jsx";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { idag } from "../../lib/datum.js";
import { laddaNer } from "../../lib/export.js";
import { fmtSEK } from "../../lib/format.js";
import { KALKYL_KATEGORIER, kalkylResurser } from "../../lib/planering.js";
import {
  MOMS_PROCENT,
  OVERTID_VAL,
  kalkylCsv,
  kalkylRader,
  kalkylSummor,
  medResurs,
  nyKalkylRad,
  radSumma,
  tidrapportRader,
  tidslagText,
  utanOvertid,
} from "../../lib/atakalkyl.js";

/* ÄTA-kalkylen — rader på ett befintligt ärende.

   Öppnas från registret eller ärendepanelen ("Öppna i kalkyl"); numret och
   benämningen kommer från posten. Raderna sparas på posten (kalkyl.rader)
   precis som alla andra fält. Beloppet på posten ändras först när
   användaren sparar kalkylen — då skrivs nettot, exkl. moms.

   Chips lägger en rad med en resurs: högst fyra per kategori, plus en tom
   rad. Enter i beskrivningen lägger en ny rad med samma resurs. Avi och PDF
   går samma väg som fältmaterialet (#utskrift och @react-pdf). */

const chip =
  "cursor-pointer rounded-full border border-solid border-hairline-stark bg-surface px-3 py-1 font-body text-[12.5px] font-semibold text-ink transition-colors hover:bg-sunken";

const tal = "text-right tabular-nums";

/** Avins dokumentmodell — samma för utskrift och PDF. */
function aviDokument(u, projekt, rader) {
  return {
    ata: u,
    projekt: projekt || { id: u.projektId, namn: "" },
    rader,
    summor: kalkylSummor(rader),
    dagbok: [],
    datum: idag(),
    skapadAv: hamtaNamn(),
  };
}

export function AtaKalkyl({ u, onStang }) {
  const { state, dispatch } = usePortfolj();
  const { skrivUt, visaToast } = useUi();
  const ref = useRef(null);
  const fokusRad = useRef(null);

  const resurser = useMemo(() => kalkylResurser(state), [state]);
  const rader = kalkylRader(u);
  const summor = kalkylSummor(rader);
  const franTid = tidrapportRader(state, u);
  const projekt = state.projekt.find((p) => p.id === u.projektId) || null;
  const sparat = u.belopp !== null && u.belopp !== undefined && u.belopp !== "" && Number(u.belopp) === summor.netto;

  /* Kortet öppnas en bit ner i vyn — rulla dit. */
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [u.id]);

  /* En ny rad får fokus i sin beskrivning när den har ritats. */
  useEffect(() => {
    const el = fokusRad.current && document.getElementById(`kb-${fokusRad.current}`);
    if (!el) return;
    fokusRad.current = null;
    el.focus();
  });

  const laggTill = (nya, efter) => dispatch({ type: "ATA_KALKYL_LAGG_TILL", id: u.id, rader: nya, efter });
  const andra = (radId, andring) => dispatch({ type: "ATA_KALKYL_ANDRA", id: u.id, radId, andring });

  const nyRad = (resurs) => {
    const r = nyKalkylRad(resurs);
    laggTill([r]);
    fokusRad.current = r.id;
  };

  /* Enter i beskrivningen: ny rad direkt under, med samma resurs och datum. */
  const nyRadEfter = (rad) => {
    const resurs = resurser.find((x) => x.namn === rad.resurs);
    const r = resurs
      ? nyKalkylRad(resurs, { datum: rad.datum })
      : { ...nyKalkylRad(null, { datum: rad.datum }), resurs: rad.resurs, kategori: rad.kategori, enhet: rad.enhet, apris: rad.apris, paslag: rad.paslag };
    laggTill([r], rad.id);
    fokusRad.current = r.id;
  };

  const spara = () => {
    dispatch({ type: "ATA_KALKYL_SPARA", id: u.id });
    visaToast(`${u.nr}: ${fmtSEK(summor.netto)} sparat på ärendet`);
  };

  const exporteraCsv = async () => {
    if (!rader.length) {
      visaToast("Kalkylen har inga rader.", "warn");
      return;
    }
    const r = await laddaNer(`ATA_kalkyl_${u.nr}_${idag()}.csv`.replace(/[^\p{L}\p{N}_.-]+/gu, "_"), kalkylCsv(rader));
    if (!r.tyst && r.txt) visaToast(r.txt, r.typ || "");
  };

  const perKategori = KALKYL_KATEGORIER.map(([k, namn]) => [namn, resurser.filter((r) => r.kategori === k).slice(0, 4)]);
  const radNamn = (r, i) => `rad ${i + 1}${r.resurs ? `, ${r.resurs}` : ""}`;

  return (
    <div ref={ref} className="scroll-mt-4">
      <Card
        id="ata-kalkyl"
        title={`ÄTA-kalkyl — ${u.nr}${u.benamning ? ` ${u.benamning}` : ""}`}
        subtitle="Raderna sparas på ärendet. Spara skriver nettot på ärendets belopp. Material och UE: faktisk kostnad + 10 % (ABT 06 kap. 6 § 9)."
        badge={sparat ? <StatusBadge ton="ok" label="Belopp sparat" /> : rader.length ? <StatusBadge ton="warn" label="Ej sparat på ärendet" /> : null}
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
        <TableRegion label={`Kalkylrader för ${u.nr}`}>
          <table className="w-full">
            <thead>
              <tr>
                <th scope="col" className="w-[140px]">Datum</th>
                <th scope="col">Beskrivning</th>
                <th scope="col" className="w-[190px]">Resurs</th>
                <th scope="col" className={`w-[100px] ${tal}`}>Antal</th>
                <th scope="col" className={`w-[100px] ${tal}`}>Á-pris</th>
                <th scope="col" className="w-[116px]">ÖT %</th>
                <th scope="col" className={`w-[90px] ${tal}`}>Påslag %</th>
                <th scope="col" className={`w-[120px] ${tal}`}>Summa</th>
                <th scope="col" className="w-[52px]">
                  <span className="sr-only">Ta bort</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rader.length ? (
                rader.map((r, i) => {
                  const ingenOt = utanOvertid(r.kategori);
                  return (
                    <tr key={r.id}>
                      <td data-label="Datum">
                        <DatumFalt varde={r.datum} etikett={`Datum, ${radNamn(r, i)}`} onCommit={(v) => andra(r.id, { datum: v })} />
                      </td>
                      <td
                        data-label="Beskrivning"
                        onKeyDownCapture={(e) => {
                          if (e.key === "Enter" && e.target.id === `kb-${r.id}`) setTimeout(() => nyRadEfter(r), 0);
                        }}
                      >
                        <Falt
                          id={`kb-${r.id}`}
                          varde={r.beskrivning || ""}
                          etikett={`Beskrivning, ${radNamn(r, i)}`}
                          placeholder="Vad, var — Enter ger ny rad"
                          onCommit={(v) => andra(r.id, { beskrivning: v })}
                          className="min-w-[200px] max-[640px]:min-w-0"
                        />
                      </td>
                      <td data-label="Resurs">
                        <select
                          value={r.resurs || ""}
                          aria-label={`Resurs, ${radNamn(r, i)}`}
                          onChange={(e) => {
                            const ny = resurser.find((x) => x.namn === e.target.value);
                            if (ny) andra(r.id, medResurs(r, ny));
                          }}
                        >
                          {!r.resurs ? <option value="">— välj resurs —</option> : null}
                          {r.resurs && !resurser.some((x) => x.namn === r.resurs) ? <option value={r.resurs}>{r.resurs}</option> : null}
                          {KALKYL_KATEGORIER.map(([k, namn]) => (
                            <optgroup key={k} label={namn}>
                              {resurser
                                .filter((x) => x.kategori === k)
                                .map((x) => (
                                  <option key={x.id} value={x.namn}>
                                    {x.namn}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td data-label={`Antal (${r.enhet || "st"})`} className={tal}>
                        <NumFalt
                          varde={r.antal}
                          etikett={`Antal ${r.enhet || ""}, ${radNamn(r, i)}`.replace("  ", " ")}
                          onCommit={(v) => andra(r.id, { antal: v ?? 0 })}
                          className="max-w-[96px] text-right"
                        />
                      </td>
                      <td data-label="Á-pris" className={tal}>
                        {r.kategori === "material" ? (
                          <span className="text-ink-soft">1</span>
                        ) : (
                          <NumFalt
                            varde={r.apris}
                            etikett={`Á-pris, ${radNamn(r, i)}`}
                            onCommit={(v) => andra(r.id, { apris: v ?? 0 })}
                            className="max-w-[96px] text-right"
                          />
                        )}
                      </td>
                      <td data-label="ÖT %">
                        {r.faktor ? (
                          <span className="text-[12.5px] text-ink-soft" title="Tidslag ur tidrapporten">
                            {tidslagText(r.faktor)}
                          </span>
                        ) : ingenOt ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <select
                            value={String(r.ot || 0)}
                            className="min-w-[88px]"
                            aria-label={`Övertid i procent, ${radNamn(r, i)}`}
                            onChange={(e) => andra(r.id, { ot: Number(e.target.value) })}
                          >
                            {OVERTID_VAL.map((v) => (
                              <option key={v} value={String(v)}>
                                {v} %
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td data-label="Påslag %" className={tal}>
                        {r.kategori === "material" ? (
                          <NumFalt
                            varde={r.paslag}
                            etikett={`Påslag i procent, ${radNamn(r, i)}`}
                            onCommit={(v) => andra(r.id, { paslag: v ?? 0 })}
                            className="max-w-[72px] text-right"
                          />
                        ) : (
                          <span className="text-ink-soft">{r.paslag || 0}</span>
                        )}
                      </td>
                      <td data-label="Summa" className={`${tal} font-semibold text-ink`}>
                        {fmtSEK(Math.round(radSumma(r)))}
                      </td>
                      <td data-label="">
                        <TaBortKnapp
                          etikett={`Ta bort ${radNamn(r, i)}`}
                          onClick={() => dispatch({ type: "ATA_KALKYL_TA_BORT", id: u.id, radId: r.id })}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-[13px] text-ink-soft">
                    Inga rader ännu. Välj en resurs ovan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableRegion>

        {/* ---------- Summering ---------- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="m-0 max-w-[46ch] text-[12.5px] leading-snug text-ink-soft">
            Beloppet på ärendet är {u.belopp === null || u.belopp === undefined || u.belopp === "" ? "inte satt" : fmtSEK(u.belopp)}
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
            Spara belopp på ärendet
          </button>
          <button
            type="button"
            className="btn sec"
            disabled={!rader.length}
            onClick={() => skrivUt(<AtaAvi dokument={aviDokument(u, projekt, rader)} />)}
          >
            Skriv ut avi
          </button>
          <PdfExporter
            dokument={aviDokument(u, projekt, rader)}
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
