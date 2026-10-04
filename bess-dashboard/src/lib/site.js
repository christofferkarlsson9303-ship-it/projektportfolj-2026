/* Siten — volymer och nålar på projektets tomt, och matematiken för att gå
   runt bland dem. Ren logik utan three, så att den kan testas utan WebGL.

   Koordinater: three.js, högerhänt, +Y upp, meter. Tomten är 80 × 52 m med
   mitten i origo. yaw 0 tittar mot −Z (norr när ingen situationsplan säger
   annat). Rotation på en volym är grader runt +Y, moturs sett ovanifrån —
   samma som rotation.y i three.

   Objekten ligger i portfolj/state som listan siteObjekt, en rad per objekt
   med id och projektId. Den slås ihop rad för rad i sammanfoga.js som alla
   andra listor. Situationsplanen är en bild och ligger bara i sessionStorage
   — den skulle spränga JSONB-raden och följa med synken. */

export const TOMT = { bredd: 80, djup: 52 };

/** Körytor när ingen situationsplan finns: en gata i söder och en infart i väster. */
export const KORYTOR = [
  { x: 0, z: TOMT.djup / 2 - 4, bredd: TOMT.bredd, djup: 6 },
  { x: -TOMT.bredd / 2 + 3, z: 0, bredd: 6, djup: TOMT.djup },
];

/** Avstånd i meter som en gående håller till en volyms sida. */
export const MARGINAL = 0.45;

export const OGONHOJD = 1.7;
export const GANGFART = 1.6;
export const SPRINGFART = 4.5;
export const LYFTFART = 2;
export const MAX_HOJD = 40;

/** Radianer per pixel musrörelse. */
export const MUSKANSLIGHET = 0.0025;

/** Mallar när användaren lägger till — mått i meter (bredd × djup × höjd). */
export const MALLAR = {
  skid: { namn: "Skid", bredd: 6.1, djup: 2.5, hojd: 2.9 },
  container: { namn: "Container", bredd: 6.1, djup: 2.5, hojd: 2.9 },
  ehouse: { namn: "E-House", bredd: 12, djup: 3.2, hojd: 3.4 },
  trafo: { namn: "Trafo", bredd: 3.2, djup: 2.6, hojd: 2.6 },
  lada: { namn: "Låda", bredd: 2, djup: 2, hojd: 2 },
  nal: { namn: "Nål", bredd: 0, djup: 0, hojd: 0 },
};

export const MALLORDNING = ["skid", "container", "ehouse", "trafo", "lada", "nal"];

/** Färg per typ som CSS-variabel ur designsystemet. 3D-scenen läser värdet
 *  vid körning och toppvyn använder variabeln direkt — inga egna hex-värden. */
export const TYPFARG = {
  skid: "--himmel",
  container: "--one-bla",
  ehouse: "--one-djup",
  trafo: "--duvbla",
  lada: "--morkgra",
  nal: "--orange",
};

export const arNal = (o) => o?.typ === "nal";
export const arVolym = (o) => !!o && !arNal(o);

/* ---------- Gång ---------- */

