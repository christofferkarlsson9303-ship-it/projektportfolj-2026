import { usePortfolj } from "../../state/hooks.js";
import { EJ_VUNNET_ORSAKER } from "../../data/projektfaser.ts";
import { TableRegion } from "../ds/index.js";

/* Arkivet för förlorade anbud, skrivskyddat. Anbuden räknas inte i aktiva vyer, planering,
   resurser eller kassaflöde, men orsaken sparas så att man kan lära av dem. */

const orsakNamn = (k) => (EJ_VUNNET_ORSAKER.find(([id]) => id === k) || [null, "Orsak saknas"])[1];

export function ForloradeAnbud() {
  const { ejVunna } = usePortfolj();
  if (!ejVunna.length) return null;
  return (
    <section className="oversikt-sektion" aria-labelledby="ov-forlorade">
      <div className="oversikt-rubrik">
        <h2 id="ov-forlorade">Förlorade anbud</h2>
        <span className="oversikt-undertext">{ejVunna.length} i arkivet</span>
      </div>
      <TableRegion label="Förlorade anbud">
        <table>
          <caption className="sr-only">Anbud som inte vanns, med orsak. Listan går inte att ändra.</caption>
          <thead>
            <tr>
              {["AO-nr", "Namn", "Beställare", "Orsak", "Kommentar", "Markerat"].map((t) => (
                <th key={t} scope="col">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ejVunna.map((p) => (
              <tr key={p.id}>
                <td data-label="AO-nr">{p.nr || "—"}</td>
                <td data-label="Namn">{p.namn}</td>
                <td data-label="Beställare">{p.bestallare || "—"}</td>
                <td data-label="Orsak">{orsakNamn(p.orsakEjVunnet)}</td>
                <td data-label="Kommentar">{p.orsakEjVunnetText || "—"}</td>
                <td data-label="Markerat">{p.ejVunnetDatum || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableRegion>
    </section>
  );
}
