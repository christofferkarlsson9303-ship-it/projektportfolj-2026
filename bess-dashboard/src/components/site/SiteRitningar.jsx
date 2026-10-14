import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, FileUp, RotateCcw, RotateCw } from "lucide-react";
import { Callout, Card, StatusBadge } from "../ds/index.js";
import { TaBortKnapp } from "../ui/Falt.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { nyRitning, placeraEfterEtiketter, ritningsMatt, ritningsText } from "../../lib/ritningar.js";
import { arPdf, lasPdfSida, ritaRitning } from "../../lib/ritningRender.js";
import { MAX_BYTE, arEjAktiverat, skapaRitningsArkiv, sokvagFor } from "../../state/ritningsArkiv.js";

/* Ritningar i 3D-vyn: uppladdning, listan med placering och kroken som ritar filerna till
   canvas för scenen. Metadata i portfolj/state (siteRitningar), filen i Storage/IndexedDB. */

const nyttId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "rit" + Date.now() + Math.random().toString(36).slice(2));

/** Mitten av det som står på tomten (volymer, inte nålar), eller origo. Nya ritningar
 *  centreras där, så att de hamnar över det som redan är byggt. */
export function mittPaTomten(objekt) {
  const v = (objekt || []).filter((o) => o.typ !== "nal");
  if (!v.length) return { x: 0, z: 0 };
  const xs = v.map((o) => Number(o.x) || 0);
  const zs = v.map((o) => Number(o.z) || 0);
  const mitt = (a) => Math.round(((Math.min(...a) + Math.max(...a)) / 2) * 10) / 10;
  return { x: mitt(xs), z: mitt(zs) };
}

/** Läget som lägger ritningen över enheterna: efter beteckningarna om de finns på båda ställen,
 *  annars mitt på det som står på tomten. */
export function placeraOver(r, objekt) {
  const efter = placeraEfterEtiketter(r.etiketter, objekt, r.sida, Number(r.skala));
  if (efter) return { x: efter.x, z: efter.z, rotation: 0, placering: { satt: "etiketter", antal: efter.antal, avvikelse: efter.avvikelse } };
  return { ...mittPaTomten(objekt), placering: { satt: "mitten" } };
}

export function placeringText(r) {
  const p = r.placering;
  if (p?.satt === "etiketter") return `Lagd över enheterna efter ${p.antal} beteckningar på ritningen (avvikelse ${String(p.avvikelse).replace(".", ",")} m).`;
  if (p?.satt === "mitten") return "Centrerad på enheterna — ritningen saknar beteckningar som finns på siten. Justera läget.";
  return "";
}

/** Ritningarna som canvas för scenen. Laddar och ritar varje fil en gång. */
export function useRitningsCanvas(rader) {
  const [ritade, setRitade] = useState(() => new Map());
  const pagar = useRef(new Set());

  useEffect(() => {
    for (const r of rader) {
      if (ritade.has(r.id) || pagar.current.has(r.id)) continue;
      pagar.current.add(r.id);
      (async () => {
        let ut;
        try {
          const blob = await skapaRitningsArkiv(r.lagring).hamta(r.sokvag);
          if (!blob) throw new Error("Filen finns inte i arkivet.");
          ut = await ritaRitning(blob, { pdf: /pdf/i.test(r.mime) || /\.pdf$/i.test(r.filnamn) });
        } catch (e) {
          ut = { fel: e?.message || "Kunde inte läsa filen." };
        }
        pagar.current.delete(r.id);
        setRitade((m) => new Map(m).set(r.id, ut));
      })();
    }
  }, [rader, ritade]);

  // Samma array så länge inget ändrats, så att scenen inte bygger om planen vid varje render.
  return useMemo(
    () =>
      rader.map((r) => {
        const c = ritade.get(r.id);
        const m = ritningsMatt({ ...r, proportion: r.proportion || c?.proportion });
        return { ...r, ...m, canvas: c?.canvas || null, fel: c?.fel || null, laddar: !c };
      }),
    [rader, ritade]
  );
}

