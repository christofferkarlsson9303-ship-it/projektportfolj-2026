/** Ramar in tomt och sparade objekt. Måtten är samma som redigeraren använder. */
export function parkVy(objekt, tomt, aspect = 1.5) {
  let minX = -tomt.bredd / 2, maxX = tomt.bredd / 2;
  let minZ = -tomt.djup / 2, maxZ = tomt.djup / 2, hojd = 0;
  for (const o of objekt || []) {
    if (o.typ === "nal") continue;
    const a = (Number(o.rotation) || 0) * Math.PI / 180;
    const x = (Math.abs(Math.cos(a)) * (Number(o.bredd) || 0) + Math.abs(Math.sin(a)) * (Number(o.djup) || 0)) / 2;
    const z = (Math.abs(Math.sin(a)) * (Number(o.bredd) || 0) + Math.abs(Math.cos(a)) * (Number(o.djup) || 0)) / 2;
    minX = Math.min(minX, (Number(o.x) || 0) - x); maxX = Math.max(maxX, (Number(o.x) || 0) + x);
    minZ = Math.min(minZ, (Number(o.z) || 0) - z); maxZ = Math.max(maxZ, (Number(o.z) || 0) + z);
    hojd = Math.max(hojd, Number(o.hojd) || 0);
  }
  const target = [(minX + maxX) / 2, hojd / 2, (minZ + maxZ) / 2];
  const fov = 42;
  const vinkel = Math.min(fov * Math.PI / 360, Math.atan(Math.tan(fov * Math.PI / 360) * Math.max(0.2, aspect)));
  const radie = Math.hypot(maxX - minX, maxZ - minZ, hojd) / 2;
  const distans = Math.max(20, radie * 1.15 / Math.sin(vinkel));
  const riktning = [0.65, 0.82, 1];
  const langd = Math.hypot(...riktning);
  return { cameraPosition: target.map((t, i) => t + riktning[i] * distans / langd), target, fov };
}
