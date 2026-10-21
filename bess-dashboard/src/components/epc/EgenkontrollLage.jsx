import { useEffect, useState } from "react";
import { hamtaGodkannanden } from "../../state/godkannanden.js";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../../data/projektkontroll.js";
import { kontrollId, kontrollSummering } from "../../lib/projektkontroll.js";
import { kontrollage } from "../../lib/epc.js";
import { HELA, tackningText, tolkaOmfattningar } from "../../lib/kontrollplan.js";
import { useSnabbUtskrift } from "../field/SnabbUtskrift.jsx";

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
  const ofullstandiga = mall.punkter.filter((p) => lage.tackning[p.id] && lage.tackning[p.id].klara < lage.tackning[p.id].totalt);

  return <section className="my-3 rounded-sm border border-solid border-hairline bg-surface p-3" aria-label={`Egenkontroller i moment ${fas}`}>
    <b className="text-sm">Verkliga egenkontroller</b>
    <label className="mt-2 flex flex-col gap-1 text-xs">Kontrollomfattning för moment {fas}<select value={omfattning} onChange={(e) => setOmfattning(e.target.value)}>{scopes.map((s) => <option key={s}>{s}</option>)}</select></label>
    <p className="my-2 text-sm">{sum.klara} av {sum.totalt} kompletta · {sum.oppna} öppna · {sum.avvikelser} Ej OK</p>
    {kvitterade ? (() => {
      const egna = mall.punkter.map((p) => ({ p, k: kvitterade.get(kontrollId(pid, omfattning, p.id)), r: index.get(kontrollId(pid, omfattning, p.id)) })).filter((x) => x.r?.resultat);
      const ok = egna.filter((x) => x.k && x.k.varde?.resultat === x.r.resultat && x.k.varde?.datum === x.r.datum).length;
      const senaste = egna.map((x) => x.k).filter(Boolean).sort((a, b) => (a.kvitterad_tid < b.kvitterad_tid ? 1 : -1))[0];
      return <p className="my-1 text-xs text-ink-soft">
        Serverkvitterade: <b className={ok === egna.length ? "text-ok-ink" : "text-warn-ink"}>{ok} av {egna.length}</b> registrerade resultat
        {senaste ? ` · senast kvitterad av ${senaste.kvitterad_epost} ${senaste.kvitterad_tid.slice(0, 16).replace("T", " ")} (utförd av ${senaste.utford_av || "–"})` : ""}
        {kvittens?.koade ? ` · ${kvittens.koade} väntar på kvittens` : ""}
      </p>;
    })() : null}

    <div className="my-2">
      <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-bold text-ink" aria-expanded={visaPlan} onClick={() => setVisaPlan((v) => !v)}>
        {visaPlan ? "▾ " : "▸ "}
        Kontrollplan: {lage.planerade.length ? `${lage.planerade.length} enheter` : "inga enheter angivna"}{lage.omfattningar.length ? ` · momentet kräver ${lage.omfattningar.length} omfattning${lage.omfattningar.length === 1 ? "" : "ar"}` : " · ingen omfattning registrerad"}
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
              <span>{p.id} {p.titel}</span>
              <span className="whitespace-nowrap font-bold text-warn-ink">{tackningText(lage.tackning[p.id])}</span>
            </li>
          ))}
        </ul>
      ) : lage.omfattningar.length ? <p className="my-1 text-xs text-ok-ink">Alla punkter täcker {tackningText({ klara: lage.omfattningar.length, totalt: lage.omfattningar.length })}.</p> : null}
      </> : null}
    </div>

    <p className="my-2 text-xs text-ink-soft">Samma sparade resultat som i fältmaterialet. Momentets bockar och grind är separat uppföljning.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn sec mini" onClick={() => snabb.fasblankett(pid, fas, { enhet: omfattning === HELA ? "" : omfattning })}>Skriv ut momentets blankett</button>
      <button type="button" className="btn sec mini" onClick={() => oppnaFaltmaterial({ mallpaket: "projekt", mallIds: [mall.id], enhet: omfattning === HELA ? "" : omfattning })}>Registrera egenkontroller – moment {fas}</button>
    </div>
  </section>;
}
