import { useState } from "react";
import { Vyvaljare } from "../ui/Vyvaljare.jsx";
import { DIFF_FARG, DIFF_TEXT, diffSammanfattning } from "../../lib/modellDiff.js";
import { SEKTION_HOJD, sektionStandard } from "../../lib/modellKoppling.js";
import { TOMT, fmtTal } from "../../lib/site.js";
import { datumKort } from "../../lib/datum.js";

/* Verktygsfältet över 3D-vyn: kamera (orbit/gå), sektionslåda, kryssmätning
   och modelljämförelse. Allt är kontrollerat — tillståndet bor i Site.jsx och
   scenen läser det. Knapparna är aria-pressed, sliders har riktiga etiketter
   och mätresultatet står i en aria-live-yta. */

const KNAPP =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-solid border-hairline-stark bg-surface px-3 py-1 font-body text-[12.5px] font-semibold text-ink " +
  "transition-[transform,background-color,border-color] duration-150 motion-reduce:transition-none hover:bg-sunken active:scale-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla " +
  "aria-pressed:border-one-djup aria-pressed:bg-one-djup aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-55";

/** En slider med synligt värde. Etiketten är en riktig <label>. */
function Slider({ id, etikett, min, max, steg = 0.5, varde, onAndra }) {
  return (
    <div className="flex min-w-[8.5rem] flex-1 flex-col gap-0.5 text-[12px] text-ink-soft">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span>{etikett}</span>
        <span className="font-bold tabular-nums text-ink">{fmtTal(varde, 1)} m</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={steg} value={varde} onChange={(e) => onAndra(Number(e.target.value))} className="w-full accent-[var(--knapp-bla)]" />
    </div>
  );
}

export function SiteVerktygsfalt({
  lage,
  onLage,
  sektion,
  onSektion,
  matning,
  onMatning,
  matt,
  onRensaMatning,
  versioner,
  jamforId,
  onJamfor,
  onSparaVersion,
  onTaBortVersion,
  diff,
}) {
  const [sektionOppen, setSektionOppen] = useState(false);
  const ga = lage === "ga";

  const sattMin = (axel, v) => onSektion({ ...sektion, min: { ...sektion.min, [axel]: Math.min(v, sektion.max[axel]) } });
  const sattMax = (axel, v) => onSektion({ ...sektion, max: { ...sektion.max, [axel]: Math.max(v, sektion.min[axel]) } });
  const halvX = TOMT.bredd / 2;
  const halvZ = TOMT.djup / 2;

  return (
    <div className="flex flex-col gap-3">
      <div role="toolbar" aria-label="Verktyg för 3D-vyn" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Vyvaljare
          etikett="Kamera"
          varde={lage}
          onValj={onLage}
          alternativ={[
            ["orbit", "Orbit", "Kameran kretsar runt tomten"],
            ["ga", "Gå in", "Gå runt på ögonhöjd (WASD och mus)"],
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={KNAPP}
            aria-pressed={sektion.aktiv}
            aria-controls="site-sektion-panel"
            onClick={() => {
              const ny = !sektion.aktiv;
              onSektion({ ...sektion, aktiv: ny });
              setSektionOppen(ny);
            }}
            title="Klipp bort det som ligger utanför en låda — för att titta in i parken"
          >
            Sektion
          </button>
          <button
            type="button"
            className={KNAPP}
            aria-pressed={matning}
            disabled={ga}
            onClick={() => onMatning(!matning)}
            title="Klicka på två ytor eller punkter för att mäta avståndet"
          >
            Mät
          </button>
          <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <span>Jämför med</span>
            <select value={jamforId || ""} onChange={(e) => onJamfor(e.target.value || null)} aria-label="Jämför med modellversion" className="!w-auto max-w-[14rem]">
              <option value="">Ingen jämförelse</option>
              {versioner.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.namn} · {datumKort(v.datum.slice(0, 10))}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={KNAPP} onClick={onSparaVersion} title="Spara dagens modell som en version att jämföra mot senare">
            Spara modellversion
          </button>
        </div>
      </div>

      {sektion.aktiv && sektionOppen ? (
        <div id="site-sektion-panel" role="group" aria-label="Sektionslåda" className="flex flex-col gap-2 rounded-lg border border-solid border-hairline bg-sunken p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Slider id="sek-xmin" etikett="X från" min={-halvX} max={halvX} varde={sektion.min.x} onAndra={(v) => sattMin("x", v)} />
            <Slider id="sek-xmax" etikett="X till" min={-halvX} max={halvX} varde={sektion.max.x} onAndra={(v) => sattMax("x", v)} />
            <Slider id="sek-zmin" etikett="Z från" min={-halvZ} max={halvZ} varde={sektion.min.z} onAndra={(v) => sattMin("z", v)} />
            <Slider id="sek-zmax" etikett="Z till" min={-halvZ} max={halvZ} varde={sektion.max.z} onAndra={(v) => sattMax("z", v)} />
            <Slider id="sek-ymax" etikett="Höjd upp till" min={0} max={SEKTION_HOJD + 8} steg={0.25} varde={sektion.max.y} onAndra={(v) => sattMax("y", v)} />
          </div>
          <div className="flex gap-2">
            <button type="button" className={KNAPP} onClick={() => onSektion({ ...sektionStandard(), aktiv: true })}>
              Återställ lådan
            </button>
            <button type="button" className={KNAPP} onClick={() => setSektionOppen(false)}>
              Dölj reglagen
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]" aria-live="polite">
        {matning ? (
          <span className="text-ink-soft">
            {matt ? (
              <>
                Avstånd <b className="tabular-nums text-ink">{fmtTal(matt.total, 2)} m</b> · horisontellt {fmtTal(matt.horisontell, 2)} m · höjdskillnad {fmtTal(matt.dy, 2)} m
              </>
            ) : (
              "Klicka på första punkten, sedan på nästa."
            )}
          </span>
        ) : null}
        {matning && matt ? (
          <button type="button" className="btn sec mini" onClick={onRensaMatning}>
            Rensa mätning
          </button>
        ) : null}
        {sektion.aktiv && !sektionOppen ? (
          <button type="button" className="btn sec mini" onClick={() => setSektionOppen(true)}>
            Visa sektionsreglage
          </button>
        ) : null}
      </div>

      {jamforId && diff ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]" role="group" aria-label="Jämförelse mot modellversion">
          {["tillagd", "borttagen", "andrad"].map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-ink">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border border-solid border-hairline-stark" style={{ background: `var(${DIFF_FARG[k]})` }} />
              {DIFF_TEXT[k]}
            </span>
          ))}
          <span className="text-ink-soft">{diffSammanfattning(diff)}</span>
          <button type="button" className="btn sec mini" onClick={() => onTaBortVersion(jamforId)}>
            Ta bort versionen
          </button>
        </div>
      ) : null}
    </div>
  );
}
