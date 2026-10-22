import { mattFor } from "../../lib/siteLager.js";
import { KOMPONENTGRUPPER, MALLAR, TYPFARG, fmtTal } from "../../lib/site.js";

/* Komponentmenyn till vänster om 3D-vyn. Grupperna kommer ur
   KOMPONENTGRUPPER (lib/site.js), så menyn och reglerna delar en lista.

   Knappens tillgängliga namn är "+ Namn" — måtten står som beskrivning
   (aria-describedby), inte i namnet, så att namnet är kort och stabilt för
   skärmläsare och tester. Aktivt val syns med aria-pressed. Bara transform
   och opacity animeras, och inget alls vid prefers-reduced-motion. */

const KNAPP =
  "group flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-solid border-hairline bg-surface px-2.5 py-2 text-left font-body text-[13px] text-ink " +
  "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none " +
  "hover:-translate-y-px hover:border-hairline-stark hover:bg-sunken hover:shadow-sm " +
  "active:translate-y-0 active:scale-[0.98] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla " +
  "aria-pressed:border-one-djup aria-pressed:bg-one-djup aria-pressed:text-white aria-pressed:shadow-md " +
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none";

const mattText = (m) => `${fmtTal(m.bredd, 2)} × ${fmtTal(m.djup, 2)} × ${fmtTal(m.hojd, 2)} m`;

export function SiteMeny({ laddad, onVal, lage, kanNal, rutnat, onRutnat, spokRot, onRotera, className = "", profilId = "catl-pe" }) {
  const ga = lage === "ga";
  return (
    <nav aria-label="Komponenter" className={`flex min-w-0 flex-row flex-wrap gap-x-4 gap-y-3 xl:flex-col xl:flex-nowrap xl:gap-4 ${className}`.trim()}>
      {KOMPONENTGRUPPER.map((g) => (
        <div key={g.id} role="group" aria-labelledby={`site-grupp-${g.id}`} className="flex min-w-[10.5rem] flex-1 flex-col gap-1.5 xl:min-w-0 xl:flex-none">
          <p id={`site-grupp-${g.id}`} className="m-0 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            {g.namn}
          </p>
          {g.typer.map((typ) => {
            const m = { ...MALLAR[typ], ...mattFor(profilId, typ) };
            const beskr = typ === "nal" ? "pekar på en öppen punkt" : mattText(m);
            const id = `site-mall-${typ}`;
            return (
              <button
                key={typ}
                type="button"
                className={KNAPP}
                aria-label={`+ ${m.namn}`}
                aria-describedby={`${id}-matt`}
                aria-pressed={laddad === typ}
                disabled={ga || (typ === "nal" && !kanNal)}
                title={`${m.namn}: ${beskr}`}
                onClick={() => onVal(laddad === typ ? null : typ)}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-3.5 w-3.5 shrink-0 border border-solid border-hairline-stark ${typ === "nal" ? "rounded-full" : "rounded-sm"}`}
                  style={{ background: `var(${TYPFARG[typ]})` }}
                />
                <span aria-hidden="true" className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">+ {m.namn}</span>
                  <span id={`${id}-matt`} className="block truncate text-[11px] tabular-nums opacity-75">
                    {beskr}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}

      <div role="group" aria-label="Placering" className="flex min-w-[10.5rem] flex-1 flex-col gap-1.5 border-0 border-t border-solid border-hairline pt-3 xl:min-w-0 xl:flex-none">
        <button type="button" className={KNAPP} aria-pressed={rutnat} onClick={() => onRutnat(!rutnat)} title="Visa rutnät och snappa till det (G)">
          <span className="font-semibold">Rutnät</span>
          <span className="ml-auto text-[11px] opacity-75">{rutnat ? "på · G" : "av · G"}</span>
        </button>
        <button type="button" className={KNAPP} disabled={ga} onClick={onRotera} title="Rotera 90° (R). Gäller vald mall, annars markerat objekt.">
          <span className="font-semibold">Rotera 90°</span>
          <span className="ml-auto text-[11px] tabular-nums opacity-75">
            {spokRot}° · R
          </span>
        </button>
      </div>
    </nav>
  );
}

