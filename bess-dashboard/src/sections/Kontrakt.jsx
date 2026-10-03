import { useRef, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Callout, Card, DataList, StatusBadge } from "../components/ds/index.js";
import { fmtSEK } from "../lib/format.js";
import { idag } from "../lib/datum.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";
import { fristText, granskaProfil, kontraktsprofil, tomProfil, vitePerVecka, viteTak } from "../lib/kontraktsprofil.js";

/* Kontraktet på en sida: det projektledaren behöver komma ihåg ur avtalet,
   med paragraf, så att originalet går att slå upp. Det visuella ankaret är
   fristerna — hur lång tid du har på dig — ritade som staplar i samma skala. */

/** Ungefärligt antal kalenderdagar, bara för att jämföra frister visuellt. */
const DAGAR = { timmar: 1 / 24, timme: 1 / 24, dagar: 1, dag: 1, bankdagar: 7 / 5, bankdag: 7 / 5, arbetsdagar: 7 / 5, veckor: 7, vecka: 7, "månader": 30, "månad": 30 };
const iDagar = (f) => (f.varde ?? 0) * (DAGAR[(f.enhet || "").toLowerCase()] ?? 1);
const procent = (v) => `${String(v).replace(".", ",")} %`;
const Ref = ({ children }) => (children ? <span className="whitespace-nowrap text-xs text-ink-soft">{children}</span> : null);

function laddaNed(namn, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: namn });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Frister({ frister }) {
  const sorterade = [...frister].sort((a, b) => iDagar(a) - iDagar(b));
  const max = Math.max(...sorterade.map(iDagar), 1);
  return <Card id="kt-frister" title="Hur lång tid du har på dig" subtitle="Kortast först. Stapeln visar ungefärlig kalendertid så att fristerna går att jämföra.">
    <ol className="m-0 flex list-none flex-col gap-4 p-0">{sorterade.map((f) => <li key={f.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-4">
      <div className="min-w-0">
        <p className="m-0 font-semibold leading-snug text-ink">{f.rubrik}</p>
        {f.vad ? <p className="m-0 mt-1 text-[13px] leading-snug text-ink-soft">{f.vad}</p> : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-3 rounded-full bg-one-bla" style={{ width: `max(0.75rem, ${(iDagar(f) / max) * 70}%)` }} />
          <b className="whitespace-nowrap font-head text-lg leading-none text-ink">{fristText(f)}</b>
        </div>
        <p className="m-0 mt-2 text-[13px] leading-snug text-ink">{f.foljd ? <>Om fristen missas: {f.foljd} </> : null}<Ref>{f.ref}</Ref></p>
        {f.intern ? <p className="m-0 mt-1 text-xs leading-snug text-ink-soft">Egen rutin: {f.intern}</p> : null}
      </div>
    </li>)}</ol>
  </Card>;
}

function Betalplan({ milstolpar, summa, betalning }) {
  return <Card id="kt-betalplan" title="Så får ni betalt" subtitle={[betalning?.villkorDagar ? `Faktura betalas inom ${betalning.villkorDagar} dagar.` : "", betalning?.forskott === false ? "Inget förskott." : ""].filter(Boolean).join(" ")}>
    <div aria-hidden="true" className="flex h-9 w-full overflow-hidden rounded-lg">{milstolpar.map((m, i) => <span key={m.kod} title={`${m.kod} ${m.namn}`} className={`flex items-center justify-center text-xs font-bold text-white ${i % 2 ? "bg-duvbla" : "bg-one-bla"}`} style={{ width: `${m.andel}%` }}>{m.andel >= 8 ? m.kod : ""}</span>)}</div>
    <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">{milstolpar.map((m) => <li key={m.kod} className="rounded-lg bg-sunken p-3">
      <p className="m-0 flex items-baseline justify-between gap-2"><b className="text-ink">{m.kod} {m.namn}</b><span className="whitespace-nowrap text-sm font-semibold text-ink">{procent(m.andel)}</span></p>
      {summa ? <p className="m-0 mt-1 text-sm text-ink">{fmtSEK(Math.round((m.andel / 100) * summa))}</p> : null}
      {m.krav ? <p className="m-0 mt-2 text-[13px] leading-snug text-ink-soft">{m.krav}</p> : null}
    </li>)}</ol>
    {betalning?.index || betalning?.ref ? <p className="m-0 text-[13px] text-ink-soft">{betalning.index} <Ref>{betalning.ref}</Ref></p> : null}
  </Card>;
}

