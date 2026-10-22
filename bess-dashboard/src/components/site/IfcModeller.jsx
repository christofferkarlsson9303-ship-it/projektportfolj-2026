import { useMemo, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { Card, StatusBadge } from "../ds/index.js";
import { TaBortKnapp } from "../ui/Falt.jsx";
import { IFC_MAX_MODELLER, fmtStorlek, kortKlass, sokIfcObjekt } from "../../lib/ifcModell.js";
import { datumKort } from "../../lib/datum.js";

/* Projektets IFC-modeller: lista, dölj/visa i 3D-vyn, ta bort, och sökning bland modellens objekt.
   Geometrin finns bara i webbläsaren som laddade upp filen; i en annan webbläsare syns objekten här
   (och kan väljas och få ÄTA) men inte i 3D, tills samma fil importeras igen. */
export function IfcModeller({ modeller, objekt, geometriFinns, dolda, valtId, onImportera, onVisaDold, onTaBort, onValj }) {
  const [fraga, setFraga] = useState("");
  const traffar = useMemo(() => sokIfcObjekt(objekt, fraga, 20), [objekt, fraga]);
  const full = modeller.length >= IFC_MAX_MODELLER;

  return (
    <Card
      id="site-ifc"
      title="IFC-modeller"
      subtitle="Importera arkitekt- eller konstruktörsmodellen och koppla ÄTA till dess objekt via GlobalId."
      badge={<StatusBadge ton="neutral" label={String(modeller.length)} />}
      action={
        <button type="button" className="btn sec mini" onClick={onImportera} disabled={full} title={full ? `Högst ${IFC_MAX_MODELLER} modeller per projekt` : undefined}>
          Importera IFC
        </button>
      }
    >
      {modeller.length ? (
        <ul className="m-0 list-none p-0" aria-label="IFC-modeller">
          {modeller.map((m) => {
            const finns = geometriFinns.has(m.id);
            const dold = dolda.has(m.id);
            return (
              <li key={m.id} className="flex items-start gap-3 border-0 border-t border-solid border-hairline py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{m.namn}</div>
                  <div className="text-[12px] text-ink-soft">
                    {m.objekt.length} objekt{m.avkortad ? ` av ${m.antal}` : ""} · {m.schema || "IFC"} · {fmtStorlek(m.storlek)} · {datumKort(m.datum)}
                  </div>
                  {!finns ? (
                    <div className="mt-1 text-[12px] text-warn-ink">
                      Geometrin saknas i den här webbläsaren. Importera {m.filnamn || "samma fil"} igen för att se modellen i 3D. Objekten och ÄTA fungerar ändå.
                    </div>
                  ) : null}
                </div>
                {finns ? (
                  <button type="button" className="btn sec mini" aria-pressed={!dold} onClick={() => onVisaDold(m.id)} aria-label={`${dold ? "Visa" : "Dölj"} ${m.namn} i 3D-vyn`}>
                    {dold ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                  </button>
                ) : null}
                <TaBortKnapp etikett={`Ta bort modellen ${m.namn}`} onClick={() => onTaBort(m)} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-ink-soft">Ingen IFC-modell i projektet än.</p>
      )}

      {objekt.length ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="f">
            <label htmlFor="ifc-sok">Sök objekt (namn, klass eller GlobalId)</label>
            <div className="relative">
              <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input id="ifc-sok" type="search" value={fraga} onChange={(e) => setFraga(e.target.value)} className="pl-7" autoComplete="off" />
            </div>
          </div>
          {fraga.trim() ? (
            traffar.length ? (
              <ul className="m-0 list-none p-0" aria-label="Träffar bland IFC-objekt">
                {traffar.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      aria-pressed={o.id === valtId}
                      onClick={() => onValj(o.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left font-body text-[13px] text-ink hover:bg-sunken aria-pressed:bg-sunken"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">{o.namn}</span>
                      <span className="shrink-0 text-[12px] text-ink-soft">{kortKlass(o.klass)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[12.5px] text-ink-soft">Inga objekt matchar ”{fraga.trim()}”.</p>
            )
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
