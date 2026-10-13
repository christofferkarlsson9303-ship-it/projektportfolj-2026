import { HARDVARUPROFILER, STANDARDPROFIL } from "../data/hardvaruprofiler.js";
import { INGANG, MALLAR, TOMT, arVolym, nyttObjekt } from "./site.js";
import { boundingBoxFor, viewpointForBox } from "./modellKoppling.js";

/* Lager, kameravinklar och standardlayout för 3D-siten. Ren logik utan three.

   Kabellagren är SCHEMATISKA: de ritas ur objektens lägen efter enkla regler (varje container
   till närmaste skid, skid till ställverket, en jordring runt parken), inte ur en relations-
   eller kabelplan. De visar principen och vad som hänger ihop, inte var kabeln faktiskt ligger. */

/* ---------- Filterlager ---------- */

/** Filterknapparna i den ordning de står. Färgerna är designsystemets variabler. */
export const LAGER = [
  { id: "markning", namn: "Märkning", farg: "--one-djup" },
  { id: "dc", namn: "DC", farg: "--orange" },
  { id: "hsp", namn: "HSP 12 kV", farg: "--rod" },
  { id: "lsp", namn: "LSP", farg: "--duvbla" },
  { id: "fiber", namn: "Fiber/tele", farg: "--turkos" },
  { id: "jord", namn: "Jord", farg: "--morkgra" },
];

export const STANDARDLAGER = { markning: true, dc: false, hsp: false, lsp: false, fiber: false, jord: false };

/** Sidled per lager, så att parallella kablar inte ritas ovanpå varandra (meter). */
const FORSKJUT = { dc: -0.6, hsp: 0.6, lsp: -1.2, fiber: 1.2 };

const volymer = (objekt, typ) => objekt.filter((o) => arVolym(o) && (!typ || o.typ === typ));
const naturligt = (a, b) => String(a.namn || "").localeCompare(String(b.namn || ""), "sv", { numeric: true });
const r2 = (n) => Math.round(n * 100) / 100;

function narmast(fran, lista) {
  let bast = null;
  let d = Infinity;
  for (const o of lista) {
    const x = Math.hypot(o.x - fran.x, o.z - fran.z);
    if (x < d) {
      d = x;
      bast = o;
    }
  }
  return bast;
}

/** Vinkeldragning från a till b: först i djupled till en mittlinje, sedan i sidled, sedan fram. */
function rutt(a, b, forskjut = 0) {
  const zMitt = r2((a.z + b.z) / 2 + forskjut);
  return [
    [r2(a.x), r2(a.z)],
    [r2(a.x), zMitt],
    [r2(b.x), zMitt],
    [r2(b.x), r2(b.z)],
  ];
}

/** Schematiska kabelvägar per lager: { dc, hsp, lsp, fiber, jord }, varje lager en lista med
 *  polylinjer [[x, z], …] på marken. Tomma listor när objekten som behövs saknas. */
export function kabelvagar(objekt) {
  const cont = volymer(objekt, "container");
  const skid = volymer(objekt, "skid");
  const stallverk = volymer(objekt, "ehouse");
  const trafo = volymer(objekt, "trafo");
  const nav = stallverk[0] || trafo[0] || null;
  const ut = { dc: [], hsp: [], lsp: [], fiber: [], jord: [] };

  // DC: varje batterienhet till närmaste skid (växelriktare). Utan skid: till ställverket.
  for (const c of cont) {
    const mal = narmast(c, skid.length ? skid : stallverk);
    if (mal) ut.dc.push(rutt(c, mal, FORSKJUT.dc));
  }
  // HSP 12 kV: skid till ställverket, ställverket till transformatorn.
  for (const s of skid) {
    const mal = stallverk[0] || trafo[0];
    if (mal) ut.hsp.push(rutt(s, mal, FORSKJUT.hsp));
  }
  if (stallverk[0]) for (const t of trafo) ut.hsp.push(rutt(stallverk[0], t, FORSKJUT.hsp));
  // LSP (hjälpkraft) och fiber/tele: från ställverket ut till varje enhet.
  if (nav) {
    for (const o of [...cont, ...skid]) {
      ut.lsp.push(rutt(nav, o, FORSKJUT.lsp));
      ut.fiber.push(rutt(nav, o, FORSKJUT.fiber));
    }
  }
  // Jord: en ring 2 m utanför parkens enheter, och en avgrening till varje enhet.
  const alla = [...cont, ...skid, ...stallverk, ...trafo];
  if (alla.length) {
    const lador = alla.map(boundingBoxFor);
    const x0 = r2(Math.max(-TOMT.bredd / 2 + 0.5, Math.min(...lador.map((b) => b.min[0])) - 2));
    const x1 = r2(Math.min(TOMT.bredd / 2 - 0.5, Math.max(...lador.map((b) => b.max[0])) + 2));
    const z0 = r2(Math.max(-TOMT.djup / 2 + 0.5, Math.min(...lador.map((b) => b.min[2])) - 2));
    const z1 = r2(Math.min(TOMT.djup / 2 - 0.5, Math.max(...lador.map((b) => b.max[2])) + 2));
    ut.jord.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]);
    for (const o of alla) {
      const tillNorr = o.z - z0 < z1 - o.z;
      ut.jord.push([[r2(o.x), r2(o.z)], [r2(o.x), tillNorr ? z0 : z1]]);
    }
  }
  return ut;
}

