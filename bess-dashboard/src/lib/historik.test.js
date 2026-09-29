import { describe, expect, it } from "vitest";
import { andringar, historikrader } from "./historik.js";

describe("historik", () => {
  it("visar bara fält som ändrats, med läsbara namn och värden", () => {
    const a = { id: "u1", status: "oppen", belopp: null, arbeteStartat: false };
    const b = { id: "u1", status: "godkand", belopp: 12000, arbeteStartat: false };
    expect(andringar(b, a)).toEqual([
      { falt: "status", namn: "Status", fore: "oppen", efter: "godkand" },
      { falt: "belopp", namn: "Belopp", fore: "—", efter: "12000" },
    ]);
  });

  it("borttagna och nya fält räknas", () => {
    expect(andringar({ x: true }, { y: "a" })).toEqual([
      { falt: "y", namn: "y", fore: "a", efter: "—" },
      { falt: "x", namn: "x", fore: "—", efter: "Ja" },
    ]);
  });

  it("varje ändrad version jämförs med versionen före", () => {
    const rader = historikrader([
      { version: 3, operation: "andrad", data: { status: "c" } },
      { version: 2, operation: "andrad", data: { status: "b" } },
      { version: 1, operation: "skapad", data: { status: "a" } },
    ]);
    expect(rader.map((r) => [r.rubrik, r.andringar.map((a) => a.efter).join()])).toEqual([
      ["Ändrad", "c"],
      ["Ändrad", "b"],
      ["Skapad", ""],
    ]);
  });
});
