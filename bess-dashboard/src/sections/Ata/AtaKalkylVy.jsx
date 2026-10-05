import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Projektvaljare } from "../../components/ui/Projektvaljare.jsx";
import { Callout, Card, Overline, StatusBadge } from "../../components/ds/index.js";
import { Falt } from "../../components/ui/Falt.jsx";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { ORSAKER } from "../../data/konstanter.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { fmtSEK } from "../../lib/format.js";
import { nyAtaPost } from "../../lib/nyaPoster.js";
import { KALKYL_KATEGORIER } from "../../lib/planering.js";
import { MOMS_PROCENT, radSumma } from "../../lib/atakalkyl.js";
import { KalkylTabell } from "./KalkylTabell.jsx";
import { useAtaKalkyl } from "./useAtaKalkyl.jsx";

/* Fliken ÄTA-kalkyl — samma kalkyl som kortet under ÄTA och hinder, med
   artefaktens enkla upplägg: ärende överst, snabbval, rader, och en
   sammanställning till höger. Raderna och beloppet ligger på ärendet i
   portföljen; fliken har ingen egen lagring och ingen egen prislista. */

/* Färgpunkt per kategori i sammanställningen och på snabbvalens rubrik. */
const KATEGORI_TON = {
  arbete: ["bg-turkos", "text-turkos"],
  maskin: ["bg-one-djup", "text-one-djup"],
  fordon: ["bg-duvbla", "text-duvbla"],
  material: ["bg-orange", "text-orange"],
};

const chip =
  "cursor-pointer rounded-full border border-solid border-hairline-stark bg-surface px-3 py-1.5 font-body text-[13px] text-ink transition-colors hover:border-turkos hover:bg-sunken";

const tal = "text-right tabular-nums";

export function AtaKalkylVy() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga, postFokus } = useUi();
  const [valdId, setValdId] = useState(null);

  /* Andra vyer kan peka ut ett ärende: oppnaPost("atakalkyl", id). */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "atakalkyl" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setValdId(postFokus.id);
  }

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const arenden = state.ur.filter((u) => u.projektId === pid);
  // Senaste ärendet först i listan och som förval.
  const lista = [...arenden].reverse();
  const u = arenden.find((x) => x.id === valdId) || lista[0] || null;

  const nyPost = async () => {
    const sv = await fraga({
      titel: "Ny ÄTA / UR-post",
      lead: "Händelsedatum sätts till idag — 24-timmarsfristen för underrättelse börjar räknas därifrån.",
      falt: [{ namn: "benamning", etikett: "Kort beskrivning av händelsen", typ: "textarea" }],
      ok: "Registrera",
    });
    if (!sv || !sv.benamning) return;
    const post = nyAtaPost(state, pid, { benamning: sv.benamning, ansvarig: hamtaNamn() || "" });
    laggTill("ur", post);
    setValdId(post.id);
  };

  return (
    <>
      <Projektvaljare />
      {u ? (
        <Kalkyl key={u.id} u={u} p={p} lista={lista} onValj={setValdId} onNy={nyPost} />
      ) : (
        <Card id="ata-kalkyl-tom" title="Inget ÄTA-ärende i projektet">
          <p className="m-0 text-[13.5px] text-ink-soft">Kalkylen räknar på ett ärende. Registrera ett först, så öppnas det här.</p>
          <div>
            <button type="button" className="btn" onClick={nyPost}>
              + Ny ÄTA
            </button>
          </div>
        </Card>
      )}
    </>
  );
}

