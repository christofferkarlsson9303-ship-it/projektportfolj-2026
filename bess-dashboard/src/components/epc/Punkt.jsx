import { useState } from "react";
import { Lightbulb, Trash2 } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { StatusBadge } from "../ds/StatusBadge.jsx";
import { KOMMENTARTYP, PAVERKAN, kommentarerFor, tidigareErfarenheter } from "../../lib/epc.js";

/* Kommentarer, avvikelser och lärdomar på en kontrollpunkt.

   Det är här erfarenheterna samlas in: en avvikelse eller lärdom med
   "gör så här nästa gång" blir en rad i erfarenhetslistan, och visas på
   samma punkt när nästa projekt kommer dit. En notering är bara en
   anteckning och stannar i projektet. */

const kortProjekt = (p) => (p ? (p.nr ? p.nr + " " : "") + (p.ort || p.namn) : "");

function Kommentar({ k }) {
  const { dispatch } = usePortfolj();
  const { bekrafta } = useUi();
  const typ = KOMMENTARTYP[k.typ] || KOMMENTARTYP.notering;
  const tabort = async () => {
    if (await bekrafta("Kommentaren tas bort från punkten och från erfarenhetslistan.", { titel: "Ta bort kommentaren?", ok: "Ta bort", fara: true }))
      dispatch({ type: "EPC_KOMMENTAR_BORT", id: k.id });
  };
  return (
    <li className={`epc-komm ${k.typ}`}>
      <div className="epc-komm-huvud">
        <StatusBadge ton={typ.ton || "neutral"} label={typ.namn} />
        {k.typ !== "notering" ? <span className="epc-komm-meta">Påverkan {PAVERKAN[k.paverkan] || "Medel"}</span> : null}
        {k.kostnad ? <span className="epc-komm-meta">{k.kostnad} kr</span> : null}
        <span className="epc-komm-meta">
          {k.datum}
          {k.av ? ` · ${k.av}` : ""}
        </span>
        <button type="button" className="epc-ikonknapp" onClick={tabort} aria-label="Ta bort kommentaren">
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="epc-komm-text">{k.text}</p>
      {k.gorSa ? (
        <p className="epc-komm-gorsa">
          <b>Gör så här nästa gång:</b> {k.gorSa}
        </p>
      ) : null}
    </li>
  );
}

function NyKommentar({ pid, punkt, onKlar }) {
  const { dispatch } = usePortfolj();
  const [typ, setTyp] = useState("notering");
  const [text, setText] = useState("");
  const [gorSa, setGorSa] = useState("");
  const [paverkan, setPaverkan] = useState(2);
  const [kostnad, setKostnad] = useState("");
  const erfarenhet = typ !== "notering";
  const id = `nk-${pid}-${punkt.id}`;

  const spara = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: "EPC_KOMMENTAR", pid, punkt: punkt.id, typ, text, gorSa: erfarenhet ? gorSa : "", paverkan, kostnad: erfarenhet ? kostnad : "" });
    setText("");
    setGorSa("");
    setKostnad("");
    onKlar?.();
  };

  return (
    <form className="epc-nykomm" onSubmit={spara}>
      <div className="ov-flikar" role="group" aria-label="Typ av kommentar">
        {Object.entries(KOMMENTARTYP).map(([k, t]) => (
          <button key={k} type="button" aria-pressed={typ === k} onClick={() => setTyp(k)}>
            {t.namn}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`${id}-text`}>
        {erfarenhet ? "Vad hände" : "Kommentar"}
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={erfarenhet ? "Vad hände? Vad blev konsekvensen?" : "Anteckning på punkten…"}
        rows={2}
      />
      {erfarenhet ? (
        <>
          <label className="sr-only" htmlFor={`${id}-gorsa`}>
            Gör så här nästa gång
          </label>
          <input
            type="text"
            id={`${id}-gorsa`}
            value={gorSa}
            onChange={(e) => setGorSa(e.target.value)}
            placeholder="Gör så här nästa gång…"
          />
          <div className="epc-nykomm-rad">
            <label>
              Påverkan
              <select value={paverkan} onChange={(e) => setPaverkan(Number(e.target.value))}>
                {Object.entries(PAVERKAN).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kostnad (kr)
              <input type="text" inputMode="numeric" value={kostnad} onChange={(e) => setKostnad(e.target.value)} placeholder="valfritt" />
            </label>
          </div>
        </>
      ) : null}
      <div className="epc-nykomm-rad">
        <button type="submit" className="btn mini" disabled={!text.trim()}>
          Spara {KOMMENTARTYP[typ].namn.toLowerCase()}
        </button>
        {erfarenhet ? <span className="epc-plantext">Hamnar i erfarenhetslistan.</span> : null}
      </div>
    </form>
  );
}

/** Tidigare projekts avvikelser och lärdomar på samma punkt. */
export function TidigareErfarenheter({ lista, kompakt = false }) {
  const { state } = usePortfolj();
  if (!lista.length) return null;
  const visade = kompakt ? lista.slice(0, 2) : lista;
  return (
    <div className="epc-tidigare">
      <b>
        <Lightbulb size={14} aria-hidden="true" /> Erfarenhet från tidigare projekt
      </b>
      <ul>
        {visade.map((k) => (
          <li key={k.id}>
            <PTag pid={k.projektId} /> {k.text}
            {k.gorSa ? (
              <>
                {" "}
                — <b>gör så här:</b> {k.gorSa}
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {kompakt && lista.length > 2 ? (
        <span className="epc-plantext">
          + {lista.length - 2} till ({[...new Set(lista.map((k) => kortProjekt(state.projekt.find((p) => p.id === k.projektId))))].join(", ")})
        </span>
      ) : null}
    </div>
  );
}

/** Tråden på en punkt: tidigare projekts erfarenheter, projektets egna
 *  kommentarer och formuläret för en ny. */
export function Kommentarer({ pid, punkt, onKlar }) {
  const { state } = usePortfolj();
  const egna = kommentarerFor(state, pid, punkt.id);
  const tidigare = tidigareErfarenheter(state, punkt.id, pid);
  return (
    <div className="epc-kommentarer">
      <TidigareErfarenheter lista={tidigare} />
      {egna.length ? (
        <ul className="epc-kommlista" aria-label={`Kommentarer på ${punkt.id}`}>
          {egna.map((k) => (
            <Kommentar key={k.id} k={k} />
          ))}
        </ul>
      ) : null}
      <NyKommentar pid={pid} punkt={punkt} onKlar={onKlar} />
    </div>
  );
}
