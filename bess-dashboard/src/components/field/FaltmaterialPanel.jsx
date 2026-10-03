import { useEffect, useMemo, useRef, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { FALTMALLAR, KALLSTATUS } from "../../data/faltmaterial.js";
import { LAGMALLAR, LAGPLAN_INLEDNING } from "../../data/lagplan.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../../data/projektkontroll.js";
import { kontrollId } from "../../lib/projektkontroll.js";
import { KontrollResultat } from "./KontrollResultat.jsx";
import { arbetsrader, byggFaltmaterial } from "../../lib/faltmaterial.js";
import { idag, lokaltDatum } from "../../lib/datum.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { EgenkontrollDocument } from "../print/EgenkontrollDocument.jsx";
import { PrintableTodoList } from "../print/PrintableTodoList.jsx";
import { PdfExporter } from "../print/PdfExporter.jsx";


function lasVal(pid) {
  try { return JSON.parse(localStorage.getItem(`bess-faltmaterial-v1-${pid}`) || "{}"); }
  catch { return {}; }
}
function veckaSlut() {
  const d = new Date(`${idag()}T12:00:00`); d.setDate(d.getDate() + 7); return lokaltDatum(d);
}

/** Native dialog ger fokusfälla, Escape och återställt fokus. Panelen skapar
    bara blankt underlag; inget resultat eller EPC-status auto-markeras. */
export function FaltmaterialPanel({ projekt, urval, onValjProjekt, onStang }) {
  const { state, dispatch } = usePortfolj();
  const { skrivUt, oppnaPost } = useUi();
  const [sparat] = useState(() => lasVal(projekt.id));
  const [mallpaket, setMallpaket] = useState(() => urval?.ids ? "teknisk" : urval?.mallpaket || (sparat.version === 3 ? sparat.mallpaket : "projekt"));
  const mallar = mallpaket === "projekt" ? PROJEKTMALLAR : mallpaket === "lagplan" ? LAGMALLAR : FALTMALLAR;
  const alla = mallar.map((m) => m.id);
  const [mallIds, setMallIds] = useState(() => urval?.ids ? [] : urval?.mallIds ? urval.mallIds.filter((id) => alla.includes(id)) : sparat.version === 3 && (!urval?.mallpaket || urval.mallpaket === sparat.mallpaket) && Array.isArray(sparat.mallIds) ? sparat.mallIds.filter((id) => alla.includes(id)) : alla);
  const [typ, setTyp] = useState(() => urval?.ids ? "arbetslista" : ["egenkontroll", "arbetslista", "paket"].includes(sparat.typ) ? sparat.typ : "egenkontroll");
  const [utforare, setUtforare] = useState(() => urval?.ids ? "" : sparat.utforare || "");
  const [referenser, setReferenser] = useState(sparat.referenser || {});
  const [ansvar, setAnsvar] = useState(sparat.ansvar || {});
  const [metadata, setMetadata] = useState(() => ({ datum: idag(), skapadAv: hamtaNamn(), enhet: urval?.enhet ?? sparat.enhet ?? "", ritning: "", visaResultat: true, kontrollplan: sparat.kontrollplan || "", dokumentNr: "", lagmedlemmar: sparat.lagmedlemmar || {}, fran: urval?.ids ? "" : idag(), till: urval?.ids ? "" : veckaSlut() }));
  const [uppgiftIds, setUppgiftIds] = useState(() => new Set(urval?.ids || (state.punkter || []).map((p) => p.id)));
  const dialog = useRef(null);
  const forraFokus = useRef(null);
  useEffect(() => {
    forraFokus.current = document.activeElement;
    const el = dialog.current; el.showModal();
    return () => { el.close(); forraFokus.current?.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (urval?.ids || urval?.mallIds) return; // En engångslista eller fasgenväg får inte skriva över projektets mallval.
    try { localStorage.setItem(`bess-faltmaterial-v1-${projekt.id}`, JSON.stringify({ version: 3, enhet: metadata.enhet, kontrollplan: metadata.kontrollplan, mallpaket, mallIds, typ, utforare, referenser, ansvar, lagmedlemmar: metadata.lagmedlemmar })); }
    catch { /* Valen gäller fortfarande denna session. */ }
  }, [projekt.id, mallpaket, mallIds, typ, utforare, referenser, ansvar, metadata.lagmedlemmar, metadata.enhet, metadata.kontrollplan, urval?.ids, urval?.mallIds]);

  const uppgifter = useMemo(() => arbetsrader(state, projekt.id, { utforare, fran: metadata.fran, till: metadata.till, ids: urval?.ids }), [state, projekt.id, utforare, metadata.fran, metadata.till, urval?.ids]);
  const dokument = useMemo(() => byggFaltmaterial({ projekt, mallpaket, mallIds, kontroller: state.faltkontroller, referenser, ansvar, metadata: { ...metadata, utforare }, uppgifter: uppgifter.filter((p) => uppgiftIds.has(p.id)) }), [state.faltkontroller, projekt, mallpaket, mallIds, referenser, ansvar, metadata, utforare, uppgifter, uppgiftIds]);
  const omfattning = metadata.enhet.trim() || "Hela anläggningen";
  const kontrollIndex = new Map((state.faltkontroller || []).map((r) => [r.id, r]));
  const sparaKontroll = (p, falt, varde) => {
    const id = kontrollId(projekt.id, omfattning, p.id);
    const gammal = kontrollIndex.get(id);
    const rad = { ...gammal, id, projektId: projekt.id, omfattning, punktId: p.id, titel: p.titel, instruktion: p.instruktion, mallrevision: !gammal || falt === "resultat" || falt === "bekrafta" ? PROJEKTKONTROLL_REVISION : gammal.mallrevision, andrad: new Date().toISOString() };
    if (falt !== "bekrafta") rad[falt] = varde;
    dispatch({ type: "FALT_KONTROLL", rad });
  };
  const namn = [...new Set([
    ...(state.kontakter || []).flatMap((k) => [k.namn, k.org]),
    ...(state.punkter || []).map((p) => p.utforare || p.agare),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv"));
  const felPeriod = metadata.fran && metadata.till && metadata.fran > metadata.till;
  const kanExportera = !felPeriod && (typ === "egenkontroll" ? dokument.antal > 0 : dokument.antal > 0 || dokument.uppgifter.length > 0);
  const sattMeta = (falt) => (e) => setMetadata((m) => ({ ...m, [falt]: e.target.value }));
  const vaxlaMall = (id) => setMallIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const print = () => skrivUt(<>
    {typ !== "egenkontroll" ? <PrintableTodoList dokument={dokument} /> : null}
    {typ === "paket" ? <div className="field-packet-break" /> : null}
    {typ !== "arbetslista" ? <EgenkontrollDocument dokument={dokument} /> : null}
  </>);
  const stang = () => { dialog.current?.querySelector(":focus")?.blur(); onStang(); };

  return <dialog ref={dialog} className="field-material-dialog m-0 fixed left-1/2 top-1/2 max-h-[92dvh] w-[min(900px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto scroll-pt-40 scroll-pb-28 rounded-card border border-solid border-hairline bg-surface p-0 text-ink shadow-lift" aria-label={`Fältmaterial – ${projekt.namn}`} onCancel={(e) => { e.preventDefault(); stang(); }}>
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-0 border-b border-solid border-hairline bg-surface p-4">
      <div><h2 id="falt-titel" className="m-0 font-head text-xl">Fältmaterial – {projekt.namn}</h2><p className="m-0 mt-1 text-sm text-ink-soft">Följ projektets kontroller. Registrera resultat och bevis eller skriv ut en blank checklista.</p></div>
      <button type="button" className="btn sec mini" onClick={stang}>Stäng</button>
    </header>
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <label className="flex flex-col gap-1 text-sm font-semibold">Projekt<select value={projekt.id} onChange={(e) => onValjProjekt(e.target.value)}>{state.projekt.map((p) => <option value={p.id} key={p.id}>{p.nr || p.id} · {p.namn}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">Mallpaket<select value={mallpaket} onChange={(e) => { const v = e.target.value; setMallpaket(v); setMallIds((v === "projekt" ? PROJEKTMALLAR : v === "lagplan" ? LAGMALLAR : FALTMALLAR).map((m) => m.id)); }}><option value="projekt">Projektchecklista – förstudie till slutdokumentation</option><option value="lagplan">Lagplan – 6 montörer / totalentreprenad</option><option value="teknisk">Tekniska egenkontroller – 4 moment</option></select></label>
      {mallpaket === "projekt" ? <section className="rounded-sm border border-solid border-hairline bg-sunken p-3"><h3 className="m-0">Egenkontroll till beställaren</h3><p className="text-sm">Öppna en fas och registrera resultat, datum, kontrollant och protokollreferens. Textfält sparas när du lämnar fältet. Resultaten sparas i projektet; PDF är en daterad sammanställning.</p><label className="flex flex-col gap-1 text-sm font-semibold">Kontrollplan / dokumentnummer och revision<input type="text" maxLength={160} value={metadata.kontrollplan} onChange={sattMeta("kontrollplan")} /></label><label className="mt-3 flex flex-col gap-1 text-sm font-semibold">Dokumentnummer / rapportrevision<input type="text" maxLength={120} value={metadata.dokumentNr} placeholder="Automatiskt nummer om fältet lämnas tomt" onChange={sattMeta("dokumentNr")} /></label><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={metadata.visaResultat} onChange={(e) => setMetadata((m) => ({ ...m, visaResultat: e.target.checked }))} />Ta med registrerade resultat i egenkontrollrapporten</label><p className="mb-0 text-sm font-semibold">{dokument.sammanstallning.klara} av {dokument.sammanstallning.totalt} kompletta kontroller · {dokument.sammanstallning.oppna} öppna · {dokument.sammanstallning.avvikelser} Ej OK. {dokument.komplett && !dokument.sammanstallning.oppna && metadata.kontrollplan.trim() ? "Redo för granskning – ingen automatisk slutacceptans." : "Arbetsunderlag – komplettera och granska före överlämning."}</p></section> : null}
      {mallpaket === "lagplan" ? <section className="rounded-sm border border-solid border-hairline bg-sunken p-3"><h3 className="m-0">Vem arbetar i vilket lag?</h3><p className="text-sm">{LAGPLAN_INLEDNING}</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{["A", "B", "C"].map((lag) => <fieldset key={lag} className="min-w-0 border-0 p-0"><legend className="font-bold">Lag {lag}</legend>{[1, 2].map((nr) => <label key={nr} className="mt-2 flex flex-col text-sm">Montör {nr} – Lag {lag}<input type="text" maxLength={80} list="falt-utforare" value={metadata.lagmedlemmar[`${lag}${nr}`] || ""} onChange={(e) => setMetadata((m) => ({ ...m, lagmedlemmar: { ...m.lagmedlemmar, [`${lag}${nr}`]: e.target.value } }))} /></label>)}</fieldset>)}</div></section> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">Dokumenttyp<select value={typ} onChange={(e) => setTyp(e.target.value)}><option value="egenkontroll">Egenkontroller</option><option value="arbetslista">Arbetslista</option><option value="paket">Fältpaket: arbetslista + egenkontroller</option></select></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Montör / entreprenör<input type="text" list="falt-utforare" maxLength={80} placeholder="Alla / fyll i namn" value={utforare} onChange={(e) => setUtforare(e.target.value)} /></label>
        <datalist id="falt-utforare">{namn.map((n) => <option key={n} value={n} />)}</datalist>
        <label className="flex flex-col gap-1 text-sm font-semibold">Enhet / serienummer<input type="text" maxLength={80} placeholder={mallpaket === "projekt" ? "Hela anläggningen / ange enhet eller delområde" : "En blankett per container/enhet"} value={metadata.enhet} onChange={sattMeta("enhet")} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Ritning / revision<input type="text" maxLength={100} value={metadata.ritning} onChange={sattMeta("ritning")} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Datum<input type="date" value={metadata.datum} onChange={sattMeta("datum")} /></label>
        <label className="flex flex-col gap-1 text-sm font-semibold">Skapad av<input type="text" maxLength={80} value={metadata.skapadAv} onChange={sattMeta("skapadAv")} /></label>
      </div>
      <p className="m-0 rounded-sm border border-solid border-hairline bg-sunken p-3 text-sm leading-relaxed">{KALLSTATUS} Källskillnader visas i respektive kontrollpunkt och följer med utskriften.</p>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 font-head text-lg font-bold">Kontrollmoment</legend>
        {mallpaket === "lagplan" ? <div className="mb-3 flex flex-wrap gap-2" aria-label="Snabbval per lag">{["A", "B", "C"].map((lag) => <button type="button" className="btn sec mini" key={lag} onClick={() => setMallIds([`lag-${lag.toLowerCase()}`])}>Endast Lag {lag}</button>)}<button type="button" className="btn sec mini" onClick={() => setMallIds(["lag-start", "lag-slut"])}>Arbetsledarens lista</button></div> : null}
        <div className="mb-3 flex flex-wrap gap-2"><button type="button" className="btn sec mini" onClick={() => setMallIds(alla)}>{mallpaket === "projekt" ? "Välj hela projektet" : mallpaket === "lagplan" ? "Välj hela lagplanen" : "Välj alla fyra"}</button><button type="button" className="btn sec mini" onClick={() => setMallIds([])}>Rensa moment</button></div>
        <div className="flex flex-col gap-3">{mallar.map((m) => <section key={m.id} className="rounded-sm border border-solid border-hairline p-3">
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={mallIds.includes(m.id)} onChange={() => vaxlaMall(m.id)} />Moment {m.nr}: {m.titel}<span className="ml-auto whitespace-nowrap text-sm text-ink-soft">{m.punkter.length} punkter</span></label>
          {m.flode ? <p className="text-sm font-semibold text-one-bla">{m.flode}</p> : null}
          {mallIds.includes(m.id) ? <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold">Manual / provplan och revision – moment {m.nr}<input type="text" maxLength={140} value={referenser[m.id] || ""} placeholder="Dokumentnamn, revision och sida" onChange={(e) => setReferenser((r) => ({ ...r, [m.id]: e.target.value }))} /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold">Utförare – moment {m.nr}<input type="text" list="falt-utforare" maxLength={80} value={ansvar[m.id] || ""} placeholder={utforare || "Namn / organisation"} onChange={(e) => setAnsvar((r) => ({ ...r, [m.id]: e.target.value }))} /></label>
          </div> : null}
          <details className="mt-2 text-sm"><summary className="cursor-pointer text-one-bla">{mallpaket === "projekt" ? "Registrera egenkontroller / visa punkter" : "Visa kontrollpunkter och EPC-koppling"}</summary><ol className="m-0 mt-2 list-none p-0">{m.punkter.map((p) => <li className="border-0 border-t border-solid border-hairline py-2" key={p.id}>
            <b>{p.id} · {p.titel}</b><p className="m-0 mt-1 text-ink-soft">{p.instruktion}</p>
            {p.verifiering ? <p className="m-0 mt-1 text-warn-ink">{p.verifiering}</p> : null}
            <p className="m-0 mt-1 text-xs text-ink-faint">Kompetens: {p.roll} · EPC {p.epc.join(", ") || "Ny detaljpunkt"}</p>
            {mallpaket === "projekt" ? <KontrollResultat punkt={p} rad={kontrollIndex.get(kontrollId(projekt.id, omfattning, p.id))} revision={PROJEKTKONTROLL_REVISION} onSpara={(falt, varde) => sparaKontroll(p, falt, varde)} /> : null}
            {p.epc[0] ? <button type="button" className="btn sec mini mt-2" onClick={() => { onStang(); oppnaPost("epc", `kp-${p.epc[0]}`); }}>Öppna EPC {p.epc[0]}</button> : null}
          </li>)}</ol></details>
        </section>)}</div>
      </fieldset>
      {typ !== "egenkontroll" ? <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 font-head text-lg font-bold">Öppna projektuppgifter</legend>
        <div className="mb-3 grid grid-cols-2 gap-3"><label className="text-sm">Från<input type="date" value={metadata.fran} onChange={sattMeta("fran")} /></label><label className="text-sm">Till<input type="date" value={metadata.till} onChange={sattMeta("till")} /></label></div>
        {felPeriod ? <p role="alert" className="text-bad-ink">Till-datum måste vara samma dag som eller efter från-datum.</p> : null}
        {uppgifter.length ? uppgifter.map((p) => <label className="flex items-start gap-2 border-0 border-b border-solid border-hairline py-2 text-sm" key={p.id}><input type="checkbox" checked={uppgiftIds.has(p.id)} onChange={() => setUppgiftIds((v) => { const n = new Set(v); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} /><span>{p.titel}<small className="block text-ink-soft">{p.utforare || "Ej tilldelad"} · {p.datum || "Datum saknas"}</small></span></label>) : <p className="text-sm text-ink-soft">Inga öppna uppgifter matchar utförare och period. Valda kontrollmoment finns fortfarande med.</p>}
      </fieldset> : null}
      <p role="status" className="m-0 text-sm font-semibold">{mallIds.length} av {mallar.length} moment · {dokument.antal} kontrollpunkter{typ !== "egenkontroll" ? ` · ${dokument.uppgifter.length} projektuppgifter` : ""}. {mallpaket === "projekt" && metadata.visaResultat ? "Registrerade kontrollresultat följer egenkontrollrapporten. Underskrift lämnas för signering." : "Resultat, datum, notering och signatur lämnas tomma."}</p>
    </div>
    <footer className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-0 border-t border-solid border-hairline bg-surface p-4">
      <button type="button" className="btn sec" disabled={!kanExportera} onClick={print}>Skriv ut</button>
      <PdfExporter dokument={dokument} typ={typ} disabled={!kanExportera} />
    </footer>
  </dialog>;
}
