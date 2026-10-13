/* Koppling mellan 3D-modellen och ärenden (UR/ÄTA), i CDE/BCF-anda: ett
   ärende pekar på ett objekt (objectGuid), en kameravy (viewpoint), objektets
   omslutande låda (boundingBox) och den modellversion det gäller
   (modelVersionId). Fälten ligger direkt på ärendet i portfolj/state.

   Allt här är ren logik utan three — kameraflygning, sektionsplan och mått
   räknas som tal och testas utan WebGL. Scenen ritar bara resultatet.

   Koordinater: three.js, högerhänt, +Y upp, meter. Vektorer är [x, y, z]. */

import { TOMT, arNal, yttermatt } from "./site.js";
import { ifcObjektForProjekt } from "./ifcModell.js";

export const FOV = 55;
/** Höjden på en nål (pinne och topp), för dess låda. */
const NAL_HOJD = 3.3;
const NAL_RADIE = 0.5;

const r3 = (n) => Math.round(n * 1000) / 1000;
const arTal = (n) => typeof n === "number" && Number.isFinite(n);
const arVektor = (v) => Array.isArray(v) && v.length === 3 && v.every(arTal);

/* ---------- Objekt → låda och kameravy ---------- */

/** Omslutande låda i världen för ett siteObjekt. En volym tas efter rotation. */
export function boundingBoxFor(o) {
  if (o?.typ === "ifc" && Array.isArray(o.bb) && o.bb.length === 6) return { min: o.bb.slice(0, 3), max: o.bb.slice(3) };
  const x = Number(o?.x) || 0;
  const z = Number(o?.z) || 0;
  if (arNal(o)) return { min: [r3(x - NAL_RADIE), 0, r3(z - NAL_RADIE)], max: [r3(x + NAL_RADIE), NAL_HOJD, r3(z + NAL_RADIE)] };
  const m = yttermatt(o);
  return { min: [r3(x - m.bredd / 2), 0, r3(z - m.djup / 2)], max: [r3(x + m.bredd / 2), r3(Number(o?.hojd) || 0), r3(z + m.djup / 2)] };
}

/** Alla objekt ärenden kan peka på i ett projekt: siteObjekt plus objekt ur importerade IFC-modeller. */
export function allaModellObjekt(state, projektId) {
  return [...(state?.siteObjekt || []).filter((o) => o.projektId === projektId), ...ifcObjektForProjekt(state, projektId)];
}

export const boxCentrum = (b) => [0, 1, 2].map((i) => r3((b.min[i] + b.max[i]) / 2));
export const boxRadie = (b) => Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2;

/**
 * En kameravy som ramar in lådan: tittar mot lådans centrum på ett avstånd där
 * hela lådan ryms i synfältet, snett uppifrån.
 */
export function viewpointForBox(box, { fov = FOV, riktning = [0.6, 0.5, 0.8], marginal = 1.35, minAvstand = 6 } = {}) {
  const c = boxCentrum(box);
  const r = boxRadie(box);
  const dist = Math.max(minAvstand, (r * marginal) / Math.sin((fov * Math.PI) / 360));
  const l = Math.hypot(...riktning) || 1;
  return {
    cameraPosition: c.map((v, i) => r3(v + (riktning[i] / l) * dist)),
    target: c,
    fov,
  };
}

/* ---------- Validering ---------- */

export function viewpointFel(v) {
  if (!v || typeof v !== "object") return "Kameravyn saknas.";
  if (!arVektor(v.cameraPosition)) return "Kamerans position måste vara tre tal.";
  if (!arVektor(v.target)) return "Kamerans mål måste vara tre tal.";
  if (!arTal(v.fov) || v.fov < 10 || v.fov > 120) return "Synfältet måste vara mellan 10 och 120 grader.";
  return null;
}

export function boxFel(b) {
  if (!b || typeof b !== "object") return "Omslutande lådan saknas.";
  if (!arVektor(b.min) || !arVektor(b.max)) return "Lådans hörn måste vara tre tal vardera.";
  if ([0, 1, 2].some((i) => b.min[i] > b.max[i])) return "Lådans min får inte vara större än max.";
  return null;
}

/**
 * Varför en koppling inte kan sparas, eller null. Alla fält är valfria var för
 * sig men objectGuid krävs, och ges viewpoint eller boundingBox måste de vara hela.
 */
export function kopplingFel(k) {
  if (!k || typeof k.objectGuid !== "string" || !k.objectGuid.trim()) return "Ett ärende måste kopplas till ett objekt (objectGuid).";
  if (k.viewpoint !== undefined && k.viewpoint !== null) {
    const f = viewpointFel(k.viewpoint);
    if (f) return f;
  }
  if (k.boundingBox !== undefined && k.boundingBox !== null) {
    const f = boxFel(k.boundingBox);
    if (f) return f;
  }
  if (k.modelVersionId !== undefined && k.modelVersionId !== null && typeof k.modelVersionId !== "string") return "Modellversionen måste vara text.";
  return null;
}

