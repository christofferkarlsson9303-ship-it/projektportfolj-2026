import { useState } from "react";
import { Slideover } from "../ui/Slideover.jsx";
import { PTag } from "../ui/PTag.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { KOPPLINGSTYPER, nyHandelse, nyKoppladPost } from "../../lib/handelse.js";

/* Registrera händelse — från vilken vy som helst.

   Steg 1 är bara fyra saker: vad som hänt, ansvarig, nästa datum och ev. underlag.
   Det blir en punkt i valt projekt. Steg 2 erbjuder tillägg (ÄTA, hinder, risk) som
   skapar en separat, länkad post med grunduppgifterna förifyllda. Man kan stanna
   efter steg 1 och komplettera senare från punkten i Idag. */

const falt = "mt-1 block w-full";

export function HandelsePanel() {
  const { handelseOppen, setHandelseOppen, valtProjekt, visaToast } = useUi();
  if (!handelseOppen) return null;
  return <Panel key={valtProjekt} onStang={() => setHandelseOppen(false)} pid={valtProjekt} visaToast={visaToast} />;
}

function Panel({ onStang, pid, visaToast }) {
  const { state, laggTill, kopplaHandelse } = usePortfolj();
  const proj = state.projekt.find((p) => p.id === pid) || state.projekt[0];
  const [v, setV] = useState({ titel: "", agare: "", uppfoljning: "", underlag: "" });
  const [sparad, setSparad] = useState(null);
  const [fel, setFel] = useState("");

  if (!proj) return null;
  const projektNamn = `${proj.nr ? `${proj.nr} ` : ""}${proj.namn}`;
  const andra = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const spara = (e) => {
    e.preventDefault();
    if (!v.titel.trim()) {
      setFel("Beskriv vad som har hänt eller behöver göras.");
      return;
    }
    const rad = nyHandelse(proj.id, v);
    laggTill("punkter", rad);
    setSparad(rad);
    setFel("");
    visaToast("Händelsen är registrerad");
  };

  /* Den sparade punkten, som den ser ut nu — länkarna läggs på via reducern. */
  const aktuell = sparad ? state.punkter.find((p) => p.id === sparad.id) || sparad : null;

  const koppla = (typ) => {
    const post = nyKoppladPost(typ, state, aktuell);
    if (post) kopplaHandelse(aktuell.id, post);
  };

  const ny = () => {
    setV({ titel: "", agare: "", uppfoljning: "", underlag: "" });
    setSparad(null);
  };

  return (
    <Slideover titel="Registrera händelse" etikett="Registrera händelse" onStang={onStang}>
      <div className="flex flex-col gap-4 text-[14px]">
        <p className="m-0 flex flex-wrap items-center gap-2 text-ink-soft">
          Gäller projekt: <PTag pid={proj.id} /> <strong className="text-ink">{projektNamn}</strong>
        </p>

        {!sparad ? (
          <form className="flex flex-col gap-4" onSubmit={spara} noValidate>
            <label className="block">
              <span className="font-semibold text-ink">Vad har hänt eller behöver göras?</span>
              <textarea className={falt} rows={3} value={v.titel} onChange={andra("titel")} aria-invalid={fel ? "true" : undefined} />
              {fel ? <span role="alert" className="mt-1 block text-[13px] font-semibold text-bad-ink">{fel}</span> : null}
            </label>
            <label className="block">
              <span className="font-semibold text-ink">Ansvarig</span>
              <input className={falt} type="text" value={v.agare} onChange={andra("agare")} placeholder="Namn, lämna tomt om det inte är bestämt" />
            </label>
            <label className="block">
              <span className="font-semibold text-ink">Nästa datum</span>
              <input className={falt} type="date" value={v.uppfoljning} onChange={andra("uppfoljning")} />
              <span className="mt-1 block text-[12px] text-ink-soft">När du vill följa upp. Arbetsfristen kan sättas senare.</span>
            </label>
            <label className="block">
              <span className="font-semibold text-ink">Underlag (valfritt)</span>
              <input className={falt} type="text" value={v.underlag} onChange={andra("underlag")} placeholder="Dokument, ritning, länk eller mejl" />
            </label>
            <div>
              <button type="submit" className="btn">Spara händelse</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="m-0 rounded-lg bg-sunken px-3 py-2">
              <strong className="block text-ink">Sparad</strong>
              {aktuell.titel}
            </p>

            <section aria-label="Komplettera" className="flex flex-col gap-2">
              <h4 className="m-0 text-[13px] font-bold text-ink">Behöver den mer? Lägg till en länkad post</h4>
              <p className="m-0 text-[12px] text-ink-soft">
                Posten skapas separat i sitt register med texten förifylld, och kopplas till händelsen. Det går bra att göra
                det senare.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(KOPPLINGSTYPER).map(([typ, t]) => {
                  const finns = (aktuell.lankar || []).some((l) => l.typ === typ);
                  return (
                    <button key={typ} type="button" className="btn sec mini" disabled={finns} onClick={() => koppla(typ)}>
                      {finns ? `${t.etikett} kopplad` : `+ ${t.etikett}`}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-wrap gap-2 border-0 border-t border-solid border-hairline pt-3">
              <button type="button" className="btn sec mini" onClick={ny}>Registrera en till</button>
              <button type="button" className="btn mini" onClick={onStang}>Klar</button>
            </div>
          </div>
        )}
      </div>
    </Slideover>
  );
}
