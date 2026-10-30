import { describe, expect, it } from "vitest";
import { medForslag, skapaForslag } from "./kommandon.js";

const IDAG = "2026-10-30"; // fredag

describe("skapaForslag", () => {
  it("tom text ger inga förslag", () => {
    expect(skapaForslag("  ", IDAG)).toEqual({ forst: false, poster: [] });
  });

  it("vanlig text ger punkt och ÄTA, sist i listan", () => {
    const f = skapaForslag("Kabel skadad vid schakt fre", IDAG);
    expect(f.forst).toBe(false);
    expect(f.poster.map((p) => p.typ)).toEqual(["punkt", "ata"]);
    expect(f.poster[0]).toMatchObject({ titel: "Kabel skadad vid schakt", forfaller: "2026-10-30" });
    // ÄTA:n tar hela texten, inget datumord tolkas bort.
    expect(f.poster[1].titel).toBe("Kabel skadad vid schakt fre");
  });

  it("+ gör det till en punkt, först i listan, utan ÄTA", () => {
    const f = skapaForslag("+ Ring Jinert om kran", IDAG);
    expect(f.forst).toBe(true);
    expect(f.poster).toHaveLength(1);
    expect(f.poster[0]).toMatchObject({ typ: "punkt", titel: "Ring Jinert om kran", uppfoljning: IDAG, sub: "uppföljning idag" });
  });

  it("för kort text blir ingen ÄTA", () => {
    expect(skapaForslag("ab", IDAG).poster.map((p) => p.typ)).toEqual(["punkt"]);
  });
});

describe("medForslag", () => {
  it("träffar först, förslag sist — utom efter +", () => {
    const t = [{ t: "Vy" }];
    const vanlig = skapaForslag("risker", IDAG);
    expect(medForslag(t, vanlig)[0]).toEqual({ t: "Vy" });
    const plus = skapaForslag("+risker", IDAG);
    expect(medForslag(t, plus)[0].typ).toBe("punkt");
  });
});
