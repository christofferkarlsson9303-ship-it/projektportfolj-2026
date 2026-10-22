import { useEffect, useRef, useState } from "react";
import { parkVy } from "../../lib/siteKamera.js";
import { luftFor } from "../../lib/siteSakerhet.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import {
  INGANG,
  KORYTOR,
  MALLAR,
  RUTNAT,
  TANGENTER,
  TOMT,
  TYPFARG,
  arNal,
  arVolym,
  forflyttning,
  innanforTomt,
  kompassVinkel,
  planMatt,
  provaPlacering,
  steg,
  titta,
} from "../../lib/site.js";
import { DIFF_FARG } from "../../lib/modellDiff.js";
import { avstand, flygBana, flygTid, klippPlan } from "../../lib/modellKoppling.js";
import { LAGER, STANDARDLAGER, kabelvagar } from "../../lib/siteLager.js";
import { frigorTexturer, laddaTexturer, modellFor, stangselTextur } from "./siteTexturer.js";

/* 3D-scenen för siten. Laddas för sig (lazy) så att three bara hämtas när
   någon öppnar siten.

   Två lägen. Orbit: kameran kretsar runt tomten tills användaren rör den,
   klick på marken placerar, klick på ett objekt markerar det och ett markerat
   objekt kan dras. Gå: kameran står på ögonhöjd, WASD/pilar går (A strafe:ar
   vänster), Shift springer, Q/E upp och ner, musen tittar. Matematiken ligger
   i lib/site.js och är testad där.

   Placering: ett rutnät (1 m) ritas på marken. Medan en mall är vald följer
   ett spökobjekt musen, snappat till rutnätet (och till grannars kanter) och
   färgat efter om platsen är fri. Samma regler (lib/site.js, provaPlacering)
   gäller vid klick, dragning och R — scenen ritar bara resultatet.

   Verktyg (styrs från verktygsfältet i Site.jsx): sektionslåda med clipping
   planes, kryssmätning med raycasting mellan två punkter på ytor, och
   jämförelse som färgar objekt efter en diff (lib/modellDiff.js). Kameran kan
   flyga mjukt till en vy — Site ber om det via `flyg` och scenen räknar
   banan med lib/modellKoppling.js, bildruta för bildruta i animationsloopen
   (requestAnimationFrame).

   Färgerna läses ur designsystemets CSS-variabler när scenen byggs — inga
   egna hex-värden.

   Filterlager (`lager`): Märkning ger en klickbar namnetikett på varje enhet,
   DC, HSP 12 kV, LSP, Fiber/tele och Jord ritar schematiska kabelvägar ur
   lib/siteLager.js. "Hög kvalitet" (`hogKvalitet`) lägger texturer på volymer
   och mark och en 360°-himmel bakom scenen (siteTexturer.js). Etiketterna är
   CSS2D-objekt i samma 3D-rum som volymerna och följer dem i varje bildruta,
   också under en kameraflygning.

   Från Vaggeryd-modellen (2026-10-19): en norrpil som vrids med kameran i båda lägena,
   mjukare skuggor utan skuggränder (bias och normalBias) och hägnad som genomsiktligt
   stängselnät med stolpar i stället för en massiv skiva. */

const ORBITLAGE = [46, 40, 58];
const rad = (g) => ((Number(g) || 0) * Math.PI) / 180;

function farg(variabel) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variabel).trim();
  return v ? new THREE.Color(v) : new THREE.Color(0.55, 0.6, 0.62);
}

/** Frigör geometri och material. En modellkopia (`userData.delad`) delar dem med den laddade
 *  modellen och hoppas över — den frigörs när Hög kvalitet slås av. */
function frigor(rot) {
  if (rot.userData?.delad) return;
  rot.geometry?.dispose?.();
  const m = rot.material;
  for (const x of Array.isArray(m) ? m : m ? [m] : []) {
    x.map?.dispose?.();
    x.dispose?.();
  }
  for (const barn of rot.children || []) frigor(barn);
}

/** Plana ytor på varandra (mark, grus, väg, plan) — djupförskjutning i
 *  stället för höjd, annars flimrar de i varandra på avstånd. */
const djupLager = (n) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 4 });

const kortTitel = (t) => (String(t).length > 42 ? String(t).slice(0, 39) + "…" : String(t));

function etikett(text, ton = "", onKlick = null) {
  const el = document.createElement(onKlick ? "button" : "div");
  el.className = `${onKlick ? "pointer-events-auto cursor-pointer hover:border-one-bla focus-visible:outline focus-visible:outline-2 focus-visible:outline-one-bla" : "pointer-events-none"} whitespace-nowrap rounded-md border border-solid px-1.5 py-0.5 font-body text-[11px] font-semibold shadow-sm ${
    ton === "nal" ? "border-orange bg-surface text-ink" : ton === "valt" ? "border-orange bg-surface text-ink" : "border-hairline bg-surface text-ink"
  }`;
  el.textContent = text;
  if (onKlick) {
    el.type = "button";
    el.dataset.roll = "site-etikett";
    el.setAttribute("aria-label", `Markera ${text}`);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onKlick();
    });
  }
  return new CSS2DObject(el);
}

/** Joystick nere till vänster för pekskärm. Minst 44 px — basen är 120. */
function Joystick({ onAxel }) {
  const bas = useRef(null);
  const aktiv = useRef(false);
  const [knopp, setKnopp] = useState({ x: 0, y: 0 });
  const R = 44;

  const flytta = (e) => {
    const b = bas.current.getBoundingClientRect();
    let dx = e.clientX - (b.left + b.width / 2);
    let dy = e.clientY - (b.top + b.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx = (dx / l) * R;
      dy = (dy / l) * R;
    }
    setKnopp({ x: dx, y: dy });
    onAxel({ sid: dx / R, fram: -dy / R });
  };
  const slapp = () => {
    aktiv.current = false;
    setKnopp({ x: 0, y: 0 });
    onAxel({ sid: 0, fram: 0 });
  };

  return (
    <div
      ref={bas}
      data-roll="joystick"
      aria-hidden="true"
      className="absolute bottom-3 left-3 z-[2] h-[120px] w-[120px] touch-none select-none rounded-full border-2 border-solid border-hairline-stark bg-raised shadow-md"
      onPointerDown={(e) => {
        e.stopPropagation();
        aktiv.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        flytta(e);
      }}
      onPointerMove={(e) => {
        if (aktiv.current) flytta(e);
      }}
      onPointerUp={slapp}
      onPointerCancel={slapp}
    >
      <span
        className="absolute left-1/2 top-1/2 h-[52px] w-[52px] rounded-full bg-one-bla shadow-sm"
        style={{ transform: `translate(calc(-50% + ${knopp.x}px), calc(-50% + ${knopp.y}px))` }}
      />
    </div>
  );
}