/** Laddar upp en fil och lägger in ritningen. Returnerar raden eller kastar ett fel med text. */
export async function laddaUppRitning(fil, { projektId, objekt }) {
  if (!fil) return null;
  if (fil.size > MAX_BYTE) throw new Error("Filen är större än 50 MB.");
  const pdf = arPdf(fil);
  if (!pdf && !/^image\/(png|jpeg|webp)$/i.test(fil.type)) throw new Error("Välj en PDF, PNG, JPG eller WebP.");
  const id = nyttId();
  const arkiv = skapaRitningsArkiv();
  const sokvag = sokvagFor(projektId, id, fil.name);
  let sida = null;
  let text = "";
  let etiketter = [];
  let proportion = 1;
  if (pdf) ({ sida, text, etiketter } = await lasPdfSida(fil));
  else proportion = (await ritaRitning(fil)).proportion;
  try {
    await arkiv.ladda(fil, sokvag);
  } catch (e) {
    if (arEjAktiverat(e)) throw new Error("Ritningsarkivet finns inte i Supabase än. Migreringen site_ritningar behöver köras.");
    throw new Error(`Uppladdningen misslyckades: ${e?.message || e}`);
  }
  const rad = nyRitning({ id, projektId, filnamn: fil.name, mime: fil.type || (pdf ? "application/pdf" : ""), storlek: fil.size, lagring: arkiv.lage, sokvag, sida, text, proportion, etiketter });
  /* Placering: efter etiketterna när ritningen och siten har samma beteckningar, annars
     centrerad på det som står på tomten. */
  return { ...rad, ...placeraOver(rad, objekt) };
}

