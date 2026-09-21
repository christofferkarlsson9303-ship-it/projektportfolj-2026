import { useDeferredValue, useId, useMemo, useState } from "react";
import { useUi } from "../../state/hooks.js";
import { exporteraTabell } from "../../lib/export.js";
import { fmtSEK, fmtTal } from "../../lib/format.js";

/* Excel-liknande tabell: sortering, snabbsökning, kolumnfilter, summeringsrad
   och CSV-export.

   Bygger vidare på designsystemets tabellregler i stället för att ersätta dem —
   där finns redan mobilens kortvy (td[data-label]::before), tabulärsiffror och
   utskriftsstilar. Tailwind används för det som tillkommer: celldelare, täthet,
   fryst rubrikrad och verktygsraden.

   Kolumndefinition:
     { nyckel, rubrik, bredd?, typ?: 'text'|'num'|'sek'|'datum',
       sorterbar?=true, filter?=false, summera?=false,
       render?(rad), sortVarde?(rad), textVarde?(rad), exportVarde?(rad) }
*/

const textAv = (kol, rad) => {
  if (kol.textVarde) return String(kol.textVarde(rad) ?? "");
  const v = rad[kol.nyckel];
  return v === null || v === undefined ? "" : String(v);
};

const sortAv = (kol, rad) => {
  if (kol.sortVarde) return kol.sortVarde(rad);
  const v = rad[kol.nyckel];
  if (kol.typ === "num" || kol.typ === "sek") return Number(v) || 0;
  return v === null || v === undefined ? "" : v;
};

function jamfor(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  // Tomma värden sist oavsett riktning — annars hamnar de överst vid stigande
  // sortering och skymmer det som faktiskt har data.
  const as = String(a ?? "");
  const bs = String(b ?? "");
  if (!as && bs) return 1;
  if (as && !bs) return -1;
  return as.localeCompare(bs, "sv");
}

