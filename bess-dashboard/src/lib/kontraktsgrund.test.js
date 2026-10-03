import { describe, expect, it } from "vitest";
import { avvikandeAndelar, harKontrakt, kontraktsText } from "./kontraktsgrund.js";

const state = { kontrakt: [{ projektId: "p1", milstolpar: [{ kod: "M1", andel: 10 }, { kod: "M2", andel: 90 }] }] };

describe("kontraktsgrund", () => {
  it("påstår kontraktsvillkor bara när en profil är inläst", () => {
    expect(harKontrakt(state, "p1")).toBe(true);
    expect(harKontrakt(state, "p2")).toBe(false);
    expect(harKontrakt({}, "p1")).toBe(false);
    expect(kontraktsText(state, "p1", "Kontraktets plan", "Standardmall")).toBe("Kontraktets plan");
    expect(kontraktsText(state, "p2", "Kontraktets plan", "Standardmall")).toBe("Standardmall");
  });

  it("hittar betalsteg där kontraktet avviker från modellen", () => {
    const modell = [{ kod: "M1", andel: 10 }, { kod: "M2", andel: 25 }, { kod: "M3", andel: 65 }];
    expect(avvikandeAndelar(state.kontrakt[0], modell)).toEqual([
      { kod: "M2", modell: 25, kontrakt: 90 },
      { kod: "M3", modell: 65, kontrakt: null },
    ]);
    expect(avvikandeAndelar(null, modell)).toEqual([]);
  });
});
