import { kravMellan } from "./siteSakerhet.js";
import { arVolym, nyttObjekt, provaPlacering } from "./site.js";

/* Byggläget i Siten i 3D (PR 7, beställt 2026-10-23): dra ut en rad, kopiera och
   ångra. Ren logik — scenen och Site.jsx ritar och skickar actions.

   En rad läggs längs en axel (x eller z) med objektets utsträckning plus
   skyddsavståndet mellan två objekt av samma typ som steg. Med ett slutläge
   (Skift + dra) väljs axeln efter dragningens största riktning och antalet
   efter längden. Med ett antal (klick, fungerar i mobilen) läggs raden längs
   objektets kortsida, som en batterigata: sida mot sida. */

export const MAX_RAD = 40;
export const MAX_ANGRA = 50;

/** Objektets utsträckning längs x och z, efter rotationen (90°-steg). */
export function utstrackning(o) {
  const vrid = Math.round(((((o.rotation || 0) % 180) + 180) % 180)) === 90;
  return { x: vrid ? o.djup : o.bredd, z: vrid ? o.bredd : o.djup };
}

/** Lägena för en rad, från `start`. Antingen `slut` (dragning) eller `antal`. */
export function radPositioner(o, start, { slut = null, antal = null, luft = 0 } = {}) {
  const u = utstrackning(o);
  let axel;
  let riktning = 1;
  let n;
  if (slut) {
    const dx = slut.x - start.x;
    const dz = slut.z - start.z;
    axel = Math.abs(dx) >= Math.abs(dz) ? "x" : "z";
    const d = axel === "x" ? dx : dz;
    riktning = Math.sign(d) || 1;
    n = Math.floor(Math.abs(d) / (u[axel] + luft)) + 1;
  } else {
    axel = u.x <= u.z ? "x" : "z";
    n = Math.max(1, Math.round(Number(antal) || 1));
  }
  n = Math.min(MAX_RAD, n);
  const steg = (u[axel] + luft) * riktning;
  return Array.from({ length: n }, (_, i) => ({ x: start.x + (axel === "x" ? i * steg : 0), z: start.z + (axel === "z" ? i * steg : 0) }));
}

/** Objekt för en rad som går att placera: varje läge provas mot det som står på
 *  tomten och mot radens tidigare objekt. Upptagna lägen hoppas över.
 *  @param {any} mall @param {string} pid @param {{x:number,z:number}[]} positioner @param {any[]} objekt
 *  @param {{ regler?: any[], rutnat?: number, luftFor?: any }} [val] */
export function radObjekt(mall, pid, positioner, objekt, { rutnat = 0, luftFor = undefined } = {}) {
  const lagda = [];
  let upptagna = 0;
  for (const q of positioner) {
    const alla = [...objekt, ...lagda];
    const res = provaPlacering(mall, q, alla, { rutnat, snappLuft: luftFor });
    if (!res.ok) {
      upptagna++;
      continue;
    }
    lagda.push({
      ...nyttObjekt(mall.typ, pid, { x: res.x, z: res.z }, alla, { exakt: true, rotation: mall.rotation || 0 }),
      bredd: mall.bredd,
      djup: mall.djup,
      hojd: mall.hojd,
    });
  }
  return { lagda, upptagna };
}

/** Skyddsavståndet mellan två objekt av samma typ, i meter. */
export const radLuft = (regler, typ) => kravMellan(regler, typ, typ) || 0;

/** En kopia av ett objekt bredvid originalet (längs kortsidan), eller null om
 *  det inte finns plats. Mått, rotation och BESS-data följer med, namnet inte. */
/** @param {any} o @param {any[]} objekt @param {{ regler?: any[], rutnat?: number, luftFor?: any }} [val] */
export function kopia(o, objekt, { regler = [], rutnat = 0, luftFor = undefined } = {}) {
  if (!arVolym(o)) return null;
  const luft = radLuft(regler, o.typ);
  for (const sida of [1, -1]) {
    const [, q] = radPositioner(o, { x: o.x, z: o.z }, { antal: 2, luft });
    const mal = { x: o.x + (q.x - o.x) * sida, z: o.z + (q.z - o.z) * sida };
    const res = provaPlacering(o, mal, objekt, { rutnat, snappLuft: luftFor });
    if (!res.ok) continue;
    const ny = nyttObjekt(o.typ, o.projektId, { x: res.x, z: res.z }, objekt, { exakt: true, rotation: o.rotation || 0 });
    const resten = Object.fromEntries(Object.entries(o).filter(([k]) => !["id", "namn", "x", "z"].includes(k)));
    return { ...ny, ...resten };
  }
  return null;
}
