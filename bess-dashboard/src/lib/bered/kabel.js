/* Kabeldimensionering för BESS-beredningen.

   MV: belastningsförmåga ur Prysmian Kabelkatalogen 2024, AXLJ-TTCL TSLF 12/20(24) kV (mark,
   treklöver, skärm jordad i båda ändar, 15 °C, 1,0 K·m/W, 0,65 m). Korrigeras med NKT
   Kraftkabelhandboken tabell 25–28 och ×0,8 i rör (EBR KJ41 6.2). 3-ledare AXALJ-TT saknar
   belastningsvärde i underlaget och ger därför "verifiera", aldrig ett påhittat tal.

   DC: Kabelboken 2026 ("Användning av likspänning på standardkablar"): 0,6/1 kV tål 0,9 kV DC
   ledare–jord och 1,8 kV DC ledare–ledare.

   Hjälpkraft: spänningsfall enligt NKT tabell 42 (Al, 380 V-bas, % per I·L där L i 100 m).

   Inget här ersätter slutlig beräkning enligt SS 424 14 16 / IEC 60287 i projekteringen. */

import { fmtTal } from "../format.js";

export const MVKABEL = {
  "AXLJ-TTCL 1x150/25": { art: "E00 715 65", I: 300, t: "MV-T240", s: "MV-S240", tri: true },
  "AXLJ-TTCL 1x240/35": { art: "E00 715 85", I: 385, t: "MV-T240", s: "MV-S240", tri: true },
  "AXLJ-TTCL 1x400/35": { art: "E00 715 95", I: 510, t: "MV-T400", s: "MV-S400", tri: true },
  "AXLJ-TTCL 1x630/50": { art: "E00 720 55", I: 635, t: "MV-T630", s: "MV-S630", tri: true },
  "AXALJ-TT 3x150/35": { art: "E00 806 85", I: null, t: "MV-T240", s: "MV-S240", tri: false },
  "AXALJ-TT 3x240/50": { art: "E00 806 95", I: null, t: "MV-T240", s: "MV-S240", tri: false },
};

/* NKT tabell 26 (24 kV PEX); 17 °C är interpolerat (högsta marktemperatur i södra Sverige). */
export const KF_TEMP = { 10: 1.03, 15: 1.0, 17: 0.984, 20: 0.96, 25: 0.93 };
/* NKT tabell 25, 24 kV, direkt i mark. */
export const KF_RHO = { "0,7": 1.1, "1,0": 1.0, "1,2": 0.92, "1,5": 0.85, "2,0": 0.75, "2,5": 0.69 };
/* NKT tabell 27. */
export const KF_DJUP = { "0,25–0,70": 1.0, "0,71–0,90": 0.97, "0,91–1,10": 0.95, "1,11–1,30": 0.93 };
/* NKT tabell 28, 12–24 kV: avstånd (mm) → faktor för 2,3,4,5,6,(7),8,10 grupper. 7 grupper tar
   8-gruppsvärdet (konservativt). */
export const KF_GRP = {
  0: [0.79, 0.69, 0.63, 0.58, 0.55, 0.5, 0.5, 0.46],
  70: [0.85, 0.75, 0.68, 0.64, 0.6, 0.56, 0.56, 0.53],
  250: [0.89, 0.79, 0.75, 0.72, 0.69, 0.66, 0.66, 0.64],
  500: [0.91, 0.84, 0.81, 0.79, 0.77, 0.75, 0.75, 0.74],
  1000: [0.95, 0.91, 0.89, 0.88, 0.87, 0.87, 0.87, 0.86],
};

/** Total korrektionsfaktor och dess delar för en MV-förläggning. */
export function kfMV(p) {
  const n = Math.max(1, Math.round(Number(p.grupper) || 1));
  const rad = KF_GRP[Number(p.avst ?? 250)] || KF_GRP[250];
  const grp = n < 2 ? 1 : rad[Math.min(n, 9) - 2] ?? rad[7];
  const f = {
    temp: KF_TEMP[Number(p.marktemp ?? 15)] ?? 1,
    rho: KF_RHO[p.rho ?? "1,0"] ?? 1,
    djup: KF_DJUP[p.djup ?? "0,25–0,70"] ?? 1,
    grp,
    ror: p.ror === "Ja" ? 0.8 : 1,
  };
  return { ...f, tot: f.temp * f.rho * f.djup * f.grp * f.ror };
}

