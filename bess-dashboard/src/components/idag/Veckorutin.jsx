import { CalendarCheck } from "lucide-react";
import { useUi } from "../../state/hooks.js";
import { rutinFor } from "../../data/veckorutin.js";

/* Dagens fokus ur projektmetodens veckorutin (docs/projektmetod.md § 3.2):
   måndag ekonomi, tisdag produktion och gränssnitt, onsdag leverantörer,
   torsdag HSE, fredag framåtblick. Länkarna går till vyerna där det görs.
   Visas inte på helgen. `datum` finns för test. */
export function Veckorutin({ datum = new Date() }) {
  const { visa } = useUi();
  const r = rutinFor(datum);
  if (!r) return null;
  return (
    <section
      aria-label={`Veckorutin — ${r.dag}`}
      className="flex flex-col gap-2 rounded-xl border border-solid border-hairline bg-surface px-5 py-4 shadow-sm print:hidden md:px-6"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <CalendarCheck size={16} aria-hidden="true" className="self-center text-one-djup" />
        <span className="text-[12px] font-bold uppercase tracking-wider text-ink-soft">Veckorutin · {r.dag}</span>
        <b className="font-head text-[15px] text-ink">{r.fokus}</b>
        {r.tid ? <span className="text-[12px] text-ink-faint">{r.tid}</span> : null}
      </div>
      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 text-[13px] text-ink">
        {r.gora.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <nav aria-label="Vyer för dagens rutin" className="flex flex-wrap gap-2">
        {r.vyer.map(([id, namn]) => (
          <button key={id + namn} type="button" className="btn sec mini" onClick={() => visa(id)}>
            {namn}
          </button>
        ))}
      </nav>
    </section>
  );
}
