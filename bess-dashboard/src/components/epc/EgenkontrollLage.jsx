import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../../data/projektkontroll.js";
import { kontrollId, kontrollSummering } from "../../lib/projektkontroll.js";

export function EgenkontrollLage({ pid, fas }) {
  const { state } = usePortfolj();
  const { oppnaFaltmaterial } = useUi();
  const [omfattning, setOmfattning] = useState("Hela anläggningen");
  const mall = PROJEKTMALLAR.find((m) => m.id === `projekt-${fas}`);
  if (!mall) return null;
  const rader = (state.faltkontroller || []).filter((r) => r.projektId === pid);
  const scopes = [...new Set(["Hela anläggningen", ...rader.map((r) => r.omfattning).filter(Boolean)])];
  const index = new Map(rader.map((r) => [r.id, r]));
  const sum = kontrollSummering([{ ...mall, punkter: mall.punkter.map((p) => ({ ...p, kontroll: index.get(kontrollId(pid, omfattning, p.id)) })) }], PROJEKTKONTROLL_REVISION);
  return <section className="my-3 rounded-sm border border-solid border-hairline bg-surface p-3" aria-label={`Egenkontroller i fas ${fas}`}>
    <b className="text-sm">Verkliga egenkontroller</b>
    <label className="mt-2 flex flex-col gap-1 text-xs">Kontrollomfattning för fas {fas}<select value={omfattning} onChange={(e) => setOmfattning(e.target.value)}>{scopes.map((s) => <option key={s}>{s}</option>)}</select></label>
    <p className="my-2 text-sm">{sum.klara} av {sum.totalt} kompletta · {sum.oppna} öppna · {sum.avvikelser} Ej OK</p>
    <p className="my-2 text-xs text-ink-soft">Samma sparade resultat som i fältmaterialet. Fasens bockar och grind är separat uppföljning.</p>
    <button type="button" className="btn sec mini" onClick={() => oppnaFaltmaterial({ mallpaket: "projekt", mallIds: [mall.id], enhet: omfattning === "Hela anläggningen" ? "" : omfattning })}>Registrera egenkontroller – fas {fas}</button>
  </section>;
}
