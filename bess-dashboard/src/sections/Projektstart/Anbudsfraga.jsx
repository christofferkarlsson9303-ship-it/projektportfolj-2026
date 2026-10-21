import { useId, useState } from "react";
import { Check, MessageSquarePlus } from "lucide-react";
import { Overline } from "../../components/ds/index.js";
import { byggSvar, lasSvar } from "../../lib/anbudssvar.js";

/* En anbudsfråga som klick i stället för skrivande:
   1. en rad cirklar – välj bedömningen (grön/gul/röd ton),
   2. en linje att dra – hur säker är bedömningen,
   3. en valfri kommentar som öppnas med en knapp.
   Värdet är en sträng (lib/anbudssvar.js), samma fält `af_<id>` som tidigare. */

const TON = {
  ok: { fylld: "bg-ok-ink border-ok-ink text-surface", ram: "border-ok-ink", text: "text-ok-ink" },
  warn: { fylld: "bg-warn-ink border-warn-ink text-surface", ram: "border-warn-ink", text: "text-warn-ink" },
  bad: { fylld: "bg-bad-ink border-bad-ink text-surface", ram: "border-bad-ink", text: "text-bad-ink" },
};

const SAKERHET_TEXT = (n) => (n == null ? "Dra för att ange" : n < 34 ? "Osäker" : n < 67 ? "Ganska säker" : "Säker");

export function Anbudsfraga({ f, nr, varde, onChange }) {
  const uid = useId();
  const valbara = f.val.map(([v]) => v);
  const svar = lasSvar(varde, valbara);
  const [visaKommentar, setVisaKommentar] = useState(Boolean(svar.text));
  const satt = (andring) => onChange(byggSvar({ ...svar, ...andring }));
  const besvarad = Boolean(svar.val);

  return (
    <fieldset
      className={`m-0 flex min-w-0 flex-col gap-4 rounded-xl border border-solid p-4 transition-colors duration-150 md:col-span-2 ${besvarad ? "border-hairline bg-surface" : "border-hairline-stark bg-sunken"}`}
      aria-required={f.obligatoriskt || undefined}
    >
      <legend className="sr-only">{f.etikett}</legend>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-bold ${besvarad ? "bg-ok-bg text-ok-ink" : "bg-sunken text-ink-soft"}`}
        >
          {besvarad ? <Check size={15} /> : nr}
        </span>
        <span className="text-[14px] font-semibold leading-snug text-ink">
          {f.etikett}
          {f.obligatoriskt ? <span aria-hidden="true" className="text-ink-faint"> *</span> : null}
        </span>
      </div>

      <div role="radiogroup" aria-label={`Bedömning: ${f.etikett}`} className="grid grid-cols-3 gap-2 pl-10">
        {f.val.map(([v, ton]) => {
          const vald = svar.val === v;
          const t = TON[ton] || TON.ok;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={vald}
              onClick={() => satt({ val: vald ? "" : v })}
              className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg border-0 bg-transparent px-1 py-1.5 hover:bg-sunken"
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-solid transition-all duration-150 ${vald ? `${t.fylld} scale-110` : `${t.ram} bg-surface group-hover:scale-105`}`}
              >
                {vald ? <Check size={18} strokeWidth={3} /> : null}
              </span>
              <span className={`text-center text-[12px] leading-tight ${vald ? `font-bold ${t.text}` : "text-ink-soft"}`}>{v}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1 pl-10">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${uid}-sak`}>
            <Overline as="span">Hur säker är bedömningen?</Overline>
          </label>
          <span className={`text-[12px] font-bold tabular-nums ${svar.sakerhet == null ? "text-ink-faint" : "text-info-ink"}`}>
            {svar.sakerhet == null ? SAKERHET_TEXT(null) : `${svar.sakerhet} % · ${SAKERHET_TEXT(svar.sakerhet)}`}
          </span>
        </div>
        <input
          id={`${uid}-sak`}
          type="range"
          min={0}
          max={100}
          step={10}
          value={svar.sakerhet ?? 50}
          disabled={!besvarad}
          aria-valuetext={svar.sakerhet == null ? "Ej angiven" : `${svar.sakerhet} procent`}
          onChange={(e) => satt({ sakerhet: Number(e.target.value) })}
          className={`anbud-linje ${svar.sakerhet == null ? "tom" : ""}`}
        />
        {!besvarad ? <span className="text-[11.5px] text-ink-faint">Välj en cirkel först.</span> : null}
      </div>

      <div className="pl-10">
        {visaKommentar ? (
          <textarea
            rows={2}
            value={svar.text}
            placeholder="Kommentar: antagande, källa eller villkor (valfri)"
            aria-label={`Kommentar: ${f.etikett}`}
            onChange={(e) => satt({ text: e.target.value })}
          />
        ) : (
          <button type="button" className="btn sec mini inline-flex items-center gap-1.5" onClick={() => setVisaKommentar(true)}>
            <MessageSquarePlus size={14} aria-hidden="true" /> Lägg till kommentar
          </button>
        )}
      </div>
    </fieldset>
  );
}