function formatera(kol, rad) {
  if (kol.render) return kol.render(rad);
  const v = rad[kol.nyckel];
  if (kol.typ === "sek") return fmtSEK(v);
  if (kol.typ === "num") return v === null || v === undefined || v === "" ? "—" : fmtTal(v);
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export function DataTable({
  kolumner,
  rader,
  getId = (r) => r.id,
  etikett,
  exportNamn,
  verktyg,
  tomText = "Inga rader.",
  sokbar = true,
  radKlass,
  maxHojd,
  fotnot,
}) {
  const { tathet, visaToast } = useUi();
  const bas = useId();

  const [sok, setSok] = useState("");
  const [filter, setFilter] = useState({});
  const [sortering, setSortering] = useState({ nyckel: null, riktning: "asc" });

  // Sökningen får halka efter inmatningen så att långa tabeller inte hackar.
  const sokFordrojd = useDeferredValue(sok);

  const filterKolumner = useMemo(() => kolumner.filter((k) => k.filter), [kolumner]);

  const filterAlternativ = useMemo(() => {
    const ut = {};
    for (const k of filterKolumner) {
      const set = new Map();
      for (const rad of rader) {
        const v = rad[k.nyckel];
        if (v === null || v === undefined || v === "") continue;
        if (!set.has(v)) set.set(v, k.filterEtikett ? k.filterEtikett(v) : textAv(k, rad));
      }
      ut[k.nyckel] = [...set.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "sv"));
    }
    return ut;
  }, [filterKolumner, rader]);

  const synliga = useMemo(() => {
    const q = sokFordrojd.toLowerCase().trim();

    let ut = rader.filter((rad) => {
      for (const [nyckel, varde] of Object.entries(filter)) {
        if (varde && String(rad[nyckel]) !== varde) return false;
      }
      if (!q) return true;
      return kolumner.some((k) => textAv(k, rad).toLowerCase().includes(q));
    });

    if (sortering.nyckel) {
      const kol = kolumner.find((k) => k.nyckel === sortering.nyckel);
      if (kol) {
        ut = [...ut].sort((a, b) => {
          const r = jamfor(sortAv(kol, a), sortAv(kol, b));
          return sortering.riktning === "asc" ? r : -r;
        });
      }
    }
    return ut;
  }, [rader, kolumner, filter, sokFordrojd, sortering]);

  const summor = useMemo(() => {
    const ut = {};
    for (const k of kolumner) {
      if (!k.summera) continue;
      ut[k.nyckel] = synliga.reduce((s, rad) => s + (Number(sortAv(k, rad)) || 0), 0);
    }
    return ut;
  }, [kolumner, synliga]);

  const harSummering = kolumner.some((k) => k.summera);
  const filtrerat = synliga.length !== rader.length;
  const kompakt = tathet === "kompakt";

  const sortera = (nyckel) => {
    setSortering((s) =>
      s.nyckel === nyckel
        ? s.riktning === "asc"
          ? { nyckel, riktning: "desc" }
          : { nyckel: null, riktning: "asc" }
        : { nyckel, riktning: "asc" }
    );
  };

  const exportera = async () => {
    if (!synliga.length) {
      visaToast("Tabellen är tom — inget att exportera.", "warn");
      return;
    }
    const r = await exporteraTabell(exportNamn || etikett || "tabell", kolumner, synliga);
    if (!r.tyst && r.txt) visaToast(r.txt, r.typ || "");
  };

  const cellPad = kompakt ? "!py-1.5 !px-2.5" : "";
  const delare = "border-r border-hairline last:border-r-0 max-[640px]:border-r-0";

  return (
    <div>
      {/* ---------- Verktygsrad ---------- */}
      {(sokbar || filterKolumner.length || exportNamn || verktyg) && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          {sokbar && (
            <div className="min-w-[180px] flex-1">
              <label htmlFor={`${bas}-sok`} className="mb-1 block text-[11px] font-bold uppercase tracking-[.06em] text-ink-soft">
                Sök i tabellen
              </label>
              <input
                id={`${bas}-sok`}
                type="search"
                value={sok}
                onChange={(e) => setSok(e.target.value)}
                placeholder="Filtrera på valfritt fält…"
                className="w-full"
              />
            </div>
          )}

          {filterKolumner.map((k) => (
            <div key={k.nyckel} className="min-w-[150px]">
              <label htmlFor={`${bas}-f-${k.nyckel}`} className="mb-1 block text-[11px] font-bold uppercase tracking-[.06em] text-ink-soft">
                {k.rubrik}
              </label>
              <select
                id={`${bas}-f-${k.nyckel}`}
                value={filter[k.nyckel] || ""}
                onChange={(e) => setFilter((f) => ({ ...f, [k.nyckel]: e.target.value }))}
              >
                <option value="">Alla</option>
                {(filterAlternativ[k.nyckel] || []).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {verktyg}
            {exportNamn && (
              <button type="button" className="btn sec mini" onClick={exportera}>
                Exportera CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sortering på mobil. Under 640 px blir tabellen kortvy och rubrikraden
          döljs — då försvinner också sorteringsknapparna, så tabellen gick inte
          att sortera alls på telefon. Den här kontrollen visas bara där.

          Skrivet som "flex + min-[641px]:hidden" och inte "hidden +
          max-[640px]:flex": max-width-varianter hamnar före basverktygen i
          Tailwinds utdata, så `hidden` vann och kontrollen syntes aldrig. */}
      <div className="mb-3 flex items-end gap-2 min-[641px]:hidden">
        <div className="flex-1">
          <label
            htmlFor={`${bas}-msort`}
            className="mb-1 block text-[11px] font-bold uppercase tracking-[.06em] text-ink-soft"
          >
            Sortera efter
          </label>
          <select
            id={`${bas}-msort`}
            value={sortering.nyckel || ""}
            onChange={(e) =>
              setSortering({ nyckel: e.target.value || null, riktning: sortering.riktning })
            }
          >
            <option value="">Ursprunglig ordning</option>
            {kolumner
              .filter((k) => k.sorterbar !== false)
              .map((k) => (
                <option key={k.nyckel} value={k.nyckel}>
                  {k.rubrik}
                </option>
              ))}
          </select>
        </div>

        <button
          type="button"
          className="btn sec mini"
          disabled={!sortering.nyckel}
          aria-label={sortering.riktning === "asc" ? "Sortera fallande" : "Sortera stigande"}
          onClick={() =>
            setSortering((s) => ({ ...s, riktning: s.riktning === "asc" ? "desc" : "asc" }))
          }
        >
          <span aria-hidden="true">{sortering.riktning === "asc" ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Antal träffar läses upp när filtret ändras. */}
      <p className="sr-only" role="status">
        {filtrerat ? `${synliga.length} av ${rader.length} rader visas` : `${rader.length} rader`}
      </p>

      {/* ---------- Tabellen ---------- */}
      <div
        className="tscroll rounded-sm border border-hairline"
        tabIndex={0}
        role="region"
        aria-label={etikett}
        style={maxHojd ? { maxHeight: maxHojd, overflowY: "auto" } : undefined}
      >
        <table className="w-full">
          <caption className="sr-only">
            {etikett}
            {filtrerat ? ` — ${synliga.length} av ${rader.length} rader visas` : ""}
          </caption>

          <thead>
            <tr>
              {kolumner.map((k) => {
                const aktiv = sortering.nyckel === k.nyckel;
                const sorterbar = k.sorterbar !== false;
                return (
                  <th
                    key={k.nyckel}
                    scope="col"
                    style={k.bredd ? { width: k.bredd } : undefined}
                    // aria-sort talar om för skärmläsare hur tabellen är ordnad
                    aria-sort={aktiv ? (sortering.riktning === "asc" ? "ascending" : "descending") : "none"}
                    className={`${delare} ${cellPad} ${maxHojd ? "sticky top-0 z-[2] bg-surface" : ""} ${
                      k.typ === "num" || k.typ === "sek" ? "text-right" : ""
                    }`}
                  >
                    {sorterbar ? (
                      <button
                        type="button"
                        onClick={() => sortera(k.nyckel)}
                        className="inline-flex w-full items-center gap-1 rounded bg-transparent p-0 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-ink-faint transition-colors hover:text-one-djup"
                        style={{ justifyContent: k.typ === "num" || k.typ === "sek" ? "flex-end" : "flex-start" }}
                      >
                        <span>{k.rubrik}</span>
                        <span aria-hidden="true" className={aktiv ? "text-one-bla" : "opacity-35"}>
                          {aktiv ? (sortering.riktning === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                        <span className="sr-only">
                          {aktiv
                            ? sortering.riktning === "asc"
                              ? "— sorterad stigande, klicka för fallande"
                              : "— sorterad fallande, klicka för att nollställa"
                            : "— klicka för att sortera"}
                        </span>
                      </button>
                    ) : (
                      k.rubrik
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {synliga.length ? (
              synliga.map((rad) => (
                <tr key={getId(rad)} className={radKlass ? radKlass(rad) : undefined}>
                  {kolumner.map((k) => (
                    <td
                      key={k.nyckel}
                      data-label={k.rubrik}
                      className={`${delare} ${cellPad} ${k.typ === "num" || k.typ === "sek" ? "num" : ""} ${
                        k.cellKlass ? k.cellKlass(rad) : ""
                      }`}
                    >
                      {formatera(k, rad)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={kolumner.length} className="lead">
                  {rader.length ? "Inga rader matchar filtret." : tomText}
                </td>
              </tr>
            )}
          </tbody>

          {harSummering && synliga.length ? (
            <tfoot>
              <tr className="sumrad font-bold">
                {kolumner.map((k, i) => (
                  <td
                    key={k.nyckel}
                    data-label={k.summera ? `Summa ${k.rubrik}` : ""}
                    className={`${delare} ${cellPad} ${k.typ === "num" || k.typ === "sek" ? "num" : ""}`}
                  >
                    {k.summera
                      ? k.typ === "sek"
                        ? fmtSEK(summor[k.nyckel])
                        : fmtTal(summor[k.nyckel])
                      : i === 0
                        ? `Summa (${synliga.length})`
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {fotnot ? <p className="mt-2 text-xs leading-relaxed text-ink-faint">{fotnot}</p> : null}
    </div>
  );
}
