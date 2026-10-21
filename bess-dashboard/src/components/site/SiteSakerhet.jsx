import { useState } from "react";
import { usePortfolj } from "../../state/hooks.js";
import { Callout } from "../ds/index.js";
import { STANDARDTOMT, fmtTal } from "../../lib/site.js";

/* Planeringsmodellens ram (granskning F11): tydlig märkning, projektets tomt och
   skyddsavstånden som regelobjekt med källa. Avstånd under ett verifierat krav
   listas som varningar. */
export function SiteSakerhet({ p, tomt, regler, brott }) {
  const { uppd } = usePortfolj();
  const [bredd, setBredd] = useState(String(tomt.bredd));
  const [djup, setDjup] = useState(String(tomt.djup));
  const [sedd, setSedd] = useState(`${p?.id}:${tomt.bredd}x${tomt.djup}`);
  const nyckel = `${p?.id}:${tomt.bredd}x${tomt.djup}`;
  if (nyckel !== sedd) {
    setSedd(nyckel);
    setBredd(String(tomt.bredd));
    setDjup(String(tomt.djup));
  }
  const spara = () => {
    const b = Number(String(bredd).replace(",", "."));
    const d = Number(String(djup).replace(",", "."));
    const ok = (v) => Number.isFinite(v) && v >= 20 && v <= 1000;
    if (!ok(b) || !ok(d)) {
      setBredd(String(tomt.bredd));
      setDjup(String(tomt.djup));
      return;
    }
    if (b === tomt.bredd && d === tomt.djup) return;
    uppd("projekt", p.id, "siteTomt", b === STANDARDTOMT.bredd && d === STANDARDTOMT.djup ? null : { bredd: b, djup: d });
  };
  const namn = (o) => o.namn || o.typ;

  return (
    <Callout ton={brott.length ? "warn" : "info"} role="note" aria-label="Planeringsmodell">
      <b>Planeringsmodell – ej projekteringsunderlag.</b> Lägen, mått och avstånd är ungefärliga och ersätter inte
      situationsplan, brandskyddsdokumentation eller tillverkarens installationskrav.
      {brott.length ? (
        <span className="mt-1 block font-bold text-warn-ink">
          {brott.length} {brott.length === 1 ? "avstånd ligger" : "avstånd ligger"} under profilens krav – se listan.
        </span>
      ) : null}
      <details className="mt-2">
        <summary className="cursor-pointer text-[12.5px] font-bold">Tomt och skyddsavstånd</summary>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex w-28 flex-col gap-1 text-xs">
            Tomtens bredd (m)
            <input type="number" min={20} max={1000} value={bredd} onChange={(e) => setBredd(e.target.value)} onBlur={spara} />
          </label>
          <label className="flex w-28 flex-col gap-1 text-xs">
            Tomtens djup (m)
            <input type="number" min={20} max={1000} value={djup} onChange={(e) => setDjup(e.target.value)} onBlur={spara} />
          </label>
          <span className="pb-1.5 text-xs text-ink-soft">
            {p?.siteTomt ? "Projektets egen tomt." : `Standardtomt ${STANDARDTOMT.bredd} × ${STANDARDTOMT.djup} m.`}
          </span>
        </div>
        <table className="mt-3">
          <caption className="sr-only">Skyddsavstånd med källa</caption>
          <thead>
            <tr>
              <th scope="col">Krav</th>
              <th scope="col">Fritt avstånd</th>
              <th scope="col">Källa</th>
            </tr>
          </thead>
          <tbody>
            {regler.map((r) => (
              <tr key={r.id}>
                <td>{r.text}</td>
                <td className="whitespace-nowrap">
                  {r.avstand === null ? <span className="text-ink-faint">Saknas</span> : `≥ ${fmtTal(r.avstand)} m`}
                  {r.avstand !== null && !r.verifierad ? <span className="text-warn-ink"> · att verifiera</span> : null}
                </td>
                <td className="text-xs text-ink-soft">{r.kalla}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {brott.length ? (
          <ul className="mt-3 list-none p-0 text-[12.5px]" aria-label="Avstånd under kravet">
            {brott.map((x) => (
              <li key={`${x.a.id}-${x.b.id}`} className="border-0 border-b border-solid border-hairline py-1">
                <b>{namn(x.a)}</b> – <b>{namn(x.b)}</b>: {fmtTal(x.avstand)} m fritt, kravet är {fmtTal(x.krav)} m
              </li>
            ))}
          </ul>
        ) : null}
      </details>
    </Callout>
  );
}
