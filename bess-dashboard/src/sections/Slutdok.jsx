import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Card, Kpi, Note, Pill, Prog, Tabellyta } from "../components/ui/Primitiver.jsx";
import { DatumFalt, Falt } from "../components/ui/Falt.jsx";
import { Overlamningsindex } from "../components/ui/Overlamningsindex.jsx";
import { DOKSTATUS, SLUTDOK_MALL } from "../data/konstanter.js";
import {
  dagarTillM6,
  slutdokArLast,
  slutdokIndex,
  slutdokKritisktKlart,
} from "../lib/berakningar.js";
import { fmtProcent } from "../lib/format.js";

/* Slutdokumentation — grinden mot M6 och M7.

   Kategori 1–4 måste vara godkända innan slutbesiktning kan begäras. Det är
   inte en rekommendation: as-built enligt Appendix 03.7 är krav för
   slutbetalning, och flaggmotorn larmar när mindre än fjorton dagar återstår
   till färdigställandet och indexet ligger under 80 %.

   Raderna kommer ur SLUTDOK_MALL och sås i efterInlasning, inte här — en vy
   ska inte skriva data bara för att någon navigerar till den. */

export function Slutdok() {
  const { state, uppd } = usePortfolj();
  const { valtProjekt: pid, skrivUt } = useUi();

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const ix = slutdokIndex(state, pid);
  const d6 = dagarTillM6(state, pid);
  const gridOppen = slutdokKritisktKlart(state, pid);
  const larm = d6 !== null && d6 < 14 && ix.proc < 80;
  const kvar = ix.av - ix.godkanda;

  return (
    <>
      <Projektvaljare />

      <div className="grid g4">
        <Kpi
          label="Överlämningsindex"
          varde={fmtProcent(ix.proc)}
          hint={`${ix.godkanda} av ${ix.av} godkända`}
          klass={ix.proc < 80 ? "warn" : ""}
        />
        <Kpi label="Kvar att godkänna" varde={kvar} hint="handlingar" />
        <Kpi
          label="M6-grind"
          varde={gridOppen ? "Öppen" : "Spärrad"}
          hint={gridOppen ? "kritiska kategorier klara" : "kategori 1–4 ej kompletta"}
          klass={gridOppen ? "" : "bad"}
        />
        <Kpi
          label="Dagar till färdigställande"
          varde={d6 === null ? "—" : d6}
          hint="enligt tidplanen"
          klass={d6 !== null && d6 < 14 ? "bad" : ""}
        />
      </div>

      {larm ? (
        <Note niva="bad">
          <b>Kritiska överlämningshandlingar saknas inför slutbesiktning.</b> {d6} dagar kvar och index
          är {fmtProcent(ix.proc)}. As-built enligt Appendix 03.7 är krav för slutbetalning.
        </Note>
      ) : null}

      <Card klass="mt-4">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Slutdokumentation — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
            <div className="lead" style={{ margin: "4px 0 0" }}>
              Kategori 1–4 måste vara godkända innan M6 kan begäras.
            </div>
          </div>
          <div className="kortverktyg">
            <button
              type="button"
              className="btn sec mini"
              onClick={() => skrivUt(<Overlamningsindex state={state} pid={pid} />)}
            >
              Överlämningsindex (A4)
            </button>
          </div>
        </div>

        <div style={{ margin: "14px 0 4px" }}>
          <Prog
            procent={ix.proc}
            klart={ix.proc === 100}
            etikett={`${ix.godkanda} av ${ix.av} handlingar godkända`}
          />
        </div>
        <div className="barlab">
          <span>{ix.godkanda} godkända</span>
          <span>{fmtProcent(ix.proc)}</span>
        </div>

        {!gridOppen ? (
          <div className="lead slutdok-sparr">
            <span aria-hidden="true">⚠ </span>
            M6 slutbesiktning kräver 100 % godkända obligatoriska handlingar (kategori 1–4)
          </div>
        ) : null}
      </Card>

      {SLUTDOK_MALL.map(([kat]) => {
        const rader = ix.rader.filter((d) => d.kategori === kat);
        if (!rader.length) return null;
        const klara = rader.filter((d) => d.status === "godkand").length;

        return (
          <Card klass="mt-3" key={kat}>
            <div className="kortrad">
              <h3>{kat}</h3>
              <div className="kortverktyg">
                <span className="mbelopp">
                  {klara}/{rader.length} godkända
                </span>
              </div>
            </div>

            <Tabellyta etikett={`Slutdokumentation — ${kat}`}>
              <table style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th scope="col">Handling</th>
                    <th scope="col" style={{ width: 190 }}>
                      Status
                    </th>
                    <th scope="col" style={{ width: 150 }}>
                      Ansvarig
                    </th>
                    <th scope="col" style={{ width: 130 }}>
                      Senast
                    </th>
                    <th scope="col" style={{ width: 170 }}>
                      Referens
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map((d) => {
                    const last = slutdokArLast(d, pid, state);
                    return (
                      <tr key={d.id}>
                        <td data-label="Handling">{d.krav}</td>
                        <td data-label="Status">
                          {last ? (
                            <span title="Låst tills kategori 1–4 är godkända">
                              <Pill status="vantar" />
                              <span className="sr-only">
                                Låst — slutbesiktningsprotokollet väntar på M6
                              </span>
                            </span>
                          ) : (
                            <select
                              aria-label={`Status för ${d.krav}`}
                              value={d.status || "ejpaborjad"}
                              onChange={(e) => uppd("slutdok", d.id, "status", e.target.value)}
                            >
                              {DOKSTATUS.map(([v, n]) => (
                                <option key={v} value={v}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td data-label="Ansvarig">
                          <Falt
                            varde={d.ansvarig}
                            etikett={`Ansvarig för ${d.krav}`}
                            placeholder="Roll eller leverantör"
                            onCommit={(v) => uppd("slutdok", d.id, "ansvarig", v)}
                          />
                        </td>
                        <td data-label="Senast">
                          <DatumFalt
                            varde={d.senast}
                            etikett={`Senast för ${d.krav}`}
                            onCommit={(v) => uppd("slutdok", d.id, "senast", v)}
                          />
                        </td>
                        <td data-label="Referens">
                          <Falt
                            varde={d.referens}
                            etikett={`Referens för ${d.krav}`}
                            placeholder="Länk eller diarienr"
                            onCommit={(v) => uppd("slutdok", d.id, "referens", v)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Tabellyta>
          </Card>
        );
      })}
    </>
  );
}
