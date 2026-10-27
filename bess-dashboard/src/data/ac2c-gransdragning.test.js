import { describe, expect, it } from "vitest";
import { ALLA_PUNKTER, SUMMERING } from "./bessChecklistData.ts";
import { FALTMALLAR } from "./faltmaterial.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "./projektkontroll.js";

describe("AC2C-gränsdragning", () => {
  it("behåller kontrollhistorikens nycklar och huvudmoment", () => {
    expect(SUMMERING).toEqual({faser:16,punkter:306,hallpunkter:55,milstolpar:7,motsagelser:12});
    expect(new Set(ALLA_PUNKTER.map(p => p.id)).size).toBe(306);
    expect(PROJEKTMALLAR).toHaveLength(16);
    expect(PROJEKTKONTROLL_REVISION).toBe("2026-10-17.1");
  });
  it("bevarar ONE:s förkontroller och tar emot CATL:s specialistprov", () => {
    const punkt = id => FALTMALLAR.flatMap(m => m.punkter).find(p => p.id === id);
    expect(punkt("M2.03").roll).toBe("Elinstallatör");
    for (const id of ["M4.03", "M4.04", "M4.05", "M4.06", "M4.07"]) {
      expect(punkt(id).roll).toContain("mottagningskontroll / CATL");
      expect(punkt(id).titel).toMatch(/^Ta emot/);
    }
  });
  it("gör inte Customer och workshopantaganden till ONE-utförande", () => {
    const punkt = id => FALTMALLAR.flatMap(m => m.punkter).find(p => p.id === id);
    for (const id of ["M4.02", "M4.11", "M4.13", "M4.14", "M4.15", "M4.16"]) {
      expect(punkt(id).roll).toMatch(/öppe[nt]/);
    }
    expect(ALLA_PUNKTER.find(p => p.id === "13.20").text).toContain("workshopantaganden");
    expect(punkt("M4.02").verifiering).not.toContain("sista moment");
  });
});
