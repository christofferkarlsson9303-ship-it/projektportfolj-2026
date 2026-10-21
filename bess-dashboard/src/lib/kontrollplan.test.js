import { describe, expect, it } from "vitest";
import { forvantadeOmfattningar, planeradeOmfattningar, tackningText, tolkaOmfattningar } from "./kontrollplan.js";

describe("kontrollplan (#73)", () => {
  it("tolkar rader och komman, utan dubbletter", () => {
    expect(tolkaOmfattningar("SKID 1\nSKID 2, skid 1;  +B1a ")).toEqual(["SKID 1", "SKID 2", "+B1a"]);
  });
  it("läser planen per moment", () => {
    expect(planeradeOmfattningar({ kontrollplan: { 11: ["A", "B"] } }, 11)).toEqual(["A", "B"]);
    expect(planeradeOmfattningar({}, 11)).toEqual([]);
  });
  it("registrerade enheter utanför planen faller inte bort", () => {
    expect(forvantadeOmfattningar(["SKID 1"], ["SKID 2", "skid 1", ""])).toEqual(["SKID 1", "SKID 2", "Hela anläggningen"]);
  });
  it("skriver täckning", () => {
    expect(tackningText({ klara: 4, totalt: 6 })).toBe("4 av 6 omfattningar");
    expect(tackningText({ klara: 0, totalt: 0 })).toBe("Ingen omfattning registrerad");
  });
});
