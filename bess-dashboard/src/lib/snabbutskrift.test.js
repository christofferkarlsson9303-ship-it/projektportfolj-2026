import { describe, expect, it } from "vitest";
import { FASBLANKETTER, arbetslistaDokument, fasblankettDokument, utforareMedUppgifter } from "./snabbutskrift.js";

const projekt = { id: "p1", nr: "1", namn: "Testpark" };
const state = {
  projekt: [projekt],
  punkter: [
    { id: "a", projektId: "p1", titel: "Dra kabel", utforare: "Dan", status: "oppen" },
    { id: "b", projektId: "p1", titel: "Montera skåp", utforare: "Eva", status: "oppen" },
    { id: "c", projektId: "p1", titel: "Klar sak", utforare: "Dan", status: "klarmarkerad" },
    { id: "d", projektId: "p2", titel: "Annat projekt", utforare: "Ola", status: "oppen" },
  ],
};

describe("snabbutskrift", () => {
  it("listar utförare med öppna uppgifter i projektet", () => {
    expect(utforareMedUppgifter(state, "p1")).toEqual(["Dan", "Eva"]);
  });

  it("arbetslistan tar bara utförarens öppna uppgifter, eller valda rader", () => {
    expect(arbetslistaDokument(state, projekt, { utforare: "Dan" }).uppgifter.map((u) => u.id)).toEqual(["a"]);
    expect(arbetslistaDokument(state, projekt, { ids: ["b"] }).uppgifter.map((u) => u.id)).toEqual(["b"]);
    expect(arbetslistaDokument(state, projekt).uppgifter).toHaveLength(2);
  });

  it("fasblanketten är tom och finns för varje byggfas med kontroller", () => {
    const d = fasblankettDokument(projekt, 0);
    expect(d.antal).toBeGreaterThan(0);
    expect(d.visaResultat).toBe(false);
    expect(d.moment.flatMap((m) => m.punkter).every((p) => p.kontroll === null)).toBe(true);
    expect(fasblankettDokument(projekt, 99)).toBeNull();
    expect(FASBLANKETTER[0]).toEqual({ fas: 0, titel: "Förstudie och krav" });
  });
});
