import { describe, expect, it } from "vitest";
import { ANBUDSFRAGOR, anbudsBedomning, anbudsljusId, matrisFalt, matrisLjus, matrisPlats } from "./anbudsfragor.js";

const [forsta] = ANBUDSFRAGOR;

describe("riskmatrisen", () => {
  it("ger tre gröna, tre gula och tre röda rutor", () => {
    const rutor = [1, 2, 3].flatMap((s) => [1, 2, 3].map((k) => matrisLjus(s, k)));
    expect(rutor.filter((l) => l === "gron")).toHaveLength(3);
    expect(rutor.filter((l) => l === "gul")).toHaveLength(3);
    expect(rutor.filter((l) => l === "rod")).toHaveLength(3);
    expect(matrisLjus(1, 1)).toBe("gron");
    expect(matrisLjus(2, 2)).toBe("gul");
    expect(matrisLjus(3, 1)).toBe("gul");
    expect(matrisLjus(2, 3)).toBe("rod");
  });

  it("saknad eller ogiltig nivå ger inget ljus", () => {
    expect(matrisLjus(0, 2)).toBe("");
    expect(matrisLjus("", 2)).toBe("");
    expect(matrisLjus(2, 4)).toBe("");
  });

  it("placering skriver ljuset och tas bort utan att röra det", () => {
    const v = matrisFalt(forsta, { sannolikhet: 3, konsekvens: 3 });
    expect(v[anbudsljusId(forsta)]).toBe("rod");
    expect(matrisPlats(v, forsta)).toEqual({ sannolikhet: 3, konsekvens: 3, ljus: "rod" });
    expect(anbudsBedomning(v).antal.rod).toBe(1);
    const bort = { ...v, ...matrisFalt(forsta, null) };
    expect(matrisPlats(bort, forsta)).toBeNull();
    expect(bort[anbudsljusId(forsta)]).toBe("rod");
  });
});