/** Fälten som sparas på ärendet när det kopplas till ett objekt. */
export function byggKoppling(objekt, { viewpoint, modelVersionId = "" } = {}) {
  const boundingBox = boundingBoxFor(objekt);
  return {
    objectGuid: String(objekt.id),
    viewpoint: viewpoint && !viewpointFel(viewpoint) ? viewpoint : viewpointForBox(boundingBox),
    boundingBox,
    modelVersionId: String(modelVersionId || ""),
  };
}

/* ---------- Ärendelistan mot objekt ---------- */

export const arKopplad = (u) => !!u && typeof u.objectGuid === "string" && u.objectGuid !== "";

/** Ärenden i projektet, filtrerade på ett objekt när `guid` anges. */
export function arendenFor(rader, projektId, guid = null) {
  return (rader || []).filter((u) => u.projektId === projektId && (!guid || u.objectGuid === guid));
}

/** Antal kopplade ärenden per objekt-GUID — för märken på objekten. */
export function arendenPerObjekt(rader, projektId) {
  const m = new Map();
  for (const u of arendenFor(rader, projektId)) if (arKopplad(u)) m.set(u.objectGuid, (m.get(u.objectGuid) || 0) + 1);
  return m;
}

/* ---------- Kameraflygning ---------- */

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

/**
 * Kameran mellan två vyer vid tid t (0–1), med mjuk start och stopp. t utanför
 * 0–1 klipps. Anropas av scenen varje bildruta (requestAnimationFrame).
 */
export function flygBana(fran, till, t) {
  const e = easeInOutCubic(Math.max(0, Math.min(1, Number(t) || 0)));
  return {
    cameraPosition: lerpV(fran.cameraPosition, till.cameraPosition, e),
    target: lerpV(fran.target, till.target, e),
    fov: lerp(fran.fov, till.fov, e),
  };
}

/** Flygtid i millisekunder efter avståndet — kort för nära, aldrig över 1,4 s. */
export function flygTid(fran, till) {
  const d = Math.hypot(...fran.cameraPosition.map((v, i) => v - till.cameraPosition[i]));
  return Math.round(Math.max(450, Math.min(1400, 450 + d * 12)));
}

/* ---------- Sektionslåda (clipping planes) ---------- */

/** Standardläge: av, och lådan lika stor som tomten och 12 m hög. */
export const SEKTION_HOJD = 12;
export const SEKTION_STANDARD = {
  aktiv: false,
  min: { x: -TOMT.bredd / 2, y: 0, z: -TOMT.djup / 2 },
  max: { x: TOMT.bredd / 2, y: SEKTION_HOJD, z: TOMT.djup / 2 },
};

/** Håller min ≤ max på varje axel (en slider kan inte dra förbi sin motsats). */
export function klippSektion(s) {
  const ut = { aktiv: !!s.aktiv, min: { ...s.min }, max: { ...s.max } };
  for (const a of ["x", "y", "z"]) {
    if (ut.min[a] > ut.max[a]) [ut.min[a], ut.max[a]] = [ut.max[a], ut.min[a]];
  }
  return ut;
}

/**
 * Sex klippplan för three: [normal, konstant]. Det som ligger på normalens
 * sida (normal·p + konstant ≥ 0) behålls. Tom lista när sektionen är av.
 */
export function klippPlan(s) {
  if (!s?.aktiv) return [];
  const k = klippSektion(s);
  return [
    { normal: [1, 0, 0], konstant: -k.min.x },
    { normal: [-1, 0, 0], konstant: k.max.x },
    { normal: [0, 1, 0], konstant: -k.min.y },
    { normal: [0, -1, 0], konstant: k.max.y },
    { normal: [0, 0, 1], konstant: -k.min.z },
    { normal: [0, 0, -1], konstant: k.max.z },
  ];
}

/** Syns punkten med den här sektionen? (Samma regel som planen, för test.) */
export const punktSynlig = (s, p) => klippPlan(s).every((pl) => pl.normal[0] * p[0] + pl.normal[1] * p[1] + pl.normal[2] * p[2] + pl.konstant >= -1e-9);

/* ---------- Mätning ---------- */

/** Avstånd mellan två punkter: rakt, horisontellt och per axel, i meter. */
export function avstand(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return { total: Math.hypot(dx, dy, dz), horisontell: Math.hypot(dx, dz), dx: Math.abs(dx), dy: Math.abs(dy), dz: Math.abs(dz) };
}
