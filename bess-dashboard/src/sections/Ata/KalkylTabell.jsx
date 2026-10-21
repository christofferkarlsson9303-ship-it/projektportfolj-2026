import { TableRegion } from "../../components/ds/index.js";
import { DatumFalt, Falt, NumFalt, TaBortKnapp } from "../../components/ui/Falt.jsx";
import { fmtSEK } from "../../lib/format.js";
import { KALKYL_KATEGORIER } from "../../lib/planering.js";
import { OVERTID_VAL, medResurs, radSumma, tidslagText, utanOvertid } from "../../lib/atakalkyl.js";

/* Kalkylraderna som tabell. `k` är useAtaKalkyl(u). */

const tal = "text-right tabular-nums";
const radNamn = (r, i) => `rad ${i + 1}${r.resurs ? `, ${r.resurs}` : ""}`;

/** Kalkylraderna som tabell. `tomText` visas när ÄTA:n saknar rader. */
export function KalkylTabell({ u, k, tomText = "Inga rader ännu. Välj en resurs ovan." }) {
  const { resurser, rader, andra, taBort, nyRadEfter } = k;
  return (
    <TableRegion label={`Kalkylrader för ${u.nr}`}>
      <table className="w-full">
        <thead>
          <tr>
            <th scope="col" className="w-[140px]">
              Datum
            </th>
            <th scope="col">Beskrivning</th>
            <th scope="col" className="w-[190px]">
              Resurs
            </th>
            <th scope="col" className={`w-[100px] ${tal}`}>
              Antal
            </th>
            <th scope="col" className={`w-[100px] ${tal}`}>
              Á-pris
            </th>
            <th scope="col" className="w-[116px]">
              ÖT %
            </th>
            <th scope="col" className={`w-[90px] ${tal}`}>
              Påslag %
            </th>
            <th scope="col" className={`w-[120px] ${tal}`}>
              Summa
            </th>
            <th scope="col" className="w-[52px]">
              <span className="sr-only">Ta bort</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rader.length ? (
            rader.map((r, i) => {
              const ingenOt = utanOvertid(r.kategori);
              return (
                <tr key={r.id}>
                  <td data-label="Datum">
                    <DatumFalt varde={r.datum} etikett={`Datum, ${radNamn(r, i)}`} onCommit={(v) => andra(r.id, { datum: v })} />
                  </td>
                  <td
                    data-label="Beskrivning"
                    onKeyDownCapture={(e) => {
                      if (e.key === "Enter" && e.target.id === `kb-${r.id}`) setTimeout(() => nyRadEfter(r), 0);
                    }}
                  >
                    <Falt
                      id={`kb-${r.id}`}
                      varde={r.beskrivning || ""}
                      etikett={`Beskrivning, ${radNamn(r, i)}`}
                      placeholder="Vad, var — Enter ger ny rad"
                      onCommit={(v) => andra(r.id, { beskrivning: v })}
                      className="min-w-[200px] max-[640px]:min-w-0"
                    />
                  </td>
                  <td data-label="Resurs">
                    <select
                      value={r.resurs || ""}
                      aria-label={`Resurs, ${radNamn(r, i)}`}
                      onChange={(e) => {
                        const ny = resurser.find((x) => x.namn === e.target.value);
                        if (ny) andra(r.id, medResurs(r, ny));
                      }}
                    >
                      {!r.resurs ? <option value="">— välj resurs —</option> : null}
                      {r.resurs && !resurser.some((x) => x.namn === r.resurs) ? <option value={r.resurs}>{r.resurs}</option> : null}
                      {KALKYL_KATEGORIER.map(([kat, namn]) => (
                        <optgroup key={kat} label={namn}>
                          {resurser
                            .filter((x) => x.kategori === kat)
                            .map((x) => (
                              <option key={x.id} value={x.namn}>
                                {x.namn}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td data-label={`Antal (${r.enhet || "st"})`} className={tal}>
                    <NumFalt
                      varde={r.antal}
                      etikett={`Antal ${r.enhet || ""}, ${radNamn(r, i)}`.replace("  ", " ")}
                      onCommit={(v) => andra(r.id, { antal: v ?? 0 })}
                      className="max-w-[96px] text-right"
                    />
                  </td>
                  <td data-label="Á-pris" className={tal}>
                    {r.kategori === "material" ? (
                      <span className="text-ink-soft">1</span>
                    ) : (
                      <NumFalt
                        varde={r.apris}
                        etikett={`Á-pris, ${radNamn(r, i)}`}
                        onCommit={(v) => andra(r.id, { apris: v ?? 0 })}
                        className="max-w-[96px] text-right"
                      />
                    )}
                  </td>
                  <td data-label="ÖT %">
                    {r.faktor ? (
                      <span className="text-[12.5px] text-ink-soft" title="Tidslag ur tidrapporten">
                        {tidslagText(r.faktor)}
                      </span>
                    ) : ingenOt ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <select
                        value={String(r.ot || 0)}
                        className="min-w-[88px]"
                        aria-label={`Övertid i procent, ${radNamn(r, i)}`}
                        onChange={(e) => andra(r.id, { ot: Number(e.target.value) })}
                      >
                        {OVERTID_VAL.map((v) => (
                          <option key={v} value={String(v)}>
                            {v} %
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td data-label="Påslag %" className={tal}>
                    {r.kategori === "material" ? (
                      <NumFalt
                        varde={r.paslag}
                        etikett={`Påslag i procent, ${radNamn(r, i)}`}
                        onCommit={(v) => andra(r.id, { paslag: v ?? 0 })}
                        className="max-w-[72px] text-right"
                      />
                    ) : (
                      <span className="text-ink-soft">{r.paslag || 0}</span>
                    )}
                  </td>
                  <td data-label="Summa" className={`${tal} font-semibold text-ink`}>
                    {fmtSEK(Math.round(radSumma(r)))}
                  </td>
                  <td data-label="">
                    <TaBortKnapp etikett={`Ta bort ${radNamn(r, i)}`} onClick={() => taBort(r.id)} />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} className="text-[13px] text-ink-soft">
                {tomText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableRegion>
  );
}
