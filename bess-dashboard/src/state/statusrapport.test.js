import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { reducer } from "./portfolj-reducer.js";
import { nyStatusrapport, nyckeltalFor } from "../lib/statusomraden.js";

const PID = "36037";

describe("intern statusrapport i portföljen", () => {
  it("sparar utkast, låser med nyckeltal och vägrar ändra en låst rapport", () => {
    let s = structuredClone(SEED);
    const rad = nyStatusrapport(s, PID, "2026-10");
    s = reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...rad, sammanfattning: "Läget är stabilt." } });
    expect(s.statusrapporter).toHaveLength(1);
    expect(s.statusrapporter[0]).toMatchObject({ status: "utkast", sammanfattning: "Läget är stabilt.", nyckeltal: null });

    s = reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...s.statusrapporter[0], sammanfattning: "Ändrad." } });
    expect(s.statusrapporter).toHaveLength(1);
    expect(s.statusrapporter[0].sammanfattning).toBe("Ändrad.");

    s = reducer(s, { type: "STATUSRAPPORT_LAS", id: rad.id, nyckeltal: nyckeltalFor(s, PID, "2026-10-22"), datum: "2026-10-31" });
    expect(s.statusrapporter[0]).toMatchObject({ status: "last", last: { datum: "2026-10-31" } });
    expect(s.statusrapporter[0].nyckeltal).toBeTruthy();
    expect(s.andringslogg[0].text).toBe("Intern statusrapport 2026-10 låst");

    const efter = reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...s.statusrapporter[0], sammanfattning: "Försök" } });
    expect(efter).toBe(s);
    expect(reducer(s, { type: "STATUSRAPPORT_TA_BORT", id: rad.id })).toBe(s);
  });

  it("avvisar rapport utan giltig period eller okänt projekt, och en spara kan inte låsa", () => {
    const s = structuredClone(SEED);
    const rad = nyStatusrapport(s, PID, "2026-10");
    expect(reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...rad, period: "oktober" } })).toBe(s);
    expect(reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...rad, projektId: "finns-inte" } })).toBe(s);
    const ut = reducer(s, { type: "STATUSRAPPORT_SPARA", rad: { ...rad, status: "last", nyckeltal: { x: 1 } } });
    expect(ut.statusrapporter[0]).toMatchObject({ status: "utkast", nyckeltal: null });
  });
});
