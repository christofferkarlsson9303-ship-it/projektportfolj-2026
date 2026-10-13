import { describe, expect, it } from "vitest";
import { antalVeckor, fasSammanfattning, flyttaVeckor, utfalldaFor, veckaFor, veckaText } from "./ganttMeny.js";

describe("veckor i Gantt-menyn", () => {
  it("ger ISO-vecka och text", () => {
    expect(veckaFor("2026-10-13")).toBe("2026-v42");
    expect(veckaText("2026-10-13")).toBe("v. 42 2026");
    expect(veckaText("")).toBe("–");
    expect(veckaFor("2027-01-01")).toBe("2026-v53");
  });

  it("flyttar start, slut eller hela momentet en vecka till måndag–fredag", () => {
    const m = { start: "2026-10-14", slut: "2026-10-28" }; // v42–v44
    expect(flyttaVeckor(m, "hela", 1)).toEqual({ start: "2026-10-19", slut: "2026-11-06" });
    expect(flyttaVeckor(m, "start", -1)).toEqual({ start: "2026-10-05", slut: "2026-10-30" });
    expect(flyttaVeckor(m, "slut", 2)).toEqual({ start: "2026-10-12", slut: "2026-11-13" });
  });

  it("låter aldrig slutet hamna före starten", () => {
    const m = { start: "2026-10-12", slut: "2026-10-16" }; // en vecka
    expect(flyttaVeckor(m, "slut", -1)).toEqual({ start: "2026-10-12", slut: "2026-10-16" });
    expect(flyttaVeckor(m, "start", 2)).toEqual({ start: "2026-10-26", slut: "2026-10-30" });
  });

  it("flyttar över årsskiftet", () => {
    expect(flyttaVeckor({ start: "2026-12-28", slut: "2027-01-01" }, "hela", 1)).toEqual({ start: "2027-01-04", slut: "2027-01-08" });
  });

  it("räknar veckor inklusive start- och slutvecka", () => {
    expect(antalVeckor("2026-10-14", "2026-10-28")).toBe(3);
    expect(antalVeckor("2026-10-12", "2026-10-16")).toBe(1);
    expect(antalVeckor(null, "2026-10-16")).toBe(0);
  });

  it("returnerar null utan datum", () => {
    expect(flyttaVeckor({ start: "", slut: "2026-10-16" }, "hela", 1)).toBeNull();
  });
});

describe("fasnivå", () => {
  const f = (status, start, slut, klara = 0, punkter = 4) => ({ status, start, slut, klara, punkter });

  it("sammanfattar en fas till en stapel och ett läge", () => {
    const s = fasSammanfattning([f("klar", "2026-01-05", "2026-02-01", 4), f("pagar", "2026-02-02", "2026-03-15", 1)]);
    expect(s).toMatchObject({ start: "2026-01-05", slut: "2026-03-15", status: "pagar", klara: 1, antal: 2, punkter: 8, klaraPunkter: 5 });
    expect(fasSammanfattning([f("klar", "a", "b"), f("klar", "a", "b")]).status).toBe("klar");
    expect(fasSammanfattning([f("klar", "a", "b"), f("sen", "a", "b")]).status).toBe("sen");
    expect(fasSammanfattning([f("kommande", "a", "b")]).status).toBe("kommande");
  });

  it("fäller ut alla faser på momentnivå och ihop alla på fasnivå", () => {
    expect([...utfalldaFor("moment", [1, 2, 3])]).toEqual([1, 2, 3]);
    expect(utfalldaFor("fas", [1, 2, 3]).size).toBe(0);
  });
});
