import * as THREE from "three";
import { batterimodell } from "./siteBatterimodell.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* Texturer och himmel för "Hög kvalitet" i 3D-siten. Ligger bredvid scenen så att three bara
   laddas när siten öppnas.

   Två källor, i den ordningen:
   1. Genererade bilder (Artlist) i public/assets/site/<profil>/: container, skid, mark (kakel)
      och himmel (360°, ekvirektangulär 2:1). Bara filer som står i manifest.json hämtas, så en
      saknad fil ger aldrig ett konsolfel.
   2. Annars en enkel textur ritad här: korrugerad plåt, paneler med galler, grus och en
      himmelsgradient. Den ser bättre ut än enfärgade block och kostar inget att ladda.

   Inget av detta sparas i portfolj/state. De ritade texturerna är bildinnehåll (neutrala gråtoner,
   himmel), inte gränssnittsfärger: på container och skid blandas typfärgen ur designsystemet in i
   materialet, så tonen följer temat. */

const DELAR = ["container", "skid", "mark", "grass", "ehouse", "himmel"];
const FILAR = { container: "container.jpg", skid: "skid.jpg", mark: "mark.jpg", himmel: "himmel.jpg", grass: "grass.jpg", ehouse: "ehouse.jpg" };

function duk(b, h, rita) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  rita(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Enkel textur ritad i koden för en del, eller null. */
export function ritadTextur(del) {
  if (typeof document === "undefined") return null;
  if (del === "container") {
    // Korrugerad containerplåt: lodräta veck med ljus och skugga, och en ram runt.
    return duk(512, 256, (g, b, h) => {
      g.fillStyle = "rgb(235,238,240)";
      g.fillRect(0, 0, b, h);
      for (let x = 0; x < b; x += 16) {
        const grad = g.createLinearGradient(x, 0, x + 16, 0);
        grad.addColorStop(0, "rgba(0,0,0,0.18)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
        grad.addColorStop(1, "rgba(0,0,0,0.12)");
        g.fillStyle = grad;
        g.fillRect(x, 0, 16, h);
      }
      g.strokeStyle = "rgba(0,0,0,0.35)";
      g.lineWidth = 6;
      g.strokeRect(3, 3, b - 6, h - 6);
    });
  }
  if (del === "skid") {
    // Skid: släta paneler med fogar och ventilationsgaller.
    return duk(512, 256, (g, b, h) => {
      g.fillStyle = "rgb(228,232,235)";
      g.fillRect(0, 0, b, h);
      g.strokeStyle = "rgba(0,0,0,0.3)";
      g.lineWidth = 3;
      for (let x = 0; x <= b; x += b / 4) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,0.28)";
      for (let p = 0; p < 4; p++) for (let y = 40; y < 110; y += 8) g.fillRect(p * (b / 4) + 22, y, b / 4 - 44, 4);
      g.strokeStyle = "rgba(0,0,0,0.4)";
      g.lineWidth = 6;
      g.strokeRect(3, 3, b - 6, h - 6);
    });
  }
  if (del === "mark" || del === "grass") {
    // Samma färger, kornstorlek och täthet som HTML-referensen. Fast frö undviker flimmer.
    return duk(256, 256, (g, b, h) => {
      const gras = del === "grass";
      g.fillStyle = gras ? "#93a77f" : "#cdc6b8";
      g.fillRect(0, 0, b, h);
      let fro = 7;
      const slump = () => ((fro = (fro * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < (gras ? 2600 : 5000); i++) {
        const v = 150 + (slump() * 80 | 0);
        g.fillStyle = gras ? `rgba(${60 + (slump() * 50 | 0)},${80 + (slump() * 50 | 0)},${40 + (slump() * 30 | 0)},.18)` : `rgba(${v},${v - 6},${v - 16},.5)`;
        g.fillRect(slump() * b, slump() * h, gras ? 2 : 1.5, gras ? 2 : 1.5);
      }
    });
  }
  if (del === "ehouse") return duk(512, 256, (g, b, h) => {
    g.fillStyle = "#2c4a59"; g.fillRect(0, 0, b, h);
    g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 3;
    for (let x = 0; x < b; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = "#1b3340";
    for (const x of [60, 200, 340]) g.fillRect(x, h - 150, 70, 150);
    g.fillStyle = "#00b9e4"; g.fillRect(0, 16, b, 4);
  });
  if (del === "himmel") {
    // Himmel: ljus horisont mot djupare blått uppåt, och mark under horisonten.
    return duk(1024, 512, (g, b, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgb(120,170,205)");
      grad.addColorStop(0.46, "rgb(214,232,240)");
      grad.addColorStop(0.5, "rgb(196,204,198)");
      grad.addColorStop(1, "rgb(120,128,120)");
      g.fillStyle = grad;
      g.fillRect(0, 0, b, h);
    });
  }
  return null;
}

/* ---------- Stängselnät ----------
   Hägnaden ritas som genomsiktligt rombnät i stället för en massiv skiva, efter Vaggeryd-
   modellen (2026-10-19). Nätet är vitt med alfa; typfärgen ur designsystemet läggs på i
   materialet. En duk delas av alla hägnader, varje hägnad får en egen textur med egen
   upprepning (en maska per halvmeter). */

let natDuk = null;
/** Stängselnät som textur, upprepad till `bredd` × `hojd` meter. Null utan DOM. */
export function stangselTextur(bredd, hojd) {
  if (typeof document === "undefined") return null;
  if (!natDuk) {
    natDuk = document.createElement("canvas");
    natDuk.width = natDuk.height = 64;
    const g = natDuk.getContext("2d");
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = "rgb(255,255,255)";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(64, 64);
    g.moveTo(64, 0);
    g.lineTo(0, 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(natDuk);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, (Number(bredd) || 1) / 0.5), Math.max(1, (Number(hojd) || 1) / 0.5));
  return t;
}

/** Vilka genererade filer som finns per profil, ur manifest.json. Tomt om manifestet saknas. */
async function manifest(bas) {
  try {
    const r = await fetch(`${bas}assets/site/manifest.json`, { cache: "no-cache" });
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}

function ladda(url) {
  return new Promise((ok) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        ok(t);
      },
      undefined,
      () => ok(null),
    );
  });
}

/** Texturer för en profil: { container, skid, mark, himmel, kalla } där kalla per del är
 *  "genererad" eller "ritad". Mark upprepas, himmeln är ekvirektangulär. */
export async function laddaTexturer(profilId, bas = import.meta.env?.BASE_URL || "/", { ritad = false } = {}) {
  const m = await manifest(bas);
  const finns = new Set(Array.isArray(m[profilId]) ? m[profilId] : []);
  const ut = { kalla: {}, modeller: {} };
  // 3D-modeller (container.glb, skid.glb) ersätter lådan när de finns.
  for (const typ of MODELLTYPER) {
    if (finns.has(`${typ}.glb`)) ut.modeller[typ] = await laddaModell(`${bas}assets/site/${profilId}/${typ}.glb`);
  }
  if (!ut.modeller.container) ut.modeller.container = batterimodell(profilId);
  // Den kapslade MV-stationen tillhör Sungrow. CATL/PE behåller sin öppna skid.
  if (!ut.modeller.skid && profilId === "sungrow") ut.modeller.skid = ritadMvStation();
  for (const del of DELAR) {
    const fil = FILAR[del];
    const t = !ritad && finns.has(fil) ? await ladda(`${bas}assets/site/${profilId}/${fil}`) : null;
    ut[del] = t || ritadTextur(del);
    ut.kalla[del] = t ? "genererad" : "ritad";
  }
  if (ut.mark) {
    ut.mark.wrapS = ut.mark.wrapT = THREE.RepeatWrapping;
    ut.mark.repeat.set(30, 30);
  }
  if (ut.grass) { ut.grass.wrapS = ut.grass.wrapT = THREE.RepeatWrapping; ut.grass.repeat.set(60, 60); ut.grass.anisotropy = 4; }
  if (ut.mark) ut.mark.anisotropy = 4;
  if (ut.himmel) ut.himmel.mapping = THREE.EquirectangularReflectionMapping;
  return ut;
}

export function frigorTexturer(t) {
  for (const del of DELAR) t?.[del]?.dispose?.();
  for (const m of Object.values(t?.modeller || {})) {
    m?.traverse((o) => {
      o.geometry?.dispose?.();
      for (const x of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
        x.map?.dispose?.();
        x.dispose?.();
      }
    });
  }
}

/* ---------- 3D-modeller ----------
   En .glb per typ. Ljus i filen (KHR_lights_punctual) tas bort — scenen har sin egen belysning,
   och sex skid med fyra lampor var skulle göra den långsam. Modellen läggs med botten på y = 0
   och mitten i origo, med sin längsta sida längs x, så att den kan skalas till objektets bredd. */

const MODELLTYPER = ["container", "skid"];

function laddaModell(url) {
  return new Promise((ok) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        const rot = gltf.scene;
        const ljus = [];
        rot.traverse((o) => {
          if (o.isLight) ljus.push(o);
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        for (const l of ljus) l.parent?.remove(l);
        rot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(rot);
        const storlek = box.getSize(new THREE.Vector3());
        const mitt = box.getCenter(new THREE.Vector3());
        // Längsta sidan längs x: vrid 90° om modellen är längre i z än i x.
        const yttre = new THREE.Group();
        const inre = new THREE.Group();
        inre.add(rot);
        rot.position.set(-mitt.x, -box.min.y, -mitt.z);
        if (storlek.z > storlek.x) inre.rotation.y = Math.PI / 2;
        yttre.add(inre);
        yttre.userData.matt = storlek.z > storlek.x ? { x: storlek.z, y: storlek.y, z: storlek.x } : { x: storlek.x, y: storlek.y, z: storlek.z };
        ok(yttre);
      },
      undefined,
      () => ok(null),
    );
  });
}

/* ---------- MV-station ritad i koden ----------
   Sungrow-profilens MV-station byggd ur enkla lådor efter en referensbild (Artlist), i metrar:
   betongplatta, vit kapsling, tak med utsprång och tre dörrpar på framsidan (RMU, transformator
   med ventilationsgaller, LSP-skåp), kabelgenomföringar och varningsskyltar. Stilreferens, inte
   Sungrows ritning — måtten följer profilen (6,1 × 2,5 × 2,9 m, att verifiera). Gråtonerna och
   den gula skylten är bildinnehåll, inte gränssnittsfärger. */

export function ritadMvStation() {
  const L = 6.1;
  const D = 2.5;
  const PLATTA = 0.18;
  const KROPP = 2.58;
  const mat = (r, g, b, extra = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(r / 255, g / 255, b / 255), roughness: 0.6, metalness: 0.1, ...extra });
  const betong = mat(168, 168, 164, { roughness: 0.95, metalness: 0 });
  const vit = mat(236, 238, 238);
  const dorr = mat(226, 229, 230);
  const fog = mat(70, 76, 80);
  const galler = mat(120, 126, 130);
  const gul = mat(240, 196, 40, { roughness: 0.5 });
  const lada = (b, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const rot = new THREE.Group();
  rot.add(lada(L + 0.5, PLATTA, D + 0.5, betong, 0, PLATTA / 2, 0));
  rot.add(lada(L, KROPP, D, vit, 0, PLATTA + KROPP / 2, 0));
  rot.add(lada(L + 0.2, 0.12, D + 0.2, vit, 0, PLATTA + KROPP + 0.06, 0));

  // Tre fack på framsidan (z = D/2): RMU, transformator, LSP. Varje fack har två dörrblad.
  const fram = D / 2 + 0.012;
  const fack = L / 3;
  const dorrH = KROPP - 0.42;
  const dorrY = PLATTA + 0.2 + dorrH / 2;
  for (let f = 0; f < 3; f++) {
    const mitt = -L / 2 + fack * (f + 0.5);
    rot.add(lada(0.03, KROPP - 0.1, 0.03, fog, -L / 2 + fack * f, PLATTA + KROPP / 2, fram));
    for (const s of [-1, 1]) {
      const bladB = fack / 2 - 0.14;
      const x = mitt + s * (bladB / 2 + 0.04);
      rot.add(lada(bladB, dorrH, 0.024, dorr, x, dorrY, fram));
      // Handtag vid mittfogen.
      rot.add(lada(0.04, 0.18, 0.04, fog, mitt + s * 0.12, dorrY, fram + 0.03));
      if (f === 1) {
        // Transformatorfacket: övre och nedre galler med lameller.
        for (const gy of [dorrY + dorrH * 0.22, dorrY - dorrH * 0.24]) {
          rot.add(lada(bladB - 0.2, dorrH * 0.36, 0.02, galler, x, gy, fram + 0.014));
          for (let i = 0; i < 9; i++) rot.add(lada(bladB - 0.24, 0.025, 0.03, fog, x, gy - dorrH * 0.16 + i * dorrH * 0.04, fram + 0.03));
        }
      }
    }
    // Varningsskylt och två kabelgenomföringar per fack.
    rot.add(lada(0.16, 0.16, 0.01, gul, mitt + 0.32, dorrY + 0.1, fram + 0.02));
    for (const s of [-1, 1]) {
      const genom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), galler);
      genom.rotation.x = Math.PI / 2;
      genom.position.set(mitt + s * 0.5, PLATTA + 0.1, fram + 0.04);
      rot.add(genom);
    }
  }
  // Baksidan: en servicedörr per fack, utan detaljer.
  for (let f = 0; f < 3; f++) rot.add(lada(fack - 0.4, dorrH, 0.024, dorr, -L / 2 + fack * (f + 0.5), dorrY, -fram));

  const yttre = new THREE.Group();
  yttre.add(rot);
  // Måtten är kapslingens, så att den skalas 1:1 mot profilens bredd; plattan sticker ut runt om.
  yttre.userData.matt = { x: L, y: PLATTA + KROPP + 0.12, z: D };
  yttre.userData.ritad = true;
  return yttre;
}

/** En kopia av modellen skalad till objektets bredd (x), med modellens egna proportioner, så att
 *  den inte blir utdragen (eller till alla tre mått med `anpassa`). Geometri och material delas med originalet: kopian märks `delad` och
 *  får inte frigöras när objektet tas bort. */
export function modellFor(modell, o, { anpassa = false } = {}) {
  const k = modell.clone(true);
  const m = modell.userData.matt;
  const s = (Number(o.bredd) || 1) / (m.x || 1);
  /* `anpassa`: modellen fylls ut till objektets bredd, höjd och djup. Används för batterierna,
     där profilens mått kommer ur databladet och den genererade modellens proportioner inte gör det. */
  if (anpassa) k.scale.set(s, (Number(o.hojd) || 1) / (m.y || 1), (Number(o.djup) || 1) / (m.z || 1));
  else k.scale.setScalar(s);
  k.userData.delad = true;
  return k;
}

