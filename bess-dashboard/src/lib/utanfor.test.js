import { describe, expect, it } from "vitest";
import { nyUtanfor, sammanstall, VART } from "./utanfor.js";
import { SEED } from "../data/seed.js";
import { normalisera, reducer } from "../state/portfolj-reducer.js";

const nu = new Date("2026-10-05T12:00:00Z");
const dag = (n) => new Date(nu.getTime() - n * 864e5);

describe("Utanför appen", () => {
  it("en rad kräver bara vart", () => {
    const r = nyUtanfor({ vart: "Excel", nu });
    expect(r).toMatchObject({ vart: "Excel", vad: "", ts: "2026-10-05T12:00:00.000Z" });
    expect(VART).toContain("Teams");
  });

  it("räknar per ställe och vanligaste behov inom 14 dagar, äldre räknas inte", () => {
    const rader = [
      nyUtanfor({ vart: "Excel", vad: "ÄTA-summa", nu: dag(1) }),
      nyUtanfor({ vart: "Excel", vad: "äta-summa", nu: dag(2) }),
      nyUtanfor({ vart: "Teams", vad: "Ritning", nu: dag(3) }),
      nyUtanfor({ vart: "Mejl", nu: dag(20) }),
    ];
    const s = sammanstall(rader, { nu });
    expect(s.antal).toBe(3);
    expect(s.perVart).toEqual([["Excel", 2], ["Teams", 1]]);
    expect(s.vanligast[0]).toEqual(["ÄTA-summa", 2]);
  });

  it("listan finns i portföljen och följer med vid normalisering", () => {
    expect(SEED.utanfor).toEqual([]);
    const s = reducer(normalisera(structuredClone(SEED)), { type: "LAGG_TILL", lista: "utanfor", rad: nyUtanfor({ vart: "Papper", nu }) });
    expect(normalisera(s).utanfor).toHaveLength(1);
  });
});
