import { describe, expect, it } from "vitest";
import { byggSvar, lasSvar } from "./anbudssvar.js";

const VAL = ["Realistiska", "Pressade", "Orealistiska"];

describe("anbudssvar", () => {
  it("bygger en läsbar sträng och läser tillbaka den", () => {
    const s = byggSvar({ val: "Pressade", sakerhet: 70, text: "Nätets datum ej bekräftat" });
    expect(s).toBe("Pressade · säkerhet 70 % — Nätets datum ej bekräftat");
    expect(lasSvar(s, VAL)).toEqual({ val: "Pressade", sakerhet: 70, text: "Nätets datum ej bekräftat" });
  });

  it("klarar val utan säkerhet och kommentar", () => {
    expect(lasSvar(byggSvar({ val: "Realistiska" }), VAL)).toEqual({ val: "Realistiska", sakerhet: null, text: "" });
    expect(lasSvar(byggSvar({ val: "Realistiska", text: "ok" }), VAL)).toEqual({ val: "Realistiska", sakerhet: null, text: "ok" });
  });

  it("tolkar äldre fritextsvar som kommentar", () => {
    expect(lasSvar("Tiderna är pressade men går", VAL)).toEqual({ val: "", sakerhet: null, text: "Tiderna är pressade men går" });
  });

  it("utan val blir svaret bara kommentaren, och tomt är tomt", () => {
    expect(byggSvar({ sakerhet: 40, text: " hej " })).toBe("hej");
    expect(byggSvar({})).toBe("");
  });
});
