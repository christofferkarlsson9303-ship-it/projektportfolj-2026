import { describe, expect, it } from "vitest";
import { exaktIlike } from "./ilike.js";

describe("exaktIlike", () => {
  it("escapar _ och % så att de inte blir jokertecken", () => {
    expect(exaktIlike("a_b%c@one-nordic.se")).toBe("a\\_b\\%c@one-nordic.se");
  });
  it("escapar bakstreck och lämnar vanliga adresser orörda", () => {
    expect(exaktIlike("a\\b")).toBe("a\\\\b");
    expect(exaktIlike("Christoffer@Example.com")).toBe("Christoffer@Example.com");
  });
});
