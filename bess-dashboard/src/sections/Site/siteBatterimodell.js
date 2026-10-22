import * as THREE from "three";

/** Schematisk formgivning för respektive profil. Skalas till det sparade objektets
 * mått; detaljerna är illustration, inte en installationsritning. Inga externa bilder. */
export function batterimodell(profil) {
  const rot = new THREE.Group();
  const L = 6.1, D = 2.5, H = 2.9;
  const material = (r, g, b, roughness = 0.65) => new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness, metalness: 0.12 });
  const vit = material(0.83, 0.86, 0.87);
  const dorr = material(0.76, 0.8, 0.82);
  const mork = material(0.13, 0.19, 0.22);
  const grund = material(0.39, 0.43, 0.44, 0.95);
  const box = (b, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    rot.add(m);
  };
  const tak = profil === "sungrow" ? 0.48 : 0.14;
  const kropp = H - tak - 0.12;
  box(L, 0.12, D, grund, 0, 0.06, 0);
  box(L, kropp, D, vit, 0, 0.12 + kropp / 2, 0);
  box(L + 0.05, 0.08, D + 0.05, vit, 0, H - tak + 0.04, 0);
  // Dörrfogar och handtag ger avläsbar skala även på avstånd.
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + (i + 0.5) * L / 6;
    box(L / 6 - 0.035, kropp - 0.14, 0.025, dorr, x, 0.12 + kropp / 2, D / 2 + 0.015);
    box(0.035, 0.2, 0.04, mork, x + L / 12 - 0.1, kropp / 2, D / 2 + 0.04);
  }
  // Kylaggregat är en förenklad profilmarkör; dess placering är inte ett montagekrav.
  if (profil === "sungrow") {
    box(L - 0.3, tak - 0.08, D - 0.25, mork, 0, H - tak / 2, 0);
    for (let i = 0; i < 12; i++) box(0.035, tak - 0.03, D - 0.2, vit, -L / 2 + 0.25 + i * (L - 0.5) / 11, H - tak / 2, 0);
  } else {
    box(0.7, kropp * 0.72, 0.08, mork, -L / 2 + 0.5, 0.25 + kropp / 2, -D / 2 - 0.02);
    for (let i = 0; i < 8; i++) box(0.66, 0.035, 0.09, dorr, -L / 2 + 0.5, 0.5 + i * 0.17, -D / 2 - 0.025);
  }
  rot.userData.matt = { x: L, y: H, z: D };
  rot.userData.ritad = true;
  return rot;
}
