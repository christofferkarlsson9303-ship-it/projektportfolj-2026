import { usePortfolj } from "../../state/hooks.js";
import { Callout, TableRegion } from "../ds/index.js";

/* Konfliktvyn (granskning #70). Visas överst i arbetsytan när samma fält ändrats
   på två ställen (två flikar eller två enheter) sedan senaste gemensamma sparning.
   Vanliga fält har redan fått min version, men kan bytas. Kritiska fält –
   kontrollresultat, grinddatum, godkännanden – har behållit den sparade versionen
   och måste väljas här. */

function visa(v) {
  if (v === undefined) return <i className="text-ink-faint">borttagen</i>;
  if (v === null || v === "") return <i className="text-ink-faint">tomt</i>;
  if (typeof v === "object") return <code className="text-[11px]">{JSON.stringify(v).slice(0, 120)}</code>;
  return String(v);
}

export function KonfliktVy() {
  const { konflikter = [], losKonflikt } = usePortfolj();
  if (!konflikter.length) return null;
  const kritiska = konflikter.filter((k) => k.kritisk).length;
  return (
    <section className="mb-5" aria-label="Konflikter">
      <Callout ton={kritiska ? "bad" : "warn"}>
        <b>{konflikter.length} fält ändrades på två ställen.</b>{" "}
        {kritiska ? `${kritiska} är kritiska och har behållit den sparade versionen tills du väljer. ` : ""}
        Övriga har fått din version. Välj för varje rad.
        <TableRegion label="Konflikter att lösa" className="mt-3">
          <table>
            <thead>
              <tr>
                <th scope="col">Fält</th>
                <th scope="col">Tidigare</th>
                <th scope="col">Ditt</th>
                <th scope="col">Sparat</th>
                <th scope="col">Välj</th>
              </tr>
            </thead>
            <tbody>
              {konflikter.map((k) => (
                <tr key={k.vag}>
                  <td>
                    <code className="text-[11.5px]">{k.vag}</code>
                    {k.kritisk ? <span className="ml-2 rounded-full bg-bad-bg px-2 py-0.5 text-[10.5px] font-bold text-bad-ink">kritiskt</span> : null}
                  </td>
                  <td>{visa(k.bas)}</td>
                  <td>{visa(k.mina)}</td>
                  <td>{visa(k.deras)}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" className="btn sec mini" onClick={() => losKonflikt(k, "mina")}>Mitt</button>{" "}
                    <button type="button" className="btn sec mini" onClick={() => losKonflikt(k, "deras")}>Sparat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      </Callout>
    </section>
  );
}
