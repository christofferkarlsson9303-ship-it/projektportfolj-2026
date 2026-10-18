/* Konstruktionsbibliotek och BESS-generator för ONE Bered.

   En konstruktion (Guru: konstruktionsgrupp → konstruktion → val) tar parametrar och ger
   materiel [art, antal], kalkylkoder [kod, antal] och kablar till kabellistan. Generatorn
   bygger hela skrivbordet ur effekt, energi och layoutdata.

   Postbeteckningar: +B battericontainer, +MV MV-skid, +SV ställverk, +HK hjälpkraft, +W MV-kabel.
   Kabelnummerserier enligt Konstruktionshandbok EL 2.4.3; DC 201–500 är förslag (saknas där). */

import { MVKABEL, kontrollDC, kontrollMV, kontrollSpanningsfall, mvVal } from "./kabel.js";

const km = (m) => m / 1000;
const DCKABEL = { "AXQ 1x240 Al": "E00 079 85", "AXQ 1x300 Al": "E00 079 95" };
const SCHAKT_MV = { "N075 0,4–0,9 m normal (137.13)": "137.13", "N075 >0,9–1,3 m normal (137.14)": "137.14", Samförlagd: null };

const kabel = (serie, fran, till, art, antal, langd, forl, typ) => ({ serie, fran, till, art, antal, langd, forl, typ });

export const SERIER = {
  HSP: { start: 1, prefix: "W", namn: "HSP 24 kV" },
  DC: { start: 201, prefix: "DC", namn: "DC (förslag 201–500)" },
  LSP: { start: 2001, prefix: "L", namn: "Lokalkraft LS" },
  OPTO: { start: 4001, prefix: "F", namn: "Opto" },
  KONTROLL: { start: 5001, prefix: "S", namn: "Kontroll/signal" },
};

const MV_FORLAGGNING = ["marktemp", "rho", "djup", "grupper", "avst", "ror"];

