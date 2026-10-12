import { describe, expect, it } from "vitest";
import { MALLAR, TOMT } from "./site.js";
import {
  FOV,
  SEKTION_STANDARD,
  arKopplad,
  arendenFor,
  arendenPerObjekt,
  avstand,
  boundingBoxFor,
  boxCentrum,
  boxFel,
  boxRadie,
  byggKoppling,
  easeInOutCubic,
  flygBana,
  flygTid,
  klippPlan,
  klippSektion,
  kopplingFel,
  punktSynlig,
  viewpointFel,
  viewpointForBox,
} from "./modellKoppling.js";

const cont = (extra = {}) => ({ id: "c1", typ: "container", namn: "Container 1", x: 10, z: -5, rotation: 0, ...MALLAR.container, ...extra });

describe("boundingBoxFor()", () => {
  it("en volym får sin låda från mått och läge", () => {
    const b = boundingBoxFor(cont());
    expect(b.min).toEqual([6.95, 0, -6.25]);
    expect(b.max).toEqual([13.05, 2.9, -3.75]);
  });

  it("följer rotationen — vriden 90° byter X- och Z-mått", () => {
    const b = boundingBoxFor(cont({ rotation: 90 }));
    expect(b.max[0] - b.min[0]).toBeCloseTo(2.5, 6);
    expect(b.max[2] - b.min[2]).toBeCloseTo(6.1, 6);
  });

  it("en nål får en smal hög låda", () => {
    const b = boundingBoxFor({ id: "n", typ: "nal", x: 1, z: 2, punktId: "p" });
    expect(b.min).toEqual([0.5, 0, 1.5]);
    expect(b.max[1]).toBeGreaterThan(3);
    expect(boxFel(b)).toBeNull();
  });

  it("centrum och radie", () => {
    const b = boundingBoxFor(cont());
    expect(boxCentrum(b)).toEqual([10, 1.45, -5]);
    expect(boxRadie(b)).toBeCloseTo(Math.hypot(6.1, 2.9, 2.5) / 2, 6);
  });
});

describe("viewpointForBox()", () => {
  const b = boundingBoxFor(cont());

  it("tittar mot lådans centrum", () => {
    expect(viewpointForBox(b).target).toEqual(boxCentrum(b));
  });

  it("står tillräckligt långt bort för att hela lådan ryms i synfältet", () => {
    const v = viewpointForBox(b);
    const dist = Math.hypot(...v.cameraPosition.map((p, i) => p - v.target[i]));
    // Lådans omskrivna sfär ska rymmas: avstånd · sin(fov/2) ≥ radie.
    expect(dist * Math.sin((v.fov * Math.PI) / 360)).toBeGreaterThanOrEqual(boxRadie(b));
  });

  it("en större låda ger större avstånd, och minavståndet gäller för små", () => {
    const stor = viewpointForBox({ min: [-20, 0, -10], max: [20, 5, 10] });
    const liten = viewpointForBox({ min: [0, 0, 0], max: [0.2, 0.2, 0.2] });
    const d = (v) => Math.hypot(...v.cameraPosition.map((p, i) => p - v.target[i]));
    expect(d(stor)).toBeGreaterThan(d(viewpointForBox(b)));
    expect(d(liten)).toBeGreaterThanOrEqual(5.99);
  });

  it("ger en giltig viewpoint", () => {
    expect(viewpointFel(viewpointForBox(b))).toBeNull();
    expect(viewpointForBox(b).fov).toBe(FOV);
  });
});