/** Framåt för en blickriktning, i markplanet. */
export function framat(yaw) {
  return { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
}

/** Höger för en blickriktning, i markplanet. */
export function hoger(yaw) {
  return { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
}

/** Tangent → avsikt. Piltangenter gör samma sak som WASD. */
export const TANGENTER = {
  KeyW: "fram",
  ArrowUp: "fram",
  KeyS: "bak",
  ArrowDown: "bak",
  KeyA: "vanster",
  ArrowLeft: "vanster",
  KeyD: "hoger",
  ArrowRight: "hoger",
  KeyQ: "upp",
  KeyE: "ner",
  ShiftLeft: "spring",
  ShiftRight: "spring",
};

/**
 * Förflyttning under dt sekunder. `in` har fram/bak/vanster/hoger/upp/ner/
 * spring som booleaner, eller framAxel/sidAxel i [−1, 1] från joysticken.
 * A är strafe åt vänster: minus höger, relativt blickriktningen.
 * @returns {{x:number,y:number,z:number}}
 */
export function forflyttning(yaw, ind, dt) {
  const fa = (ind.framAxel ?? 0) + (ind.fram ? 1 : 0) - (ind.bak ? 1 : 0);
  const sa = (ind.sidAxel ?? 0) + (ind.hoger ? 1 : 0) - (ind.vanster ? 1 : 0);
  const f = framat(yaw);
  const h = hoger(yaw);
  let x = f.x * fa + h.x * sa;
  let z = f.z * fa + h.z * sa;
  const langd = Math.hypot(x, z);
  if (langd > 1) {
    x /= langd;
    z /= langd;
  }
  const fart = ind.spring ? SPRINGFART : GANGFART;
  const y = ((ind.upp ? 1 : 0) - (ind.ner ? 1 : 0)) * LYFTFART;
  return { x: x * fart * dt, y: y * dt, z: z * fart * dt };
}

/** Musrörelse → ny blick. Pitch hålls inom ±85°. */
export function titta(yaw, pitch, movementX, movementY, k = MUSKANSLIGHET) {
  const grans = (85 * Math.PI) / 180;
  return {
    yaw: yaw - movementX * k,
    pitch: Math.max(-grans, Math.min(grans, pitch - movementY * k)),
  };
}

/* ---------- Kollision ---------- */

/** Punkt i världen → volymens lokala koordinater (rotation runt +Y). */
export function tillLokal(o, x, z) {
  const t = ((o.rotation || 0) * Math.PI) / 180;
  const dx = x - (o.x || 0);
  const dz = z - (o.z || 0);
  return { x: dx * Math.cos(t) - dz * Math.sin(t), z: dx * Math.sin(t) + dz * Math.cos(t) };
}

/** Ligger punkten (på ögonhöjd y) inne i volymens låda plus marginal? */
export function krockar(o, x, z, y = OGONHOJD, marginal = MARGINAL) {
  if (!arVolym(o)) return false;
  // Över taket går man fritt — fötterna är ögonhöjden under kameran.
  if (y - OGONHOJD >= (o.hojd || 0)) return false;
  const l = tillLokal(o, x, z);
  return Math.abs(l.x) < (o.bredd || 0) / 2 + marginal && Math.abs(l.z) < (o.djup || 0) / 2 + marginal;
}

/**
 * Ett steg. Blockerat steg stannar — positionen blir den gamla. Höjden
 * följer alltid med (Q/E) men hålls mellan ögonhöjd och taket.
 */
export function steg(pos, delta, objekt, marginal = MARGINAL) {
  const y = Math.max(OGONHOJD, Math.min(MAX_HOJD, pos.y + delta.y));
  const x = pos.x + delta.x;
  const z = pos.z + delta.z;
  const kant = 30;
  const utanfor = Math.abs(x) > TOMT.bredd / 2 + kant || Math.abs(z) > TOMT.djup / 2 + kant;
  const blockerad = utanfor || objekt.some((o) => krockar(o, x, z, y, marginal));
  return blockerad ? { x: pos.x, y, z: pos.z, blockerad: true } : { x, y, z, blockerad: false };
}

/** Startpunkt när användaren går in: söder om tomten, blicken mot norr. */
export const INGANG = { x: 0, y: OGONHOJD, z: TOMT.djup / 2 + 6, yaw: 0, pitch: 0 };

/* ---------- Objekt i state ---------- */

const avrunda = (n, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;

/** Håller en punkt inom tomten. */
export function innanforTomt(x, z) {
  return {
    x: avrunda(Math.max(-TOMT.bredd / 2, Math.min(TOMT.bredd / 2, x)), 1),
    z: avrunda(Math.max(-TOMT.djup / 2, Math.min(TOMT.djup / 2, z)), 1),
  };
}

export function siteObjekt(state, projektId) {
  return (state.siteObjekt || []).filter((o) => o.projektId === projektId);
}

export const volymer = (state, projektId) => siteObjekt(state, projektId).filter(arVolym);

/** Nästa lediga namn för en typ: "Skid 3" om Skid 1 och 2 finns. */
export function nastaNamn(befintliga, typ) {
  const bas = MALLAR[typ].namn;
  const tagna = new Set(befintliga.filter((o) => o.typ === typ).map((o) => o.namn));
  let n = befintliga.filter((o) => o.typ === typ).length + 1;
  while (tagna.has(`${bas} ${n}`)) n += 1;
  return `${bas} ${n}`;
}

/** Nytt objekt ur en mall, på en punkt på marken. */
export function nyttObjekt(typ, projektId, punkt, befintliga = [], extra = {}) {
  const m = MALLAR[typ];
  if (!m) throw new Error(`Okänd typ: ${typ}`);
  const { x, z } = innanforTomt(punkt.x, punkt.z);
  const rad = {
    id: `so${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    projektId,
    typ,
    x,
    z,
    rotation: 0,
  };
  if (typ === "nal") return { ...rad, punktId: extra.punktId || "" };
  return { ...rad, namn: extra.namn || nastaNamn(befintliga, typ), bredd: m.bredd, djup: m.djup, hojd: m.hojd };
}

/**
 * Varför ett objekt inte kan sparas, eller null. En nål måste peka på en
 * befintlig punkt — ingen lös text som inte är en punkt.
 */
export function objektFel(o, punkter = []) {
  if (!o || !MALLAR[o.typ]) return "Okänd typ.";
  if (!o.projektId) return "Objektet saknar projekt.";
  if (arNal(o)) {
    if (!o.punktId) return "En nål måste peka på en öppen punkt.";
    if (!punkter.some((p) => p.id === o.punktId)) return "Punkten finns inte.";
    return null;
  }
  for (const [falt, text] of [["bredd", "Bredd"], ["djup", "Djup"], ["hojd", "Höjd"]]) {
    if (!(Number(o[falt]) > 0)) return `${text} måste vara större än 0.`;
  }
  return null;
}

/** Öppen punkt — samma regel som arbetslistan (lib/faltmaterial.js). */
export const arOppenPunkt = (p) => !!p && p.status !== "klarmarkerad";

/** Punkter som en nål i projektet kan peka på. */
export function punkterForSite(state, projektId) {
  return (state.punkter || []).filter((p) => p.projektId === projektId || p.projektId === "bada");
}

/* ---------- Situationsplan (sessionStorage) ---------- */

export const PLAN_NYCKEL = (projektId) => `batchc-situationsplan:${projektId}`;

/** Läser planen för projektet, eller null. */
export function lasPlan(projektId, lagring = globalThis.sessionStorage) {
  try {
    const v = JSON.parse(lagring?.getItem(PLAN_NYCKEL(projektId)) || "null");
    return v && typeof v.bild === "string" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Sparar planen i sessionStorage. Returnerar ett fel som text om lagringen
 * är full eller blockerad — bilden hamnar aldrig i portfolj/state.
 */
export function sparaPlan(projektId, plan, lagring = globalThis.sessionStorage) {
  try {
    lagring.setItem(
      PLAN_NYCKEL(projektId),
      JSON.stringify({
        bild: plan.bild,
        namn: plan.namn || "",
        bredd: Number(plan.bredd) > 0 ? Number(plan.bredd) : TOMT.bredd,
        norr: Number(plan.norr) || 0,
        proportion: Number(plan.proportion) > 0 ? Number(plan.proportion) : 1,
      })
    );
    return null;
  } catch {
    return "Bilden får inte plats i webbläsarens sessionslagring. Välj en mindre bild.";
  }
}

export function rensaPlan(projektId, lagring = globalThis.sessionStorage) {
  try {
    lagring.removeItem(PLAN_NYCKEL(projektId));
  } catch {
    /* blockerad lagring — inget att ta bort */
  }
}

/** Planens mått i meter: bredden användaren angav, djupet ur bildens proportion. */
export function planMatt(plan) {
  const bredd = Number(plan?.bredd) > 0 ? Number(plan.bredd) : TOMT.bredd;
  return { bredd, djup: bredd * (Number(plan?.proportion) > 0 ? Number(plan.proportion) : 1) };
}