function Viten({ viten, summa }) {
  return <Card id="kt-viten" title="Vad det kostar att missa" subtitle="Belopp räknade på kontraktssumman.">
    <ul className="m-0 flex list-none flex-col p-0">{viten.map((v) => {
      const vecka = vitePerVecka(v, summa);
      const tak = viteTak(v, summa);
      return <li key={v.id} className="grid grid-cols-1 gap-1 border-0 border-t border-solid border-hairline py-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
        <div className="min-w-0"><p className="m-0 font-semibold text-ink">{v.rubrik}</p>{v.nar ? <p className="m-0 mt-1 text-[13px] leading-snug text-ink-soft">{v.nar} <Ref>{v.ref}</Ref></p> : <Ref>{v.ref}</Ref>}</div>
        <div className="text-sm sm:text-right">
          <b className="text-ink">{vecka !== null ? `${fmtSEK(vecka)} per vecka` : v.beloppPerTillfalle ? `${fmtSEK(v.beloppPerTillfalle)} per tillfälle` : v.procentPerVecka !== null ? `${procent(v.procentPerVecka)} per vecka` : v.takProcent !== null ? procent(v.takProcent) : ""}</b>
          {tak !== null && (vecka !== null || v.beloppPerTillfalle) ? <p className="m-0 text-xs text-ink-soft">högst {fmtSEK(tak)}{v.takProcent ? ` (${procent(v.takProcent)})` : ""}</p> : null}
        </div>
      </li>;
    })}</ul>
  </Card>;
}

function Forhandsgranskning({ f, projekt, onSpara, onAvbryt }) {
  const p = projekt.find((x) => x.id === f.profil?.projektId);
  return <Card id="kt-import" title={`Granska innan du sparar: ${f.filnamn}`} subtitle={p ? `Gäller ${p.nr ? `${p.nr} ` : ""}${p.namn}. En tidigare profil för projektet ersätts.` : ""}>
    {f.granskning.fel.length ? <Callout ton="bad"><b>Filen kan inte sparas.</b><ul className="mb-0 mt-1 pl-5">{f.granskning.fel.map((t) => <li key={t}>{t}</li>)}</ul></Callout> : <DataList items={[
      { label: "Avtal", value: f.profil.kalla?.dokument, detail: f.profil.kalla?.datum },
      { label: "Innehåll", value: `${f.profil.frister?.length || 0} frister · ${f.profil.milstolpar?.length || 0} betalsteg · ${f.profil.viten?.length || 0} viten · ${f.profil.priser?.length || 0} priser` },
    ]} />}
    {f.granskning.varningar.length ? <Callout ton="warn"><b>Kontrollera:</b><ul className="mb-0 mt-1 pl-5">{f.granskning.varningar.map((t) => <li key={t}>{t}</li>)}</ul></Callout> : null}
    <div className="flex flex-wrap gap-2">{f.granskning.fel.length ? null : <button type="button" className="btn" onClick={onSpara}>Spara kontraktsprofilen</button>}<button type="button" className="btn sec" onClick={onAvbryt}>Avbryt</button></div>
  </Card>;
}