/** Knappen som öppnar filväljaren. Används i 3D-vyns filterrad och i kortet. */
export function RitningsKnapp({ onFil, upptagen, etikett = "Ladda upp ritning" }) {
  const ref = useRef(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Välj ritning (PDF eller bild)"
        onChange={(e) => {
          onFil(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn sec mini" disabled={upptagen} aria-busy={upptagen || undefined} onClick={() => ref.current?.click()}>
        <FileUp size={14} aria-hidden="true" />
        {upptagen ? "Laddar upp…" : etikett}
      </button>
    </>
  );
}

const fmt = (v) => String(Math.round(Number(v) * 10) / 10).replace(".", ",");

function TalRuta({ id, etikett, varde, steg = 1, onAndra, enhet = "" }) {
  const [text, setText] = useState(fmt(varde));
  const [forra, setForra] = useState(varde);
  if (forra !== varde) {
    setForra(varde);
    setText(fmt(varde));
  }
  const spara = () => {
    const v = Number(String(text).replace(",", "."));
    if (Number.isFinite(v) && v !== Number(varde)) onAndra(v);
    else setText(fmt(varde));
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[12px] font-semibold text-ink-soft">
        {etikett}
      </label>
      <div className="flex items-center gap-1">
        <button type="button" className="btn sec mini" aria-label={`${etikett}: minska ${fmt(steg)}${enhet}`} onClick={() => onAndra(Number(varde) - steg)}>
          −
        </button>
        <input
          id={id}
          inputMode="decimal"
          className="min-h-[32px] w-full min-w-0 rounded-md border border-solid border-hairline-stark bg-surface px-2 text-center text-[13px] tabular-nums text-ink"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={spara}
          onKeyDown={(e) => e.key === "Enter" && spara()}
        />
        <button type="button" className="btn sec mini" aria-label={`${etikett}: öka ${fmt(steg)}${enhet}`} onClick={() => onAndra(Number(varde) + steg)}>
          +
        </button>
      </div>
    </div>
  );
}

/** Kortet med projektets ritningar. */
export function SiteRitningar({ ritningar, objekt, onLaddaUpp, upptagen }) {
  const { dispatch } = usePortfolj();
  const { bekrafta, visaToast } = useUi();
  const andra = (r, andring) => dispatch({ type: "SITE_RITNING_ANDRA", id: r.id, andring });
  const taBort = async (r) => {
    if (!(await bekrafta(`Ta bort ritningen ${r.namn} från siten?`, { titel: "Ta bort ritning", ok: "Ta bort" }))) return;
    dispatch({ type: "SITE_RITNING_TA_BORT", id: r.id });
    try {
      await skapaRitningsArkiv(r.lagring).taBort(r.sokvag);
    } catch {
      visaToast("Ritningen är borttagen från siten. Filen ligger kvar i arkivet (bara administratören kan radera filer).", "warn");
    }
  };

  return (
    <Card
      id="site-ritningar"
      title="Ritningar på siten"
      subtitle="PDF eller bild i skala på marken. Skalan läses ur ritningshuvudet; justera läget mot enheterna."
      action={<RitningsKnapp onFil={onLaddaUpp} upptagen={upptagen} />}
    >
      {ritningar.length ? (
        <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label="Ritningar">
          {ritningar.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 border-0 border-t border-solid border-hairline pt-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn sec mini"
                  aria-pressed={r.synlig}
                  aria-label={`${r.synlig ? "Dölj" : "Visa"} ${r.namn}`}
                  onClick={() => andra(r, { synlig: !r.synlig })}
                >
                  {r.synlig ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                </button>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] text-ink">{r.namn}</b>
                  <span className="text-[12px] text-ink-soft">{ritningsText(r)}</span>
                </span>
                {r.fel ? <StatusBadge ton="bad" label="Kunde inte läsas" /> : r.laddar ? <StatusBadge ton="info" label="Laddar" /> : null}
                {r.lagring === "lokal" ? <StatusBadge ton="warn" label="Bara i webbläsaren" /> : null}
                <TaBortKnapp etikett={`Ta bort ${r.namn}`} onClick={() => taBort(r)} />
              </div>
              {r.fel ? <p className="m-0 text-[12.5px] text-bad-ink">{r.fel}</p> : null}
              {placeringText(r) ? <p className="m-0 text-[12.5px] text-ink-soft">{placeringText(r)}</p> : null}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                {r.sida ? (
                  <TalRuta id={`rit-${r.id}-skala`} etikett="Skala 1:" varde={r.skala} steg={10} onAndra={(v) => v > 0 && andra(r, { skala: v })} />
                ) : (
                  <TalRuta id={`rit-${r.id}-bredd`} etikett="Bredd (m)" varde={r.bredd} steg={1} enhet=" m" onAndra={(v) => v > 0 && andra(r, { bredd: v })} />
                )}
                <TalRuta id={`rit-${r.id}-x`} etikett="Öster (m)" varde={r.x} steg={0.5} enhet=" m" onAndra={(v) => andra(r, { x: v })} />
                <TalRuta id={`rit-${r.id}-z`} etikett="Söder (m)" varde={r.z} steg={0.5} enhet=" m" onAndra={(v) => andra(r, { z: v })} />
                <TalRuta id={`rit-${r.id}-rot`} etikett="Vridning (°)" varde={r.rotation} steg={1} enhet="°" onAndra={(v) => andra(r, { rotation: ((v % 360) + 360) % 360 })} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn sec mini" onClick={() => andra(r, { rotation: (((Number(r.rotation) || 0) - 90) % 360 + 360) % 360 })}>
                  <RotateCcw size={14} aria-hidden="true" /> −90°
                </button>
                <button type="button" className="btn sec mini" onClick={() => andra(r, { rotation: ((Number(r.rotation) || 0) + 90) % 360 })}>
                  <RotateCw size={14} aria-hidden="true" /> +90°
                </button>
                <button
                  type="button"
                  className="btn sec mini"
                  onClick={() => {
                    const lage = placeraOver(r, objekt);
                    andra(r, lage);
                    visaToast(placeringText(lage));
                  }}
                >
                  Lägg över enheterna
                </button>
                <label className="ml-auto flex items-center gap-2 text-[12.5px] text-ink-soft">
                  Synlighet
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={r.opacitet ?? 0.85}
                    aria-label={`Synlighet för ${r.namn}`}
                    onChange={(e) => andra(r, { opacitet: Number(e.target.value) })}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-ink-soft">Inga ritningar än. Ladda upp en situationsplan, kanalisationsplan eller elplan som PDF eller bild.</p>
      )}
      <Callout ton="info">
        Filen sparas i portföljens ritningsarkiv och placeringen i portföljen, så att alla med åtkomst ser samma
        ritning på samma plats. En PDF läggs i skala ur pappersformatet och skalan i ritningshuvudet (t.ex. A3 1:250).
        Står skalan inte på ritningen antas 1:100 — ändra den då.
      </Callout>
    </Card>
  );
}
