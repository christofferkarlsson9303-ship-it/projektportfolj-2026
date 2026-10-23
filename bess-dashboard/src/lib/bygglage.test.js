import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { MALLAR, nyttObjekt, siteObjekt } from "./site.js";
import { kopia, radLuft, radObjekt, radPositioner, utstrackning } from "./bygglage.js";

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const container = { typ: "container", bredd: 6.1, djup: 2.5, hojd: 2.9, rotation: 0 };

describe("utsträckning och rad", () => {
  it("följer rotationen i 90-gradersteg", () => {
    expect(utstrackning(container)).toEqual({ x: 6.1, z: 2.5 });
    expect(utstrackning({ ...container, rotation: 90 })).toEqual({ x: 2.5, z: 6.1 });
    expect(utstrackning({ ...container, rotation: 270 })).toEqual({ x: 2.5, z: 6.1 });
  });

  it("ett antal läggs sida mot sida längs kortsidan med skyddsavstånd", () => {
    const p = radPositioner(container, { x: 0, z: 0 }, { antal: 3, luft: 3 });
    expect(p).toEqual([{ x: 0, z: 0 }, { x: 0, z: 5.5 }, { x: 0, z: 11 }]);
  });

  it("en dragning väljer axel och antal ur riktningen och längden", () => {
    const p = radPositioner(container, { x: 0, z: 0 }, { slut: { x: -20, z: 2 }, luft: 1 });
    expect(p.map((q) => q.x)).toEqual([0, -7.1, -14.2]);
    expect(p.every((q) => q.z === 0)).toBe(true);
    expect(radPositioner(container, { x: 0, z: 0 }, { antal: 999 })).toHaveLength(40);
  });
});

describe("radObjekt, kopia och ångra", () => {
  it("lägger en rad, hoppar över upptagna lägen och kopierar bredvid", () => {
    let s = seed();
    const pid = "36037";
    const mall = { ...container, typ: "container" };
    const { lagda, upptagna } = radObjekt(mall, pid, radPositioner(mall, { x: 0, z: -10 }, { antal: 4, luft: 3 }), siteObjekt(s, pid), { rutnat: 0 });
    expect(lagda).toHaveLength(4);
    expect(upptagna).toBe(0);
    expect(new Set(lagda.map((o) => o.namn)).size).toBe(4);
    s = reducer(s, { type: "SITE_LAGG_TILL_FLERA", projektId: pid, rader: lagda });
    expect(siteObjekt(s, pid).filter((o) => o.typ === "container")).toHaveLength(4);
    expect(s.andringslogg[0].text).toBe(`Site: 4 × ${MALLAR.container.namn} placerade i rad`);

    // Samma rad igen: alla lägen är upptagna.
    const igen = radObjekt(mall, pid, radPositioner(mall, { x: 0, z: -10 }, { antal: 4, luft: 3 }), siteObjekt(s, pid), { rutnat: 0 });
    expect(igen.lagda).toHaveLength(0);
    expect(igen.upptagna).toBe(4);

    const forsta = siteObjekt(s, pid)[0];
    const k = kopia({ ...forsta, mwh: 5 }, siteObjekt(s, pid), { rutnat: 0 });
    expect(k).toMatchObject({ typ: "container", bredd: 6.1, mwh: 5, rotation: 0 });
    expect(k.id).not.toBe(forsta.id);
    expect(k.namn).not.toBe(forsta.namn);
  });

  it("ångra sätter tillbaka projektets lista utan att röra andra projekt", () => {
    let s = seed();
    const a = nyttObjekt("container", "36037", { x: 0, z: 0 }, [], { exakt: true });
    const b = nyttObjekt("container", "36038", { x: 0, z: 0 }, [], { exakt: true });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: a });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: b });
    const fore = siteObjekt(s, "36037");
    s = reducer(s, { type: "SITE_TA_BORT", id: a.id });
    expect(siteObjekt(s, "36037")).toHaveLength(0);
    s = reducer(s, { type: "SITE_ANGRA", projektId: "36037", rader: fore });
    expect(siteObjekt(s, "36037").map((o) => o.id)).toEqual([a.id]);
    expect(siteObjekt(s, "36038").map((o) => o.id)).toEqual([b.id]);
  });

  it("skyddsavståndet för en rad kommer ur reglerna", () => {
    expect(radLuft([], "container")).toBe(0);
  });
});

describe("granskningsfynd #107", () => {
  it("utsträckningen och kopian följer en fri rotation", () => {
    const o = { ...nyttObjekt("container", "36037", { x: 0, z: 0 }, [], { exakt: true }), bredd: 6.1, djup: 2.5, hojd: 2.9, rotation: 45 };
    const u = utstrackning(o);
    expect(u.x).toBeCloseTo((6.1 + 2.5) * Math.SQRT1_2, 2);
    expect(u.z).toBeCloseTo((6.1 + 2.5) * Math.SQRT1_2, 2);
    const k = kopia(o, [o], { rutnat: 0 });
    expect(k).not.toBe(null);
    // 2,5 m längs kortsidan, som vid 45° ligger diagonalt.
    expect(Math.hypot(k.x - o.x, k.z - o.z)).toBeCloseTo(2.5, 2);
    expect(k.rotation).toBe(45);
  });
});
