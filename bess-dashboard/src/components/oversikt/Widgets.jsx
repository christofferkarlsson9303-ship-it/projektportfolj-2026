import { useMemo } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { Pill } from "../ui/Primitiver.jsx";
import { fmtSEK } from "../../lib/format.js";
import { dagarTill, idag, kortDatum, MANADER } from "../../lib/datum.js";
import { berakFlaggor } from "../../lib/flaggor.js";
import { MILSTOLPE_MODELL } from "../../data/konstanter.js";
import {
  BESS_MATCH,
  ataSummering,
  bessNedrakning,
  dagarSedanRond,
  ekonomi,
  kommandeHandelser,
  oppnaRondavvikelser,
  projekt,
  slutdokIndex,
} from "../../lib/berakningar.js";

/* ---------- Flaggpanel ---------- */

export function Flaggpanel() {
  const { state } = usePortfolj();
  const { oppnaFlagga } = useUi();
  const fl = useMemo(() => berakFlaggor(state), [state]);

  if (!fl.length) return null;
  const hoga = fl.filter((f) => f.niva === "hog").length;

  return (
    <div className="card flaggor" style={{ marginBottom: 16 }}>
      <h3>
        <span aria-hidden="true">⚠</span> Kräver uppmärksamhet <span className="fcount">{fl.length}</span>
      </h3>
      <div className="lead">
        {hoga ? `${hoga} akuta · ` : ""}
        {fl.length - hoga} att bevaka — automatiskt beräknat över alla projekt.
      </div>
      <ul className="flist" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {fl.map((f, i) => (
          <li className={`fitem ${f.niva}`} key={`${f.vy}-${f.text}-${i}`}>
            <span className="fdot" aria-hidden="true" />
            <span className="ftxt">{f.text}</span>
            <PTag pid={f.projektId} />
            <button
              type="button"
              className="btn sec mini"
              onClick={() => oppnaFlagga(state.projekt.some((p) => p.id === f.projektId) ? f.projektId : "", f.vy, f.extra)}
            >
              Öppna
              {/* Gör knappen unik för skärmläsare — "Öppna" ensamt säger inget i en lista. */}
              <span className="sr-only">: {f.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Site-statusrad ---------- */

const LEV_TXT = {
  bekraftad: (l) => "Bekräftad" + (l.datum ? " · ETA " + l.datum : ""),
  pa_vag: (l) => "På väg" + (l.datum ? " · ETA " + l.datum : ""),
  levererad: (l) => "Levererad" + (l.datum ? " " + l.datum : ""),
  avvikelse: () => "Avvikelse — nytt datum saknas",
};

export function SiteStatusBar({ pid }) {
  const { state } = usePortfolj();
  const p = projekt(state, pid);
  if (!p || !p.mw) return null;

  const { godkant, pending } = ataSummering(state, pid);
  const dagarR = dagarSedanRond(state, pid);
  const avv = oppnaRondavvikelser(state, pid).length;
  const ar = idag().slice(0, 4);
  const tillbudYTD = state.hseqIncidenter.filter(
    (i) => i.projektId === pid && i.typ === "tillbud" && (i.datum || "").slice(0, 4) === ar
  ).length;
  const lev = state.leveranser
    .filter((l) => l.projektId === pid)
    .sort((a, b) => (a.datum || "9999").localeCompare(b.datum || "9999"))
    .slice(0, 3);

  return (
    <section className="sitebar" role="region" aria-label={`Status för ${p.namn}`}>
      <h2 className="sitebar-top">
        <b>SITE: {p.namn.toUpperCase()}</b>
        <span>
          {p.mw} MW / {p.mwh ?? "—"} MWh
        </span>
        <span aria-hidden="true">·</span>
        <span>Anslutning: {p.natagare || "—"}</span>
        <span aria-hidden="true">·</span>
        <span>Planerad drift: {p.fardigstallande || "—"}</span>
      </h2>
      <div className="sitebar-cols">
        <div className="sitebar-col">
          <h5>ÄTA-status</h5>
          <div className="sitebar-row">
            <span>Godkända</span>
            <b>{fmtSEK(godkant)}</b>
          </div>
          <div className="sitebar-row">
            <span>Pending</span>
            <b>{fmtSEK(pending)}</b>
          </div>
          <div className="sitebar-row">
            <span>Totalt</span>
            <b>{fmtSEK(godkant + pending)}</b>
          </div>
        </div>
        <div className="sitebar-col">
          <h5>BAS-U / HMS-statistik</h5>
          <div className="sitebar-row">
            <span>Senaste skyddsrond</span>
            <b>{dagarR === null ? "—" : dagarR + " d sedan"}</b>
          </div>
          <div className="sitebar-row">
            <span>Öppna avvikelser</span>
            <b>{avv} st</b>
          </div>
          <div className="sitebar-row">
            <span>Tillbud ({ar})</span>
            <b>{tillbudYTD} st</b>
          </div>
        </div>
        <div className="sitebar-col">
          <h5>Leveransstatus (long-lead)</h5>
          {lev.length ? (
            lev.map((l) => (
              <div className="sitebar-row" key={l.id}>
                <span>{(l.benamning || "").split(" (")[0]}</span>
                <b>{(LEV_TXT[l.status] || ((x) => x.status))(l)}</b>
              </div>
            ))
          ) : (
            <div className="sitebar-row">
              <span>Ingen leverans registrerad</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- BESS-nedräkning ---------- */

export function BessHero() {
  const { state } = usePortfolj();
  const b = bessNedrakning(state);
  if (!b) return null;
  const forsenad = b.d < 0;

  return (
    <div className={`bhero ${forsenad ? "past" : b.d <= 14 ? "urgent" : ""}`.trim()}>
      <div className="bh-num">{forsenad ? "−" + Math.abs(b.d) : b.d}</div>
      <div>
        <div className="bh-lbl">
          {forsenad ? "dagar sedan senaste BESS-leverans" : "dagar till nästa BESS-leverans"}
        </div>
        <div className="bh-sub">
          <PTag pid={b.projektId} /> {b.benamning}
          {b.leverantor && b.leverantor !== "—" ? ` · ${b.leverantor}` : ""} · {b.datum}
        </div>
      </div>
    </div>
  );
}

/* ---------- Gantt-rad: kommande i alla projekt ---------- */

export function GanttRad() {
  const { state } = usePortfolj();

  const rader = useMemo(() => {
    const ut = [];
    state.leveranser.forEach((l) => {
      if (l.datum)
        ut.push({ datum: l.datum, titel: l.benamning, pid: l.projektId, bess: BESS_MATCH.test(l.benamning) });
    });
    state.milstolpar.forEach((m) => {
      if (m.datum && m.status !== "klar" && !/leverans/i.test(m.titel))
        ut.push({ datum: m.datum, titel: m.titel, pid: m.projektId, bess: BESS_MATCH.test(m.titel) });
    });
    return ut
      .filter((r) => dagarTill(r.datum) >= -3)
      .sort((a, b) => a.datum.localeCompare(b.datum))
      .slice(0, 10);
  }, [state]);

  if (!rader.length) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3>Kommande — alla projekt</h3>
      <div className="lead">Leveranser och grindar, närmast överst. Bläddra i sidled på mobil.</div>
      <ul className="gwrap" style={{ listStyle: "none", margin: 0, padding: "0 0 4px" }} tabIndex={0}>
        {rader.map((r, i) => {
          const d = dagarTill(r.datum);
          const kl = d < 0 ? "past" : d <= 7 ? "urgent" : d <= 30 ? "soon" : "";
          return (
            <li className={`gchip ${kl}${r.bess ? " bess" : ""}`.trim()} key={`${r.datum}-${r.titel}-${i}`}>
              <div className="gd">
                {d < 0 ? "−" + Math.abs(d) : d}
                <span>d</span>
              </div>
              <div className="gt">
                {r.bess ? <span aria-hidden="true">🔋 </span> : null}
                {r.titel}
              </div>
              <div className="gp">
                <PTag pid={r.pid} />
              </div>
              <div className="gdatum">{r.datum}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Mätare ---------- */

function Ring({ proc, etikett, varde, klass = "" }) {
  const p = Math.max(0, Math.min(100, Math.round(proc || 0)));
  const c = 2 * Math.PI * 26;
  return (
    <div className={`matare ${klass}`.trim()}>
      <svg viewBox="0 0 64 64" className="ringsvg" aria-hidden="true">
        <circle cx="32" cy="32" r="26" className="ringbg" />
        <circle
          cx="32"
          cy="32"
          r="26"
          className="ringfg"
          style={{ strokeDasharray: c, strokeDashoffset: c - (c * p) / 100 }}
        />
      </svg>
      <div className="mtxt">
        <b>{varde}</b>
        <span>{etikett}</span>
      </div>
    </div>
  );
}

export function Matarrad({ pid }) {
  const { state } = usePortfolj();
  const p = projekt(state, pid);
  if (!p) return null;

  const ek = ekonomi(state, pid);
  const mKlara = MILSTOLPE_MODELL.filter((m) => {
    const b = state.betalplan.find((x) => x.projektId === pid && x.kod === m.kod);
    return b && b.status === "fakturerad";
  }).length;
  const ix = slutdokIndex(state, pid);
  const dagar = dagarSedanRond(state, pid);
  const hseqProc = dagar === null ? 0 : Math.max(0, Math.min(100, Math.round(((14 - dagar) / 14) * 100)));

  return (
    <div className="card">
      <h3>Mätare — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
      <div className="lead">Framdrift, budget, arbetsmiljö och överlämning i en blick.</div>
      <div className="matargrid">
        <Ring proc={(mKlara / 7) * 100} etikett="milstolpar klara" varde={`${mKlara}/7`} />
        <Ring proc={ek.faktProc} etikett="av kontraktet fakturerat" varde={`${ek.faktProc} %`} />
        <Ring
          proc={hseqProc}
          etikett="marginal till skyddsrond"
          varde={dagar === null ? "—" : `${14 - dagar} d`}
          klass={hseqProc < 30 ? "bad" : ""}
        />
        <Ring proc={ix.proc} etikett="överlämningsindex" varde={`${ix.proc} %`} klass={ix.proc < 80 ? "warn" : ""} />
      </div>
    </div>
  );
}

/* ---------- Kommande leveranser och grindar ---------- */

export function KommandeTidslinje() {
  const { state } = usePortfolj();
  const rader = useMemo(() => kommandeHandelser(state), [state]);

  if (!rader.length) return <p className="lead">Inga kommande händelser.</p>;

  let senasteManad = "";
  const poster = [];

  rader.forEach((r, i) => {
    const d = r.datum ? dagarTill(r.datum) : null;
    const kd = r.datum ? kortDatum(r.datum) : { dag: "?", man: "" };
    const kl = d === null ? "okant" : d < 0 ? "past" : d <= 14 ? "urgent" : d <= 45 ? "soon" : "";
    const bess = BESS_MATCH.test(r.titel) ? " bess" : "";
    const nyckel = r.datum ? r.datum.slice(0, 7) : "okant";

    if (nyckel !== senasteManad) {
      senasteManad = nyckel;
      poster.push(
        <li className="tl-man" key={`man-${nyckel}`}>
          {r.datum
            ? `${MANADER[new Date(r.datum + "T00:00:00").getMonth()]} ${r.datum.slice(0, 4)}`
            : "Utan bekräftat datum"}
        </li>
      );
    }

    poster.push(
      <li className={`tl-item ${kl}${bess}`.trim()} key={`${r.titel}-${r.datum || "x"}-${i}`}>
        <div className="tl-dat">
          <b>{kd.dag}</b>
          <span>{kd.man}</span>
        </div>
        <div className="tl-spar" aria-hidden="true">
          <i />
        </div>
        <div className="tl-inn">
          <div className="tl-titel">{r.titel}</div>
          <div className="tl-meta">
            <PTag pid={r.pid} />
            <span className="tl-kvar">
              {d === null ? "datum saknas" : d < 0 ? `${Math.abs(d)} dagar sedan` : `${d} dagar kvar`}
            </span>
            {r.status === "avvikelse" ? <Pill status="avvikelse" /> : null}
            <span className="tl-typ">{r.typ === "ms" ? "grind" : "leverans"}</span>
          </div>
        </div>
      </li>
    );
  });

  return <ol className="tlista">{poster}</ol>;
}