export default function SiteScen({
  objekt,
  skyddsregler = [],
  punkter,
  plan,
  valtId,
  laddad,
  lage,
  rutnat = true,
  spokRot = 0,
  sektion = null,
  matning = false,
  diff = null,
  arenden = null,
  flyg = null,
  ifcModeller = null,
  ifcObjekt = null,
  lager = STANDARDLAGER,
  hogKvalitet = false,
  profil = "catl-pe",
  spokMatt = null,
  ritningar = null,
  flyttaObjekt = false,
  panelBredd = 0,
  onKlar,
  onPlacera,
  onValj,
  onFlytta,
  onMatt,
  onFel,
}) {
  const holder = useRef(null);
  const kompass = useRef(null);
  const s = useRef({});
  const senaste = useRef({});
  const [pek] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  const [laddadeTexturer, setTexturer] = useState(null);
  // Av = inga texturer, även om de från förra gången fortfarande ligger i state.
  const texturer = hogKvalitet ? laddadeTexturer : null;

  // Senaste props för händelser som registreras en gång.
  useEffect(() => {
    senaste.current = { objekt, skyddsregler, valtId, laddad, lage, rutnat, spokRot, spokMatt, matning, onPlacera, onValj, onFlytta, onMatt, onKlar, onFel, flyttaObjekt, panelBredd };
  });

  /* ---------- Bygg scenen en gång ---------- */
  useEffect(() => {
    const el = holder.current;
    let renderer;
    try {
      // Fråga först — three loggar ett konsolfel om kontexten inte går att skapa.
      const prov = document.createElement("canvas");
      if (!(prov.getContext("webgl2") || prov.getContext("webgl"))) throw new Error("WebGL saknas");
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      senaste.current.onFel?.("Webbläsaren kan inte visa 3D (WebGL saknas eller är avstängt).");
      return undefined;
    }
    /* Utan grafikkort (SwiftShader, llvmpipe) kostar varje bild tiotals
       millisekunder. Då ritas utan skuggor och utan autorotation. */
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const programvara = /swiftshader|llvmpipe|software/i.test(info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "");
    renderer.setPixelRatio(programvara ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = !programvara;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "block h-full w-full touch-none";
    el.appendChild(renderer.domElement);

    const etiketter = new CSS2DRenderer();
    etiketter.domElement.className = "pointer-events-none absolute inset-0";
    el.appendChild(etiketter.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 6000);
    camera.position.set(...ORBITLAGE);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    // Mjuk tröghet: kameran glider ut i stället för att stanna på stället.
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.maxPolarAngle = rad(84);
    controls.minDistance = 8;
    controls.maxDistance = Math.max(500, TOMT.bredd * 6, TOMT.djup * 6);
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.6;
    // Orbit tills användaren tar över.
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });
    /* Ritas bara när något ändrats och bara när bilden syns — en scen som
       ritas om 60 gånger i sekunden i onödan äter batteri på en surfplatta. */
    let smutsig = true;
    let synlig = true;
    const markera = () => {
      smutsig = true;
    };
    controls.addEventListener("change", markera);

    scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), farg("--web2"), 1.35));
    const sol = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 2.0);
    sol.position.set(-40, 70, 30);
    sol.castShadow = true;
    sol.shadow.mapSize.set(programvara ? 1024 : 2048, programvara ? 1024 : 2048);
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
    // Mjuk kant och inga skuggränder på plana tak och marken (samma värden som Vaggeryd-modellen).
    sol.shadow.radius = 3;
    sol.shadow.bias = -0.0005;
    sol.shadow.normalBias = 0.06;
    scene.add(sol);

    // Marken runt tomten, tomtens grus och körytor.
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: farg("--web2"), roughness: 1 }));
    mark.rotation.x = -Math.PI / 2;
    mark.receiveShadow = true;
    scene.add(mark);

    const tomt = new THREE.Group();
    const grus = new THREE.Mesh(
      new THREE.PlaneGeometry(TOMT.bredd, TOMT.djup),
      new THREE.MeshStandardMaterial({ color: farg("--ink-faint"), roughness: 1, ...djupLager(1) })
    );
    grus.rotation.x = -Math.PI / 2;
    grus.position.y = 0.01;
    grus.receiveShadow = true;
    tomt.add(grus);
    for (const k of KORYTOR) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(k.bredd, k.djup), new THREE.MeshStandardMaterial({ color: farg("--morkgra"), roughness: 0.9, ...djupLager(2) }));
      v.rotation.x = -Math.PI / 2;
      v.position.set(k.x, 0.02, k.z);
      v.receiveShadow = true;
      tomt.add(v);
    }
    scene.add(tomt);

    const grans = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([a, b]) => new THREE.Vector3((a * TOMT.bredd) / 2, 0.05, (b * TOMT.djup) / 2))
      ),
      new THREE.LineBasicMaterial({ color: farg("--one-djup") })
    );
    scene.add(grans);

    /* Rutnätet: en linje per meter över tomten. Ligger för sig (inte i
       `tomt`) så att det syns även när en situationsplan ersätter gruset. */
    const rutPunkter = [];
    for (let x = -TOMT.bredd / 2; x <= TOMT.bredd / 2 + 1e-6; x += RUTNAT) rutPunkter.push(x, 0.06, -TOMT.djup / 2, x, 0.06, TOMT.djup / 2);
    for (let z = -TOMT.djup / 2; z <= TOMT.djup / 2 + 1e-6; z += RUTNAT) rutPunkter.push(-TOMT.bredd / 2, 0.06, z, TOMT.bredd / 2, 0.06, z);
    const rutGeo = new THREE.BufferGeometry();
    rutGeo.setAttribute("position", new THREE.Float32BufferAttribute(rutPunkter, 3));
    const rutnatLinjer = new THREE.LineSegments(rutGeo, new THREE.LineBasicMaterial({ color: farg("--himmel"), transparent: true, opacity: 0.35 }));
    rutnatLinjer.visible = senaste.current.rutnat !== false;
    scene.add(rutnatLinjer);

    const objektGrupp = new THREE.Group();
    scene.add(objektGrupp);
    /* Importerade IFC-modeller: egen grupp, byggs om bara när modellerna byts (inte vid varje markering). */
    const ifcGrupp = new THREE.Group();
    scene.add(ifcGrupp);
    const matGrupp = new THREE.Group();
    scene.add(matGrupp);
    // Sektionslådans kanter, så att man ser vad som klipps.
    const sektionLinjer = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: farg("--orange") }));
    sektionLinjer.visible = false;
    scene.add(sektionLinjer);
    // Spökobjektet visas medan en mall är vald; färgen säger om platsen är fri.
    const spok = new THREE.Group();
    spok.visible = false;
    spok.renderOrder = 5;
    scene.add(spok);
    const planGrupp = new THREE.Group();
    scene.add(planGrupp);
    // Uppladdade ritningar (lib/ritningar.js): plan på marken, ovanpå gruset och situationsplanen.
    const ritGrupp = new THREE.Group();
    scene.add(ritGrupp);
    // Schematiska kabelvägar per filterlager.
    const kabelGrupp = new THREE.Group();
    scene.add(kabelGrupp);

    let forstaStorlek = true;
    const ramaIn = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      const inset = Math.min(senaste.current.panelBredd || 0, w * 0.48);
      const vy = parkVy(senaste.current.objekt, TOMT, (w - inset) / h);
      camera.position.set(...vy.cameraPosition);
      controls.target.set(...vy.target);
      camera.fov = vy.fov;
      camera.updateProjectionMatrix();
      controls.update();
      smutsig = true;
    };
    const storlek = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      etiketter.setSize(w, h);
      camera.aspect = w / h;
      const inset = Math.min(senaste.current.panelBredd || 0, w * 0.48);
      camera.setViewOffset(w, h, -inset / 2, 0, w, h);
      camera.updateProjectionMatrix();
      if (forstaStorlek) { ramaIn(); forstaStorlek = false; }
      smutsig = true;
    };
    storlek();
    const ro = new ResizeObserver(storlek);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      synlig = e.isIntersecting;
      smutsig = true;
    });
    io.observe(el);

    const ga = { pos: { x: INGANG.x, y: INGANG.y, z: INGANG.z }, yaw: INGANG.yaw, pitch: INGANG.pitch, avsikt: {}, joy: { fram: 0, sid: 0 } };
    s.current = { ramaIn, storlek, renderer, etiketter, scene, camera, controls, objektGrupp, ifcGrupp, planGrupp, ritGrupp, ritTexturer: new Map(), kabelGrupp, tomt, mark, grus, ga, meshar: new Map(), markera, rutnatLinjer, spok, spokPunkt: null, matGrupp, sektionLinjer, flygning: null };

    /* ---------- Pekare: välja, placera, dra, titta ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const markplan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const straale = (e) => {
      const b = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const traffbara = () => [...objektGrupp.children, ...ifcGrupp.children.filter((g) => g.visible)];
    const traffadId = () => {
      for (const h of ray.intersectObjects(traffbara(), true)) {
        let o = h.object;
        while (o && !o.userData.id) o = o.parent;
        if (o) return o.userData.id;
      }
      return null;
    };
    const markpunkt = () => {
      const p = new THREE.Vector3();
      return ray.ray.intersectPlane(markplan, p) ? p : null;
    };

    /* Kryssmätning: träffa första ytan under pekaren (objekt eller mark). */
    const ytpunkt = () => {
      const traff = ray.intersectObjects(traffbara(), true).find((h) => h.object.isMesh && h.object.visible && !h.object.userData.spok);
      if (traff) return traff.point.clone();
      return markpunkt();
    };
    const matMat = new THREE.MeshBasicMaterial({ color: farg("--orange"), depthTest: false });
    const matLinje = new THREE.LineBasicMaterial({ color: farg("--orange"), depthTest: false });
    const rensaMatning = () => {
      for (const barn of [...matGrupp.children]) {
        barn.traverse((o) => {
          if (o.isCSS2DObject) o.element.remove();
        });
        matGrupp.remove(barn);
        barn.geometry?.dispose?.();
      }
      s.current.matPunkter = [];
      smutsig = true;
    };
    s.current.rensaMatning = rensaMatning;
    s.current.matPunkter = [];
    const lagg = (p) => {
      let pts = s.current.matPunkter;
      if (pts.length >= 2) {
        rensaMatning();
        pts = s.current.matPunkter;
      }
      pts.push([p.x, p.y, p.z]);
      const kula = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), matMat);
      kula.position.copy(p);
      kula.renderOrder = 10;
      matGrupp.add(kula);
      if (pts.length === 2) {
        const [a, b] = pts;
        const linje = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), matLinje);
        linje.renderOrder = 10;
        matGrupp.add(linje);
        const d = avstand(a, b);
        const l = etikett(`${d.total.toFixed(2).replace(".", ",")} m`);
        l.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.4, (a[2] + b[2]) / 2);
        matGrupp.add(l);
        senaste.current.onMatt?.({ a, b, ...d });
      } else {
        senaste.current.onMatt?.(null);
      }
      smutsig = true;
    };

    /* Spöket: räkna ut var det hamnar för senaste musposition och rita det.
       Anropas vid musrörelse och när mall, rotation eller objekt ändras. */
    const matGod = new THREE.MeshStandardMaterial({ color: farg("--turkos"), transparent: true, opacity: 0.6, depthWrite: false });
    const matFel = new THREE.MeshStandardMaterial({ color: farg("--rod"), transparent: true, opacity: 0.6, depthWrite: false });
    let spokTyp = null;
    let spokDim = "";
    const uppdateraSpok = () => {
      const p = senaste.current;
      const q = s.current.spokPunkt;
      const bas = p.laddad && p.laddad !== "nal" ? MALLAR[p.laddad] : null;
      // Profilens mått för container och skid (lib/siteLager.js mattFor), annars mallens.
      const mall = bas ? { ...bas, ...(p.spokMatt || {}) } : null;
      if (!mall || !q || p.lage === "ga") {
        if (spok.visible) {
          spok.visible = false;
          smutsig = true;
        }
        return;
      }
      const rot = p.spokRot || 0;
      const ob = { typ: p.laddad, bredd: mall.bredd, djup: mall.djup, hojd: mall.hojd, rotation: rot };
      const res = provaPlacering(ob, q, p.objekt || [], { rutnat: p.rutnat === false ? 0 : RUTNAT, snappLuft: luftFor(p.skyddsregler || [], p.laddad) });
      const dim = `${p.laddad}:${mall.bredd}x${mall.djup}x${mall.hojd}`;
      if (spokTyp !== p.laddad || spokDim !== dim) {
        for (const barn of [...spok.children]) {
          spok.remove(barn);
          barn.geometry?.dispose?.();
        }
        const m = new THREE.Mesh(new THREE.BoxGeometry(mall.bredd, mall.hojd, mall.djup), matGod);
        m.position.y = mall.hojd / 2;
        spok.add(m);
        spokTyp = p.laddad;
        spokDim = dim;
      }
      spok.children[0].material = res.ok ? matGod : matFel;
      spok.position.set(res.x, 0, res.z);
      spok.rotation.y = rad(rot);
      spok.visible = true;
      smutsig = true;
    };
    s.current.uppdateraSpok = uppdateraSpok;

    let start = null;
    let drag = null;
    let titt = null;

    const ned = (e) => {
      const p = senaste.current;
      if (p.lage === "ga") {
        if (pek || e.pointerType === "touch") {
          titt = { x: e.clientX, y: e.clientY, id: e.pointerId };
        } else if (document.pointerLockElement !== renderer.domElement) {
          try {
            const r = renderer.domElement.requestPointerLock?.();
            r?.catch?.(() => {});
          } catch {
            /* pekarlås nekat — titta med dragning i stället */
            titt = { x: e.clientX, y: e.clientY, id: e.pointerId };
          }
        }
        return;
      }
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY };
      straale(e);
      const id = traffadId();
      if (p.flyttaObjekt && id && id === p.valtId && !p.matning) {
        const m = s.current.meshar.get(id);
        const q = markpunkt();
        if (m && q) {
          drag = { id, dx: q.x - m.position.x, dz: q.z - m.position.z, pos: null };
          controls.enabled = false;
          renderer.domElement.setPointerCapture?.(e.pointerId);
        }
      }
    };

    const rorelse = (e) => {
      if (titt && e.pointerId === titt.id) {
        const t = titta(ga.yaw, ga.pitch, (e.clientX - titt.x) * 1.6, (e.clientY - titt.y) * 1.6);
        ga.yaw = t.yaw;
        ga.pitch = t.pitch;
        smutsig = true;
        titt.x = e.clientX;
        titt.y = e.clientY;
        return;
      }
      if (!drag) {
        if (senaste.current.laddad) {
          straale(e);
          const q = markpunkt();
          s.current.spokPunkt = q ? { x: q.x, z: q.z } : null;
          uppdateraSpok();
        }
        return;
      }
      straale(e);
      const q = markpunkt();
      const m = s.current.meshar.get(drag.id);
      if (!q || !m) return;
      /* Dragningen följer samma regler som placeringen: snappad till rutnätet
         och kant mot kant, och den stannar på senaste lediga plats i stället
         för att hamna inuti ett annat objekt. */
      const o = (senaste.current.objekt || []).find((x) => x.id === drag.id);
      const mal = { x: q.x - drag.dx, z: q.z - drag.dz };
      const res = o
        ? provaPlacering(o, mal, senaste.current.objekt || [], { ignorera: o.id, rutnat: senaste.current.rutnat === false ? 0 : RUTNAT, snappLuft: luftFor(senaste.current.skyddsregler || [], o.typ) })
        : { ...innanforTomt(mal.x, mal.z), ok: true };
      if (!res.ok) return;
      m.position.x = res.x;
      m.position.z = res.z;
      drag.pos = { x: res.x, z: res.z };
      smutsig = true;
    };

    const lamna = () => {
      s.current.spokPunkt = null;
      uppdateraSpok();
    };

    const upp = (e) => {
      if (titt && e.pointerId === titt.id) {
        titt = null;
        return;
      }
      const p = senaste.current;
      if (drag) {
        if (drag.pos) p.onFlytta?.(drag.id, drag.pos.x, drag.pos.z);
        drag = null;
        controls.enabled = p.lage !== "ga";
        start = null;
        return;
      }
      if (!start || p.lage === "ga") return;
      const flyttat = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      start = null;
      if (flyttat > 6) return;
      straale(e);
      if (p.matning) {
        const y = ytpunkt();
        if (y) lagg(y);
        return;
      }
      const id = traffadId();
      if (id) {
        p.onValj?.(id);
        return;
      }
      const q = markpunkt();
      if (p.laddad && q) p.onPlacera?.(q.x, q.z);
      else p.onValj?.(null);
    };

    const mus = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      const t = titta(ga.yaw, ga.pitch, e.movementX || 0, e.movementY || 0);
      ga.yaw = t.yaw;
      ga.pitch = t.pitch;
      smutsig = true;
    };

    /* ---------- Tangenter i gåläget ---------- */
    const harFokus = () => document.pointerLockElement === renderer.domElement || document.activeElement === el;
    const tangent = (ned) => (e) => {
      if (senaste.current.lage !== "ga" || e.ctrlKey || e.metaKey || e.altKey) return;
      const avsikt = TANGENTER[e.code];
      if (!avsikt || (ned && !harFokus())) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || "")) return;
      e.preventDefault();
      ga.avsikt[avsikt] = ned;
    };
    const tangentNed = tangent(true);
    const tangentUpp = tangent(false);
    const tappa = () => {
      ga.avsikt = {};
    };

    const c = renderer.domElement;
    c.addEventListener("pointerdown", ned);
    c.addEventListener("pointermove", rorelse);
    c.addEventListener("pointerup", upp);
    c.addEventListener("pointercancel", upp);
    c.addEventListener("pointerleave", lamna);
    document.addEventListener("mousemove", mus);
    window.addEventListener("keydown", tangentNed);
    window.addEventListener("keyup", tangentUpp);
    window.addEventListener("blur", tappa);

    /* ---------- Kameraflygning ---------- */
    const nuVy = () => {
      const l = senaste.current.lage === "ga";
      const mal = l ? [ga.pos.x - Math.sin(ga.yaw), ga.pos.y, ga.pos.z - Math.cos(ga.yaw)] : controls.target.toArray();
      return { cameraPosition: camera.position.toArray(), target: mal, fov: camera.fov };
    };
    const startaFlyg = (till) => {
      if (!till) return;
      const lugnt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      controls.autoRotate = false;
      const fran = nuVy();
      const dur = lugnt ? 0 : flygTid(fran, till);
      controls.enabled = false;
      s.current.flygning = { t0: performance.now(), dur, fran, till };
      smutsig = true;
    };
    const stegaFlyg = (nu) => {
      const f = s.current.flygning;
      if (!f) return;
      const t = f.dur ? (nu - f.t0) / f.dur : 1;
      const v = flygBana(f.fran, f.till, t);
      camera.position.set(...v.cameraPosition);
      controls.target.set(...v.target);
      if (Math.abs(camera.fov - v.fov) > 1e-6) {
        camera.fov = v.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(...v.target);
      controls.update();
      smutsig = true;
      if (t >= 1) {
        s.current.flygning = null;
        controls.enabled = senaste.current.lage !== "ga";
      }
    };
    /* Skärmdump som data-URL (PNG), tagen från en given vy utan att användaren ser kameran röra sig:
       kameran sätts, scenen ritas, bilden läses av och kameran återställs i samma bildruta. Används av
       BCF-exporten. Null om scenen inte kan ritas. */
    const skarmdump = (vp) => {
      try {
        const sparad = { pos: camera.position.clone(), mal: controls.target.clone(), fov: camera.fov, rot: camera.rotation.clone() };
        if (vp) {
          camera.position.set(...vp.cameraPosition);
          controls.target.set(...vp.target);
          camera.fov = vp.fov;
          camera.updateProjectionMatrix();
          camera.lookAt(...vp.target);
        }
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/png");
        camera.position.copy(sparad.pos);
        controls.target.copy(sparad.mal);
        camera.fov = sparad.fov;
        camera.updateProjectionMatrix();
        camera.rotation.copy(sparad.rot);
        smutsig = true;
        return url;
      } catch {
        return null;
      }
    };
    s.current.startaFlyg = startaFlyg;
    senaste.current.onKlar?.({ ramaIn, hamtaVy: nuVy, flygTill: startaFlyg, flyger: () => !!s.current.flygning, rensaMatning: () => s.current.rensaMatning?.(), skarmdump });

    /* ---------- Loop ---------- */
    let forra = performance.now();
    renderer.setAnimationLoop((t) => {
      const dt = Math.min(0.05, Math.max(0, (t - forra) / 1000));
      forra = t;
      if (!synlig) return;
      if (s.current.flygning) stegaFlyg(performance.now());
      if (senaste.current.lage === "ga") {
        const d = forflyttning(ga.yaw, { ...ga.avsikt, framAxel: ga.joy.fram, sidAxel: ga.joy.sid }, dt);
        if (d.x || d.y || d.z) {
          ga.pos = steg(ga.pos, d, (senaste.current.objekt || []).filter(arVolym));
          smutsig = true;
        }
        if (smutsig) {
          camera.position.set(ga.pos.x, ga.pos.y, ga.pos.z);
          camera.rotation.set(ga.pitch, ga.yaw, 0, "YXZ");
        }
      } else if (controls.update()) {
        smutsig = true;
      }
      if (!smutsig) return;
      smutsig = false;
      renderer.render(scene, camera);
      etiketter.render(scene, camera);
      // Norrpilen: gåläget tittar mot position + framåt, orbit mot målpunkten.
      const nal = kompass.current;
      if (nal) {
        const ga2 = senaste.current.lage === "ga";
        const mal = ga2 ? { x: ga.pos.x - Math.sin(ga.yaw), z: ga.pos.z - Math.cos(ga.yaw) } : controls.target;
        const v = Math.round(kompassVinkel(camera.position, mal) * 10) / 10;
        if (nal.dataset.vinkel !== String(v)) {
          nal.dataset.vinkel = String(v);
          nal.setAttribute("transform", `rotate(${v})`);
        }
      }
    });

    return () => {
      senaste.current.onKlar?.(null);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      c.removeEventListener("pointerdown", ned);
      c.removeEventListener("pointermove", rorelse);
      c.removeEventListener("pointerup", upp);
      c.removeEventListener("pointercancel", upp);
      c.removeEventListener("pointerleave", lamna);
      document.removeEventListener("mousemove", mus);
      window.removeEventListener("keydown", tangentNed);
      window.removeEventListener("keyup", tangentUpp);
      window.removeEventListener("blur", tappa);
      if (document.pointerLockElement === c) document.exitPointerLock?.();
      controls.dispose();
      matGod.dispose();
      matFel.dispose();
      frigor(scene);
      renderer.dispose();
      c.remove();
      etiketter.domElement.remove();
      s.current = {};
    };
    // Scenen byggs en gång; props läses via `senaste`. `pek` ändras aldrig.
  }, [pek]);

  /* ---------- Flyg på begäran ---------- */
  useEffect(() => {
    if (flyg?.viewpoint) s.current.startaFlyg?.(flyg.viewpoint);
  }, [flyg?.tid]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Sektionslåda ---------- */
  useEffect(() => {
    const { renderer, sektionLinjer, markera } = s.current;
    if (!renderer) return;
    const plan = klippPlan(sektion);
    renderer.clippingPlanes = plan.map((p) => new THREE.Plane(new THREE.Vector3(...p.normal), p.konstant));
    if (sektion?.aktiv) {
      const { min, max } = sektion;
      sektionLinjer.scale.set(Math.max(0.001, max.x - min.x), Math.max(0.001, max.y - min.y), Math.max(0.001, max.z - min.z));
      sektionLinjer.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    }
    sektionLinjer.visible = !!sektion?.aktiv;
    markera?.();
  }, [sektion]);

  /* ---------- Mätläge av: rensa mätningen ---------- */
  useEffect(() => {
    if (!matning) s.current.rensaMatning?.();
  }, [matning]);

  /* ---------- Objekten ---------- */
  useEffect(() => {
    const { objektGrupp, meshar } = s.current;
    if (!objektGrupp) return;
    for (const barn of [...objektGrupp.children]) {
      barn.traverse((o) => {
        if (o.isCSS2DObject) o.element.remove();
      });
      objektGrupp.remove(barn);
      frigor(barn);
    }
    meshar.clear();
    const kant = farg("--one-djup");
    const markering = farg("--orange");
    const vit = new THREE.Color(1, 1, 1);
    const markeraId = (id) => senaste.current.onValj?.(id);

    for (const o of objekt) {
      const g = new THREE.Group();
      g.userData.id = o.id;
      g.position.set(o.x || 0, 0, o.z || 0);
      if (arNal(o)) {
        const pinne = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), new THREE.MeshStandardMaterial({ color: farg("--morkgra") }));
        pinne.position.y = 1.3;
        const topp = new THREE.Mesh(new THREE.SphereGeometry(o.id === valtId ? 0.5 : 0.38, 20, 14), new THREE.MeshStandardMaterial({ color: markering, roughness: 0.5 }));
        topp.position.y = 2.75;
        pinne.castShadow = topp.castShadow = true;
        g.add(pinne, topp);
        const p = (punkter || []).find((x) => x.id === o.punktId);
        const l = etikett(p ? kortTitel(p.titel) : "Punkt saknas", "nal");
        l.position.y = 3.5;
        g.add(l);
      } else {
        g.rotation.y = rad(o.rotation);
        const geo = new THREE.BoxGeometry(o.bredd, o.hojd, o.djup);
        // Jämförelse: tillagt och modifierat färgas efter diffen, resten behåller sin typfärg.
        const ds = diff?.status?.get(o.id);
        /* Hög kvalitet: container och skid får textur, med typfärgen inblandad så att tonen följer
           designsystemet. En jämförelse (diff) vinner — då gäller bara diffens färg. */
        const del = o.typ === "container" ? "container" : o.typ === "skid" ? "skid" : "";
        const tex = !ds && texturer ? texturer[del] : null;
        // Ett genererat foto får bara en aning typfärg; en ritad textur mer, så att typen syns.
        const ton = texturer?.kalla?.[del] === "genererad" ? 0.12 : 0.45;
        const material = tex
          ? new THREE.MeshStandardMaterial({ map: tex, color: vit.clone().lerp(farg(TYPFARG[o.typ]), ton), roughness: 0.6, metalness: 0.2 })
          : new THREE.MeshStandardMaterial({ color: farg(ds ? DIFF_FARG[ds] : TYPFARG[o.typ]), roughness: 0.75, metalness: 0.05 });
        /* Med en 3D-modell (Hög kvalitet) blir lådan osynlig men ligger kvar: den är det som
           träffas vid klick och dragning och det som gången krockar mot. Kanten syns bara när
           objektet är markerat. */
        const modell = !ds && texturer?.modeller?.[o.typ];
        /* Hägnad: stängselnät (genomsiktligt) och stolpar var tredje meter. Lådan
           ligger kvar för klick, dragning och gångens kollision. */
        const nat = o.typ === "hagnad" && !ds ? stangselTextur(o.bredd, o.hojd) : null;
        if (nat) {
          material.map = nat;
          material.color = farg(TYPFARG.hagnad);
          // Genomskinligt utan alfa-test: på avstånd blir nätet en tunn slöja i stället för att försvinna.
          material.transparent = true;
          material.opacity = 0.9;
          material.depthWrite = false;
          material.side = THREE.DoubleSide;
          material.roughness = 0.6;
          material.metalness = 0.5;
          const n = Math.max(1, Math.round((Number(o.bredd) || 0) / 3));
          const stolpe = new THREE.CylinderGeometry(0.04, 0.04, o.hojd, 6);
          const stolpMat = new THREE.MeshStandardMaterial({ color: farg("--morkgra"), roughness: 0.5, metalness: 0.6 });
          for (let k = 0; k <= n; k++) {
            const st = new THREE.Mesh(k ? stolpe.clone() : stolpe, k ? stolpMat.clone() : stolpMat);
            st.position.set(-o.bredd / 2 + (o.bredd * k) / n, o.hojd / 2, 0);
            st.castShadow = true;
            g.add(st);
          }
        }
        if (modell) {
          material.transparent = true;
          material.opacity = 0;
          material.depthWrite = false;
        }
        const lada = new THREE.Mesh(geo, material);
        lada.position.y = o.hojd / 2;
        lada.castShadow = !modell;
        lada.receiveShadow = !modell && !nat;
        const linjer = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: o.id === valtId ? markering : kant }));
        linjer.position.y = o.hojd / 2;
        linjer.visible = (!modell && !nat) || o.id === valtId;
        g.add(lada, linjer);
        // Batterierna fylls ut till profilens mått (datablad); skiden behåller modellens proportioner.
        const anpassa = o.typ === "container";
        if (modell) g.add(modellFor(modell, o, { anpassa }));
        // Etiketten svävar över det som syns: modellens höjd när den används, annars lådans.
        const etikettY = (modell && !anpassa ? modell.userData.matt.y * ((Number(o.bredd) || 1) / (modell.userData.matt.x || 1)) : o.hojd) + 0.8;
        const antalArenden = arenden?.get(o.id) || 0;
        if (o.id === valtId) {
          const delar = [o.namn];
          if (o.soc !== undefined && o.soc !== null && o.soc !== "") delar.push(`${Math.round(Number(o.soc))} %`);
          if (antalArenden) delar.push(`ÄTA ${antalArenden}`);
          const l = etikett(delar.join(" · "), "valt");
          l.position.y = etikettY;
          g.add(l);
        } else if (lager?.markning) {
          // Märkning: klickbar namnetikett på varje enhet, med ÄTA-antal när det finns.
          const l = etikett([o.namn, antalArenden ? `ÄTA ${antalArenden}` : ""].filter(Boolean).join(" · "), antalArenden ? "nal" : "", () => markeraId(o.id));
          l.position.y = etikettY;
          g.add(l);
        } else if (antalArenden) {
          const l = etikett(`ÄTA ${antalArenden}`, "nal");
          l.position.y = etikettY;
          g.add(l);
        }
      }
      objektGrupp.add(g);
      meshar.set(o.id, g);
    }
    /* Borttaget i jämförelsen: rött genomskinligt spöke på den gamla platsen. Inget id — går inte att välja. */
    for (const o of diff?.borttagna || []) {
      if (arNal(o)) continue;
      const g = new THREE.Group();
      g.position.set(o.x || 0, 0, o.z || 0);
      g.rotation.y = rad(o.rotation);
      const geo = new THREE.BoxGeometry(o.bredd, o.hojd, o.djup);
      const rod = farg(DIFF_FARG.borttagen);
      const lada = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: rod, transparent: true, opacity: 0.35, depthWrite: false }));
      lada.position.y = o.hojd / 2;
      lada.userData.spok = true;
      const linjer = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: rod }));
      linjer.position.y = o.hojd / 2;
      g.add(lada, linjer);
      objektGrupp.add(g);
    }
    s.current.markera?.();
  }, [objekt, valtId, punkter, diff, arenden, lager?.markning, texturer]);

  /* ---------- Kabellager ----------
     Schematiska vägar ur lib/siteLager.js som tunna band på marken, ett lager i taget och med
     olika höjd så att de inte flimrar i varandra. Byggs om när objekten eller filtren ändras. */
  useEffect(() => {
    const { kabelGrupp, markera } = s.current;
    if (!kabelGrupp) return;
    for (const barn of [...kabelGrupp.children]) {
      kabelGrupp.remove(barn);
      frigor(barn);
    }
    const vagar = kabelvagar(objekt || []);
    LAGER.filter((l) => l.id !== "markning" && lager?.[l.id]).forEach((l, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: farg(l.farg), depthWrite: false, ...djupLager(4 + i) });
      const y = 0.09 + i * 0.015;
      const bredd = l.id === "hsp" ? 0.32 : l.id === "jord" ? 0.18 : 0.22;
      const g = new THREE.Group();
      g.userData.lager = l.id;
      for (const linje of vagar[l.id] || []) {
        for (let k = 1; k < linje.length; k++) {
          const [x0, z0] = linje[k - 1];
          const [x1, z1] = linje[k];
          const langd = Math.hypot(x1 - x0, z1 - z0);
          if (langd < 0.01) continue;
          const band = new THREE.Mesh(new THREE.PlaneGeometry(langd + bredd, bredd), mat);
          band.rotation.x = -Math.PI / 2;
          band.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
          band.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
          band.renderOrder = 3;
          g.add(band);
        }
      }
      kabelGrupp.add(g);
    });
    markera?.();
  }, [objekt, lager]);

  /* ---------- Hög kvalitet: texturer och himmel ----------
     Laddas när växeln slås på eller profilen byts. Av: enfärgad mark och ingen himmel. */
  useEffect(() => {
    let avbruten = false;
    let laddade = null;
    if (!hogKvalitet) return undefined;
    laddaTexturer(profil, undefined, { ritad: true }).then((t) => {
      if (avbruten) {
        frigorTexturer(t);
        return;
      }
      laddade = t;
      setTexturer(t);
    });
    return () => {
      avbruten = true;
      if (laddade) frigorTexturer(laddade);
    };
  }, [hogKvalitet, profil]);

  useEffect(() => {
    const { scene, mark, grus, markera } = s.current;
    if (!scene) return;
    scene.background = texturer?.himmel || farg("--himmel");
    scene.fog = new THREE.Fog(farg("--himmel"), Math.max(TOMT.bredd, TOMT.djup) * 3, 2400);
    /* Gruset inne på tomten får samma bild som marken, med samma kornstorlek: marken är 500 m
       med texturen upprepad 60 gånger, så tomten upprepar den i proportion till sina mått.
       Utan det blir kornen så små att ytan ser grå ut. */
    let tomtGrus = null;
    if (texturer?.mark) {
      const meterPerRuta = 500 / (texturer.mark.repeat.x || 1);
      tomtGrus = texturer.mark.clone();
      tomtGrus.repeat.set(TOMT.bredd / meterPerRuta, TOMT.djup / meterPerRuta);
      tomtGrus.needsUpdate = true;
    }
    for (const yta of [mark, grus]) {
      if (!yta) continue;
      const tex = yta === mark ? texturer?.mark : tomtGrus;
      yta.material.map = tex || null;
      // Tomten något ljusare än marken utanför, så att gränsen syns.
      yta.material.color = tex ? new THREE.Color(1, 1, 1).lerp(farg(yta === mark ? "--web2" : "--ink-faint"), yta === mark ? 0.35 : 0.12) : farg(yta === mark ? "--web2" : "--ink-faint");
      yta.material.needsUpdate = true;
    }
    markera?.();
    return () => tomtGrus?.dispose();
  }, [texturer]);

  /* ---------- IFC-modeller ----------
     En grupp per modell, en Mesh per del och färg, med GlobalId på varje mesh så att
     träff, markering och ärenden pratar om samma objekt. Modellen är redan centrerad
     och i meter (lib/ifcLaddare.js). Byggs bara om när modellerna byts. */
  useEffect(() => {
    const { ifcGrupp, markera } = s.current;
    if (!ifcGrupp) return;
    for (const barn of [...ifcGrupp.children]) {
      ifcGrupp.remove(barn);
      frigor(barn);
    }
    for (const m of ifcModeller || []) {
      if (!m.geometri) continue;
      const grupp = new THREE.Group();
      grupp.userData.modellId = m.id;
      const material = new Map();
      for (const o of m.geometri) {
        const guid = m.guidPerEid?.[o.eid];
        if (!guid) continue;
        for (const del of o.delar) {
          const [r, g, b, a] = del.farg;
          const nyckel = [r, g, b, a].map((v) => Math.round(v * 255)).join(",");
          let mat = material.get(nyckel);
          if (!mat) {
            mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide, transparent: a < 1, opacity: a, depthWrite: a >= 1 });
            material.set(nyckel, mat);
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(del.pos, 3));
          geo.setAttribute("normal", new THREE.BufferAttribute(del.nor, 3));
          geo.setIndex(new THREE.BufferAttribute(del.idx, 1));
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = a >= 1;
          mesh.receiveShadow = true;
          mesh.userData.id = guid;
          mesh.userData.mat = mat;
          grupp.add(mesh);
        }
      }
      ifcGrupp.add(grupp);
    }
    markera?.();
  }, [ifcModeller]);

  /* Markerat IFC-objekt: orange material och en etikett. Ändrar bara materialet, bygger inget om. */
  useEffect(() => {
    const { ifcGrupp, markera } = s.current;
    if (!ifcGrupp) return;
    const mark = new THREE.MeshStandardMaterial({ color: farg("--orange"), roughness: 0.5, side: THREE.DoubleSide });
    let etikettObj = null;
    ifcGrupp.traverse((o) => {
      if (o.isMesh) o.material = o.userData.id === valtId ? mark : o.userData.mat;
    });
    const valt = ifcObjekt?.get(valtId);
    if (valt) {
      const antalArenden = arenden?.get(valtId) || 0;
      etikettObj = etikett([valt.namn, antalArenden ? `ÄTA ${antalArenden}` : ""].filter(Boolean).join(" · "));
      etikettObj.position.set((valt.bb[0] + valt.bb[3]) / 2, valt.bb[4] + 0.8, (valt.bb[2] + valt.bb[5]) / 2);
      ifcGrupp.add(etikettObj);
    }
    markera?.();
    return () => {
      mark.dispose();
      if (etikettObj) {
        etikettObj.element.remove();
        ifcGrupp.remove(etikettObj);
      }
    };
  }, [valtId, ifcModeller, ifcObjekt, arenden]);

  /* ---------- Rutnät och spöke följer props ---------- */
  useEffect(() => {
    const { rutnatLinjer, uppdateraSpok, markera } = s.current;
    if (!rutnatLinjer) return;
    rutnatLinjer.visible = rutnat;
    uppdateraSpok?.();
    markera?.();
  }, [rutnat, laddad, spokRot, objekt, lage]);

  /* ---------- Situationsplanen som marktextur ---------- */
  useEffect(() => {
    const { planGrupp, tomt } = s.current;
    if (!planGrupp) return undefined;
    for (const barn of [...planGrupp.children]) {
      planGrupp.remove(barn);
      frigor(barn);
    }
    tomt.visible = !plan;
    s.current.markera?.();
    if (!plan) return undefined;
    let avbruten = false;
    new THREE.TextureLoader().load(plan.bild, (tex) => {
      if (avbruten) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = s.current.renderer?.capabilities.getMaxAnisotropy?.() || 1;
      const { bredd, djup } = planMatt(plan);
      const yta = new THREE.Mesh(new THREE.PlaneGeometry(bredd, djup), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, ...djupLager(3) }));
      yta.rotation.x = -Math.PI / 2;
      yta.receiveShadow = true;
      const g = new THREE.Group();
      g.position.y = 0.03;
      // Bildens norrpil lutar `norr` grader medurs — vrid moturs så att norr blir −Z.
      g.rotation.y = rad(plan.norr);
      g.add(yta);
      planGrupp.add(g);
      s.current.markera?.();
    });
    return () => {
      avbruten = true;
    };
  }, [plan]);

  /* ---------- Ritningar på marken ----------
     En plan per synlig ritning, i meter, centrerad på (x, z) och vriden `rotation` grader
     medurs sett uppifrån. Texturen skapas en gång per canvas och återanvänds när bara
     placeringen ändras; den frigörs när ritningen försvinner. */
  useEffect(() => {
    const { ritGrupp, ritTexturer, renderer } = s.current;
    if (!ritGrupp) return;
    for (const barn of [...ritGrupp.children]) {
      ritGrupp.remove(barn);
      barn.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
    const kvar = new Set();
    for (const [k, r] of (ritningar || []).entries()) {
      if (!r.canvas) continue;
      kvar.add(r.canvas);
      let tex = ritTexturer.get(r.canvas);
      if (!tex) {
        tex = new THREE.CanvasTexture(r.canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
        ritTexturer.set(r.canvas, tex);
      }
      if (!r.synlig) continue;
      const yta = new THREE.Mesh(
        new THREE.PlaneGeometry(r.bredd, r.djup),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: r.opacitet ?? 0.85, depthWrite: false, ...djupLager(4 + k) })
      );
      yta.rotation.x = -Math.PI / 2;
      yta.userData.ritning = r.id;
      const g = new THREE.Group();
      g.position.set(Number(r.x) || 0, 0.04 + k * 0.005, Number(r.z) || 0);
      g.rotation.y = -rad(Number(r.rotation) || 0);
      g.add(yta);
      ritGrupp.add(g);
    }
    for (const [canvas, tex] of ritTexturer) {
      if (!kvar.has(canvas)) {
        tex.dispose();
        ritTexturer.delete(canvas);
      }
    }
    s.current.markera?.();
  }, [ritningar]);

  /* ---------- Läge ---------- */
  useEffect(() => {
    const { controls, ga, renderer } = s.current;
    if (!controls) return;
    if (lage === "ga") {
      controls.enabled = false;
      controls.autoRotate = false;
      ga.pos = { x: INGANG.x, y: INGANG.y, z: INGANG.z };
      ga.yaw = INGANG.yaw;
      ga.pitch = INGANG.pitch;
      ga.avsikt = {};
      holder.current?.focus();
    } else {
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      controls.enabled = true;
      s.current.ramaIn?.();
    }
    s.current.markera?.();
  }, [lage]);

  useEffect(() => { s.current.storlek?.(); }, [panelBredd]);

  const hjalp =
    lage === "ga"
      ? pek
        ? "Joysticken går. Dra i bilden för att titta."
        : "Klicka i bilden för att titta med musen. W och S går, A och D åt sidan, Shift springer, Q och E upp och ner. Esc släpper musen."
      : laddad
        ? "Klicka på marken för att placera. Esc avbryter."
        : flyttaObjekt ? "Flytta: dra det markerade objektet. Stäng Flytta objekt för att rotera kameran över objektet." : "Dra för att rotera · högerdra för att panorera · scrolla för zoom · klicka för att välja";

  return (
    <div
      ref={holder}
      tabIndex={0}
      role="application"
      aria-label={lage === "ga" ? "Siten, gåläge" : "Siten, orbit"}
      aria-describedby="site-hjalp"
      className="relative h-[62vh] max-h-[720px] min-h-[360px] w-full overflow-hidden rounded-lg bg-sunken outline-none focus-visible:ring-2 focus-visible:ring-one-bla"
      data-lage={lage}
    >
      <p
        id="site-hjalp"
        className="pointer-events-none absolute left-3 top-3 z-[2] m-0 max-w-[min(520px,calc(100%-170px))] rounded-lg border border-solid border-hairline bg-surface px-2.5 py-1.5 text-[12px] leading-snug text-ink shadow-sm"
      >
        {hjalp}
      </p>
      <div
        data-roll="norrpil"
        title="Norr"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 z-[2] grid h-10 w-10 place-items-center rounded-full border border-solid border-hairline bg-surface text-ink shadow-sm"
      >
        <svg width="30" height="30" viewBox="-15 -15 30 30">
          <g ref={kompass} transform="rotate(0)">
            <path d="M0-11 L5 5 L0 2 L-5 5Z" fill="currentColor" />
          </g>
          <circle r="13" fill="none" stroke="currentColor" strokeOpacity=".25" />
        </svg>
      </div>
      {lage === "ga" ? (
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-one-djup" />
      ) : null}
      {lage === "ga" && pek ? (
        <Joystick
          onAxel={(a) => {
            if (s.current.ga) s.current.ga.joy = a;
          }}
        />
      ) : null}
    </div>
  );
}