export const BIBLIOTEK = {
  batt: {
    namn: "Battericontainer", grupp: "Batterisystem",
    bygg(p, id) {
      const L = Number(p.dcl) || 0, n = Number(p.dcn) || 0, art = DCKABEL[p.dckabel] || DCKABEL["AXQ 1x240 Al"];
      return {
        m: [["BL-BATT", 1], [art, Math.ceil(n * L * 1.05)], ["DC-KS240", n * 2], ["SRS110", Math.ceil(n * L * 0.9)], ["E06 228 55", Number(p.jord) || 0], ["CPRESS-50", 2], ["ROXTEC", 2], ["ELAQBY-2x2x06", L + 10]],
        k: [["B101.01", 1], ["B101.02", 1], ["B101.03", 1], ["B101.10", n * L], ["B101.11", n * 2], ["B101.12", n + 2], ["B140.01", L + 10], ["B140.02", 1], ["B140.03", 1], ["B170.02", n], ["B170.03", 1], ["B170.05", 1], ["B160.01", 1], ["133.22", km(Number(p.jord) || 0)]],
        c: [
          kabel("DC", id, p.skid, art, n, L, "Kabelrör SRS 110 i mark, 1 kabel/rör", "DC 1500 V"),
          kabel("KONTROLL", id, p.skid, "ELAQBY-2x2x06", 1, L + 10, "Rör i mark, skilt från kraft ≥ 0,3 m", "Brand/FSS"),
        ],
      };
    },
    kontroll: (p) => kontrollDC(p),
  },
  skid: {
    namn: "MV-skid / PCS", grupp: "Batterisystem",
    bygg(p) {
      const kct = Number(p.kct) || 0;
      return {
        m: [["BL-MVS", 1], ["E06 228 55", Number(p.jord) || 0], ["CPRESS-50", 4], ["ROXTEC", 4], ["KCT-JF", kct]],
        k: [["B110.01", 1], ["B110.02", 1], ["B110.03", 1], ["B110.04", 1], ["B110.05", 1], ["B110.06", kct], ["B160.02", 1], ["B170.05", 1], ["133.22", km(Number(p.jord) || 0)]],
        c: [],
      };
    },
  },
  mv: {
    namn: "MV-kabelsystem", grupp: "Mellanspänning 24 kV",
    bygg(p) {
      const c = MVKABEL[p.kabel], L = Number(p.langd) || 0, s = Number(p.sys) || 1, fas = c.tri ? 3 : 1;
      const avslut = c.t === "MV-T240" ? "140.54" : c.t === "MV-T400" ? "140.55" : "140.56";
      const k = [["140.92", km(L * s * fas)], ["140.80", km(L)], ["140.83", km(L)], [c.tri ? "140.18" : "140.17", 2 * s], ["B170.01", s], [avslut, 2 * s]];
      if (c.tri) k.push(["140.16", km(L * s)]);
      const sk = SCHAKT_MV[p.schakt];
      if (sk) k.push([sk, km(L)]);
      return {
        m: [[c.art, Math.ceil(L * s * fas * 1.03)], [c.t, 2 * s], ["VARNNAT", L]],
        k,
        c: [kabel("HSP", p.fran, p.till, c.art, s * fas, L, c.tri ? "Mark, treklöver, sand, varningsnät" : "Mark, sand, varningsnät", "AC MV 24 kV")],
      };
    },
    kontroll: (p) => kontrollMV(p),
  },
  sv: {
    namn: "Ställverk 24 kV", grupp: "Mellanspänning 24 kV",
    bygg(p) {
      const n = Number(p.fack) || 0;
      return {
        m: [...(p.lev === "Beställarlevererat" ? [] : [["SV24-FACK", n]]), ["E06 224 55", Number(p.jord) || 0], ["CPRESS-50", 6], ["ROXTEC", n + 2]],
        k: [["B120.01", n], ["B160.03", 1], ["B170.05", n], ["133.23", km(Number(p.jord) || 0)], ["133.41", 1]],
        c: [],
      };
    },
  },
  hk: {
    namn: "Hjälpkraft, UPS och EMS/PPC", grupp: "Hjälpkraft & kontroll",
    bygg(p) {
      const L = Number(p.langd) || 0, art = p.art || "E00 046 55";
      const m = [["HKC", 1], ["UPS", 1], ["BL-EMS", 1], [art, Math.ceil(L * 1.05)], ["HJ-TRAFO", 1]];
      const k = [["B120.02", 1], ["B120.03", 1], ["B120.04", 1], ["B120.05", 1], ["B130.01", L], ["B130.02", 2]];
      return { m, k, c: [kabel("LSP", "Hjälpkrafttrafo", "+HK01", art, 1, L, "Rör i mark", "Hjälpkraft 400 V")] };
    },
    kontroll: (p) => kontrollSpanningsfall({ art: p.art || "E00 046 55", kw: p.kw, langd: p.langd }),
  },
  fiber: {
    namn: "Fiberring OS2 och data", grupp: "Kommunikation",
    bygg(p) {
      const L = Number(p.langd) || 0, n = Number(p.nod) || 0, d = Number(p.data) || 0;
      return {
        m: [["OS2-48", Math.ceil(L * 1.05)], ["OPTOSLANG", L], ["ODF-24", n], ["SFTP-CAT7", d * 30]],
        k: [["173.04", km(L)], ["173.74", km(L)], ["174.26", n], ["174.28", n * 12], ["175.30", 1], ["175.31", n * 12], ["B140.04", d]],
        c: [kabel("OPTO", "+SV01", "Ring via MV-skid", "OS2-48", 1, L, "Optoslang i mark, samförlagd med MV", "Fiber OS2 48f")],
      };
    },
  },
  jord: {
    namn: "Jordnät och staketjordning", grupp: "Jordning",
    bygg(p) {
      const L = Number(p.ring) || 0, sp = Number(p.spett) || 0, st = Number(p.staket) || 0;
      return {
        m: [["E06 228 55", L], ["JORDSPETT", sp * 1.5], ["CPRESS-50", sp + st + 8]],
        k: [["133.22", km(L)], ["133.31", sp * 1.5], ["B150.02", sp + 8], ["B150.03", st], ["133.41", 2]],
        c: [],
      };
    },
  },
  mark: {
    namn: "Yta, stängsel och kranplats", grupp: "Mark & bygg",
    bygg(p) {
      return { m: [], k: [["B160.04", Number(p.yta) || 0], ["B160.05", Number(p.kran) || 0], ["B160.06", Number(p.stangsel) || 0], ["B160.07", 2], ["B130.03", 4], ["137.33", 4], ["B160.08", Number(p.krantim) || 0]], c: [] };
    },
  },
  etab: {
    namn: "Etablering, provning och dokumentation", grupp: "Projektgemensamt",
    bygg(p) {
      const v = Number(p.veckor) || 0, mw = Number(p.mw) || 0;
      return { m: [], k: [["510.01", 1], ["510.15", 1], ["510.13", 1], ["411.20", 2], ["411.22", 1], ["411.23", 1], ["B160.09", v], ["B180.01", v], ["B170.04", mw], ["B180.02", mw]], c: [] };
    },
  },
};