describe("validering", () => {
  it("viewpoint måste ha tre tal i position och mål, och ett rimligt synfält", () => {
    const ok = { cameraPosition: [1, 2, 3], target: [0, 0, 0], fov: 55 };
    expect(viewpointFel(ok)).toBeNull();
    expect(viewpointFel(null)).toMatch(/saknas/);
    expect(viewpointFel({ ...ok, cameraPosition: [1, 2] })).toMatch(/position/);
    expect(viewpointFel({ ...ok, target: [0, 0, Number.NaN] })).toMatch(/mål/);
    expect(viewpointFel({ ...ok, fov: 5 })).toMatch(/Synfältet/);
    expect(viewpointFel({ ...ok, fov: 200 })).toMatch(/Synfältet/);
  });

  it("boundingBox måste ha min ≤ max på varje axel", () => {
    expect(boxFel({ min: [0, 0, 0], max: [1, 1, 1] })).toBeNull();
    expect(boxFel({ min: [2, 0, 0], max: [1, 1, 1] })).toMatch(/min/);
    expect(boxFel({ min: [0, 0], max: [1, 1, 1] })).toMatch(/tre tal/);
  });

  it("kopplingen kräver objectGuid, och viewpoint/boundingBox måste vara hela om de ges", () => {
    const ok = byggKoppling(cont(), { modelVersionId: "v1" });
    expect(kopplingFel(ok)).toBeNull();
    expect(kopplingFel({ ...ok, objectGuid: "" })).toMatch(/objectGuid/);
    expect(kopplingFel({ objectGuid: "x" })).toBeNull();
    expect(kopplingFel({ ...ok, viewpoint: { fov: 55 } })).toMatch(/position/);
    expect(kopplingFel({ ...ok, boundingBox: { min: [1, 1, 1], max: [0, 0, 0] } })).toMatch(/min/);
    expect(kopplingFel({ ...ok, modelVersionId: 5 })).toMatch(/text/);
  });

  it("byggKoppling använder objektets id som GUID och räknar fram vy och låda", () => {
    const k = byggKoppling(cont());
    expect(k.objectGuid).toBe("c1");
    expect(k.modelVersionId).toBe("");
    expect(k.boundingBox).toEqual(boundingBoxFor(cont()));
    expect(k.viewpoint.target).toEqual(boxCentrum(k.boundingBox));
    // En egen vy, om den är giltig, behålls — annars räknas en ny fram.
    const egen = { cameraPosition: [0, 5, 5], target: [0, 0, 0], fov: 40 };
    expect(byggKoppling(cont(), { viewpoint: egen }).viewpoint).toEqual(egen);
    expect(byggKoppling(cont(), { viewpoint: { fov: 1 } }).viewpoint.fov).toBe(FOV);
  });
});

describe("ärenden mot objekt", () => {
  const rader = [
    { id: "u1", projektId: "p1", objectGuid: "c1" },
    { id: "u2", projektId: "p1", objectGuid: "c2" },
    { id: "u3", projektId: "p1" },
    { id: "u4", projektId: "p2", objectGuid: "c1" },
    { id: "u5", projektId: "p1", objectGuid: "c1" },
  ];

  it("filtrerar på projekt och på objekt-GUID", () => {
    expect(arendenFor(rader, "p1").map((u) => u.id)).toEqual(["u1", "u2", "u3", "u5"]);
    expect(arendenFor(rader, "p1", "c1").map((u) => u.id)).toEqual(["u1", "u5"]);
    expect(arendenFor(rader, "p1", "finns-inte")).toEqual([]);
    expect(arendenFor(undefined, "p1")).toEqual([]);
  });

  it("räknar kopplade ärenden per objekt, bara i projektet", () => {
    const m = arendenPerObjekt(rader, "p1");
    expect(m.get("c1")).toBe(2);
    expect(m.get("c2")).toBe(1);
    expect(m.size).toBe(2);
    expect(arKopplad(rader[2])).toBe(false);
    expect(arKopplad(rader[0])).toBe(true);
  });
});

