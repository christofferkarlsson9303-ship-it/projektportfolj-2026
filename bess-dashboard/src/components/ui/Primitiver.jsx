/* Små återanvändbara byggstenar. De ärver designsystemets klasser, så
   utseendet är identiskt med standalone-versionen — skillnaden är att de är
   komponerbara och att tillgängligheten är inbyggd. */

import { PILL } from "../../data/konstanter.js";
import { PILL_TILL_TON } from "../../lib/status.js";
import { StatusBadge } from "../ds/StatusBadge.jsx";
import { StatTile } from "../ds/StatTile.jsx";
import { Callout } from "../ds/Callout.jsx";

export function Card({ children, klass = "", ...rest }) {
  return (
    <div className={`card ${klass}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function Kortrubrik({ titel, lead, verktyg, id }) {
  return (
    <div className="kortrad">
      <div style={{ minWidth: 0 }}>
        <h3 id={id}>{titel}</h3>
        {lead ? <div className="lead">{lead}</div> : null}
      </div>
      {verktyg ? <div className="kortverktyg">{verktyg}</div> : null}
    </div>
  );
}

/** Nyckeltal i de äldre vyerna — samma ruta som i resten av appen (StatTile). */
export function Kpi({ label, varde, hint, klass = "" }) {
  return <StatTile label={label} value={varde} hint={hint} ton={klass} />;
}

/** Status i de äldre vyerna — samma märke som i resten av appen (StatusBadge). */
export function Pill({ status }) {
  const [c, t] = PILL[status] || ["p-wait", status];
  return <StatusBadge ton={PILL_TILL_TON[c]} label={t} />;
}

export function Tag({ children, klass = "" }) {
  return <span className={`tag ${klass}`.trim()}>{children}</span>;
}

/** Projektetikett med projektets egen accentfärg. */
export function ProjektTag({ state, pid, projektKlass }) {
  if (pid === "bada") return <Tag>Båda</Tag>;
  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return <Tag>{pid}</Tag>;
  return <Tag klass={projektKlass}>{(p.nr ? p.nr + " " : "") + (p.ort || p.namn)}</Tag>;
}

/** Statusväljare. Kräver etikett — en naken <select> är otillgänglig. */
export function SelStatus({ alternativ, varde, onChange, etikett, ...rest }) {
  return (
    <select value={varde ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={etikett} {...rest}>
      {alternativ.map((a) => {
        const v = Array.isArray(a) ? a[0] : a;
        const t = Array.isArray(a) ? a[1] : (PILL[a] || [undefined, a])[1];
        return (
          <option key={v} value={v}>
            {t}
          </option>
        );
      })}
    </select>
  );
}

/** Upplysning i de äldre vyerna — samma ruta som i resten av appen (Callout).
 *  Luften ovanför behålls, eftersom de äldre vyerna inte staplar med gap. */
export function Note({ children, niva = "", ...rest }) {
  return (
    <Callout ton={niva || "info"} className="mt-4" {...rest}>
      {children}
    </Callout>
  );
}

/** Framdriftsstapel med värdet utläst för skärmläsare. */
export function Bar({ procent, klass = "", etikett }) {
  const p = Math.max(0, Math.min(100, Number(procent) || 0));
  return (
    <div
      className={`bar ${klass}`.trim()}
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etikett}
    >
      <span style={{ width: p + "%" }} />
    </div>
  );
}

export function Prog({ procent, klart = false, etikett }) {
  const p = Math.max(0, Math.min(100, Number(procent) || 0));
  return (
    <div
      className={`prog ${klart ? "done" : ""}`.trim()}
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etikett}
    >
      <span style={{ width: p + "%" }} />
    </div>
  );
}

/** Riskvärde i färgad ruta. */
export function Riskvarde({ varde, klass }) {
  return (
    <span className={`rv ${klass}`}>
      {varde}
      <span className="sr-only"> riskvärde</span>
    </span>
  );
}

/** Horisontellt rullbar tabellyta. Får tabindex så den går att rulla med
 *  tangentbord, vilket en ren overflow-container annars inte gör. */
export function Tabellyta({ children, etikett }) {
  return (
    <div className="tscroll" tabIndex={0} role="region" aria-label={etikett}>
      {children}
    </div>
  );
}

export function Btn({ children, variant = "", mini = false, ...rest }) {
  const klasser = ["btn", variant === "sec" ? "sec" : "", mini ? "mini" : ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={klasser} {...rest}>
      {children}
    </button>
  );
}

export function Tom({ children }) {
  return <p className="lead">{children}</p>;
}
