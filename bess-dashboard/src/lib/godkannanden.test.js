import { describe, expect, it } from "vitest";
import { kvittensFor, laggIKo, tomKo, validera } from "./godkannanden.js";

describe("godkännanden (F05)", () => {
  it("bara kompletta kontroller och grinddatum ger kvittens", () => {
    const rad = { id: "k", projektId: "p", resultat: "ok", datum: "2026-10-01", kontrollant: "A", referens: "R" };
    expect(kvittensFor({ type: "FALT_KONTROLL", rad })).toMatchObject({ typ: "egenkontroll", objektId: "k", utfordAv: "A" });
    expect(kvittensFor({ type: "FALT_KONTROLL", rad: { ...rad, referens: "" } })).toBeNull();
    expect(kvittensFor({ type: "FALT_KONTROLL", rad: { ...rad, datum: "2026-02-30" } })).toBeNull();
    expect(kvittensFor({ type: "EPC_FAS", pid: "p", fas: 3, falt: "grindDatum", varde: "" }, "C")).toMatchObject({ objektId: "G3", varde: { grindDatum: "" }, utfordAv: "C" });
    expect(kvittensFor({ type: "EPC_FAS", pid: "p", fas: 3, falt: "start", varde: "2026-01-01" })).toBeNull();
  });

  it("validerar som servern", () => {
    expect(validera({ typ: "egenkontroll", varde: { resultat: "ej-tillamplig", datum: "2026-10-01", kontrollant: "A", referens: "R" } })).toEqual(["Ej tillämplig kräver motivering"]);
    expect(validera({ typ: "egenkontroll", varde: { resultat: "ok", datum: "2999-01-01", kontrollant: "A", referens: "R" } })).toEqual(["Kontrolldatum i framtiden"]);
  });

  it("kön behåller senaste värdet per objekt och skiljer nät från nekad", async () => {
    let ko = laggIKo([], { projektId: "p", typ: "grind", objektId: "G1", varde: { grindDatum: "2026-10-01" } });
    ko = laggIKo(ko, { projektId: "p", typ: "grind", objektId: "G1", varde: { grindDatum: "2026-10-02" } });
    ko = laggIKo(ko, { projektId: "p", typ: "grind", objektId: "G2", varde: { grindDatum: "2026-10-02" } });
    expect(ko).toHaveLength(2);
    const res = await tomKo(ko, async (k) => {
      if (k.objektId === "G1") throw Object.assign(new Error("nät"), { code: "PGRST000" });
      throw Object.assign(new Error("nej"), { code: "42501" });
    });
    expect(res.kvar.map((k) => k.objektId)).toEqual(["G1"]);
    expect(res.nekade.map((k) => k.objektId)).toEqual(["G2"]);
  });
});
