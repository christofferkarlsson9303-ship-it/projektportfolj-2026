import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { attGoraAntal, blockerar, nastaAtgard, projektlage } from "./projektlage.js";
import { arbetslage } from "./agenda.js";

const NU = "2026-10-30";
const state = efterInlasning(normalisera(structuredClone(SEED)));
const p = (id) => state.projekt.find((x) => x.id === id);

describe("projektlage", () => {
  it("ger fas, tid, pengar, blockering, nästa åtgärd och antal för ett projekt med plan", () => {
    const r = projektlage(state, p("36037"), NU);
    expect(r.fas.nr).toBeGreaterThanOrEqual(1);
    expect(r.fas.kort).toBeTruthy();
    expect(r.tid.text).toBeTruthy();
    expect(r.block.text).toBeTruthy();
    expect(r.nasta).not.toBeNull();
    expect(r.nasta.post).toMatch(/^(kp-|fas-)/);
    expect(r.nasta.text).toBeTruthy();
  });

  it("utan startdatum finns ingen plan: blockerar säger det och ingen åtgärd gissas", () => {
    const utan = { ...state, projekt: state.projekt.map((x) => (x.id === "goteborg" ? { ...x, startdatum: "" } : x)) };
    expect(blockerar(utan, "goteborg", NU)).toEqual({ ton: "warn", text: "Datum saknas" });
    expect(nastaAtgard(utan, "goteborg", NU)).toBeNull();
  });

  it("antal att göra är samma räkning som Idag", () => {
    const l = arbetslage(state, 30, "36037");
    expect(attGoraAntal(state, "36037")).toBe(l.frister.length + l.forfallet.length + (l.utanDatum.length ? 1 : 0) + l.idag.length + l.veckan.length);
  });
});
