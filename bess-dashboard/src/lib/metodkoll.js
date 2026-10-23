import { KATALOG } from "../data/projektstartKatalog.js";
import { dagarMellan, faslage } from "./epc.js";
import { idag } from "./datum.js";
import { kritiskLinje } from "./kritiskLinje.js";
import { prognos, prognosLage } from "./prognos.js";

/* Projektmetodens BESS-kritiska kontroller (docs/projektmetod.md § 11.2),
   räknade ur det som redan finns i portföljen:

   - interfacelage   — interface-listan (§ 6.7). Listan bor i Projektstart
                       (steget Godkänd lösning) och följs upp varje vecka.
   - losningslage    — godkänd lösning som grind före inköp (§ 6.8, HP mot G4).
   - trafikljus      — tid, budget, planerat arbete och milstolpar (§ 3.4).

   Inget här skriver; det läser state och svarar. */

const AVSTAMNING_DAGAR = 7;

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
export const projektstartFor = (state, pid) => (state.projektstart || []).find((x) => x.projektId === pid) || null;

/* ---------- Interface-lista ---------- */

/** Raderna i interface-listan med läge. Ett gränssnitt behöver åtgärd när det
 *  är Oklart, inte bedömt, eller inte avstämt de senaste sju dagarna. */
export function interfacelage(state, pid, nu = idag()) {
  const post = projektstartFor(state, pid);
  if (!post) return { finns: false, rader: [], atgard: 0 };
  const rader = (post.utkast?.rader?.interface || [])
    .filter((r) => (r.granssnitt || r.innehall || "").trim())
    .map((r) => {
      const dagar = giltigt(r.avstamd) ? dagarMellan(r.avstamd, nu) : null;
      const status = r.status || "Ej bedömd";
      let lage = "ok";
      if (status === "Oklart") lage = "oklart";
      else if (status === "Ej bedömd") lage = "ejbedomd";
      else if (dagar === null || dagar > AVSTAMNING_DAGAR) lage = "gammal";
      return { ...r, status, dagarSedan: dagar, lage };
    });
  return { finns: true, rader, atgard: rader.filter((r) => r.lage !== "ok").length };
}

/* ---------- Godkänd lösning — grind före inköp ---------- */

const GRIND_FORE_INKOP = (KATALOG.solution || []).filter((p) => p.grupp === "Grind före inköp");

/** Godkänd lösning är klar när alla kritiska punkter i "Grind före inköp"
 *  (Projektstart, steget Godkänd lösning) är bockade. */
export function losningslage(state, pid) {
  const post = projektstartFor(state, pid);
  const kryss = post?.utkast?.kryss?.solution || {};
  const kritiska = GRIND_FORE_INKOP.filter((p) => p.kritisk);
  const saknas = kritiska.filter((p) => !kryss[p.id]).map((p) => p.text);
  return { finns: !!post, godkand: !!post && saknas.length === 0, saknas, totalt: kritiska.length };
}

/* ---------- Trafikljus (§ 3.4) ---------- */

const VARRE = { neutral: 0, ok: 1, warn: 2, bad: 3 };
export const LJUSTEXT = { ok: "Grön", warn: "Gul", bad: "Röd", neutral: "Underlag saknas" };

/** Fyra ljus per projekt — tid, budget, planerat arbete och milstolpar — och
 *  ett samlat som är det sämsta. Grön = enligt plan, gul = avvikelse som
 *  hanteras i projektet, röd = allvarlig avvikelse som kräver hjälp eller beslut.
 *  Gränserna (14 dagar, två sena moment) är projektledarens tumregler och
 *  står i `grund` så att ljuset alltid går att förklara. */
export function trafikljus(state, pid, nu = idag()) {
  const kl = kritiskLinje(state, pid, nu);
  const tid = (() => {
    if (!kl || kl.forsening === null) return { ton: "neutral", text: "Plan eller kontraktsdatum saknas", grund: "" };
    const d = kl.forsening;
    if (d <= 0) return { ton: "ok", text: "Klar i tid", grund: `Beräknat slut ${kl.slutPrognos}, ${-d} dagars marginal mot kontraktet.` };
    if (d <= 14) return { ton: "warn", text: `${d} dagar sent`, grund: `Beräknat slut ${kl.slutPrognos} mot kontraktet ${kl.kontrakt}.` };
    return { ton: "bad", text: `${d} dagar sent`, grund: `Beräknat slut ${kl.slutPrognos} mot kontraktet ${kl.kontrakt}. Kräver beslut.` };
  })();

  const budget = (() => {
    const l = prognosLage(prognos(state, pid));
    return { ton: l.ton === "neutral" ? "neutral" : l.ton, text: l.text, grund: "Prognos slutkostnad och TB (Ekonomi)." };
  })();

  const arbete = (() => {
    const faser = faslage(state, pid, nu);
    if (faser.some((f) => f.status === "odaterad")) return { ton: "neutral", text: "Momentplan saknas", grund: "" };
    const sena = faser.filter((f) => f.status === "sen");
    const namn = sena.map((f) => `${f.fas.nr} ${f.fas.kort}`).join(", ");
    if (!sena.length) return { ton: "ok", text: "Inga sena moment", grund: "" };
    if (sena.length === 1) return { ton: "warn", text: "1 sent moment", grund: `Moment ${namn}.` };
    return { ton: "bad", text: `${sena.length} sena moment`, grund: `Moment ${namn}.` };
  })();

  const milstolpar = (() => {
    if (!kl) return { ton: "neutral", text: "Plan saknas", grund: "" };
    const oppna = kl.milstolpar.filter((m) => !m.klar);
    if (!oppna.length) return { ton: "ok", text: "Alla passerade", grund: "" };
    const varst = oppna.reduce((a, m) => (m.forskjutning > a.forskjutning ? m : a), oppna[0]);
    if (varst.forskjutning <= 0) return { ton: "ok", text: "Enligt plan", grund: `Nästa: ${oppna[0].kod} ${oppna[0].prognos}.` };
    const t = `${varst.kod} ${varst.forskjutning} dagar sen`;
    return { ton: varst.forskjutning <= 14 ? "warn" : "bad", text: t, grund: `${varst.kod} beräknas ${varst.prognos} mot plan ${varst.plan}.` };
  })();

  const delar = { tid, budget, arbete, milstolpar };
  const samlad = Object.values(delar).reduce((a, d) => (VARRE[d.ton] > VARRE[a] ? d.ton : a), "neutral");
  return { ...delar, samlad };
}

export const LJUSDELAR = [
  ["tid", "Tid"],
  ["budget", "Budget"],
  ["arbete", "Planerat arbete"],
  ["milstolpar", "Milstolpar"],
];
