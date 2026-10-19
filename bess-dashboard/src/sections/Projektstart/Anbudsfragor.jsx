import { Callout, Overline, StatusBadge } from "../../components/ds/index.js";
import { TON_KLASS } from "../../lib/status.js";
import { ANBUDSLJUS, anbudsBedomning, anbudsfragaId, anbudsljusId } from "../../data/anbudsfragor.js";

/* Steg 3 i Projektstart: anbudsfrågorna som trafikljus (ONE-P:s trafikljusmetod).

   Överst: anbudshjulet, en ring med ett segment per fråga i sin färg, och domen ur
   anbudsBedomning(). Klick på ett segment hoppar till frågan.
   Under: ett kort per fråga med rubriken på ren svenska, tre ljusknappar och svaret.
   Svaret är obligatoriskt (fältet `af_<id>`); ljuset (`af_ljus_<id>`) är frivilligt men
   behövs för att domen ska bli något annat än "inte bedömda". Färgen bär aldrig betydelsen
   ensam: knappen och märket har alltid ordet Grön, Gul eller Röd. */

/* Utskrivna klasser så att Tailwind hittar dem. */
const SEGMENT = { gron: "text-ok-ink", gul: "text-warn-ink", rod: "text-bad-ink", "": "text-hairline-stark" };
const PLURAL = { gron: "gröna", gul: "gula", rod: "röda" };
const KANT = { gron: "bg-ok-ink", gul: "bg-warn-ink", rod: "bg-bad-ink", "": "bg-hairline-stark" };

function bage(cx, cy, r, fran, till) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x1, y1] = p(fran);
  const [x2, y2] = p(till);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${till - fran > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function hoppaTill(id) {
  const kort = document.getElementById(`af-kort-${id}`);
  kort?.scrollIntoView({ behavior: "smooth", block: "center" });
  kort?.querySelector("textarea")?.focus({ preventScroll: true });
}

function Anbudshjul({ bedomning }) {
  const { per, antal, dom } = bedomning;
  const steg = (2 * Math.PI) / per.length;
  const glapp = 0.06;
  const bedomda = per.length - antal.obedomd;
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-solid border-hairline p-4 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label={`Anbudshjulet: ${antal.gron} gröna, ${antal.gul} gula, ${antal.rod} röda, ${antal.obedomd} inte bedömda`} className="shrink-0">
        {per.map(({ fraga, ljus }, i) => (
          <path
            key={fraga.id}
            d={bage(80, 80, 62, i * steg + glapp, (i + 1) * steg - glapp)}
            fill="none"
            stroke="currentColor"
            strokeWidth="22"
            className={`${SEGMENT[ljus]} cursor-pointer transition-opacity duration-150 hover:opacity-70`}
            onClick={() => hoppaTill(fraga.id)}
          >
            <title>{`${i + 1}. ${fraga.kort} – ${ljus ? ANBUDSLJUS[ljus][1] : "Inte bedömd"}`}</title>
          </path>
        ))}
        <text x="80" y="78" textAnchor="middle" className="fill-current font-display text-[26px] font-bold">{bedomda}/{per.length}</text>
        <text x="80" y="98" textAnchor="middle" className="fill-current text-[11px] opacity-70">bedömda</text>
      </svg>
      <div className="flex min-w-0 flex-col gap-3">
        <Overline as="span">Anbudshjulet</Overline>
        <StatusBadge label={dom.text} ton={dom.ton} wrap />
        <div className="flex flex-wrap gap-2 text-[12px]">
          {Object.entries(ANBUDSLJUS).map(([id, [ton, namn]]) => (
            <span key={id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${TON_KLASS[ton]}`}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              {antal[id]} {antal[id] === 1 ? namn.toLowerCase() : PLURAL[id]}
            </span>
          ))}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${TON_KLASS.neutral}`}>{antal.obedomd} ej bedömda</span>
        </div>
        <span className="text-[12px] text-ink-soft">Klicka på ett segment för att gå till frågan.</span>
      </div>
    </div>
  );
}

function LjusVal({ fraga, varde, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Trafikljus: ${fraga.kort}`}>
      {Object.entries(ANBUDSLJUS).map(([id, [ton, namn, betyder]]) => (
        <button
          key={id}
          type="button"
          title={betyder}
          aria-pressed={varde === id}
          onClick={() => onChange(varde === id ? "" : id)}
          className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${varde === id ? `${TON_KLASS[ton]} border-current` : "border-hairline-stark bg-transparent text-ink-soft hover:bg-sunken"}`}
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
          {namn}
        </button>
      ))}
    </div>
  );
}

export function Anbudsfragor({ v, onFalt }) {
  const bedomning = anbudsBedomning(v);
  return (
    <div className="flex flex-col gap-4">
      <Anbudshjul bedomning={bedomning} />
      <Callout ton="info">
        <b className="block">Så fyller du i</b>
        Grön: klart och prissatt. Gul: avvikelse som vi hanterar med reservation eller påslag. Röd: ledningen eller beställaren måste svara innan anbudet lämnas. Skriv alltid en eller två meningar om vad bedömningen bygger på, och märk antaganden.
      </Callout>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {bedomning.per.map(({ fraga, ljus }, i) => {
          const id = `ps-${anbudsfragaId(fraga)}`;
          return (
            <li key={fraga.id} id={`af-kort-${fraga.id}`} className="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-solid border-hairline py-3 pl-5 pr-4">
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${KANT[ljus]}`} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="m-0 font-display text-[15px] font-bold leading-snug">
                  <span className="mr-2 tabular-nums text-ink-soft">{i + 1}.</span>
                  {fraga.kort}
                </h3>
                <LjusVal fraga={fraga} varde={ljus} onChange={(val) => onFalt(anbudsljusId(fraga), val)} />
              </div>
              <label htmlFor={id} className="text-[12px] text-ink-soft">
                {fraga.fraga}
                <span aria-hidden="true"> *</span>
              </label>
              <textarea id={id} rows={3} value={v[anbudsfragaId(fraga)] ?? ""} placeholder={fraga.hjalp} aria-required="true" onChange={(e) => onFalt(anbudsfragaId(fraga), e.target.value)} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

