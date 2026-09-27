import { useMemo, useState } from "react";
import { Check, ListChecks, MessageSquare, RotateCcw } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Markeringar } from "../epc/Delar.jsx";
import { Kommentarer, TidigareErfarenheter } from "../epc/Punkt.jsx";
import { MILSTOLPAR } from "../../data/bessChecklistData.ts";
import { idag } from "../../lib/datum.js";
import { kommentarerFor, nastaUppgifter, tidigareErfarenheter } from "../../lib/epc.js";
import { Lank, Ruta } from "./Ruta.jsx";
import { StatusBadge } from "../ds/StatusBadge.jsx";

/* Nästa uppgift — det enda som behöver göras just nu i valt projekt.

   Kön räknas fram i lib/epc.js (nastaUppgifter): försenade ledtider först,
   sedan öppna punkter i försenade och pågående faser i checklistans ordning,
   och grinden när en fas är klar. Bockas uppgiften av vaskas nästa fram
   direkt; det senaste går att ångra. Tidigare projekts erfarenheter på samma
   punkt står på kortet, så lärdomen dyker upp när den behövs. */

const kortNamn = (p) => (p.nr ? p.nr + " " : "") + (p.ort || p.namn);
const nrText = (id) => id.replace("lop.", "∞.");
const nyckelFor = (u) => (!u ? "tom" : u.typ === "grind" ? u.fas.fas.grind.kod : u.punkt.id);

function Projektflikar() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt } = useUi();
  return (
    <div className="ov-flikar" role="group" aria-label="Projekt för nästa uppgift">
      {state.projekt.map((p) => (
        <button key={p.id} type="button" aria-pressed={valtProjekt === p.id} onClick={() => setValtProjekt(p.id)}>
          {kortNamn(p)}
        </button>
      ))}
    </div>
  );
}

