import { describe, expect, it } from "vitest";
import { nastaIndex, tolkaDatumord, tolkaSnabbrad } from "./snabbrad.js";

// 2026-10-30 är en fredag.
const IDAG = "2026-10-30";

describe("tolkaDatumord", () => {
  it("läser relativa ord", () => {
    expect(tolkaDatumord("idag", IDAG)).toBe("2026-10-30");
    expect(tolkaDatumord("imorgon", IDAG)).toBe("2026-10-31");
    expect(tolkaDatumord("+3", IDAG)).toBe("2026-11-02");
  });

  it("veckodag ger närmaste, och idag räknas", () => {
    expect(tolkaDatumord("fre", IDAG)).toBe("2026-10-30");
    expect(tolkaDatumord("mån", IDAG)).toBe("2026-11-02");
    expect(tolkaDatumord("Tor", IDAG)).toBe("2026-11-05");
    expect(tolkaDatumord("sön.", IDAG)).toBe("2026-11-01");
  });

  it("dag/månad går till nästa år när datumet passerat", () => {
    expect(tolkaDatumord("5/11", IDAG)).toBe("2026-11-05");
    expect(tolkaDatumord("3/2", IDAG)).toBe("2027-02-03");
    expect(tolkaDatumord("31/2", IDAG)).toBeNull();
  });

  it("ISO-datum valideras och vanliga ord är inga datum", () => {
    expect(tolkaDatumord("2026-12-01", IDAG)).toBe("2026-12-01");
    expect(tolkaDatumord("2026-02-31", IDAG)).toBeNull();
    expect(tolkaDatumord("servis", IDAG)).toBeNull();
    expect(tolkaDatumord("3", IDAG)).toBeNull();
  });
});

describe("tolkaSnabbrad", () => {
  it("datum i slutet blir frist", () => {
    expect(tolkaSnabbrad("Ring Alex om servis fre", IDAG)).toEqual({ titel: "Ring Alex om servis", forfaller: "2026-10-30", uppfoljning: "" });
    expect(tolkaSnabbrad("Beställ kran i morgon", IDAG)).toEqual({ titel: "Beställ kran", forfaller: "2026-10-31", uppfoljning: "" });
  });

  it("utan datum blir uppföljningen idag", () => {
    expect(tolkaSnabbrad("  Kontrollera jordning  ", IDAG)).toEqual({ titel: "Kontrollera jordning", forfaller: "", uppfoljning: IDAG });
  });

  it("ett ensamt datumord är en titel, inte ett datum", () => {
    expect(tolkaSnabbrad("fre", IDAG)).toEqual({ titel: "fre", forfaller: "", uppfoljning: IDAG });
  });

  it("tom rad ger null", () => {
    expect(tolkaSnabbrad("   ", IDAG)).toBeNull();
  });
});

describe("nastaIndex", () => {
  it("stannar vid kanterna", () => {
    expect(nastaIndex(3, 0, -1)).toBe(0);
    expect(nastaIndex(3, 2, 1)).toBe(2);
    expect(nastaIndex(3, 1, 1)).toBe(2);
  });

  it("utan fokus börjar j överst och k nederst", () => {
    expect(nastaIndex(3, -1, 1)).toBe(0);
    expect(nastaIndex(3, -1, -1)).toBe(2);
    expect(nastaIndex(0, -1, 1)).toBe(-1);
  });
});
