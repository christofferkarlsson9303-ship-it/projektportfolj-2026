import * as THREE from "three";

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

const DELAR = ["container", "skid", "mark", "himmel"];
const FILAR = { container: "container.jpg", skid: "skid.jpg", mark: "mark.jpg", himmel: "himmel.jpg" };

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
  if (del === "mark") {
    // Grus: tusentals små korn i ljus och skugga på grå botten. Upprepas över marken.
    return duk(256, 256, (g, b, h) => {
      g.fillStyle = "rgb(150,152,150)";
      g.fillRect(0, 0, b, h);
      let fro = 7;
      const slump = () => ((fro = (fro * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 4200; i++) {
        const ljus = slump() > 0.5;
        g.fillStyle = ljus ? `rgba(255,255,255,${0.08 + slump() * 0.22})` : `rgba(0,0,0,${0.08 + slump() * 0.22})`;
        const r = 0.6 + slump() * 1.8;
        g.fillRect(slump() * b, slump() * h, r, r);
      }
    });
  }
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
export async function laddaTexturer(profilId, bas = import.meta.env?.BASE_URL || "/") {
  const m = await manifest(bas);
  const finns = new Set(Array.isArray(m[profilId]) ? m[profilId] : []);
  const ut = { kalla: {} };
  for (const del of DELAR) {
    const fil = FILAR[del];
    const t = finns.has(fil) ? await ladda(`${bas}assets/site/${profilId}/${fil}`) : null;
    ut[del] = t || ritadTextur(del);
    ut.kalla[del] = t ? "genererad" : "ritad";
  }
  if (ut.mark) {
    ut.mark.wrapS = ut.mark.wrapT = THREE.RepeatWrapping;
    ut.mark.repeat.set(60, 60);
  }
  if (ut.himmel) ut.himmel.mapping = THREE.EquirectangularReflectionMapping;
  return ut;
}

export function frigorTexturer(t) {
  for (const del of DELAR) t?.[del]?.dispose?.();
}
