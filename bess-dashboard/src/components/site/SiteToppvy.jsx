import { useRef } from "react";
import { KORYTOR, TOMT, TYPFARG, arNal } from "../../lib/site.js";

/* Toppvy av siten — ritad ur samma objekt som 3D-scenen, inte en bild.

   Meter rakt in i viewBox: x åt höger, z nedåt (söder), norr uppåt. En volym
   roteras med −rotation eftersom SVG:s rotate går medurs där three går
   moturs sett ovanifrån. Färgerna är designsystemets variabler.

   Med onMark blir ytan klickbar: klick på marken ger meter, klick på ett
   objekt väljer det. Utan blir den en ren bild (Idag lägger den i en knapp). */

const KANT = 2;
const VY = `${-TOMT.bredd / 2 - KANT} ${-TOMT.djup / 2 - KANT} ${TOMT.bredd + KANT * 2} ${TOMT.djup + KANT * 2}`;

export function SiteToppvy({ objekt, valtId = null, onMark, onValj, etikett, className = "" }) {
  const svg = useRef(null);
  const interaktiv = !!onMark;

  const tillMeter = (e) => {
    const s = svg.current;
    const m = s?.getScreenCTM?.();
    if (!s || !m) return null;
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, z: q.y };
  };

  const klick = (e) => {
    if (!interaktiv) return;
    const id = e.target?.closest?.("[data-objekt]")?.getAttribute("data-objekt");
    if (id) {
      onValj?.(id);
      return;
    }
    const p = tillMeter(e);
    if (p) onMark(p.x, p.z);
  };

  return (
    <svg
      ref={svg}
      viewBox={VY}
      role="img"
      aria-label={etikett}
      onClick={interaktiv ? klick : undefined}
      className={`block h-auto w-full ${interaktiv ? "cursor-crosshair" : ""} ${className}`.trim()}
      data-roll="toppvy"
    >
      <rect
        x={-TOMT.bredd / 2}
        y={-TOMT.djup / 2}
        width={TOMT.bredd}
        height={TOMT.djup}
        rx="0.6"
        style={{ fill: "var(--sunken)", stroke: "var(--hairline-stark)", strokeWidth: 0.3 }}
      />
      {KORYTOR.map((k, i) => (
        <rect
          key={i}
          x={k.x - k.bredd / 2}
          y={k.z - k.djup / 2}
          width={k.bredd}
          height={k.djup}
          style={{ fill: "var(--hairline-stark)" }}
        />
      ))}

      {objekt.filter((o) => !arNal(o)).map((o) => {
        const valt = o.id === valtId;
        return (
          <g key={o.id} transform={`translate(${o.x} ${o.z}) rotate(${-(o.rotation || 0)})`} data-objekt={o.id}>
            <title>{o.namn}</title>
            <rect
              x={-o.bredd / 2}
              y={-o.djup / 2}
              width={o.bredd}
              height={o.djup}
              rx="0.2"
              style={{
                fill: `var(${TYPFARG[o.typ]})`,
                stroke: valt ? "var(--orange)" : "var(--one-djup)",
                strokeWidth: valt ? 0.6 : 0.2,
              }}
            />
          </g>
        );
      })}

      {objekt.filter(arNal).map((o) => (
        <g key={o.id} transform={`translate(${o.x} ${o.z})`} data-objekt={o.id}>
          <title>Nål</title>
          <circle
            r={o.id === valtId ? 1.5 : 1.1}
            style={{ fill: "var(--orange)", stroke: o.id === valtId ? "var(--one-djup)" : "var(--surface)", strokeWidth: 0.4 }}
          />
        </g>
      ))}

      {/* Norr uppåt. */}
      <g transform={`translate(${TOMT.bredd / 2 - 2.5} ${-TOMT.djup / 2 + 3})`} aria-hidden="true">
        <path d="M0 -2.2 L1.2 1 L0 0.3 L-1.2 1 Z" style={{ fill: "var(--ink-soft)" }} />
        <text y="3.4" textAnchor="middle" style={{ fill: "var(--ink-soft)", fontSize: 2.2, fontWeight: 700 }}>
          N
        </text>
      </g>
    </svg>
  );
}