function Kalkyl({ u, p, lista, onValj, onNy }) {
  const { uppd } = usePortfolj();
  const k = useAtaKalkyl(u);
  const { resurser, rader, summor, franTid, harBelopp, sparat, laggTill, nyRad, spara, exporteraCsv, avi, skrivUtAvi } = k;

  const orsak = ORSAKER.find((o) => o[0] === u.orsak);
  const perKategori = KALKYL_KATEGORIER.map(([kat, namn]) => {
    const egna = rader.filter((r) => (r.kategori || "arbete") === kat);
    return {
      kat,
      namn,
      resurser: resurser.filter((r) => r.kategori === kat && !String(r.kalla).startsWith("Resurser")),
      summa: Math.round(egna.reduce((s, r) => s + radSumma(r), 0)),
    };
  });
  const timmar = rader.filter((r) => r.enhet === "tim").reduce((s, r) => s + (Number(r.antal) || 0), 0);
  const tom = !rader.length;

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          {/* ---------- Ärendet ---------- */}
          <Card id="ata-kalkyl-arende" title={`ÄTA-kalkyl — ${u.nr}${u.benamning ? ` ${u.benamning}` : ""}`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[240px] flex-1 flex-col gap-1">
                <Overline as="span">ÄTA-ärende</Overline>
                <select value={u.id} onChange={(e) => onValj(e.target.value)} aria-label="ÄTA-ärende">
                  {lista.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nr} {x.benamning || "(utan benämning)"}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn sec" onClick={onNy}>
                + Ny ÄTA
              </button>
            </div>

            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Projekt", `${p.nr ? p.nr + " " : ""}${p.namn}`],
                ["Beställare", p.bestallare || "—"],
                ["Händelsedatum", u.handelseDatum || "—"],
                ["Entreprenör", "ONE Nordic AB"],
              ].map(([rubrik, varde]) => (
                <div key={rubrik} className="min-w-0">
                  <dt>
                    <Overline as="span">{rubrik}</Overline>
                  </dt>
                  <dd className="m-0 mt-1 truncate border-0 border-b border-solid border-hairline pb-1 text-[14px] text-ink">{varde}</dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="flex flex-col gap-1">
                <Overline as="span">Benämning</Overline>
                <Falt varde={u.benamning || ""} etikett={`Benämning för ${u.nr}`} onCommit={(v) => uppd("ur", u.id, "benamning", v)} />
              </label>
              <div className="flex flex-col gap-1">
                <Overline as="span">Orsak</Overline>
                <p className="m-0 py-1 text-[14px] text-ink-soft">{orsak ? orsak[1] : "Ej vald — sätts på ärendet under ÄTA och hinder."}</p>
              </div>
            </div>
          </Card>

          {/* ---------- Snabbval ---------- */}
          <Card id="ata-kalkyl-snabbval" title="Snabbval" subtitle="Klicka för att lägga till en rad. Enhet, á-pris och påslag fylls i.">
            <div className="flex flex-col gap-3" role="group" aria-label="Lägg till rad">
              {perKategori.map(({ kat, namn, resurser: lista }) => (
                <div key={kat} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <span className={`pt-1.5 text-[13px] font-bold ${KATEGORI_TON[kat]?.[1] || "text-ink"}`}>{namn}</span>
                  <div className="flex flex-wrap gap-2">
                    {lista.map((r) => (
                      <button key={r.id} type="button" className={chip} onClick={() => nyRad(r)} title={`${fmtSEK(r.apris)} per ${r.enhet} · ${r.kalla}`}>
                        {r.namn}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ---------- Sammanställning ---------- */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <Card
            id="ata-kalkyl-summa"
            title="Sammanställning"
            badge={sparat ? <StatusBadge ton="ok" label="Belopp sparat" /> : tom ? null : <StatusBadge ton="warn" label="Ej sparat på ärendet" />}
          >
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13.5px]">
              {perKategori.map(({ kat, namn, summa }) => (
                <li key={kat} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className={`inline-block h-2 w-2 rounded-full ${KATEGORI_TON[kat]?.[0] || "bg-ink-faint"}`} aria-hidden="true" />
                    {namn}
                    {kat === "material" ? " (inkl. påslag)" : ""}
                  </span>
                  <span className={`${tal} text-ink`}>{fmtSEK(summa)}</span>
                </li>
              ))}
            </ul>

            <dl
              aria-label="Summering"
              className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-0 border-t border-solid border-hairline pt-3 text-[13.5px]"
            >
              <dt className="text-ink-soft">Netto</dt>
              <dd className={`m-0 ${tal} font-semibold text-ink`}>{fmtSEK(summor.netto)}</dd>
              <dt className="text-ink-soft">Moms {MOMS_PROCENT} %</dt>
              <dd className={`m-0 ${tal} text-ink`}>{fmtSEK(summor.moms)}</dd>
              <dt className="sr-only">Att betala</dt>
              <dd className="sr-only">{fmtSEK(summor.attBetala)}</dd>
            </dl>

            <div className="flex flex-col gap-1 rounded-lg bg-one-djup px-4 py-3 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Att betala inkl. moms</span>
              <span className={`text-[26px] font-bold leading-tight tabular-nums`} aria-label={`Att betala ${fmtSEK(summor.attBetala)}`}>
                {fmtSEK(summor.attBetala)}
              </span>
            </div>

            <p className="m-0 text-[12px] text-ink-faint">
              {rader.length} poster · {timmar.toLocaleString("sv-SE")} timmar
            </p>

            <div className="flex flex-col gap-2">
              <button type="button" className="btn" onClick={spara} disabled={tom}>
                Spara belopp på ärendet
              </button>
              <button type="button" className="btn sec" onClick={skrivUtAvi} disabled={tom}>
                Skriv ut avi
              </button>
              <PdfExporter dokument={avi} typ="avi" disabled={tom} label="Ladda ned avi (PDF)" className="btn sec" />
              <button type="button" className="btn sec" onClick={exporteraCsv} disabled={tom}>
                Exportera CSV
              </button>
            </div>
          </Card>

          <Callout ton="info">
            Raderna sparas på ärendet {u.nr}. Beloppet på ärendet är {harBelopp ? fmtSEK(u.belopp) : "inte satt"}
            {sparat || tom ? "." : ` — spara för att föra över ${fmtSEK(summor.netto)}.`} Á-priser från Bilaga 06.1 och Resurser. Material och UE: faktisk
            kostnad + 10 % (ABT 06 kap. 6 § 9).
          </Callout>
        </aside>
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
      <Card id="ata-kalkyl-rader" title="Rader">
        <KalkylTabell u={u} k={k} tomText="Inga poster ännu. Klicka på ett snabbval ovan." />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn sec mini" onClick={() => nyRad(null)}>
            + Lägg till tom rad
          </button>
          <span className="text-[12px] text-ink-faint">Enter i beskrivningen ger en ny rad med samma resurs.</span>
        </div>
      </Card>
    </div>
  );
}