export function NastaUppgift({ i }) {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid, oppnaPost, visa } = useUi();
  const nu = idag();
  const ko = useMemo(() => nastaUppgifter(state, pid, nu), [state, pid, nu]);
  const p = state.projekt.find((x) => x.id === pid);
  const forsta = ko[0] || null;
  const nyckel = nyckelFor(forsta);

  const [senast, setSenast] = useState(null);
  const [kommentera, setKommentera] = useState(false);
  const [seddNyckel, setSeddNyckel] = useState(nyckel);
  if (seddNyckel !== nyckel) {
    setSeddNyckel(nyckel);
    setKommentera(false);
  }

  if (!p) return null;

  const f = forsta?.fas;
  const fasText = f ? `Fas ${f.fas.nr} ${f.fas.kort}: ${f.klara} av ${f.punkter - f.ejAktuella} klara` : "";

  const sattPunkt = (status) => {
    dispatch({ type: "EPC_PUNKT", pid, punkt: forsta.punkt.id, status });
    setSenast({ pid, typ: "punkt", id: forsta.punkt.id, status });
  };
  const passeraGrind = () => {
    dispatch({ type: "EPC_FAS", pid, fas: f.fas.nr, falt: "grindDatum", varde: idag() });
    setSenast({ pid, typ: "grind", fas: f.fas.nr, kod: f.fas.grind.kod });
  };
  const angra = () => {
    if (senast.typ === "grind") dispatch({ type: "EPC_FAS", pid, fas: senast.fas, falt: "grindDatum", varde: "" });
    else dispatch({ type: "EPC_PUNKT", pid, punkt: senast.id, status: "" });
    setSenast(null);
  };

  const tidigare = forsta?.typ === "punkt" ? tidigareErfarenheter(state, forsta.punkt.id, pid) : [];
  const antalKomm = forsta?.typ === "punkt" ? kommentarerFor(state, pid, forsta.punkt.id).length : 0;
  const ms = forsta?.typ === "grind" && f.fas.milstolpe ? MILSTOLPAR.find((m) => m.kod === f.fas.milstolpe) : null;
  const visaSenast = senast && senast.pid === pid;

  return (
    <Ruta
      id="ov-nasta"
      i={i}
      ikon={ListChecks}
      ikonTon={forsta?.ton === "bad" ? "bad" : forsta?.ton === "warn" ? "warn" : ""}
      titel="Nästa uppgift"
      under={`${kortNamn(p)} · ${ko.length ? `${ko.length} i kön just nu` : "inget i kön"}`}
      klass="ov-nasta"
      atgard={
        <Lank onClick={() => visa("epc")} etikett="Öppna hela checklistan under Bygga batteripark">
          Hela checklistan
        </Lank>
      }
    >
      <Projektflikar />

      <div className="ov-nasta-grid">
        <div className="ov-nasta-kort" key={nyckel}>
          {forsta ? (
            <>
              <div className="ov-nasta-orsak">
                <StatusBadge ton={forsta.ton || "neutral"} label={forsta.orsak} wrap />
                <span className="ov-nasta-fas">{fasText}</span>
              </div>

              {forsta.typ === "punkt" ? (
                <>
                  <p className="ov-nasta-text">
                    <span className="ov-nasta-id">{nrText(forsta.punkt.id)}</span>
                    {forsta.punkt.text}
                  </p>
                  <p className="ov-nasta-meta">
                    <Markeringar badges={forsta.punkt.badges} />
                    <span>{forsta.punkt.ansvar}</span>
                    {forsta.punkt.nar && forsta.punkt.nar !== "—" ? <span>· {forsta.punkt.nar}</span> : null}
                  </p>
                  <TidigareErfarenheter lista={tidigare} kompakt />
                  <div className="ov-nasta-knappar">
                    <button type="button" className="btn ov-nasta-klar" onClick={() => sattPunkt("klar")}>
                      <Check size={16} aria-hidden="true" />
                      Klar
                      <span className="sr-only">: {nrText(forsta.punkt.id)}</span>
                    </button>
                    <button type="button" className="btn sec mini" onClick={() => sattPunkt("ejaktuell")}>
                      Ej aktuell
                    </button>
                    <button
                      type="button"
                      className="btn sec mini ov-nasta-komm"
                      aria-expanded={kommentera}
                      onClick={() => setKommentera((v) => !v)}
                    >
                      <MessageSquare size={14} aria-hidden="true" />
                      Kommentera{antalKomm ? ` (${antalKomm})` : ""}
                    </button>
                    <button
                      type="button"
                      className="epc-textknapp"
                      onClick={() => oppnaPost("epc", `kp-${forsta.punkt.id}`)}
                    >
                      Visa i guiden
                    </button>
                  </div>
                  {kommentera ? (
                    <Kommentarer pid={pid} punkt={forsta.punkt} onKlar={() => setKommentera(false)} />
                  ) : null}
                </>
              ) : (
                <>
                  <p className="ov-nasta-text">
                    <span className="ov-nasta-id">{f.fas.grind.kod}</span>
                    {f.fas.grind.text}
                  </p>
                  <p className="ov-nasta-meta">
                    <span>
                      Alla punkter i fas {f.fas.nr} är klara
                      {ms ? ` — grinden låser ${ms.kod} (${ms.andel} %): avisera beställaren` : ""}.
                    </span>
                  </p>
                  <div className="ov-nasta-knappar">
                    <button type="button" className="btn ov-nasta-klar" onClick={passeraGrind}>
                      <Check size={16} aria-hidden="true" />
                      Markera {f.fas.grind.kod} passerad idag
                    </button>
                    <button type="button" className="epc-textknapp" onClick={() => oppnaPost("epc", `fas-${f.fas.nr}`)}>
                      Visa fasen i guiden
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="ov-tom">
              Inget kvar att göra i de faser som pågår. Nästa fas syns här när den startar enligt planen.
            </div>
          )}

          <p className="ov-nasta-senast" aria-live="polite">
            {visaSenast ? (
              <>
                <Check size={14} aria-hidden="true" />
                {senast.typ === "grind"
                  ? `${senast.kod} passerad`
                  : `${nrText(senast.id)} ${senast.status === "klar" ? "klar" : "ej aktuell"}`}
                {forsta ? ` — nästa: ${forsta.typ === "grind" ? forsta.fas.fas.grind.kod : nrText(forsta.punkt.id)}` : ""}
                <button type="button" className="epc-textknapp" onClick={angra}>
                  <RotateCcw size={12} aria-hidden="true" /> Ångra
                </button>
              </>
            ) : null}
          </p>
        </div>

        {ko.length > 1 ? (
          <div className="ov-nasta-darefter">
            <h4>Därefter</h4>
            <ol>
              {ko.slice(1, 5).map((u) => (
                <li key={nyckelFor(u)}>
                  <button
                    type="button"
                    className="ov-hprad"
                    onClick={() =>
                      oppnaPost("epc", u.typ === "grind" ? `fas-${u.fas.fas.nr}` : `kp-${u.punkt.id}`)
                    }
                  >
                    <span className={`ov-nasta-idchip ${u.ton}`.trim()}>
                      {u.typ === "grind" ? u.fas.fas.grind.kod : nrText(u.punkt.id)}
                    </span>
                    <span className="ov-hptext">
                      {u.typ === "grind" ? u.fas.fas.grind.text : u.punkt.text}
                      <small>{u.orsak}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </Ruta>
  );
}