/* ---------- Kameravinklar ---------- */

const FOV = 50;

/** Parkens mitt och utbredning, eller tomtens om inga volymer finns. */
function parken(objekt) {
  const v = volymer(objekt);
  if (!v.length) return { cx: 0, cz: 0, spann: Math.max(TOMT.bredd, TOMT.djup), minX: -TOMT.bredd / 2, maxX: TOMT.bredd / 2 };
  const lador = v.map(boundingBoxFor);
  const minX = Math.min(...lador.map((b) => b.min[0]));
  const maxX = Math.max(...lador.map((b) => b.max[0]));
  const minZ = Math.min(...lador.map((b) => b.min[2]));
  const maxZ = Math.max(...lador.map((b) => b.max[2]));
  return { cx: r2((minX + maxX) / 2), cz: r2((minZ + maxZ) / 2), spann: Math.max(maxX - minX, maxZ - minZ, 20), minX, maxX };
}

const medel = (lista) => lista.reduce((a, b) => a + b, 0) / lista.length;

/** Tredje skiden: den vars namn slutar på 3, annars den tredje i namnordning. */
export function tredjeSkid(objekt) {
  const s = volymer(objekt, "skid").sort(naturligt);
  return s.find((o) => /\b0?3$/.test(String(o.namn || "").trim())) || s[2] || null;
}

/** Snabbvinklarna till höger i 3D-vyn. `vy` är null när det som vinkeln pekar på saknas.
 *  `bage` lyfter kameran mitt i flygningen (meter) och `tid` är flygtiden (ms). */
export function kameravinklar(objekt) {
  const p = parken(objekt);
  const vinklar = [];

  vinklar.push({
    id: "plan",
    namn: "Plan & kran",
    vy: { cameraPosition: [p.cx, r2(p.spann * 1.7 + 20), r2(p.cz + 0.01)], target: [p.cx, 0, p.cz], fov: FOV, bage: 0, tid: 1600 },
  });

  vinklar.push({
    id: "grind",
    namn: "Grind",
    vy: { cameraPosition: [INGANG.x, 3, INGANG.z], target: [p.cx, 1.5, p.cz], fov: 60, bage: 8, tid: 1800 },
  });

  const s3 = tredjeSkid(objekt);
  vinklar.push({ id: "skid3", namn: s3 ? String(s3.namn) : "SKID 3", vy: s3 ? { ...viewpointForBox(boundingBoxFor(s3), { fov: FOV }), bage: 6, tid: 1600 } : null });

  const cont = volymer(objekt, "container");
  const skid = volymer(objekt, "skid");
  let gata = null;
  if (cont.length) {
    /* Gatan går mellan två containerrader om det finns två, annars mellan containerraden och
       skidraden, och utan skid framför containrarna. En rad = containrar på samma z (±1 m). */
    const rader = [];
    for (const z of cont.map((o) => o.z).sort((a, b) => a - b)) {
      if (!rader.length || z - rader.at(-1).at(-1) > 1) rader.push([z]);
      else rader.at(-1).push(z);
    }
    const zc = medel(rader[0]);
    const zs = rader.length > 1 ? medel(rader[1]) : skid.length ? medel(skid.map((o) => o.z)) : zc + (zc <= 0 ? 6 : -6);
    const z = r2((zc + zs) / 2);
    const x0 = Math.min(...cont.map((o) => o.x)) - 8;
    const x1 = Math.max(...cont.map((o) => o.x)) + 4;
    gata = { cameraPosition: [r2(x0), 1.7, z], target: [r2(x1), 1.5, z], fov: 65, bage: 4, tid: 2000 };
  }
  vinklar.push({ id: "batterigata", namn: "Batterigata", vy: gata });

  const sv = volymer(objekt, "ehouse")[0] || volymer(objekt, "trafo")[0] || null;
  vinklar.push({ id: "stallverk", namn: "Ställverk", vy: sv ? { ...viewpointForBox(boundingBoxFor(sv), { fov: FOV }), bage: 6, tid: 1600 } : null });

  vinklar.push({
    id: "dronare",
    namn: "Drönarvy",
    vy: { cameraPosition: [r2(p.cx + p.spann * 0.75), r2(p.spann * 0.55 + 14), r2(p.cz + p.spann * 0.85)], target: [p.cx, 0, p.cz], fov: FOV, bage: 10, tid: 2200 },
  });

  return vinklar;
}

