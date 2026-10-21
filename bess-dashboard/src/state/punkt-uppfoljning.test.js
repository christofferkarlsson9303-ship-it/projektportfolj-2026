import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { normalisera, reducer } from "./portfolj-reducer.js";
import { sammanfoga } from "../lib/sammanfoga.js";

const start = () => normalisera(structuredClone(SEED));
const forst = (s) => s.punkter.find((p) => p.id === "p2");

describe("uppföljning och kommentarer på punkter", () => {
  it("uppföljningsdatum ändrar inte arbetsfristen", () => {
    const s0 = start();
    const frist = forst(s0).forfaller;
    const s1 = reducer(s0, { type: "UPPDATERA", lista: "punkter", id: "p2", falt: "uppfoljning", varde: "2026-12-01" });
    expect(forst(s1).uppfoljning).toBe("2026-12-01");
    expect(forst(s1).forfaller).toBe(frist);
  });

  it("en kommentar läggs till, loggas och rör inte övriga fält", () => {
    const s0 = start();
    const s1 = reducer(s0, { type: "PUNKT_KOMMENTAR", id: "p2", kommentar: { id: "k1", text: "  Ringt leverantören  ", av: "Anna", ts: "2026-10-21T08:00:00Z" } });
    expect(forst(s1).kommentarer).toEqual([{ id: "k1", text: "Ringt leverantören", av: "Anna", ts: "2026-10-21T08:00:00Z" }]);
    expect(forst(s1).titel).toBe(forst(s0).titel);
    expect(s1.andringslogg[0].text).toContain("kommentar — Ringt leverantören");
    expect(s1.andringslogg[0].projektId).toBe("36037");
  });

  it("tom kommentar, okänd punkt och saknat id ändrar ingenting", () => {
    const s0 = start();
    expect(reducer(s0, { type: "PUNKT_KOMMENTAR", id: "p2", kommentar: { id: "k1", text: "   " } })).toBe(s0);
    expect(reducer(s0, { type: "PUNKT_KOMMENTAR", id: "finns-ej", kommentar: { id: "k1", text: "x" } })).toBe(s0);
    expect(reducer(s0, { type: "PUNKT_KOMMENTAR", id: "p2", kommentar: { text: "x" } })).toBe(s0);
  });

  it("två personers kommentarer på samma punkt slås ihop, ingen försvinner", () => {
    const bas = start();
    const mina = reducer(bas, { type: "PUNKT_KOMMENTAR", id: "p2", kommentar: { id: "a", text: "Min", av: "A" } });
    const deras = reducer(bas, { type: "PUNKT_KOMMENTAR", id: "p2", kommentar: { id: "b", text: "Deras", av: "B" } });
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(konflikter.filter((k) => k.startsWith("punkter"))).toEqual([]);
    expect(forst(varde).kommentarer.map((k) => k.id).sort()).toEqual(["a", "b"]);
  });

  it("fälten överlever normalisering", () => {
    const s = reducer(start(), { type: "UPPDATERA", lista: "punkter", id: "p2", falt: "uppfoljning", varde: "2026-12-01" });
    expect(forst(normalisera(structuredClone(s))).uppfoljning).toBe("2026-12-01");
  });
});
