import { useEffect, useState } from "react";
import { kontrollNr } from "../../data/kontrollnummer.js";
import { hamtaGodkannanden } from "../../state/godkannanden.js";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../../data/projektkontroll.js";
import { arUe, kontrollBrister, kontrollId, kontrollSummering } from "../../lib/projektkontroll.js";
import { kontrollage } from "../../lib/epc.js";
import { HELA, tackningText, tolkaOmfattningar } from "../../lib/kontrollplan.js";
import { useSnabbUtskrift } from "../field/SnabbUtskrift.jsx";
import { MONTOR } from "../../data/montortext.js";
import { profilIdFor } from "../../data/hardvaruprofiler.js";

export function EgenkontrollLage({ pid, fas }) {
  const { state, uppd, kvittens } = usePortfolj();
  /* Serverkvittenser (F05): vem som kvitterade och när, satt av databasen. null i lokalt läge. */
  const [kvitterade, setKvitterade] = useState(null);
  const antalKontroller = (state.faltkontroller || []).length;
  useEffect(() => {
    let aktiv = true;
    hamtaGodkannanden(pid).then((m) => aktiv && setKvitterade(m)).catch(() => aktiv && setKvitterade(null));
    return () => {
      aktiv = false;
    };
  }, [pid, antalKontroller, kvittens?.senast]);
  const { oppnaFaltmaterial } = useUi();
  const snabb = useSnabbUtskrift();
  const [omfattning, setOmfattning] = useState(HELA);
  const mall = PROJEKTMALLAR.find((m) => m.id === `projekt-${fas}`);
  const projekt = (state.projekt || []).find((p) => p.id === pid);
  const lage = kontrollage(state, pid)[fas];
  const [planText, setPlanText] = useState(() => (lage?.planerade || []).join("\n"));
  const [visaPlan, setVisaPlan] = useState(false);
  const [nyEnhet, setNyEnhet] = useState("");
  if (!mall || !lage) return null;
  const rader = (state.faltkontroller || []).filter((r) => r.projektId === pid);
  const scopes = [...new Set([HELA, ...lage.omfattningar, ...rader.map((r) => r.omfattning).filter(Boolean)])];
  const index = new Map(rader.map((r) => [r.id, r]));
  const sum = kontrollSummering([{ ...mall, punkter: mall.punkter.map((p) => ({ ...p, kontroll: index.get(kontrollId(pid, omfattning, p.id)) })) }], PROJEKTKONTROLL_REVISION);
  const sparaPlan = () => {
    const lista = tolkaOmfattningar(planText);
    setPlanText(lista.join("\n"));
    if (JSON.stringify(lista) === JSON.stringify(lage.planerade)) return;
    uppd("projekt", pid, "kontrollplan", { ...(projekt?.kontrollplan || {}), [String(fas)]: lista });
  };
  const laggTillEnhet = () => {
    const v = nyEnhet.trim();
    if (!v) return;
    const nyaEnheter = tolkaOmfattningar(v);
    if (!nyaEnheter.length) return;
    const lista = tolkaOmfattningar([...(lage.planerade.length ? lage.planerade : []), ...nyaEnheter].join("\n"));
    uppd("projekt", pid, "kontrollplan", { ...(projekt?.kontrollplan || {}), [String(fas)]: lista });
    setPlanText(lista.join("\n"));
    setOmfattning(lista.find((x) => x.toLocaleLowerCase("sv") === nyaEnheter[0].toLocaleLowerCase("sv")) || HELA);
    setNyEnhet("");
  };
  /* UE-kontroller i vald enhet som inte är klara: mottagen, granskad och skickad. */
  const ueKvar = mall.punkter.map((p) => ({ p, r: index.get(kontrollId(pid, omfattning, p.id)) }))
    .filter((x) => arUe(x.r) && kontrollBrister(x.r, PROJEKTKONTROLL_REVISION).length)
    .map((x) => ({ ...x, vad: !x.r.resultat ? "ej granskad" : x.r.resultat === "ej-ok" ? "åter till UE" : !x.r.skickadBestallare ? "ej skickad till beställaren" : "ofullständig" }));
  const ofullstandiga = mall.punkter.filter((p) => lage.tackning[p.id] && lage.tackning[p.id].klara < lage.tackning[p.id].totalt);

  return <section className="my-3 rounded-sm border border-solid border-hairline bg-surface p-3" aria-label={`Egenkontroller i moment ${fas}`}>
    <b className="text-sm">Egenkontroller</b>
    {/* UX-10: läget i klartext – vad som krävs för grinden, inte bara räknare. */}
    <p className="my-2 text-sm" data-testid="egenkontroll-lage">
      {sum.totalt && sum.klara === sum.totalt ? (
        <span className="font-bold text-ok-ink">Alla {sum.totalt} egenkontroller är gjorda.</span>
      ) : (
        <>
          <b className="text-warn-ink">
            {sum.totalt - sum.klara} av {sum.totalt} egenkontroll{sum.totalt === 1 ? "" : "er"} inte gjorda
          </b>{" "}
          – krävs för G{fas}.
        </>
      )}
      {sum.avvikelser ? (
        <>
          {" "}
          <b className="text-bad-ink">
            {sum.avvikelser} med avvikelse (Ej OK)
          </b>{" "}
          måste åtgärdas.
        </>
      ) : null}
    </p>
    <div className="mt-1 flex flex-wrap items-end gap-2 text-xs">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1">Kontrolleras för<select value={omfattning} onChange={(e) => setOmfattning(e.target.value)}>{scopes.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1">Lägg till enhet<input type="text" maxLength={80} value={nyEnhet} placeholder="T.ex. Batterifundament, Ställverk, SKID 1" onChange={(e) => setNyEnhet(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); laggTillEnhet(); } }} /></label>
      <button type="button" className="btn sec mini" disabled={!nyEnhet.trim()} onClick={laggTillEnhet}>Lägg till</button>
    </div>
    <p className="my-1 text-xs text-ink-soft">{lage.omfattningar.length > 1
      ? `Varje enhet kontrolleras för sig. G${fas} kräver en klar kontroll per punkt för: ${lage.omfattningar.join(", ")}.`
      : "Hela anläggningen = en gemensam kontroll för hela platsen. Kontrolleras något per enhet (t.ex. batterifundament och ställverksfundament), lägg till enheterna – då krävs en kontroll per enhet."}</p>
    {ueKvar.length ? <p className="my-1 text-xs font-bold text-warn-ink">UE-egenkontroller: {ueKvar.length} ej klara – {ueKvar.map((x) => `${kontrollNr(x.p.id)} ${x.vad}`).join(" · ")}</p> : null}
    {kvitterade ? (() => {
      const egna = mall.punkter.map((p) => ({ p, k: kvitterade.get(kontrollId(pid, omfattning, p.id)), r: index.get(kontrollId(pid, omfattning, p.id)) })).filter((x) => x.r?.resultat);
      const ok = egna.filter((x) => x.k && x.k.varde?.resultat === x.r.resultat && x.k.varde?.datum === x.r.datum).length;
      const senaste = egna.map((x) => x.k).filter(Boolean).sort((a, b) => (a.kvitterad_tid < b.kvitterad_tid ? 1 : -1))[0];
      if (!egna.length) return null;
      return <p className="my-1 text-xs text-ink-soft">
        Säkrat i molnet (med inloggning och servertid): <b className={ok === egna.length ? "text-ok-ink" : "text-warn-ink"}>{ok} av {egna.length}</b> registrerade resultat
        {senaste ? ` · senast kvitterad av ${senaste.kvitterad_epost} ${senaste.kvitterad_tid.slice(0, 16).replace("T", " ")} (utförd av ${senaste.utford_av || "–"})` : ""}
        {kvittens?.koade ? ` · ${kvittens.koade} väntar på kvittens` : ""}
      </p>;
    })() : null}

    <div className="my-2">
      <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-bold text-ink" aria-expanded={visaPlan} onClick={() => setVisaPlan((v) => !v)}>
        {visaPlan ? "▾ " : "▸ "}
        {lage.planerade.length ? `Kontrollplan: ${lage.planerade.length} enheter att kontrollera` : "Redigera enhetslistan"}{lage.omfattningar.length > 1 ? ` · ${lage.omfattningar.length} enheter har kontroller` : ""}
      </button>
      {visaPlan ? <>
      <label className="mt-2 flex flex-col gap-1 text-xs">
        Enheter som ska kontrolleras i moment {fas} (en per rad)
        <textarea rows={4} value={planText} placeholder={"Hela anläggningen\nSKID 1\nSKID 2\n+B1a"} onChange={(e) => setPlanText(e.target.value)} onBlur={sparaPlan} />
      </label>
      <p className="my-1 text-xs text-ink-soft">En punkt räknas verifierad först när varje enhet i planen och varje registrerad omfattning har en komplett kontroll.</p>
      {ofullstandiga.length ? (
        <ul className="my-1 list-none p-0 text-xs" aria-label="Täckning per punkt">
          {ofullstandiga.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 border-0 border-b border-solid border-hairline py-1">
              <span>{kontrollNr(p.id)} {p.titel}</span>
              <span className="whitespace-nowrap font-bold text-warn-ink">{tackningText(lage.tackning[p.id])}</span>
            </li>
          ))}
        </ul>
      ) : lage.omfattningar.length ? <p className="my-1 text-xs text-ok-ink">Alla punkter täcker {tackningText({ klara: lage.omfattningar.length, totalt: lage.omfattningar.length })}.</p> : null}
      </> : null}
    </div>

    <p className="my-2 text-xs text-ink-soft">Resultaten är desamma som i fältmaterialet. Bockarna i listan och grinden följs upp för sig.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn sec mini" onClick={() => snabb.fasblankett(pid, fas, { enhet: omfattning === HELA ? "" : omfattning })}>Skriv ut momentets blankett</button>
      {MONTOR[fas] && profilIdFor(projekt) === "catl-pe" ? <button type="button" className="btn sec mini" onClick={() => snabb.montorlista(pid, fas)}>Skriv ut montörens lista</button> : null}
      <button type="button" className="btn sec mini" onClick={() => oppnaFaltmaterial({ mallpaket: "projekt", mallIds: [mall.id], enhet: omfattning === HELA ? "" : omfattning })}>Registrera egenkontroller – moment {fas}</button>
    </div>
  </section>;
}
