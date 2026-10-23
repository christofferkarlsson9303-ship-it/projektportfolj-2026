import { FASER } from "../data/bessChecklistData.ts";
import { gallerFor } from "./berakningar.js";
import { idag } from "./datum.js";
import { VARNING_DAGAR, dagarMellan, faslage, plusDagar } from "./epc.js";

/* Beställningar mot tidplanen — "beställ senast".

   En leverans i leveranslistan (state.leveranser) kan få tre fält till:
     moment       — vilket moment (0–15) som behöver leveransen. Sätts det
                    uttryckligen styr leveransdatumet momentets start i
                    kritisk linje (lib/kritiskLinje.js).
     ledtidVeckor — leverantörens ledtid från order till leverans, i veckor.
     bestalld     — datum då ordern lades.

   Behovsdatum = momentets planerade start. Beställ senast = behovsdatum minus
   ledtiden. Är ordern inte lagd larmar raden när datumet närmar sig (gul inom
   VARNING_DAGAR, röd när det passerat). Är den lagd och leveransdatumet ligger
   efter behovsdatumet försenar leveransen momentet.

   Momentet gissas ur benämningen när det inte är satt, så att BESS, MV och
   kabel får ett behovsdatum direkt. En gissning styr aldrig kritisk linje. */

/** @type {{ re: RegExp, nr: number }[]} */
const GISSNING = [
  { re: /str[öo]mtransformator|kabel-?ct|\bct\b/i, nr: 10 },
  { re: /bess|batteri|container|catl|enerx/i, nr: 11 },
  { re: /\bmv\b|mellansp|st[äa]llverk|station|transformator|trafo|skid|pcs|e-?house/i, nr: 10 },
  { re: /kabel/i, nr: 9 },
  { re: /jord/i, nr: 8 },
];

/** Momentet en leverans behövs till: uttryckligt eller gissat ur benämningen. */
export function behovsmoment(l) {
  if (Number.isInteger(l.moment) && l.moment >= 0 && l.moment < FASER.length) return { nr: l.moment, gissat: false };
  const g = GISSNING.find((x) => x.re.test(l.benamning || ""));
  return g ? { nr: g.nr, gissat: true } : null;
}

export const BESTALLNING_STATUS = {
  sen: ["bad", "Beställ nu — försenad"],
  forsenar: ["bad", "Försenar momentet"],
  snart: ["warn", "Beställ snart"],
  "i-tid": ["neutral", "I tid"],
  bestalld: ["ok", "Beställd"],
  levererad: ["ok", "Levererad"],
  underlag: ["info", "Ledtid eller moment saknas"],
};

const ORDNING = { sen: 0, forsenar: 1, snart: 2, underlag: 3, "i-tid": 4, bestalld: 5, levererad: 6 };

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const veckor = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Varje leverans för projektet med behovsdatum, beställ-senast och läge,
 *  mest brådskande först. */
export function bestallningslage(state, pid, nu = idag()) {
  const faser = faslage(state, pid, nu);
  return (state.leveranser || [])
    .filter((l) => gallerFor(l, pid))
    .map((l) => {
      const m = behovsmoment(l);
      const behov = m ? faser[m.nr]?.start || null : null;
      const v = veckor(l.ledtidVeckor);
      const senast = behov && v ? plusDagar(behov, -Math.round(v * 7)) : null;
      const dagarKvar = senast ? dagarMellan(nu, senast) : null;
      const bestalld = giltigt(l.bestalld) ? l.bestalld : null;
      const levSen = behov && giltigt(l.datum) ? dagarMellan(behov, l.datum) : null;

      let status;
      if (l.status === "klar") status = "levererad";
      else if (bestalld) status = levSen !== null && levSen > 0 ? "forsenar" : "bestalld";
      else if (dagarKvar === null) status = "underlag";
      else if (dagarKvar < 0) status = "sen";
      else if (dagarKvar <= VARNING_DAGAR) status = "snart";
      else status = "i-tid";

      return {
        id: l.id,
        rad: l,
        projektId: pid,
        moment: m ? m.nr : null,
        momentGissat: m ? m.gissat : false,
        behov,
        ledtidVeckor: v,
        senast,
        dagarKvar,
        bestalld,
        forsenarDagar: levSen !== null && levSen > 0 ? levSen : 0,
        status,
      };
    })
    .sort((a, b) => ORDNING[a.status] - ORDNING[b.status] || (a.dagarKvar ?? 1e9) - (b.dagarKvar ?? 1e9));
}

/** Leveranser med uttryckligt moment och giltigt datum: momentets start kan
 *  inte ligga före leveransen. Senaste leveransen per moment vinner. */
export function leveransbindningar(state, pid) {
  const ut = new Map();
  for (const l of state.leveranser || []) {
    if (!gallerFor(l, pid) || !giltigt(l.datum) || !Number.isInteger(l.moment)) continue;
    const fore = ut.get(l.moment);
    if (!fore || l.datum > fore.datum) ut.set(l.moment, { datum: l.datum, text: `${l.benamning} levereras ${l.datum}` });
  }
  return ut;
}
