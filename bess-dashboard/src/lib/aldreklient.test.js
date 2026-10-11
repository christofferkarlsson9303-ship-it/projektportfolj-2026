import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning } from "../state/portfolj-reducer.js";

/* En äldre klient (sexfasmodellen) känner inte igen fas 7 och 8 och nollställer dem till 1 när den läser
   och skriver tillbaka portföljen. Statusen är det som överlever, och den nya koden rättar fasen efter den. */
describe("Äldre klienter", () => {
  const med = (p) => {
    const s = structuredClone(SEED);
    s.projekt = [{ ...s.projekt[0], ...p, id: "x", fasModell: 8 }];
    return efterInlasning(s).projekt[0];
  };

  it("flyttar en fas som inte hör till statusen till statusens första fas", () => {
    expect(med({ status: "SLUTBESIKTNING", fas: 1 }).fas).toBe(7);
    expect(med({ status: "AVSLUTAT_OCH_GARANTI", fas: 1 }).fas).toBe(8);
    expect(med({ status: "PRODUKTION", fas: 1 }).fas).toBe(3);
  });

  it("rör inte en fas som hör till statusen, eller ett förlorat anbud", () => {
    expect(med({ status: "PRODUKTION", fas: 5 }).fas).toBe(5);
    expect(med({ status: "PLANERING_OCH_UPPSTART", fas: 2 }).fas).toBe(2);
    expect(med({ status: "ANBUD_EJ_VUNNET", fas: 1 })).toMatchObject({ status: "ANBUD_EJ_VUNNET", fas: 1 });
  });

  it("tål en status som den inte känner igen", () => {
    expect(med({ status: "Okänd status", fas: 3 })).toMatchObject({ status: "PLANERING_OCH_UPPSTART", fas: 1 });
  });
});