describe("kameraflygning", () => {
  const a = { cameraPosition: [0, 10, 20], target: [0, 0, 0], fov: 55 };
  const b = { cameraPosition: [10, 5, -4], target: [10, 1, -5], fov: 40 };

  it("börjar i början och slutar i slutet", () => {
    expect(flygBana(a, b, 0)).toEqual(a);
    const slut = flygBana(a, b, 1);
    slut.cameraPosition.forEach((v, i) => expect(v).toBeCloseTo(b.cameraPosition[i], 9));
    expect(slut.fov).toBeCloseTo(40, 9);
  });

  it("mjuk start och stopp: långsam i ändarna, snabb i mitten, och t klipps till 0–1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 9);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
    expect(flygBana(a, b, -3)).toEqual(a);
    expect(flygBana(a, b, 7).fov).toBeCloseTo(40, 9);
    expect(flygBana(a, b, Number.NaN)).toEqual(a);
  });

  it("är monoton på vägen — avståndet till målet minskar aldrig", () => {
    let forra = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const p = flygBana(a, b, t).cameraPosition;
      const d = Math.hypot(...p.map((v, i) => v - b.cameraPosition[i]));
      expect(d).toBeLessThanOrEqual(forra + 1e-9);
      forra = d;
    }
  });

  it("flygtiden är mellan 450 och 1400 ms och växer med avståndet", () => {
    expect(flygTid(a, a)).toBe(450);
    expect(flygTid(a, b)).toBeGreaterThan(450);
    expect(flygTid(a, { ...b, cameraPosition: [900, 0, 900] })).toBe(1400);
  });
});

describe("sektionslåda (clipping planes)", () => {
  it("är av från början och ger då inga plan", () => {
    expect(SEKTION_STANDARD.aktiv).toBe(false);
    expect(klippPlan(SEKTION_STANDARD)).toEqual([]);
    expect(SEKTION_STANDARD.max.x).toBe(TOMT.bredd / 2);
  });

  it("aktiv ger sex plan, och det innanför lådan syns", () => {
    const s = { aktiv: true, min: { x: -5, y: 0, z: -5 }, max: { x: 5, y: 4, z: 5 } };
    expect(klippPlan(s)).toHaveLength(6);
    expect(punktSynlig(s, [0, 1, 0])).toBe(true);
    expect(punktSynlig(s, [5, 4, 5])).toBe(true); // på kanten
  });

  it("det utanför klipps bort, per axel och riktning", () => {
    const s = { aktiv: true, min: { x: -5, y: 0, z: -5 }, max: { x: 5, y: 4, z: 5 } };
    expect(punktSynlig(s, [6, 1, 0])).toBe(false);
    expect(punktSynlig(s, [-6, 1, 0])).toBe(false);
    expect(punktSynlig(s, [0, 5, 0])).toBe(false);
    expect(punktSynlig(s, [0, -1, 0])).toBe(false);
    expect(punktSynlig(s, [0, 1, 6])).toBe(false);
    expect(punktSynlig(s, [0, 1, -6])).toBe(false);
  });

  it("av betyder att allt syns", () => {
    expect(punktSynlig({ ...SEKTION_STANDARD, aktiv: false }, [999, 999, 999])).toBe(true);
  });

  it("en slider som dras förbi sin motsats byter plats i stället för att vända lådan ut och in", () => {
    const k = klippSektion({ aktiv: true, min: { x: 8, y: 0, z: 0 }, max: { x: 2, y: 3, z: 1 } });
    expect(k.min.x).toBe(2);
    expect(k.max.x).toBe(8);
    expect(punktSynlig({ aktiv: true, min: { x: 8, y: 0, z: 0 }, max: { x: 2, y: 3, z: 1 } }, [5, 1, 0.5])).toBe(true);
  });

  it("ändrar inte sin indata", () => {
    const s = { aktiv: true, min: { x: 8, y: 0, z: 0 }, max: { x: 2, y: 3, z: 1 } };
    const kopia = JSON.stringify(s);
    klippPlan(s);
    expect(JSON.stringify(s)).toBe(kopia);
  });
});

describe("kryssmätning", () => {
  it("rakt avstånd, horisontellt och per axel", () => {
    const d = avstand([0, 0, 0], [3, 4, 0]);
    expect(d.total).toBe(5);
    expect(d.horisontell).toBe(3);
    expect(d.dy).toBe(4);
    const e = avstand([1, 1, 1], [4, 5, 13]);
    expect(e.total).toBeCloseTo(Math.hypot(3, 4, 12), 9);
    expect(e.horisontell).toBeCloseTo(Math.hypot(3, 12), 9);
  });

  it("är symmetriskt och noll mellan samma punkt", () => {
    const a = [1, 2, 3];
    const b = [-4, 0, 9];
    expect(avstand(a, b).total).toBeCloseTo(avstand(b, a).total, 12);
    expect(avstand(a, a).total).toBe(0);
  });
});
