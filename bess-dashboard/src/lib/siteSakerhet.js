/* Säkerhets- och serviceavstånd på siten (granskning F11).

   3D-vyn är en planeringsmodell, inte projekteringsunderlag. Avstånden här är
   regelobjekt med källa: varje krav säger mellan vilka objekttyper det gäller,
   hur stort det är och var siffran kommer ifrån. Ett krav utan verifierat värde
   har avstand null och visas som "saknas" – det gissas aldrig fram.

   Placeringen blockeras bara av fysisk krock. Ett avstånd under kravet ger en
   varning i listan (avstandsbrott), eftersom ritningens lägen är ungefärliga och
   par som +B1a/+B1b kan stå rygg mot rygg enligt tillverkaren. Kantsnappen drar
   däremot nya objekt till kravets avstånd i stället för kant mot kant. */

import { HARDVARUPROFILER, STANDARDPROFIL } from "../data/hardvaruprofiler.js";
import { arVolym } from "./site.js";

const KALLA_SAKNAS = "Saknas i appens underlag – fastställs i projekteringen (brandskydd, elsäkerhet, service)";

/**
 * @typedef {object} Skyddsregel
 * @property {string} id
 * @property {[string, string]} mellan   objekttyper, t.ex. ["container", "container"]
 * @property {number|null} avstand      fritt avstånd i meter, null = saknas
 * @property {string} text
 * @property {string} kalla
 * @property {boolean} verifierad
 */

/** Regler som gäller oavsett profil. Värden saknas tills projekteringen anger dem. */
const ALLMANNA = [
  { id: "trafo-container", mellan: ["trafo", "container"], avstand: null, text: "Transformator – batterienhet", kalla: KALLA_SAKNAS, verifierad: false },
  { id: "ehouse-container", mellan: ["ehouse", "container"], avstand: null, text: "Ställverk – batterienhet", kalla: KALLA_SAKNAS, verifierad: false },
];

/** @returns {Skyddsregel[]} */
export function skyddsreglerFor(profilId) {
  const profil = HARDVARUPROFILER[profilId] || HARDVARUPROFILER[STANDARDPROFIL];
  return [...(profil.skyddsavstand || []), ...ALLMANNA];
}

const passar = (r, a, b) => (r.mellan[0] === a && r.mellan[1] === b) || (r.mellan[0] === b && r.mellan[1] === a);

/** Kravet i meter mellan två typer, eller 0 när inget verifierat krav finns. */
export function kravMellan(regler, typA, typB) {
  const r = regler.find((x) => passar(x, typA, typB) && x.verifierad && Number(x.avstand) > 0);
  return r ? Number(r.avstand) : 0;
}

/** luft-funktion till provaPlacering/kantSnappa för ett objekt av typen `typ`. */
export const luftFor = (regler, typ) => (granne) => kravMellan(regler, typ, granne.typ);

/* ---------- Avstånd mellan två vridna rektanglar ---------- */

function horn(o) {
  const t = ((o.rotation || 0) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const hb = (o.bredd || 0) / 2;
  const hd = (o.djup || 0) / 2;
  return [[-hb, -hd], [hb, -hd], [hb, hd], [-hb, hd]].map(([u, v]) => [(o.x || 0) + u * c + v * s, (o.z || 0) - u * s + v * c]);
}

/** @param {number[]} p @param {number[]} a @param {number[]} b */
function punktTillSegment([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function inuti(p, poly) {
  let in_ = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) in_ = !in_;
  }
  return in_;
}

/** Kortaste fria avstånd i meter mellan två volymers fotavtryck (0 vid överlapp). */
export function avstandMellan(a, b) {
  const A = horn(a);
  const B = horn(b);
  if (A.some((p) => inuti(p, B)) || B.some((p) => inuti(p, A))) return 0;
  let min = Infinity;
  for (const [P, Q] of /** @type {Array<[number[][], number[][]]>} */ ([[A, B], [B, A]])) {
    for (const p of P) for (let i = 0; i < 4; i++) min = Math.min(min, punktTillSegment(p, Q[i], Q[(i + 1) % 4]));
  }
  return Math.round(min * 100) / 100;
}

/**
 * Par av volymer som står närmare än ett verifierat krav.
 * @returns {Array<{a: object, b: object, avstand: number, krav: number, regel: Skyddsregel}>}
 */
export function avstandsbrott(objekt, regler) {
  const v = objekt.filter(arVolym);
  const ut = [];
  for (let i = 0; i < v.length; i++) {
    for (let j = i + 1; j < v.length; j++) {
      const regel = regler.find((r) => passar(r, v[i].typ, v[j].typ) && r.verifierad && Number(r.avstand) > 0);
      if (!regel) continue;
      const avstand = avstandMellan(v[i], v[j]);
      if (avstand < Number(regel.avstand) - 1e-6) ut.push({ a: v[i], b: v[j], avstand, krav: Number(regel.avstand), regel });
    }
  }
  return ut;
}
