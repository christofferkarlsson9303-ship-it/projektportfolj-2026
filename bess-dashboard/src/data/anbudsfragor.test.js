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

describe("förslag på ljus efter frågans typ", () => {
  const fraga = (id) => ANBUDSFRAGOR.find((f) => f.id === id);
  it("bara osäkra händelser hör till matrisen", async () => {
    const { I_MATRIS } = await import("./anbudsfragor.js");
    expect(ANBUDSFRAGOR.filter((f) => I_MATRIS.has(f.typ)).map((f) => f.id)).toEqual(["tider", "viten", "risker", "antaganden", "lonsamhet", "hseq"]);
  });

  it("avtal, nyckelroller, gränsdragning och frågor och svar", async () => {
    const { forslagLjus, AVTAL_ID, NYCKELROLLER, anbudsRollId, OMFATTNING_RADER, QA_RADER } = await import("./anbudsfragor.js");
    expect(forslagLjus(fraga("villkor"), { [AVTAL_ID]: "standard" })).toBe("gron");
    expect(forslagLjus(fraga("villkor"), { [AVTAL_ID]: "beslut" })).toBe("rod");

    const roller = (st) => Object.fromEntries(NYCKELROLLER.map((r) => [anbudsRollId(r), st]));
    expect(forslagLjus(fraga("resurser"), roller("sakrad"))).toBe("gron");
    expect(forslagLjus(fraga("resurser"), { ...roller("sakrad"), af_roll_ue: "pagar" })).toBe("gul");
    expect(forslagLjus(fraga("resurser"), { af_roll_pl: "saknas" })).toBe("rod");
    expect(forslagLjus(fraga("resurser"), { af_roll_pl: "sakrad" })).toBe("");

    expect(forslagLjus(fraga("omfattning"), {}, { [OMFATTNING_RADER]: [{ del: "Nätanslutning", val: "Ingår ej" }] })).toBe("gron");
    expect(forslagLjus(fraga("omfattning"), {}, { [OMFATTNING_RADER]: [{ del: "Byggström", val: "Oklart" }] })).toBe("gul");
    expect(forslagLjus(fraga("fragor"), {}, { [QA_RADER]: [{ fraga: "Kabeldjup?", status: "Väntar svar" }] })).toBe("gul");
    expect(forslagLjus(fraga("fragor"), {}, { [QA_RADER]: [{ fraga: "Kabeldjup?", status: "Besvarad" }] })).toBe("gron");
    expect(forslagLjus(fraga("betalning"), { kassaflodeLagst: "-2 Mkr" })).toBe("");
  });
});
