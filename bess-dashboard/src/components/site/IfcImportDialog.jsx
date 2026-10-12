import { useEffect, useRef, useState } from "react";
import { IFC_MAX_OBJEKT, fmtStorlek, ifcModellRad, kortKlass } from "../../lib/ifcModell.js";
import { geometriStorlek, lasIfc } from "../../lib/ifcLaddare.js";
import { hamtaIfcApi } from "../../lib/ifcApi.js";

/* Importerar en IFC-fil till projektet. Filen läses i webbläsaren (web-ifc); ingenting laddas upp.
   Metadatan (objekt, GlobalId, lådor) sparas i portföljen, geometrin i den här webbläsarens IndexedDB.

   Läsningen körs på huvudtråden: en stor fil kan låsa fliken en stund. Därför visas texten innan
   läsningen börjar och filstorleken står i listan. */

/** Väntar tills webbläsaren hunnit rita om, så att "Läser …" syns innan parsern tar tråden. */
const ritaFirst = () => new Promise((klar) => requestAnimationFrame(() => setTimeout(klar, 30)));

export function IfcImportDialog({ projektId, filnamnFinns = [], onLagg, onStang }) {
  const boxRef = useRef(null);
  const [fas, setFas] = useState("val"); // val | laser | klart
  const [fil, setFil] = useState(null);
  const [fel, setFel] = useState("");
  const [res, setRes] = useState(null);
  const [namn, setNamn] = useState("");
  const [framsteg, setFramsteg] = useState(null);
  const [sparar, setSparar] = useState(false);

  useEffect(() => {
    const fokus = boxRef.current?.querySelector("input, button");
    fokus?.focus();
  }, []);

  const las = async (f) => {
    if (!f) return;
    setFil(f);
    setFel("");
    setRes(null);
    setFas("laser");
    setNamn(f.name.replace(/\.ifc$/i, ""));
    try {
      if (!/\.ifc$/i.test(f.name)) throw new Error("Välj en IFC-fil (.ifc).");
      const bytes = new Uint8Array(await f.arrayBuffer());
      setFramsteg({ gjorda: 0, totalt: 0 });
      await ritaFirst();
      const api = await hamtaIfcApi();
      const r = lasIfc(api, bytes, { onFramsteg: (p) => setFramsteg(p) });
      setRes(r);
      setFas("klart");
    } catch (e) {
      setFel(e?.message || "Filen gick inte att läsa som IFC.");
      setFas("val");
    }
  };

  const lagg = async () => {
    if (!res || !fil) return;
    setSparar(true);
    try {
      const modell = ifcModellRad({
        id: `ifc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        projektId,
        namn,
        filnamn: fil.name,
        storlek: fil.size,
        schema: res.schema,
        objekt: res.objekt,
        antal: res.antal,
        avkortad: res.avkortad,
        forskjutning: res.forskjutning,
      });
      const varning = await onLagg({ modell, geometri: res.geometri, guidPerEid: res.guidPerEid });
      if (varning) {
        setFel(varning);
        setFas("klart");
        return;
      }
      onStang();
    } finally {
      setSparar(false);
    }
  };

  const klasser = res ? [...res.objekt.reduce((m, o) => m.set(kortKlass(o.klass), (m.get(kortKlass(o.klass)) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
  const dubblett = fil && filnamnFinns.includes(fil.name);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onKeyDown={(e) => e.key === "Escape" && !sparar && onStang()}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="ifc-dialog-titel" className="flex max-h-[90vh] w-full max-w-[520px] flex-col gap-3 overflow-y-auto rounded-lg border border-solid border-hairline bg-surface p-5 shadow-lg">
        <h3 id="ifc-dialog-titel" className="m-0 font-head text-[16px] font-bold text-ink">
          Importera IFC-modell
        </h3>
        <p className="m-0 text-[13px] text-ink-soft">
          Filen läses i webbläsaren och laddas inte upp. Objektlistan (GlobalId, namn, klass) sparas i portföljen och delas med kollegorna; själva 3D-geometrin sparas bara i den här webbläsaren.
        </p>

        {fas !== "klart" ? (
          <div className="f">
            <label htmlFor="ifc-fil">IFC-fil (.ifc)</label>
            <input id="ifc-fil" type="file" accept=".ifc" disabled={fas === "laser"} onChange={(e) => las(e.target.files?.[0])} />
          </div>
        ) : null}

        {fas === "laser" ? (
          <p className="m-0 text-[13px] text-ink" role="status">
            Läser {fil?.name} ({fmtStorlek(fil?.size)}) …{" "}
            {framsteg?.totalt ? `${framsteg.gjorda} av ${framsteg.totalt} element` : "förbereder läsaren"}. Större filer kan göra fliken seg en stund.
          </p>
        ) : null}

        {fas === "klart" && res ? (
          <>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-ink-soft">Fil</dt>
              <dd className="m-0 text-ink">{fil.name} ({fmtStorlek(fil.size)})</dd>
              <dt className="text-ink-soft">Schema</dt>
              <dd className="m-0 text-ink">{res.schema || "okänt"}</dd>
              <dt className="text-ink-soft">Objekt</dt>
              <dd className="m-0 text-ink">{res.objekt.length}{res.avkortad ? ` av ${res.antal}` : ""}</dd>
              <dt className="text-ink-soft">Vanligast</dt>
              <dd className="m-0 text-ink">{klasser.map(([k, n]) => `${k} ${n}`).join(", ") || "–"}</dd>
              <dt className="text-ink-soft">Geometri</dt>
              <dd className="m-0 text-ink">{fmtStorlek(geometriStorlek(res.geometri))} i den här webbläsaren</dd>
            </dl>
            {res.avkortad ? (
              <p className="m-0 rounded-md bg-warn-bg p-2 text-[13px] text-warn-ink" role="note">
                Modellen har {res.antal} objekt. Bara de {IFC_MAX_OBJEKT} första tas med, så att portföljen inte växer för mycket.
              </p>
            ) : null}
            {res.delFel ? (
              <p className="m-0 text-[12.5px] text-ink-soft">{res.delFel} geometridelar gick inte att läsa och saknas i 3D-vyn.</p>
            ) : null}
            {dubblett ? <p className="m-0 text-[12.5px] text-ink-soft">En modell från en fil med samma namn finns redan i projektet.</p> : null}
            <div className="f">
              <label htmlFor="ifc-namn">Namn på modellen</label>
              <input id="ifc-namn" value={namn} onChange={(e) => setNamn(e.target.value)} maxLength={120} />
            </div>
          </>
        ) : null}

        {fel ? (
          <p className="m-0 rounded-md bg-bad-bg p-2 text-[13px] text-bad-ink" role="alert">
            {fel}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn sec" onClick={onStang} disabled={sparar}>
            Avbryt
          </button>
          {fas === "klart" && res ? (
            <button type="button" className="btn" onClick={lagg} disabled={sparar}>
              {sparar ? "Sparar …" : "Lägg till i projektet"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
