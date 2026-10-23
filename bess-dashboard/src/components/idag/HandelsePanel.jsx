import { useEffect, useMemo, useState } from "react";
import { Camera, MapPin, X } from "lucide-react";
import { Slideover } from "../ui/Slideover.jsx";
import { PTag } from "../ui/PTag.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { KOPPLINGSTYPER, nyHandelse, nyKoppladPost } from "../../lib/handelse.js";
import { ORSAKER } from "../../data/konstanter.js";
import { MAX_FOTON, fotoSokvag, krympFoto, medSiterunda, nalPa, platser } from "../../lib/siterunda.js";
import { skapaRitningsArkiv } from "../../state/ritningsArkiv.js";

/* Registrera händelse — från vilken vy som helst, också på en siterunda i mobilen.

   Steg 1 är vad som hänt, ansvarig, nästa datum och ev. underlag, plus foto och
   plats på siten (lib/siterunda.js). Foton krymps och laddas upp till arkivet;
   en plats ger en nål i 3D. Med foto eller plats men utan datum blir nästa
   datum idag, så att punkten hamnar i Idag.
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
  const { state, laggTill, kopplaHandelse, dispatch } = usePortfolj();
  const proj = state.projekt.find((p) => p.id === pid) || state.projekt[0];
  const [v, setV] = useState({ titel: "", agare: "", uppfoljning: "", underlag: "" });
  const [sparad, setSparad] = useState(null);
  const [fel, setFel] = useState("");
  const [orsak, setOrsak] = useState("");
  const [filer, setFiler] = useState([]);
  const [platsId, setPlatsId] = useState("");
  const [laddar, setLaddar] = useState(false);
  const forhand = useMemo(() => filer.map((f) => URL.createObjectURL(f)), [filer]);
  useEffect(() => () => forhand.forEach((u) => URL.revokeObjectURL(u)), [forhand]);
  const platsLista = useMemo(() => (proj ? platser(state, proj.id) : []), [state, proj]);

  if (!proj) return null;
  const projektNamn = `${proj.nr ? `${proj.nr} ` : ""}${proj.namn}`;
  const andra = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const valjFoton = (e) => {
    const nya = [...(e.target.files || [])].filter((f) => /^image\//.test(f.type));
    setFiler((f) => [...f, ...nya].slice(0, MAX_FOTON));
    e.target.value = "";
  };

  const spara = async (e) => {
    e.preventDefault();
    if (!v.titel.trim()) {
      setFel("Beskriv vad som har hänt eller behöver göras.");
      return;
    }
    const grund = nyHandelse(proj.id, v);
    const foton = [];
    if (filer.length) {
      setLaddar(true);
      const arkiv = skapaRitningsArkiv();
      try {
        for (let i = 0; i < filer.length; i++) {
          const blob = await krympFoto(filer[i]);
          const sokvag = fotoSokvag(proj.id, grund.id, i);
          await arkiv.ladda(blob, sokvag);
          foton.push({ sokvag, lagring: arkiv.lage, storlek: blob.size, namn: filer[i].name || `foto-${i + 1}.jpg` });
        }
      } catch (err) {
        /* Punkten sparas inte — ta bort de foton som hann laddas upp, så att inga filer blir
           kvar utan punkt. Går borttagningen inte (bara administratören får ta bort i delat
           läge) ligger de kvar under projekt/foto/ i bucketen. */
        await Promise.allSettled(foton.map((f) => arkiv.taBort(f.sokvag)));
        setLaddar(false);
        setFel(`Fotot kunde inte sparas: ${err?.message || err}. Försök igen, eller spara utan foto.`);
        return;
      }
      setLaddar(false);
    }
    const plats = platsLista.find((x) => x.id === platsId) || null;
    const rad = medSiterunda(grund, { foton, plats });
    laggTill("punkter", rad);
    if (plats) {
      const nal = nalPa(state, proj.id, plats.id, rad.id);
      if (nal) dispatch({ type: "SITE_LAGG_TILL", rad: nal });
    }
    setSparad(rad);
    setFel("");
    visaToast(foton.length || plats ? "Händelsen är registrerad med foto och plats" : "Händelsen är registrerad");
  };

  /* Den sparade punkten, som den ser ut nu — länkarna läggs på via reducern. */
  const aktuell = sparad ? state.punkter.find((p) => p.id === sparad.id) || sparad : null;

  const koppla = (typ) => {
    const post = nyKoppladPost(typ, state, aktuell, { orsak });
    if (post) kopplaHandelse(aktuell.id, post);
  };

  const ny = () => {
    setV({ titel: "", agare: "", uppfoljning: "", underlag: "" });
    setFiler([]);
    setPlatsId("");
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
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-ink">Foto (valfritt)</span>
              <label className="btn sec inline-flex w-fit cursor-pointer items-center gap-2">
                <Camera size={16} aria-hidden="true" />
                {filer.length ? "Ta ett foto till" : "Ta foto"}
                <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={valjFoton} aria-label="Ta eller välj foto" />
              </label>
              {filer.length ? (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Valda foton">
                  {filer.map((f, i) => (
                    <li key={forhand[i]} className="relative">
                      <img src={forhand[i]} alt={`Foto ${i + 1}`} className="block h-20 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full border-0 bg-black/60 p-0.5 text-white"
                        aria-label={`Ta bort foto ${i + 1}`}
                        onClick={() => setFiler((x) => x.filter((_, j) => j !== i))}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <span className="text-[12px] text-ink-soft">Högst {MAX_FOTON} foton. De krymps före uppladdning.</span>
            </div>
            <label className="block">
              <span className="font-semibold text-ink">
                <MapPin size={14} aria-hidden="true" className="mr-1 inline align-[-2px]" />
                Plats på siten (valfritt)
              </span>
              <select className={falt} value={platsId} onChange={(e) => setPlatsId(e.target.value)} disabled={!platsLista.length}>
                <option value="">{platsLista.length ? "Ingen plats" : "Inget placerat på siten än"}</option>
                {platsLista.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.namn}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[12px] text-ink-soft">En nål sätts på platsen i Siten i 3D. Med foto eller plats och utan datum hamnar punkten i Idag i dag.</span>
            </label>
            <label className="block">
              <span className="font-semibold text-ink">Underlag (valfritt)</span>
              <input className={falt} type="text" value={v.underlag} onChange={andra("underlag")} placeholder="Dokument, ritning, länk eller mejl" />
            </label>
            <div>
              <button type="submit" className="btn" disabled={laddar}>{laddar ? "Sparar foton …" : "Spara händelse"}</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="m-0 rounded-lg bg-sunken px-3 py-2">
              <strong className="block text-ink">Sparad</strong>
              {aktuell.titel}
            </p>

            <section aria-label="Komplettera" className="flex flex-col gap-2">
              <h4 className="m-0 text-[13px] font-bold text-ink">Behöver den mer? Lägg till en ÄTA eller risk</h4>
              <p className="m-0 text-[12px] text-ink-soft">
                Posten skapas separat i sitt register med texten förifylld, och kopplas till händelsen. Det går bra att göra
                det senare.
              </p>
              <label className="block text-[13px]">
                <span className="font-semibold text-ink">Orsak till en ÄTA (valfritt)</span>
                <select className={falt} value={orsak} onChange={(e) => setOrsak(e.target.value)}>
                  <option value="">Ange senare</option>
                  {ORSAKER.map(([v, n]) => (
                    <option key={v} value={v}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[12px] text-ink-soft">Hinder och störning är orsaker, inte egna poster.</span>
              </label>
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
