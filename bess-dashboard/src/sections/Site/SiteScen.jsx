import { useEffect, useRef, useState } from "react";
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
  planMatt,
  provaPlacering,
  steg,
  titta,
} from "../../lib/site.js";

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

   Färgerna läses ur designsystemets CSS-variabler när scenen byggs — inga
   egna hex-värden. */

const ORBITLAGE = [46, 40, 58];
const rad = (g) => ((Number(g) || 0) * Math.PI) / 180;

function farg(variabel) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variabel).trim();
  return v ? new THREE.Color(v) : new THREE.Color(0.55, 0.6, 0.62);
}

function frigor(rot) {
  rot.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) {
      x.map?.dispose?.();
      x.dispose?.();
    }
  });
}

/** Plana ytor på varandra (mark, grus, väg, plan) — djupförskjutning i
 *  stället för höjd, annars flimrar de i varandra på avstånd. */
const lager = (n) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 4 });

const kortTitel = (t) => (String(t).length > 42 ? String(t).slice(0, 39) + "…" : String(t));

function etikett(text, ton = "") {
  const el = document.createElement("div");
  el.className = `pointer-events-none whitespace-nowrap rounded-md border border-solid px-1.5 py-0.5 font-body text-[11px] font-semibold shadow-sm ${
    ton === "nal" ? "border-orange bg-surface text-ink" : "border-hairline bg-surface text-ink"
  }`;
  el.textContent = text;
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

export default function SiteScen({ objekt, punkter, plan, valtId, laddad, lage, rutnat = true, spokRot = 0, onPlacera, onValj, onFlytta, onFel }) {
  const holder = useRef(null);
  const s = useRef({});
  const senaste = useRef({});
  const [pek] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);

  // Senaste props för händelser som registreras en gång.
  useEffect(() => {
    senaste.current = { objekt, valtId, laddad, lage, rutnat, spokRot, onPlacera, onValj, onFlytta, onFel };
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "block h-full w-full touch-none";
    el.appendChild(renderer.domElement);

    const etiketter = new CSS2DRenderer();
    etiketter.domElement.className = "pointer-events-none absolute inset-0";
    el.appendChild(etiketter.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 1200);
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
    controls.maxDistance = 220;
    const lugn = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = !lugn && !programvara;
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

    scene.add(new THREE.HemisphereLight(new THREE.Color(1, 1, 1), farg("--web2"), 1.8));
    const sol = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 2.2);
    sol.position.set(-40, 70, 30);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
    scene.add(sol);

    // Marken runt tomten, tomtens grus och körytor.
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: farg("--web2"), roughness: 1 }));
    mark.rotation.x = -Math.PI / 2;
    mark.receiveShadow = true;
    scene.add(mark);

    const tomt = new THREE.Group();
    const grus = new THREE.Mesh(
      new THREE.PlaneGeometry(TOMT.bredd, TOMT.djup),
      new THREE.MeshStandardMaterial({ color: farg("--ink-faint"), roughness: 1, ...lager(1) })
    );
    grus.rotation.x = -Math.PI / 2;
    grus.position.y = 0.01;
    grus.receiveShadow = true;
    tomt.add(grus);
    for (const k of KORYTOR) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(k.bredd, k.djup), new THREE.MeshStandardMaterial({ color: farg("--morkgra"), roughness: 0.9, ...lager(2) }));
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
    // Spökobjektet visas medan en mall är vald; färgen säger om platsen är fri.
    const spok = new THREE.Group();
    spok.visible = false;
    spok.renderOrder = 5;
    scene.add(spok);
    const planGrupp = new THREE.Group();
    scene.add(planGrupp);

    const storlek = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      etiketter.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
    s.current = { renderer, etiketter, scene, camera, controls, objektGrupp, planGrupp, tomt, ga, meshar: new Map(), markera, rutnatLinjer, spok, spokPunkt: null };

    /* ---------- Pekare: välja, placera, dra, titta ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const markplan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const straale = (e) => {
      const b = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const traffadId = () => {
      for (const h of ray.intersectObjects(objektGrupp.children, true)) {
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

    /* Spöket: räkna ut var det hamnar för senaste musposition och rita det.
       Anropas vid musrörelse och när mall, rotation eller objekt ändras. */
    const matGod = new THREE.MeshStandardMaterial({ color: farg("--turkos"), transparent: true, opacity: 0.6, depthWrite: false });
    const matFel = new THREE.MeshStandardMaterial({ color: farg("--rod"), transparent: true, opacity: 0.6, depthWrite: false });
    let spokTyp = null;
    let spokDim = "";
    const uppdateraSpok = () => {
      const p = senaste.current;
      const q = s.current.spokPunkt;
      const mall = p.laddad && p.laddad !== "nal" ? MALLAR[p.laddad] : null;
      if (!mall || !q || p.lage === "ga") {
        if (spok.visible) {
          spok.visible = false;
          smutsig = true;
        }
        return;
      }
      const rot = p.spokRot || 0;
      const ob = { typ: p.laddad, bredd: mall.bredd, djup: mall.djup, hojd: mall.hojd, rotation: rot };
      const res = provaPlacering(ob, q, p.objekt || [], { rutnat: p.rutnat === false ? 0 : RUTNAT });
      const dim = `${p.laddad}`;
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
      if (id && id === p.valtId) {
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
        ? provaPlacering(o, mal, senaste.current.objekt || [], { ignorera: o.id, rutnat: senaste.current.rutnat === false ? 0 : RUTNAT })
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

    /* ---------- Loop ---------- */
    let forra = performance.now();
    renderer.setAnimationLoop((t) => {
      const dt = Math.min(0.05, Math.max(0, (t - forra) / 1000));
      forra = t;
      if (!synlig) return;
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
    });

    return () => {
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
        const lada = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: farg(TYPFARG[o.typ]), roughness: 0.75, metalness: 0.05 }));
        lada.position.y = o.hojd / 2;
        lada.castShadow = true;
        lada.receiveShadow = true;
        const linjer = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: o.id === valtId ? markering : kant }));
        linjer.position.y = o.hojd / 2;
        g.add(lada, linjer);
        if (o.id === valtId) {
          const l = etikett(o.soc !== undefined && o.soc !== null && o.soc !== "" ? `${o.namn} · ${Math.round(Number(o.soc))} %` : o.namn);
          l.position.y = o.hojd + 0.8;
          g.add(l);
        }
      }
      objektGrupp.add(g);
      meshar.set(o.id, g);
    }
    s.current.markera?.();
  }, [objekt, valtId, punkter]);

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
      const yta = new THREE.Mesh(new THREE.PlaneGeometry(bredd, djup), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, ...lager(3) }));
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

  /* ---------- Läge ---------- */
  useEffect(() => {
    const { controls, camera, ga, renderer } = s.current;
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
      camera.position.set(...ORBITLAGE);
      controls.target.set(0, 0, 0);
      controls.enabled = true;
      camera.lookAt(0, 0, 0);
    }
    s.current.markera?.();
  }, [lage]);

  const hjalp =
    lage === "ga"
      ? pek
        ? "Joysticken går. Dra i bilden för att titta."
        : "Klicka i bilden för att titta med musen. W och S går, A och D åt sidan, Shift springer, Q och E upp och ner. Esc släpper musen."
      : laddad
        ? "Klicka på marken för att placera. Esc avbryter."
        : "Dra för att snurra, scrolla för att zooma. Klicka på ett objekt för att markera det, dra det markerade för att flytta.";

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
        className="pointer-events-none absolute left-3 top-3 z-[2] m-0 max-w-[min(520px,calc(100%-24px))] rounded-lg border border-solid border-hairline bg-surface px-2.5 py-1.5 text-[12px] leading-snug text-ink shadow-sm"
      >
        {hjalp}
      </p>
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
