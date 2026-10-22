import * as THREE from "three";

/** Endast renderingsdetaljer. modellFor skalar alltid mot objektets sparade profil/mått. */
function panelTextur(kyla = false) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 512; c.height = kyla ? 128 : 256;
  const g = c.getContext("2d"), w = c.width, h = c.height;
  g.fillStyle = "#eef1f2"; g.fillRect(0, 0, w, h);
  if (kyla) {
    for (const x of [10, w / 2 + 6]) {
      const b = w / 2 - 16;
      g.fillStyle = "#8f989d"; g.fillRect(x, 10, b, h - 20);
      g.strokeStyle = "rgba(40,50,55,.55)"; g.lineWidth = 2;
      for (let y = 16; y < h - 10; y += 7) { g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + b - 3, y); g.stroke(); }
      g.strokeStyle = "#e9eef0"; g.lineWidth = 4; g.strokeRect(x, 10, b, h - 20);
    }
  } else {
    g.strokeStyle = "rgba(60,75,82,.45)"; g.lineWidth = 2;
    for (const u of [.2, .4, .6, .8]) { g.beginPath(); g.moveTo(u * w, 8); g.lineTo(u * w, h - 6); g.stroke(); }
    g.fillStyle = "rgba(60,75,82,.5)";
    for (const u of [.37, .57, .77, .97]) g.fillRect(u * w - 14, h * .45, 4, 26);
    g.fillStyle = "#00b9e4"; g.fillRect(.05 * w, h * .2, 22, 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Schematisk CATL/Sungrow-illustration, aldrig ett nytt batterialternativ eller datablad. */
export function batterimodell(profil) {
  const rot = new THREE.Group();
  const L = 6.1, D = 2.5, H = 2.9;
  const vit = new THREE.MeshStandardMaterial({ color: 0xeef1f2, roughness: .55, metalness: .1 });
  const tak = new THREE.MeshStandardMaterial({ color: 0xdfe4e6, roughness: .6 });
  const grund = new THREE.MeshStandardMaterial({ color: 0x3a4044, roughness: .7 });
  const dorr = new THREE.MeshStandardMaterial({ color: 0xffffff, map: panelTextur(), roughness: .55, metalness: .1 });
  const galler = new THREE.MeshStandardMaterial({ color: 0xffffff, map: panelTextur(true), roughness: .55, metalness: .1 });
  const box = (b, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; rot.add(m);
  };
  const kylH = profil === "sungrow" ? .48 : .14;
  const kropp = H - kylH - .12;
  box(L, .12, D, grund, 0, .06, 0);
  box(L, kropp, D, [vit, vit, tak, vit, dorr, dorr], 0, .12 + kropp / 2, 0);
  box(L, .08, D, tak, 0, H - kylH + .04, 0);
  if (profil === "sungrow") {
    box(L - .12, kylH - .08, D - .12, [galler, galler, tak, vit, galler, galler], 0, H - kylH / 2, 0);
  } else {
    box(.7, kropp * .72, .08, galler, -L / 2 + .5, .25 + kropp / 2, -D / 2 - .02);
  }
  rot.userData.matt = { x: L, y: H, z: D };
  rot.userData.ritad = true;
  return rot;
}