export function Kontrakt() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt, setValtProjekt, visaToast, bekrafta } = useUi();
  const filRef = useRef(null);
  const [forslag, setForslag] = useState(null);
  const p = state.projekt.find((x) => x.id === valtProjekt) || state.projekt[0];
  const k = p ? kontraktsprofil(state, p.id) : null;
  const summa = k?.kontraktssumma ?? p?.kontraktsvarde ?? null;

  const lasIn = async (fil) => {
    if (!fil) return;
    let profil = null;
    try { profil = JSON.parse(await fil.text()); } catch { /* granskningen nedan säger vad som är fel */ }
    setForslag({ filnamn: fil.name, profil, granskning: granskaProfil(profil, state.projekt) });
  };
  const spara = () => {
    dispatch({ type: "SPARA_KONTRAKT", profil: forslag.profil, av: hamtaNamn(), datum: idag() });
    setValtProjekt(forslag.profil.projektId);
    setForslag(null);
    visaToast("Kontraktsprofilen är sparad. Sidorna använder nu kontraktets villkor.");
  };
  const taBort = async () => {
    if (await bekrafta("Profilen tas bort från portföljen. Avtalet i dokumentmappen påverkas inte. Standardmallen gäller igen.", { titel: "Ta bort kontraktsprofilen?", ok: "Ta bort", fara: true })) {
      dispatch({ type: "TA_BORT_KONTRAKT", projektId: p.id });
      visaToast("Kontraktsprofilen är borttagen.");
    }
  };

  if (!p) return <p>Skapa ett projekt för att börja.</p>;
  const knappar = <>
    <button type="button" className="btn" onClick={() => filRef.current?.click()}>Läs in kontraktsprofil</button>
    <input ref={filRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Välj kontraktsprofil" onChange={(e) => { lasIn(e.target.files?.[0]); e.target.value = ""; }} />
  </>;

  return <div className="flex flex-col gap-4 lg:gap-6">
    <Projektvaljare />
    {forslag ? <Forhandsgranskning f={forslag} projekt={state.projekt} onSpara={spara} onAvbryt={() => setForslag(null)} /> : null}

    <Card id="kt-start" title={`Kontraktet – ${p.nr ? `${p.nr} ` : ""}${p.namn}`}
      subtitle={k ? `${k.kalla.dokument}${k.kalla.datum ? `, ${k.kalla.datum}` : ""}${k.avtalsform ? `. ${k.avtalsform}` : ""}` : "Ingen kontraktsprofil är inläst. Sidorna visar standardmallen från Batch C."}
      badge={k ? <StatusBadge ton="ok" label="Kontrollerat mot kontrakt" /> : <StatusBadge ton="warn" label="Standardmall" />} action={knappar}>
      {k ? <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div><p className="m-0 text-[13px] text-ink-soft">Kontraktssumma</p><p className="m-0 font-head text-3xl font-bold leading-tight text-ink">{fmtSEK(summa)}</p></div>
        {k.garanti?.arbetenAr ? <div><p className="m-0 text-[13px] text-ink-soft">Garanti</p><p className="m-0 text-lg font-semibold text-ink">{k.garanti.arbetenAr} år arbete{k.garanti.materialAr ? `, ${k.garanti.materialAr} år material` : ""}</p></div> : null}
        {k.sakerheter?.length ? <div><p className="m-0 text-[13px] text-ink-soft">Säkerhet</p><p className="m-0 text-lg font-semibold text-ink">{k.sakerheter.map((s) => procent(s.procent)).join(" + ")}</p></div> : null}
      </div> : <ol className="m-0 space-y-2 pl-5 text-sm">
        <li>Be Claude läsa avtalet i projektets mapp och ta fram en kontraktsprofil, eller fyll i den tomma mallen.</li>
        <li>Klicka på <b>Läs in kontraktsprofil</b> och välj filen.</li>
        <li>Granska förhandsvisningen och spara. Sedan använder Milstolpar, Ekonomi, ÄTA och HSEQ kontraktets villkor.</li>
      </ol>}
      {k ? null : <div><button type="button" className="btn sec mini" onClick={() => laddaNed(`kontraktsprofil-${p.nr || p.id}.json`, tomProfil(p.id))}>Ladda ned tom mall</button></div>}
    </Card>

    {k?.kontrollera?.length ? <Callout ton="warn"><b>Stäm av med beställaren eller i avtalet:</b><ul className="mb-0 mt-1 pl-5">{k.kontrollera.map((t) => <li key={t}>{t}</li>)}</ul></Callout> : null}
    {k?.frister?.length ? <Frister frister={k.frister} /> : null}
    {k?.milstolpar?.length ? <Betalplan milstolpar={k.milstolpar} summa={summa} betalning={k.betalning} /> : null}

    {k ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {k.viten?.length ? <Viten viten={k.viten} summa={summa} /> : null}
      {k.sakerheter?.length || k.garanti?.arbetenAr ? <Card id="kt-sakerhet" title="Säkerheter och garanti">
        <DataList items={[
          ...k.sakerheter.map((s) => ({ label: s.rubrik, value: `${procent(s.procent)}${summa ? ` · ${fmtSEK(Math.round((s.procent / 100) * summa))}` : ""}`, detail: [s.giltig, s.ref].filter(Boolean).join(" · ") })),
          ...(k.garanti?.arbetenAr ? [{ label: "Garantitid", value: `${k.garanti.arbetenAr} år för arbeten${k.garanti.materialAr ? `, ${k.garanti.materialAr} år för material och varor` : ""}`, detail: k.garanti.ref }] : []),
        ]} />
      </Card> : null}
    </div> : null}

    {k?.priser?.length ? <Card id="kt-priser" title="Priser för ändrat och tillkommande arbete" subtitle="Används när ÄTA inte har ett överenskommet pris.">
      <div className="tscroll" role="region" aria-label="Timpriser" tabIndex={0}><table className="w-full text-sm"><thead><tr><th className="text-left">Roll eller resurs</th><th className="text-right">Pris</th></tr></thead>
        <tbody>{k.priser.map((r) => <tr key={r.roll}><td>{r.roll}</td><td className="whitespace-nowrap text-right">{fmtSEK(r.pris)}{r.enhet ? ` / ${r.enhet}` : ""}</td></tr>)}</tbody></table></div>
      {k.prisvillkor?.length ? <ul className="m-0 space-y-1 pl-5 text-[13px] text-ink-soft">{k.prisvillkor.map((t) => <li key={t}>{t}</li>)}</ul> : null}
    </Card> : null}

    {k ? <p className="m-0 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
      <span>Inläst {k.inlast?.datum || "–"}{k.inlast?.av ? ` av ${k.inlast.av}` : ""}. Granskad av {k.kalla?.granskadAv || "–"}. Originalet gäller vid oklarhet.</span>
      <button type="button" className="btn sec mini" onClick={taBort}>Ta bort profilen</button>
    </p> : null}
  </div>;
}
