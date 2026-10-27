import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, reducer } from "../state/portfolj-reducer.js";
import { MOMENT_LISTOR, aktuelltMoment, medPostmoment } from "./postmoment.js";
import { momentIFas, projektfasForMoment } from "./fasmappning.js";

const ladda = () => efterInlasning(structuredClone(SEED));
const arMoment = (m) => Number.isInteger(m) && m >= 0 && m <= 15;

describe("moment på alla poster", () => {
  it("ger äldre poster ett antaget moment vid inläsning, utom poster utan känt projekt", () => {
    const s = ladda();
    const kanda = new Set(s.projekt.map((p) => p.id));
    for (const lista of MOMENT_LISTOR) {
      for (const r of s[lista] || []) {
        if (!kanda.has(r.projektId)) continue;
        expect(arMoment(r.moment), `${lista} ${r.id}`).toBe(true);
        expect(["antaget", "auto", undefined]).toContain(r.momentKalla);
      }
    }
    expect(s.punkter.some((r) => r.momentKalla === "antaget")).toBe(true);
  });

  it("är idempotent och rör inte ett valt moment", () => {
    const s = ladda();
    expect(medPostmoment(s)).toBe(s);
    const pid = s.projekt[0].id;
    const vald = { ...structuredClone(SEED), punkter: [{ id: "p-vald", projektId: pid, titel: "Vald", moment: 3, momentKalla: "vald" }] };
    const efter = efterInlasning(vald);
    expect(efter.punkter.find((r) => r.id === "p-vald")).toMatchObject({ moment: 3, momentKalla: "vald" });
  });

  it("en ny punkt får projektets aktuella moment, oavsett vilken åtgärd som skapar den", () => {
    const s = ladda();
    const pid = s.projekt[0].id;
    const m = aktuelltMoment(s, pid);
    expect(arMoment(m)).toBe(true);
    const efter = reducer(s, { type: "LAGG_TILL", lista: "punkter", rad: { id: "p-ny", projektId: pid, titel: "Ny" } });
    expect(efter.punkter.find((r) => r.id === "p-ny")).toMatchObject({ moment: m, momentKalla: "auto" });
  });

  it("en ny ÄTA och en ny dagboksrad får moment, en leverans gör det inte", () => {
    const s = ladda();
    const pid = s.projekt[0].id;
    let t = reducer(s, { type: "LAGG_TILL", lista: "ur", rad: { id: "u-ny", projektId: pid, nr: "ÄTA-99", benamning: "Test" } });
    t = reducer(t, { type: "LAGG_TILL", lista: "dagbok", rad: { id: "d-ny", projektId: pid, datum: "2026-10-27" } });
    t = reducer(t, { type: "LAGG_TILL", lista: "leveranser", rad: { id: "l-ny", projektId: pid, benamning: "Trafo" } });
    expect(arMoment(t.ur.find((r) => r.id === "u-ny").moment)).toBe(true);
    expect(arMoment(t.dagbok.find((r) => r.id === "d-ny").moment)).toBe(true);
    expect(t.leveranser.find((r) => r.id === "l-ny").moment).toBeUndefined();
  });

  it("en risk i en annan fas än projektets får fasens första moment", () => {
    const s = ladda();
    const p = s.projekt[0];
    const annanFas = p.fas === 7 ? 2 : 7;
    const t = reducer(s, { type: "LAGG_TILL", lista: "risker", rad: { id: "r-ny", projektId: p.id, titel: "Risk", fas: annanFas } });
    const r = t.risker.find((x) => x.id === "r-ny");
    expect(r.moment).toBe(momentIFas(annanFas)[0]);
    expect(projektfasForMoment(r.moment)).toBe(annanFas);
  });

  it("en post i ett okänt projekt lämnas utan moment", () => {
    const s = ladda();
    const t = reducer(s, { type: "LAGG_TILL", lista: "punkter", rad: { id: "p-x", projektId: "finns-inte", titel: "X" } });
    expect(t.punkter.find((r) => r.id === "p-x").moment).toBeUndefined();
  });

  it("en ändring som inte rör posterna ger samma listor", () => {
    const s = ladda();
    const t = reducer(s, { type: "LAGG_TILL", lista: "kontakter", rad: { id: "k-ny", namn: "Test" } });
    for (const lista of MOMENT_LISTOR) expect(t[lista]).toBe(s[lista]);
  });
});
