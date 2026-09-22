import { describe, expect, it } from "vitest";
import { ALLVARSNAMN, SVARSORD, allvar } from "./veckotriage.js";
import { veckaBesvarade, veckaFlaggor, veckorad } from "./berakningar.js";
import { VECKOFRAGOR } from "../data/veckofragor.js";

const fraga = (n) => VECKOFRAGOR.find((f) => f.n === n);

describe("allvar", () => {
  it("ger null för obesvarat", () => {
    expect(allvar(fraga(1), "")).toBeNull();
    expect(allvar(fraga(1), undefined)).toBeNull();
  });

  it("gör osäker till varning, inte avvikelse", () => {
    // Fråga 2 flaggar både "ja" och "osaker". Den som är osäker ska
    // kontrollera, inte rapportera — därför är de inte samma sak.
    expect(allvar(fraga(2), "osaker")).toBe("varning");
    expect(allvar(fraga(2), "ja")).toBe("avvikelse");
  });

  it("gör flaggat svar till avvikelse och övrigt till ok", () => {
    expect(allvar(fraga(1), "nej")).toBe("avvikelse");
    expect(allvar(fraga(1), "ja")).toBe("ok");
    expect(allvar(fraga(3), "ja")).toBe("avvikelse");
    expect(allvar(fraga(3), "nej")).toBe("ok");
  });

  it("vänder inte på frågor där ja är det goda svaret", () => {
    // Fråga 4 och 9 flaggar "nej" — ett ja är alltså OK där.
    expect(allvar(fraga(4), "ja")).toBe("ok");
    expect(allvar(fraga(4), "nej")).toBe("avvikelse");
    expect(allvar(fraga(9), "ja")).toBe("ok");
  });
});

describe("frågornas form — det gränssnittet bygger på", () => {
  it("ger varje fråga exakt ett ok-svar och ett avvikelsesvar", () => {
    for (const f of VECKOFRAGOR) {
      const grader = f.alt.map((a) => allvar(f, a));
      expect(grader.filter((g) => g === "ok"), `fråga ${f.n}`).toHaveLength(1);
      expect(grader.filter((g) => g === "avvikelse"), `fråga ${f.n}`).toHaveLength(1);
    }
  });

  it("har svarstext för varje alternativ", () => {
    for (const f of VECKOFRAGOR) {
      for (const a of f.alt) {
        expect(f.svar[a], `fråga ${f.n} saknar text för ${a}`).toBeTruthy();
        expect(SVARSORD[a], `okänt svarsord ${a}`).toBeTruthy();
      }
    }
  });

  it("namnger varje allvarsgrad", () => {
    expect(Object.keys(ALLVARSNAMN).sort()).toEqual(["avvikelse", "ok", "varning"]);
  });
});

describe("veckoraden", () => {
  const state = {
    veckokoll: [
      { id: "v1", projektId: "a", vecka: "2026-v38", q1: "ja", q2: "osaker", q3: "", klar: true },
      { id: "v2", projektId: "b", vecka: "2026-v38", q1: "nej" },
    ],
  };

  it("hittar rätt rad per projekt och vecka", () => {
    expect(veckorad(state, "a", "2026-v38").id).toBe("v1");
    expect(veckorad(state, "a", "2026-v39")).toBeNull();
    expect(veckorad(state, "c", "2026-v38")).toBeNull();
  });

  it("räknar bara besvarade frågor", () => {
    expect(veckaBesvarade(veckorad(state, "a", "2026-v38"))).toBe(2);
    expect(veckaBesvarade(null)).toBe(0);
  });

  it("flaggar de svar som kräver åtgärd", () => {
    const flaggade = veckaFlaggor(veckorad(state, "a", "2026-v38"));
    // q1 "ja" är OK, q2 "osaker" är flaggad.
    expect(flaggade.map((f) => f.n)).toEqual([2]);
    expect(veckaFlaggor(null)).toEqual([]);
  });
});