/** Bygger en konstruktion: lägger på materiel, koder och kablar, utan nollrader. */
export function byggKonstruktion(typ, ident, params) {
  const r = BIBLIOTEK[typ].bygg(params, ident);
  return {
    typ, ident, params,
    m: r.m.filter(([, n]) => n > 0).map(([art, n]) => ({ art, n })),
    k: r.k.filter(([, n]) => n > 0).map(([kod, n]) => ({ kod, n })),
    c: r.c,
  };
}

/** Kontrollresultat för en konstruktion, eller null om typen saknar kontroll. */
export function kontrollera(konst) {
  const f = BIBLIOTEK[konst.typ]?.kontroll;
  return f ? f(konst.params) : null;
}

export const GEN_STANDARD = {
  mw: 20, mwh: 40, mwhC: 5, mwS: 5, sPerR: 3, kv: 20,
  marktemp: 17, rho: "1,0", djup: "0,71–0,90", avst: 250, ror: "Nej",
  dcn: 4, dcl: 25, dcu: 1500, dcjord: "Ojordat (IT) med isolationsövervakning",
  lSkid: 40, lSV: 150, stangsel: 240, veckor: 20, hkKw: 60,
};

/** Hela beredningen ur generatorns indata. */
export function genereraBess(indata) {
  const g = { ...GEN_STANDARD, ...indata };
  const nB = Math.ceil(g.mwh / g.mwhC), nS = Math.ceil(g.mw / g.mwS), perS = Math.ceil(nB / nS), nR = Math.ceil(nS / g.sPerR);
  const pad = (n) => String(n).padStart(2, "0");
  const forl = Object.fromEntries(MV_FORLAGGNING.map((k) => [k, g[k]]));
  const ut = [];
  ut.push(byggKonstruktion("etab", "Projekt", { veckor: g.veckor, mw: g.mw }));
  ut.push(byggKonstruktion("mark", "Område", { yta: Math.round(nB * 60 + nS * 45 + 600), kran: 200, stangsel: g.stangsel, krantim: Math.ceil((nB + nS) * 1.5 + 8) }));
  ut.push(byggKonstruktion("sv", "+SV01", { fack: nR + 3, lev: "UE/ONE Nordic", jord: 40 }));
  ut.push(byggKonstruktion("hk", "+HK01", { art: "E00 046 55", langd: 40, kw: g.hkKw }));
  let b = 0;
  for (let s = 1; s <= nS; s++) {
    ut.push(byggKonstruktion("skid", `+MV${pad(s)}`, { jord: 30, kct: 1 }));
    for (let j = 0; j < perS && b < nB; j++) {
      b++;
      ut.push(byggKonstruktion("batt", `+B${pad(b)}`, { skid: `+MV${pad(s)}`, dckabel: "AXQ 1x240 Al", dcn: g.dcn, dcl: g.dcl, dcu: g.dcu, dcjord: g.dcjord, jord: 35 }));
    }
  }
  /* Radialer: skidarna kopplas i kedja; sträckan närmast ställverket bär hela radialen och delar
     schakt med övriga radialer (anhopning = antal radialer). */
  for (let r = 0; r < nR; r++) {
    const skids = [];
    for (let s = r * g.sPerR + 1; s <= Math.min(nS, (r + 1) * g.sPerR); s++) skids.push(s);
    skids.forEach((s, i) => {
      const forst = i === 0;
      const mw = (skids.length - i) * g.mwS;
      const f = { ...forl, grupper: forst ? nR : 1 };
      ut.push(byggKonstruktion("mv", `+W${pad(r + 1)}${pad(i + 1)}`, {
        fran: `+MV${pad(s)}`, till: forst ? "+SV01" : `+MV${pad(skids[i - 1])}`,
        ...mvVal(mw, g.kv, f), langd: forst ? g.lSV : g.lSkid, mw, kv: g.kv, ...f, schakt: "N075 0,4–0,9 m normal (137.13)",
      }));
    });
  }
  ut.push(byggKonstruktion("fiber", "+F01", { langd: Math.round(nS * g.lSkid + nR * g.lSV + 50), nod: nS + 2, data: 6 }));
  ut.push(byggKonstruktion("jord", "+J01", { ring: Math.round(g.stangsel * 1.1 + nB * 10), spett: Math.max(8, nS * 2), staket: Math.ceil(g.stangsel / 25) }));
  return { indata: g, antal: { container: nB, skid: nS, radialer: nR, perSkid: perS }, konstruktioner: ut };
}
