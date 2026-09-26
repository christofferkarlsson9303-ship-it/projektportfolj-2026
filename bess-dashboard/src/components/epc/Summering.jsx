import { useMemo } from "react";
import { usePortfolj } from "../../state/hooks.js";
import { Tabellyta } from "../ui/Primitiver.jsx";
import { FasStatus } from "./Delar.jsx";
import { checklistsummering } from "../../lib/epc.js";

/* Summeringen av checklistan för valt projekt: fyra tal överst och en rad per
   fas. Mätaren är andel klart av det som är aktuellt, i samma ton som
   Gantt-schemat; siffrorna står alltid bredvid, så mätaren är dekor för
   skärmläsare. Fasnamnet är en knapp som öppnar fasen i guiden. */

function Matare({ klara, aktuella }) {
  const andel = aktuella ? Math.round((klara / aktuella) * 100) : 100;
  return (
    <span className="epc-matarcell">
      <span className="epc-matare" aria-hidden="true">
        <i style={{ width: andel + "%" }} />
      </span>
      <span className="epc-matartal">
        {klara}/{aktuella}
      </span>
    </span>
  );
}

export function Summering({ pid, onVisaFas }) {
  const { state } = usePortfolj();
  const { faser, lopande, totalt: t } = useMemo(() => checklistsummering(state, pid), [state, pid]);
  const aktuella = t.punkter - t.ejAktuella;

  return (
    <>
      <ul className="epc-tal epc-sumtal" aria-label="Status i checklistan">
        <li>
          <b>{t.andel} %</b>
          <span>
            klart — {t.klara} av {aktuella} punkter
          </span>
        </li>
        <li>
          <b>
            {t.hpKlara}/{t.hp}
          </b>
          <span>hållpunkter klara</span>
        </li>
        <li>
          <b>{t.grindar}/16</b>
          <span>grindar passerade</span>
        </li>
        <li>
          <b>{t.kvar}</b>
          <span>kvar{t.ejAktuella ? ` · ${t.ejAktuella} ej aktuella` : ""}</span>
        </li>
      </ul>

      <Tabellyta etikett="Status per fas">
        <table className="epc-sumtabell">
          <thead>
            <tr>
              <th scope="col">Fas</th>
              <th scope="col">Klara</th>
              <th scope="col">HP</th>
              <th scope="col">Kvar</th>
              <th scope="col">Läge</th>
            </tr>
          </thead>
          <tbody>
            {faser.map((f) => (
              <tr key={f.fas.nr} className={f.status}>
                <th scope="row" data-label="Fas">
                  <button type="button" className="epc-textknapp" onClick={() => onVisaFas(f.fas.nr)}>
                    {f.fas.nr} · {f.fas.kort}
                  </button>
                </th>
                <td data-label="Klara">
                  <Matare klara={f.klara} aktuella={f.punkter - f.ejAktuella} />
                </td>
                <td data-label="HP">{f.hp ? `${f.hpKlara}/${f.hp}` : "—"}</td>
                <td data-label="Kvar">
                  {f.kvar}
                  {f.hpKvar ? <small className="epc-punktref">varav {f.hpKvar} HP</small> : null}
                </td>
                <td data-label="Läge">
                  <FasStatus status={f.status} />
                  {!f.grind.passerad && !f.kvar ? (
                    <small className="epc-punktref">{f.fas.grind.kod} kan passeras</small>
                  ) : null}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" data-label="Fas">
                <button type="button" className="epc-textknapp" onClick={() => onVisaFas("lop")}>
                  ∞ · Löpande
                </button>
              </th>
              <td data-label="Klara">
                <Matare klara={lopande.klara} aktuella={lopande.punkter - lopande.ejAktuella} />
              </td>
              <td data-label="HP">—</td>
              <td data-label="Kvar">{lopande.kvar}</td>
              <td data-label="Läge">
                <span className="epc-plantext">Rutiner hela projektet</span>
              </td>
            </tr>
          </tbody>
        </table>
      </Tabellyta>
    </>
  );
}
