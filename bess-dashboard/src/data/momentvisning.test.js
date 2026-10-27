import { describe, expect, it } from "vitest";
import { ALLA_PUNKTER, FASER } from "./bessChecklistData.ts";
import { RUBRIKER, TIDSGRUPPER, visadeSektioner } from "./momentvisning.js";

describe("tidsgrupper", () => {
  it("har varje punkt i momentet i exakt en grupp", () => {
    for (const [nr, grupper] of Object.entries(TIDSGRUPPER)) {
      const fas = FASER[Number(nr)];
      const allaId = fas.sektioner.flatMap((s) => s.punkter).map((p) => p.id);
      const grupperade = grupper.flatMap((g) => g.punkter);
      expect([...grupperade].sort(), `moment ${nr}`).toEqual([...allaId].sort());
      expect(new Set(grupperade).size, `moment ${nr}`).toBe(grupperade.length);
    }
  });

  it("ersätter sektionen 'Från källgenomgången' i grupperade moment", () => {
    for (const nr of Object.keys(TIDSGRUPPER)) {
      expect(visadeSektioner(FASER[Number(nr)]).map((s) => s.namn)).not.toContain("Från källgenomgången");
    }
  });

  it("ritar moment utan tidsgrupper med checklistans sektioner", () => {
    expect(visadeSektioner(FASER[15])).toBe(FASER[15].sektioner);
  });
});

describe("rubriker", () => {
  const perId = new Map(ALLA_PUNKTER.map((p) => [p.id, p]));
  it("finns bara för kända punkter och är kortare än texten", () => {
    for (const [id, r] of Object.entries(RUBRIKER)) {
      expect(perId.has(id), id).toBe(true);
      expect(r.length, id).toBeLessThanOrEqual(80);
      expect(r.length, id).toBeLessThan(perId.get(id).text.length);
    }
  });

  it("ger alla långa punkter i moment 10–13 en rubrik", () => {
    const langa = ALLA_PUNKTER.filter((p) => /^1[0-3]\./.test(p.id) && p.text.length > 100).map((p) => p.id);
    expect(langa.filter((id) => !RUBRIKER[id])).toEqual([]);
  });
});
