import { describe, expect, it } from "vitest";
import { lankadAtgard, motespunktStatus, nyAtgardFranMotespunkt } from "./motesatgard.js";

const punkter = [
  { id: "p1", status: "oppen" },
  { id: "p2", status: "klarmarkerad" },
];

describe("motespunktStatus", () => {
  it("en länkad åtgärd styr statusen", () => {
    expect(motespunktStatus({ punktId: "p1", status: "avslutad" }, punkter)).toBe("oppen");
    expect(motespunktStatus({ punktId: "p2", status: "oppen" }, punkter)).toBe("avslutad");
  });

  it("utan länk gäller mötespunktens egen status", () => {
    expect(motespunktStatus({ status: "avslutad" }, punkter)).toBe("avslutad");
    expect(motespunktStatus({}, punkter)).toBe("oppen");
  });

  it("en borttagen åtgärd faller tillbaka på mötespunkten", () => {
    expect(lankadAtgard({ punktId: "borta" }, punkter)).toBeNull();
    expect(motespunktStatus({ punktId: "borta", status: "avslutad" }, punkter)).toBe("avslutad");
  });
});

describe("nyAtgardFranMotespunkt", () => {
  const mote = { id: "bm1", nr: "BM-03", projektId: "36037", nasta: "2026-11-04" };
  const pt = { id: "pt1", para: "3", text: "  Bekräfta leveransdatum  ", ansvarig: "UE" };

  it("förifyller projekt, titel, frist och källa", () => {
    expect(nyAtgardFranMotespunkt(mote, pt)).toMatchObject({
      projektId: "36037",
      titel: "Bekräfta leveransdatum",
      forfaller: "2026-11-04",
      status: "oppen",
      kalla: "Byggmöte BM-03 §3",
      moteId: "bm1",
      motespunktId: "pt1",
    });
  });

  it("gissar inte ansvarig från rollen och ger nya id varje gång", () => {
    const a = nyAtgardFranMotespunkt(mote, pt);
    expect(a.agare).toBe("");
    expect(nyAtgardFranMotespunkt(mote, pt).id).not.toBe(a.id);
  });

  it("lämnar fristen tom när nästa möte inte är ett datum", () => {
    expect(nyAtgardFranMotespunkt({ ...mote, nasta: "efter jul" }, pt).forfaller).toBe("");
  });
});