/* ---------- Standardlayout per profil ---------- */

/** [typ, x, z, rotation, nummer] per profil. CATL/PE följer prototypens Växjö-bild (6 skid i en rad,
 *  6 containrar mitt emot, E-House i väster, transformator i öster). Sungrow har växelriktaren i
 *  batterienheten, så skidraden blir tre MV-stationer. Båda är exempel, inte projektets ritning. */
const LAYOUT = {
  "catl-pe": [
    ...[0, 1, 2, 3, 4, 5].map((i) => ["skid", -22.5 + i * 9, -10, 0, i + 1]),
    ...[0, 1, 2, 3, 4, 5].map((i) => ["container", -22.5 + i * 9, 2, 0, i + 1]),
    ["ehouse", -32, -4, 90, 1],
    ["trafo", 32, -4, 0, 1],
    ["lada", -32, 16, 0, 1],
  ],
  sungrow: [
    ...[0, 1, 2, 3, 4, 5].map((i) => ["container", -22.5 + i * 9, -9, 0, i + 1]),
    ...[0, 1, 2, 3, 4, 5].map((i) => ["container", -22.5 + i * 9, 3, 0, i + 7]),
    ...[0, 1, 2].map((i) => ["skid", -18 + i * 18, 13, 0, i + 1]),
    ["ehouse", -32, -3, 90, 1],
    ["trafo", 32, -3, 0, 1],
  ],
};

/** Objekten i profilens standardlayout för ett projekt. Mått och namn följer profilen. */
export function standardlayout(profilId, projektId) {
  const profil = HARDVARUPROFILER[profilId] || HARDVARUPROFILER[STANDARDPROFIL];
  const rader = [];
  for (const [typ, x, z, rotation, nr] of LAYOUT[profil.id]) {
    const del = typ === "container" ? profil.container : typ === "skid" ? profil.skid : null;
    const namn = del ? `${del.prefix} ${nr}` : typ === "ehouse" ? "Ställverk" : typ === "trafo" ? `Trafo T${nr}` : "Bod";
    const o = nyttObjekt(typ, projektId, { x, z }, rader, { exakt: true, rotation, namn });
    rader.push(del ? { ...o, ...del.matt } : o);
  }
  return rader;
}

/** Mått för en ny volym: profilens för container och skid, annars mallens. */
export function mattFor(profilId, typ) {
  const profil = HARDVARUPROFILER[profilId] || HARDVARUPROFILER[STANDARDPROFIL];
  if (typ === "container") return profil.container.matt;
  if (typ === "skid") return profil.skid.matt;
  const m = MALLAR[typ];
  return m ? { bredd: m.bredd, djup: m.djup, hojd: m.hojd } : null;
}

/** KPI:er för profilen ur objekten på siten. `beraknadMwh` är null när kapaciteten per enhet saknas. */
export function profilKpi(profilId, objekt) {
  const profil = HARDVARUPROFILER[profilId] || HARDVARUPROFILER[STANDARDPROFIL];
  const antalCont = volymer(objekt, "container").length;
  const antalSkid = volymer(objekt, "skid").length;
  return {
    antalCont,
    antalSkid,
    mwhPerEnhet: profil.container.mwh,
    beraknadMwh: profil.container.mwh ? Math.round(antalCont * profil.container.mwh * 10) / 10 : null,
  };
}
