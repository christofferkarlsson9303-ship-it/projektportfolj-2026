import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { MILSTOLPAR } from "../data/bessChecklistData.ts";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { faslage } from "./epc.js";
import { milstolpskrav } from "./milstolpskrav.js";

const NU = "2026-09-26";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU + "T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));

describe("milstolpskrav", () => {
  it("ger M1–M7 i betalplanens ordning, knutna till grindens moment", () => {
    const rader = milstolpskrav(seed(), "36037");
    expect(rader.map((r) => r.kod)).toEqual(MILSTOLPAR.map((m) => m.kod));
    const m4 = rader.find((r) => r.kod === "M4");
    expect(m4.grind).toBe("G7");
    expect(m4.moment).toBe(7);
    const m5 = rader.find((r) => r.kod === "M5");
    expect(m5.moment).toBe(13);
  });

  it("räknar samma punkter som Bygga batteripark", () => {
    const s = seed();
    const faser = faslage(s, "36037");
    for (const r of milstolpskrav(s, "36037", faser)) {
      const f = faser[r.moment];
      expect(r.totalt).toBe(f.punkter);
      expect(r.klara).toBe(f.klara + f.ejAktuella);
      expect(r.kvar).toBe(f.kvar);
    }
  });

  it("visar godkänd grind när momentets grinddatum är satt", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 7, falt: "grindDatum", varde: "2026-09-21" });
    const m4 = milstolpskrav(s, "36037").find((r) => r.kod === "M4");
    expect(m4.grindGodkand).toBe(true);
    expect(["godkand", "fakturerad"]).toContain(m4.lage);
  });

  it("ändrar ingenting i state", () => {
    const s = seed();
    const fore = JSON.stringify(s);
    milstolpskrav(s, "36038");
    expect(JSON.stringify(s)).toBe(fore);
  });
});
