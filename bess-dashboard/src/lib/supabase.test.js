import { describe, expect, it } from "vitest";
import { lokaltLageSparrat } from "./supabase.js";

describe("lokaltLageSparrat (#71)", () => {
  it("spärrar produktionsbygge utan databas", () => {
    expect(lokaltLageSparrat({ prod: true, konfigurerad: false })).toBe(true);
  });
  it("tillåter utveckling, konfigurerad databas och uttryckligt lokalt bygge", () => {
    expect(lokaltLageSparrat({ prod: false, konfigurerad: false })).toBe(false);
    expect(lokaltLageSparrat({ prod: true, konfigurerad: true })).toBe(false);
    expect(lokaltLageSparrat({ prod: true, konfigurerad: false, tillat: "1" })).toBe(false);
  });
});
