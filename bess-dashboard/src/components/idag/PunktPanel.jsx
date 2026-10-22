import { useState } from "react";
import { Slideover } from "../ui/Slideover.jsx";
import { PTag } from "../ui/PTag.jsx";
import { DatumFalt, Falt, SelStatus } from "../ui/Falt.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { datumKort } from "../../lib/datum.js";
import { nyttId } from "../../lib/id.js";

/* Detaljpanel för en punkt i Idag. Ändrar samma rad som Öppna punkter —
   ansvarig, status, uppföljning och kommentar — utan att lämna arbetslistan.

   Frist och uppföljning är två olika datum. Fristen är punktens arbetsfrist och
   ändras i Öppna punkter; uppföljningen är när jag själv vill titta på den igen
   och kan flyttas här utan att fristen skrivs om. */

const falt = "mt-1 block w-full";
const KOPPLING_TEXT = { ata: "ÄTA", hinder: "Hinder", risk: "Risk" };

export function PunktPanel({ id, onStang, onOppnaRegister }) {
  const { state, uppd, uppdStatus, kommenteraPunkt } = usePortfolj();
  const { oppnaPost } = useUi();
  const [utkast, setUtkast] = useState("");
  const pt = state.punkter.find((x) => x.id === id);

  if (!pt) return null;

  const kommentarer = pt.kommentarer || [];
  const skicka = () => {
    const text = utkast.trim();
    if (!text) return;
    kommenteraPunkt(pt.id, { id: nyttId("kom"), text, av: hamtaNamn() || "", ts: new Date().toISOString() });
    setUtkast("");
  };

  return (
    <Slideover titel={pt.titel} etikett={`Punkt: ${pt.titel}`} onStang={onStang}>
      <div className="flex flex-col gap-4 text-[14px]">
        <p className="m-0 flex flex-wrap items-center gap-2 text-ink-soft">
          <PTag pid={pt.projektId} />
          <span>Ändringar här gäller bara den här punkten.</span>
        </p>

        {pt.kalla ? <p className="m-0 text-[13px] text-ink-soft">Källa: {pt.kalla}</p> : null}

        {pt.underlag ? <p className="m-0 text-[13px] text-ink-soft">Underlag: {pt.underlag}</p> : null}
        {(pt.lankar || []).length ? (
          <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
            Kopplat till:
            {pt.lankar.map((l) => (
              <button key={l.id} type="button" className="btn sec mini" onClick={() => oppnaPost(l.lista === "ur" ? "ata" : "risker", l.id)}>
                {KOPPLING_TEXT[l.typ] || l.typ} {l.etikett && l.etikett !== KOPPLING_TEXT[l.typ] ? l.etikett : ""}
              </button>
            ))}
          </p>
        ) : null}

        <label className="block">
          <span className="font-semibold text-ink">Ansvarig</span>
          <Falt className={falt} varde={pt.agare || ""} etikett="Ansvarig" onCommit={(v) => uppd("punkter", pt.id, "agare", v)} />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-ink">Min uppföljning</span>
            <DatumFalt className={falt} varde={pt.uppfoljning || ""} etikett={`Uppföljningsdatum för ${pt.titel}`} onCommit={(v) => uppd("punkter", pt.id, "uppfoljning", v)} />
            <span className="mt-1 block text-[12px] text-ink-soft">När jag vill titta på den igen. Rör inte fristen.</span>
          </label>
          <div>
            <span className="font-semibold text-ink">Frist</span>
            <p className="m-0 mt-2">{pt.forfaller ? datumKort(pt.forfaller) : "Ingen frist satt"}</p>
            <span className="mt-1 block text-[12px] text-ink-soft">Ändras i Öppna punkter.</span>
          </div>
        </div>

        <label className="block">
          <span className="font-semibold text-ink">Status</span>
          <SelStatus
            className={falt}
            alternativ={["oppen", "klarmarkerad"]}
            varde={pt.status}
            etikett={`Status för ${pt.titel}`}
            onChange={(v) => uppdStatus("punkter", pt.id, "status", v)}
          />
        </label>

        <section aria-label="Kommentarer" className="flex flex-col gap-2">
          <h4 className="m-0 text-[13px] font-bold text-ink">Kommentarer <span className="font-semibold tabular-nums text-ink-faint">{kommentarer.length}</span></h4>
          {kommentarer.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {kommentarer.map((k) => (
                <li key={k.id} className="rounded-lg bg-sunken px-3 py-2">
                  <p className="m-0 whitespace-pre-wrap">{k.text}</p>
                  <p className="m-0 mt-1 text-[12px] text-ink-soft">
                    {k.av || "Namn saknas"}{k.ts ? ` · ${k.ts.slice(0, 10)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-ink-soft">Inga kommentarer än.</p>
          )}
          <label className="block">
            <span className="sr-only">Ny kommentar</span>
            <textarea className={falt} rows={3} value={utkast} placeholder="Skriv en kommentar" onChange={(e) => setUtkast(e.target.value)} />
          </label>
          <div>
            <button type="button" className="btn mini" disabled={!utkast.trim()} onClick={skicka}>Lägg till kommentar</button>
          </div>
        </section>

        <div className="border-0 border-t border-solid border-hairline pt-3">
          <button type="button" className="btn sec mini" onClick={onOppnaRegister}>Öppna i Öppna punkter</button>
        </div>
      </div>
    </Slideover>
  );
}