/** Ström i A för effekt i MW vid huvudspänning i kV (cos φ = 1). */
export const mvStrom = (mw, kv) => (mw * 1e6) / (Math.sqrt(3) * kv * 1e3);

/** Minsta 1-ledarkabel som bär `mw`, med parallella system vid behov (1–4). */
export function mvVal(mw, kv, forlaggning) {
  const kf = kfMV(forlaggning).tot;
  for (let sys = 1; sys <= 4; sys++) {
    for (const [kabel, c] of Object.entries(MVKABEL)) {
      if (c.I && c.I * kf >= mvStrom(mw, kv) / sys) return { kabel, sys };
    }
  }
  return { kabel: "AXLJ-TTCL 1x630/50", sys: 4 };
}

/** Kontroll av ett MV-system. ok: true / false / null (verifiera). */
export function kontrollMV(p) {
  const c = MVKABEL[p.kabel];
  const I = mvStrom(Number(p.mw), Number(p.kv)) / (Number(p.sys) || 1);
  if (!c?.I) return { ok: null, text: `${fmtTal(I)} A per system. Belastningsförmåga för 3-ledare saknas i underlaget – verifiera.` };
  const f = kfMV(p);
  const kap = c.I * f.tot;
  return {
    ok: I <= kap,
    text: `${fmtTal(I)} A per system mot ${fmtTal(kap)} A = ${c.I} A × ${fmtTal(f.tot, 2)} (temp ${fmtTal(f.temp, 2)}, resistivitet ${fmtTal(f.rho, 2)}, djup ${fmtTal(f.djup, 2)}, anhopning ${fmtTal(f.grp, 2)}, rör ${fmtTal(f.ror, 2)}).`,
  };
}

/** DC-spänning mot 0,6/1 kV-kabel. */
export function kontrollDC(p) {
  const U = (Number(p.dcu) || 0) / 1000;
  const vo = p.dcjord === "Mittpunktsjordat" ? U / 2 : U;
  if (U > 1.8) return { ok: false, text: `${fmtTal(U, 2)} kV DC ledare–ledare överstiger 1,8 kV för 0,6/1 kV-kabel.` };
  if (vo <= 0.9) return { ok: true, text: `${fmtTal(vo, 2)} kV DC mot jord ≤ 0,9 kV och ${fmtTal(U, 2)} kV ledare–ledare ≤ 1,8 kV.` };
  return {
    ok: p.dcjord === "En pol jordad" ? false : null,
    text: `${fmtTal(vo, 2)} kV DC mot jord${String(p.dcjord).startsWith("Ojordat") ? " vid första jordfel" : ""} överstiger 0,9 kV för 0,6/1 kV-kabel. Välj kabel med DC-märkning ≥ ${fmtTal(U, 1)} kV mot jord eller få leverantörens skriftliga godkännande.`,
  };
}

/* NKT tabell 42, Al: I·L (L i 100 m) som ger 1 % spänningsfall. */
const DU_1PROCENT = { "E00 046 55": 95, "E00 046 15": 34 };

/** Spänningsfall för hjälpkraftmatning, gräns 3 % (5 % ger "verifiera"). */
export function kontrollSpanningsfall({ art, kw, langd }) {
  const per1 = DU_1PROCENT[art];
  if (!per1) return { ok: null, text: "Spänningsfall: kabeln saknas i tabellen – verifiera." };
  const I = ((Number(kw) || 0) * 1000) / (Math.sqrt(3) * 400 * 0.9);
  const du = (I * (Number(langd) || 0)) / 100 / per1;
  return { ok: du <= 3 ? true : du <= 5 ? null : false, text: `Spänningsfall ${fmtTal(du, 1)} % vid ${fmtTal(I)} A, cos φ 0,9.` };
}
