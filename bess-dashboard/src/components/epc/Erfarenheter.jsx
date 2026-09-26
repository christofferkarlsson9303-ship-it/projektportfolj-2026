import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import logotyp from "../../assets/one-nordic-logo.png";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { idag } from "../../lib/datum.js";
import { KOMMENTARTYP, PAVERKAN, erfarenheter, lagesbild } from "../../lib/epc.js";

/* Erfarenhetsåterföring: avvikelser och lärdomar från punkterna, vassast
   först. Listan byggs av sig själv medan projektet pågår — det enda som
   krävs är att avvikelsen kommenteras på punkten där den hände. När
   slutbesiktningen är godkänd är listan projektets lessons learned, klar att
   skriva ut och föra in i nästa anbud. */

const TOPP = 10;
const kortNamn = (p) => (p ? (p.nr ? p.nr + " " : "") + (p.ort || p.namn) : "");

function Rad({ e, nr, onVisaPunkt }) {
  const typ = KOMMENTARTYP[e.typ];
  return (
    <li className="epc-erfrad">
      <span className="epc-lardomnr" aria-hidden="true">
        {nr}
      </span>
      <div className="min-w-0">
        <div className="epc-erfhuvud">
          <span className={`epc-status ${typ.ton}`.trim()}>{typ.namn}</span>
          <PTag pid={e.projektId} />
          <span className="epc-komm-meta">Påverkan {PAVERKAN[e.paverkan] || "Medel"}</span>
          {e.kostnadKr ? <span className="epc-komm-meta">{e.kostnadKr.toLocaleString("sv-SE")} kr</span> : null}
          {e.aterkommer > 1 ? <span className="epc-mschip">Återkommer i {e.aterkommer} projekt</span> : null}
        </div>
        <b className="epc-erftext">{e.text}</b>
        <p className="epc-gorsa">
          <span>Gör så här nästa gång:</span> {e.gorSa || "— inte ifyllt ännu"}
        </p>
        {e.kp ? (
          <button type="button" className="epc-textknapp epc-erfpunkt" onClick={() => onVisaPunkt(e.punkt)}>
            {e.punkt.replace("lop.", "∞.")} {e.kp.text}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function Erfarenhetslista({ pid, onVisaPunkt }) {
  const { state } = usePortfolj();
  const { skrivUt } = useUi();
  const [omfang, setOmfang] = useState("projekt");
  const [allaVisas, setAllaVisas] = useState(false);
  const p = state.projekt.find((x) => x.id === pid);
  const filtPid = omfang === "projekt" ? pid : null;
  const lista = useMemo(() => erfarenheter(state, filtPid), [state, filtPid]);
  const visade = allaVisas ? lista : lista.slice(0, TOPP);
  const avslutat = lagesbild(state, pid).faser[14].grind.passerad;

  return (
    <div className="epc-erf">
      <div className="epc-erfverktyg">
        <div className="ov-flikar" role="group" aria-label="Erfarenheter för">
          <button type="button" aria-pressed={omfang === "projekt"} onClick={() => setOmfang("projekt")}>
            {kortNamn(p)}
          </button>
          <button type="button" aria-pressed={omfang === "alla"} onClick={() => setOmfang("alla")}>
            Alla projekt
          </button>
        </div>
        {lista.length ? (
          <button
            type="button"
            className="btn sec mini epc-skrivut"
            onClick={() => skrivUt(<Erfarenhetsrapport state={state} pid={filtPid} />)}
          >
            <Printer size={14} aria-hidden="true" /> Skriv ut
          </button>
        ) : null}
      </div>

      {omfang === "projekt" && avslutat && lista.length ? (
        <p className="epc-grindforslag">
          Slutbesiktningen är godkänd — det här är projektets erfarenhetslista. Gå igenom den på kick-out (15.14) och
          för in de viktigaste i nästa anbud.
        </p>
      ) : null}

      {visade.length ? (
        <ol className="epc-erflista">
          {visade.map((e, i) => (
            <Rad key={e.id} e={e} nr={i + 1} onVisaPunkt={onVisaPunkt} />
          ))}
        </ol>
      ) : (
        <div className="ov-tom">
          Inga avvikelser eller lärdomar ännu. Öppna kommentarerna på en punkt i guiden, välj Avvikelse eller Lärdom
          och skriv vad som hände och vad som ska göras nästa gång.
        </div>
      )}

      {lista.length > TOPP ? (
        <div>
          <button type="button" className="btn sec mini" onClick={() => setAllaVisas((v) => !v)} aria-expanded={allaVisas}>
            {allaVisas ? `Visa topp ${TOPP}` : `Visa alla ${lista.length}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Erfarenhetslistan som A4, för kick-out och nästa anbud. */
export function Erfarenhetsrapport({ state, pid }) {
  const p = pid ? state.projekt.find((x) => x.id === pid) : null;
  const lista = erfarenheter(state, pid);
  return (
    <>
      <div className="raphead med-logo">
        <img src={logotyp} alt="" className="logo" />
        <div>
          <h1>Erfarenhetsåterföring — lessons learned</h1>
          <div className="s">
            {p ? `${p.nr ? p.nr + " " : ""}${p.namn}` : "Alla projekt"} · {idag()} · ONE Nordic AB
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Punkt</th>
            <th>Vad hände</th>
            <th>Gör så här nästa gång</th>
            <th>Påverkan</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e, i) => (
            <tr key={e.id}>
              <td>{i + 1}</td>
              <td>
                {e.punkt.replace("lop.", "∞.")} {e.kp ? e.kp.text : ""}
                {pid ? "" : ` (${kortNamn(state.projekt.find((x) => x.id === e.projektId))})`}
              </td>
              <td>
                {KOMMENTARTYP[e.typ].namn}: {e.text}
              </td>
              <td>{e.gorSa || "—"}</td>
              <td>
                {PAVERKAN[e.paverkan] || "Medel"}
                {e.kostnadKr ? ` · ${e.kostnadKr.toLocaleString("sv-SE")} kr` : ""}
                {e.aterkommer > 1 ? ` · ${e.aterkommer} projekt` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
