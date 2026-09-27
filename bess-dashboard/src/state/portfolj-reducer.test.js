import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "./portfolj-reducer.js";

const last = (state) => efterInlasning(normalisera(structuredClone(state)));
const alvesta = (state) => state.projekt.find((p) => p.id === "36038");

describe("efterInlasning — Alvestas kontraktssumma", () => {
  it("grunddatan har kontraktets 6 614 187 kr", () => {
    expect(alvesta(last(SEED)).kontraktsvarde).toBe(6614187);
  });

  it("rättar det kända felvärdet 5 600 000 kr i sparad data", () => {
    const gammal = structuredClone(SEED);
    alvesta(gammal).kontraktsvarde = 5600000;
    expect(alvesta(last(gammal)).kontraktsvarde).toBe(6614187);
  });

  it("rör inte ett annat värde som någon satt medvetet", () => {
    const annan = structuredClone(SEED);
    alvesta(annan).kontraktsvarde = 7000000;
    expect(alvesta(last(annan)).kontraktsvarde).toBe(7000000);
    alvesta(annan).kontraktsvarde = null;
    expect(alvesta(last(annan)).kontraktsvarde).toBe(null);
  });
});
