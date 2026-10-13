import { describe, expect, it } from "vitest";
import { DIFF_FARG, diffArTom, diffSammanfattning, diffStatusPerGuid, diffaModeller, guidAv } from "./modellDiff.js";

const c = (id, extra = {}) => ({ id, typ: "container", namn: id, x: 0, z: 0, rotation: 0, bredd: 6.1, djup: 2.5, hojd: 2.9, ...extra });

describe("diffaModeller()", () => {
  it("identiska versioner ger ingen skillnad", () => {
    const v = [c("a"), c("b", { x: 10 })];
    const d = diffaModeller(v, structuredClone(v));
    expect(d).toEqual({ tillagda: [], borttagna: [], andrade: [], oforandrade: 2 });
    expect(diffArTom(d)).toBe(true);
  });

  it("hittar tillagda och borttagna GUID:n", () => {
    const d = diffaModeller([c("a"), c("b")], [c("b"), c("c")]);
    expect(d.tillagda).toEqual(["c"]);
    expect(d.borttagna).toEqual(["a"]);
    expect(d.oforandrade).toBe(1);
  });

  it("hittar ändrade objekt och säger vilka fält som skiljer", () => {
    const d = diffaModeller([c("a", { x: 0, mwh: 4 })], [c("a", { x: 3.5, mwh: 5, status: "monterad" })]);
    expect(d.andrade).toEqual([{ guid: "a", falt: ["x", "mwh", "status"] }]);
  });

  it("flytt under toleransen är ingen ändring, över den är det", () => {
    expect(diffaModeller([c("a", { x: 1 })], [c("a", { x: 1.0004 })]).andrade).toEqual([]);
    expect(diffaModeller([c("a", { x: 1 })], [c("a", { x: 1.01 })]).andrade).toHaveLength(1);
    expect(diffaModeller([c("a", { x: 1 })], [c("a", { x: 1.01 })], { tolerans: 0.05 }).andrade).toEqual([]);
  });

  it("tomt är tomt — saknat fält, null, undefined och tom text är samma sak", () => {
    expect(diffaModeller([c("a")], [c("a", { soc: null, spec: "", status: undefined })]).andrade).toEqual([]);
    expect(diffaModeller([c("a")], [c("a", { soc: 0 })]).andrade).toEqual([{ guid: "a", falt: ["soc"] }]);
  });

  it("ordningen i listorna spelar ingen roll och resultatet är sorterat", () => {
    const d = diffaModeller([c("b"), c("a")], [c("z"), c("y"), c("a"), c("b")]);
    expect(d.tillagda).toEqual(["y", "z"]);
    expect(d.oforandrade).toBe(2);
  });

  it("ett explicit guid går före id", () => {
    expect(guidAv({ id: "so1", guid: "3x9Fq" })).toBe("3x9Fq");
    const d = diffaModeller([c("so1", { guid: "G1", namn: "N", x: 0 })], [c("so2", { guid: "G1", namn: "N", x: 2 })]);
    expect(d.andrade).toEqual([{ guid: "G1", falt: ["x"] }]);
    expect(d.tillagda).toEqual([]);
  });

  it("tål saknade eller trasiga listor utan att kasta", () => {
    expect(diffaModeller(undefined, [c("a")]).tillagda).toEqual(["a"]);
    expect(diffaModeller([c("a")], null).borttagna).toEqual(["a"]);
    expect(diffaModeller([null, {}, { id: "" }], [undefined])).toEqual({ tillagda: [], borttagna: [], andrade: [], oforandrade: 0 });
  });

  it("ändrar inte sina indata", () => {
    const a = [c("a")];
    const b = [c("a", { x: 5 })];
    const kopia = JSON.stringify([a, b]);
    diffaModeller(a, b);
    expect(JSON.stringify([a, b])).toBe(kopia);
  });

  it("status per GUID för färgläggning, och färgerna är tokens — inga hex", () => {
    const d = diffaModeller([c("a"), c("b")], [c("a", { x: 9 }), c("b"), c("n")]);
    const m = diffStatusPerGuid(d);
    expect(m.get("a")).toBe("andrad");
    expect(m.get("n")).toBe("tillagd");
    expect(m.has("b")).toBe(false);
    for (const v of Object.values(DIFF_FARG)) expect(v).toMatch(/^--[a-z-]+$/);
    expect(diffSammanfattning(d)).toBe("1 tillagda · 0 borttagna · 1 modifierade");
  });
});
