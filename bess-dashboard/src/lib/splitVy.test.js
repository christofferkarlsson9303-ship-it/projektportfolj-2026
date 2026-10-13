import { describe, expect, it } from "vitest";
import { SPLIT_MAX, SPLIT_MIN, klammaAndel } from "./splitVy.js";

describe("klammaAndel()", () => {
  it("håller andelen mellan gränserna", () => {
    expect(klammaAndel(0.5)).toBe(0.5);
    expect(klammaAndel(0.01)).toBe(SPLIT_MIN);
    expect(klammaAndel(0.99)).toBe(SPLIT_MAX);
    expect(klammaAndel(-5)).toBe(SPLIT_MIN);
  });

  it("text med tal tolkas, ogiltigt ger startvärdet", () => {
    expect(klammaAndel("0.7")).toBe(0.7);
    expect(klammaAndel("abc", 0.6)).toBe(0.6);
    expect(klammaAndel(null, 0.6)).toBe(0.6);
    expect(klammaAndel(undefined, 0.6)).toBe(0.6);
    expect(klammaAndel("", 0.6)).toBe(0.6);
    expect(klammaAndel(Number.NaN, 0.6)).toBe(0.6);
  });

  it("gränserna lämnar plats åt båda delarna", () => {
    expect(SPLIT_MIN).toBeGreaterThan(0.2);
    expect(SPLIT_MAX).toBeLessThan(0.9);
    expect(SPLIT_MIN).toBeLessThan(SPLIT_MAX);
  });
});
