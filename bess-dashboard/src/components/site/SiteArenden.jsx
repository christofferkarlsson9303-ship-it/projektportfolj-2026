import { useRef, useState } from "react";
import { StatusBadge } from "../ds/index.js";
import { registerStatus } from "../../lib/status.js";
import { arKopplad } from "../../lib/modellKoppling.js";

/* Ärendepanelen till höger om 3D-vyn: UR/ÄTA-posterna för projektet, i
   CDE/BCF-anda. Ett klick på objekt i 3D filtrerar listan till objektets
   ärenden, och ett klick på ett ärende flyger kameran till objektet.

   Panelen äger ingen data — den får raderna och gör bara det användaren ber
   om via callbacks. Varje rad är en grupp med egna knappar (Visa i 3D, Öppna,
   Koppla, Ta bort koppling) så att allt går att nå med tangentbordet. */

const SEG =
  "cursor-pointer rounded-full border border-solid border-hairline-stark bg-surface px-3 py-1 font-body text-[12.5px] font-semibold text-ink transition-colors motion-reduce:transition-none hover:bg-sunken " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla aria-pressed:border-one-djup aria-pressed:bg-one-djup aria-pressed:text-white";

export function SiteArenden({ rader, valt, objektById, onVisa, onVisaVy, onKoppla, onLos, onOppna, onNy, onExportBcf, onImportBcf, bcfJobb = "" }) {
  const [vy, setVy] = useState("objekt");
  const [valda, setValda] = useState(() => new Set());
  const filRef = useRef(null);
  const medObjekt = !!valt && vy === "objekt";
  const synliga = medObjekt ? rader.filter((u) => u.objectGuid === valt.id) : rader;
  const antalObjekt = valt ? rader.filter((u) => u.objectGuid === valt.id).length : 0;
  // Valet gäller bara ärenden som finns kvar — ett borttaget ärende ska inte exporteras.
  const giltiga = rader.filter((u) => valda.has(u.id)).map((u) => u.id);
  const vaxla = (id) =>
    setValda((f) => {
      const n = new Set(f);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alla = synliga.length > 0 && synliga.every((u) => valda.has(u.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Vilka ärenden som visas">
        <button type="button" className={SEG} aria-pressed={medObjekt} disabled={!valt} onClick={() => setVy("objekt")}>
          {valt ? `${valt.namn || "Valt objekt"} (${antalObjekt})` : "Valt objekt"}
        </button>
        <button type="button" className={SEG} aria-pressed={!medObjekt} onClick={() => setVy("alla")}>
          Alla ({rader.length})
        </button>
        <button type="button" className="btn mini ml-auto" onClick={onNy} disabled={!valt} title={valt ? `Registrera ett ärende på ${valt.namn || "objektet"} med kamerans vy` : "Markera ett objekt först"}>
          + Ärende på objektet
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="BCF — utbyte med andra modellverktyg">
        <button type="button" className="btn sec mini" disabled={!synliga.length} onClick={() => setValda(alla ? new Set() : new Set(synliga.map((u) => u.id)))}>
          {alla ? "Avmarkera alla" : "Markera alla synliga"}
        </button>
        <button type="button" className="btn mini" disabled={!giltiga.length || !!bcfJobb} onClick={() => onExportBcf(giltiga)} title="Spara de markerade ärendena som en .bcfzip med kameravy och skärmdump">
          {bcfJobb || `Exportera BCF (${giltiga.length})`}
        </button>
        <input
          ref={filRef}
          type="file"
          accept=".bcfzip,.bcf,application/zip"
          className="sr-only"
          aria-label="Välj BCF-fil att importera"
          onChange={(e) => {
            onImportBcf(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn sec mini" disabled={!!bcfJobb} onClick={() => filRef.current?.click()}>
          Importera BCF …
        </button>
      </div>

      {!valt ? <p className="m-0 text-[12.5px] text-ink-soft">Klicka på ett objekt i 3D-vyn för att se dess ärenden och registrera nya.</p> : null}

      {synliga.length ? (
        <ul aria-label="Ärenden" className="m-0 flex list-none flex-col gap-2 p-0">
          {synliga.map((u) => {
            const o = u.objectGuid ? objektById.get(u.objectGuid) : null;
            const s = registerStatus(u.status);
            const kopplad = arKopplad(u);
            return (
              <li key={u.id} className="flex flex-col gap-2 rounded-lg border border-solid border-hairline bg-surface p-3 transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-hairline-stark hover:shadow-sm">
                <div className="flex flex-wrap items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--knapp-bla)]"
                    checked={valda.has(u.id)}
                    onChange={() => vaxla(u.id)}
                    aria-label={`Välj ${u.nr || "ärendet"} för BCF-export`}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer rounded border-0 bg-transparent p-0 text-left font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla"
                    onClick={() => onVisa(u)}
                    aria-label={`Visa ${u.nr || ""} ${u.benamning || "ärende"} i 3D`.replace(/\s+/g, " ").trim()}
                    disabled={!o}
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">{u.nr || "Utan nummer"}</span>
                    <span className="block text-[13.5px] font-semibold leading-snug text-ink">{u.benamning || "Utan benämning"}</span>
                  </button>
                  <StatusBadge ton={s.ton} label={s.label} />
                </div>
                <p className="m-0 text-[12px] text-ink-soft">
                  {kopplad ? (o ? <>Objekt: <b className="text-ink">{o.namn || o.typ}</b></> : "Objektet finns inte längre i modellen.") : "Inte kopplat till något objekt."}
                  {kopplad && u.modelVersionId ? ` · modellversion ${u.modelVersionId}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {o ? (
                    <button type="button" className="btn sec mini" onClick={() => onVisa(u)}>
                      Visa i 3D
                    </button>
                  ) : null}
                  {o && u.viewpoint ? (
                    <button type="button" className="btn sec mini" onClick={() => onVisaVy(u)} title="Flyg till kameravyn som sparades med ärendet">
                      Ärendets vy
                    </button>
                  ) : null}
                  <button type="button" className="btn sec mini" onClick={() => onOppna(u)}>
                    Öppna ärendet
                  </button>
                  {valt && u.objectGuid !== valt.id ? (
                    <button type="button" className="btn sec mini" onClick={() => onKoppla(u)}>
                      Koppla till {valt.namn || "valt objekt"}
                    </button>
                  ) : null}
                  {kopplad ? (
                    <button type="button" className="btn sec mini" onClick={() => onLos(u)}>
                      Ta bort koppling
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-ink-soft">
          {medObjekt ? `Inga ärenden är kopplade till ${valt.namn || "objektet"} än.` : "Inga ärenden registrerade för projektet."}
        </p>
      )}
    </div>
  );
}
