import { MALLAR, nyttObjekt, siteObjekt } from "./site.js";
import { idag } from "./datum.js";

/* Siterunda i mobilen: foto, punkt och plats i ett steg (tips 6).

   - Foton krymps i webbläsaren (längsta sida FOTO_MAX px, JPEG) och laddas upp
     till samma arkiv som ritningarna (Supabase Storage, bucket "ritningar",
     eller IndexedDB i lokalt läge) under projekt/foto/. På punkten ligger bara
     metadata — aldrig bilden (samma regel som för ritningar och situationsplan).
   - Plats är ett objekt på siten (container, skid, E-House …). Väljs en plats
     sätts en nål på objektet som pekar på punkten, så att den syns i 3D.
   - En punkt med foto eller plats men utan datum får dagens datum som
     uppföljning, så att den hamnar i Idag. */

export const FOTO_MAX = 1600;
export const FOTO_KVALITET = 0.8;
export const MAX_FOTON = 6;

/** Sökväg för ett foto: projekt/foto/punkt-nummer.jpg. */
export const fotoSokvag = (pid, punktId, i) => `${pid}/foto/${punktId}-${i + 1}.jpg`;

/** Platser att välja: siteobjekt med namn (inte nålar), sorterade på namn. */
export function platser(state, pid) {
  return siteObjekt(state, pid)
    .filter((o) => o.typ !== "nal" && MALLAR[o.typ])
    .map((o) => ({ id: o.id, namn: o.namn || MALLAR[o.typ].namn, typ: o.typ, x: o.x, z: o.z }))
    .sort((a, b) => a.namn.localeCompare(b.namn, "sv", { numeric: true }));
}

/** Nålen som pekar på punkten, placerad på objektet. */
export function nalPa(state, pid, objektId, punktId) {
  const o = siteObjekt(state, pid).find((x) => x.id === objektId);
  if (!o) return null;
  return nyttObjekt("nal", pid, { x: o.x, z: o.z }, siteObjekt(state, pid), { punktId, exakt: true });
}

/** Kompletterar punkten från siterundan med foton, plats och datum. */
export function medSiterunda(rad, { foton = [], plats = null } = {}, nu = idag()) {
  const ut = { ...rad };
  if (foton.length) ut.foton = foton;
  if (plats) ut.plats = { objektId: plats.id, namn: plats.namn };
  if ((foton.length || plats) && !ut.uppfoljning && !ut.forfaller) ut.uppfoljning = nu;
  return ut;
}

/** Krymper en bild till JPEG med längsta sida FOTO_MAX. Bara i webbläsaren. */
export async function krympFoto(fil, max = FOTO_MAX, kvalitet = FOTO_KVALITET) {
  const bild = await createImageBitmap(fil);
  const skala = Math.min(1, max / Math.max(bild.width, bild.height));
  const b = Math.round(bild.width * skala);
  const h = Math.round(bild.height * skala);
  const canvas = document.createElement("canvas");
  canvas.width = b;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bild, 0, 0, b, h);
  bild.close?.();
  return new Promise((ok, fel) => canvas.toBlob((blob) => (blob ? ok(blob) : fel(new Error("Kunde inte läsa bilden."))), "image/jpeg", kvalitet));
}
