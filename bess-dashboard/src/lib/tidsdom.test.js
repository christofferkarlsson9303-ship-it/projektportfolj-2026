import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { senaLeveranser, tidsdom } from "./tidsdom.js";

const NU = "2026-10-23";
const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const iTid = { forsening: 0, faser: [] };

describe("senaLeveranser", () => {
  it("tar med passerade leveranser som inte är levererade, äldst först", () => {
    const s = seed();
    const sena = senaLeveranser(s, "36037", NU);
    expect(sena.map((l) => l.benamning)).toEqual(["BESS-batteri", "MV-station"]);
    expect(sena[0]).toMatchObject({ leverantor: "CATL", dagar: 11 });
    expect(sena[1].leverantor).toBe("");
  });

  it("räknar inte levererade eller kommande leveranser", () => {
    const s = seed();
    s.leveranser = s.leveranser.map((l) => (l.id === "l1" ? { ...l, status: "levererad" } : l.id === "l2" ? { ...l, datum: "2026-11-01" } : l));
    expect(senaLeveranser(s, "36037", NU)).toEqual([]);
  });
});

describe("tidsdom", () => {
  it("ger Risk i stället för I tid när en leverans är sen", () => {
    const d = tidsdom(seed(), "36037", NU, iTid);
    expect(d.ton).toBe("warn");
    expect(d.text).toBe("Risk · 2 leveranser sen");
    expect(d.mening).toContain("BESS-batteri (CATL) och 1 till");
  });

  it("ger I tid utan sena leveranser och sent när planen är sen", () => {
    const s = { ...seed(), leveranser: [] };
    expect(tidsdom(s, "36037", NU, iTid)).toMatchObject({ ton: "ok", text: "I tid" });
    expect(tidsdom(s, "36037", NU, { forsening: 3, faser: [] })).toMatchObject({ ton: "bad", text: "3 dagar sent" });
    expect(tidsdom(s, "36037", NU, null)).toMatchObject({ ton: "warn", text: "Uppgifter saknas" });
  });
});
