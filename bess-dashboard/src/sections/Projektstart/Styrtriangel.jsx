import { StatusBadge } from "../../components/ds/index.js";
import { STYRPARAMETRAR, styrparametrar } from "../../lib/styrparametrar.js";

/* Styrparametertriangeln i projektdirektivet: kostnad, kvalitet och tid i procent.
   Punkten i triangeln ligger närmast det hörn som väger tyngst (barycentriska
   koordinater). Den ritas bara när fördelningen är giltig; annars står summan
   och vad som saknas i text. Värdena står alltid i klartext bredvid. */

const B = 220;
const H = 190;
// Hörnen: kostnad uppe, kvalitet nere till vänster, tid nere till höger.
const HORN = [
  [B / 2, 30],
  [30, H - 30],
  [B - 30, H - 30],
];
const ETIKETT = [
  [B / 2, 14, "middle"],
  [30, H - 8, "start"],
  [B - 30, H - 8, "end"],
];

const fmt = (n) => (n === null || Number.isNaN(n) ? "–" : `${String(n).replace(".", ",")} %`);

export function Styrtriangel({ v }) {
  const s = styrparametrar(v);
  const punkt = s.giltig
    ? HORN.reduce(([x, y], [hx, hy], i) => [x + (hx * s.varden[i]) / 100, y + (hy * s.varden[i]) / 100], [0, 0])
    : null;
  const ton = s.giltig ? "ok" : s.ifyllda ? "warn" : "neutral";
  const text = s.giltig ? "Summa 100 %" : s.ifyllda ? `Summa ${fmt(s.summa)} – ska vara 100 %` : "Fyll i kostnad, kvalitet och tid";
  return (
    <section aria-label="Styrparametrar: kostnad, kvalitet och tid" className="flex flex-col gap-3 rounded-sm border border-solid border-hairline bg-sunken p-4 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox={`0 0 ${B} ${H}`} width="220" height="190" className="max-w-full shrink-0" role="img" aria-label={s.giltig ? `Kostnad ${fmt(s.varden[0])}, kvalitet ${fmt(s.varden[1])}, tid ${fmt(s.varden[2])}` : text}>
        <polygon points={HORN.map((p) => p.join(",")).join(" ")} fill="var(--surface)" stroke="var(--one-djup)" strokeWidth="2" />
        {HORN.map(([x, y], i) => (
          <circle key={STYRPARAMETRAR[i][0]} cx={x} cy={y} r={4 + (s.giltig ? (s.varden[i] / 100) * 8 : 0)} fill="var(--one-bla)" />
        ))}
        {ETIKETT.map(([x, y, a], i) => (
          <text key={a} x={x} y={y} textAnchor={a} fontSize="12" fontWeight="600" fill="var(--ink)">
            {STYRPARAMETRAR[i][1]}
          </text>
        ))}
        {punkt ? <circle cx={punkt[0]} cy={punkt[1]} r="6" fill="var(--one-djup)" stroke="var(--surface)" strokeWidth="2" /> : null}
      </svg>
      <div className="flex min-w-0 flex-col gap-2">
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px]">
          {STYRPARAMETRAR.map(([id, namn], i) => (
            <div key={id} className="contents">
              <dt className="font-semibold text-ink">{namn}</dt>
              <dd className="m-0 text-right tabular-nums text-ink">{fmt(s.varden[i])}</dd>
            </div>
          ))}
        </dl>
        <StatusBadge label={text} ton={ton} />
        <span className="text-xs text-ink-soft">Ange i procent hur kostnad, kvalitet och tid prioriteras. Fas 1 godkänns när summan är 100 %.</span>
      </div>
    </section>
  );
}
