import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";

/* SATT_PROJEKTFAS: fasmätaren på projektkortet. */

const start = () => efterInlasning(normalisera(structuredClone(SEED)));
const projektI = (s, fas) => {
  const p = s.projekt[0];
  return { s: { ...s, projekt: s.projekt.map((x) => (x.id === p.id ? { ...x, fas, status: fas === 1 ? "PLANERING_OCH_UPPSTART" : x.status } : x)) }, id: p.id };
};

describe("SATT_PROJEKTFAS", () => {
  it("anbudet vunnet: fas 1 → 2 sätter fasen, behåller statusen Planering och uppstart och loggar", () => {
    const { s, id } = projektI(start(), 1);
    const ut = reducer(s, { type: "SATT_PROJEKTFAS", id, fas: 2 });
    const p = ut.projekt.find((x) => x.id === id);
    expect(p.fas).toBe(2);
    expect(p.status).toBe("PLANERING_OCH_UPPSTART");
    expect(ut.andringslogg[0].text).toBe("Fas ändrad: 1. Anbud → 2. Planering (status Planering och uppstart)");
  });

  it("statusen följer fasen: fas 3–6 är Produktion, 7 Slutbesiktning, 8 Avslutat och garanti", () => {
    const { s, id } = projektI(start(), 1);
    const status = (fas) => reducer(s, { type: "SATT_PROJEKTFAS", id, fas }).projekt.find((x) => x.id === id).status;
    expect(status(3)).toBe("PRODUKTION");
    expect(status(6)).toBe("PRODUKTION");
    expect(status(7)).toBe("SLUTBESIKTNING");
    expect(status(8)).toBe("AVSLUTAT_OCH_GARANTI");
  });

  it("går att backa, och ett hopp över faser är tillåtet", () => {
    const { s, id } = projektI(start(), 1);
    const fram = reducer(s, { type: "SATT_PROJEKTFAS", id, fas: 5 });
    expect(fram.projekt.find((x) => x.id === id).fas).toBe(5);
    const bak = reducer(fram, { type: "SATT_PROJEKTFAS", id, fas: 2 });
    expect(bak.projekt.find((x) => x.id === id).fas).toBe(2);
    expect(bak.projekt.find((x) => x.id === id).status).toBe("PLANERING_OCH_UPPSTART");
  });

  it("samma fas igen är en no-op, utan ny loggrad", () => {
    const { s, id } = projektI(start(), 1);
    const a = reducer(s, { type: "SATT_PROJEKTFAS", id, fas: 3 });
    expect(reducer(a, { type: "SATT_PROJEKTFAS", id, fas: 3 })).toBe(a);
  });

  it("avvisar ogiltiga faser och okända projekt, utan att röra state", () => {
    const { s, id } = projektI(start(), 1);
    for (const fas of [0, 9, -1, 2.5, "3", null, undefined, Number.NaN]) expect(reducer(s, { type: "SATT_PROJEKTFAS", id, fas })).toBe(s);
    expect(reducer(s, { type: "SATT_PROJEKTFAS", id: "finns-inte", fas: 2 })).toBe(s);
  });

  it("ett förlorat anbud kan inte ändra fas — det har bara Återaktivera", () => {
    const { s, id } = projektI(start(), 1);
    const forlorat = reducer(s, { type: "MARKERA_EJ_VUNNET", id, orsak: "pris", text: "" });
    expect(reducer(forlorat, { type: "SATT_PROJEKTFAS", id, fas: 3 })).toBe(forlorat);
  });

  it("övriga projekt och fält på projektet rörs inte", () => {
    const { s, id } = projektI(start(), 1);
    const ut = reducer(s, { type: "SATT_PROJEKTFAS", id, fas: 4 });
    const fore = s.projekt.find((x) => x.id === id);
    const efter = ut.projekt.find((x) => x.id === id);
    expect({ ...efter, fas: fore.fas, status: fore.status, fasModell: fore.fasModell }).toEqual(fore);
    expect(ut.projekt.filter((x) => x.id !== id)).toEqual(s.projekt.filter((x) => x.id !== id));
  });

  it("ett projekt utan lagrad fas utgår från statusen", () => {
    const s0 = start();
    const p = s0.projekt[0];
    const s = { ...s0, projekt: s0.projekt.map((x) => (x.id === p.id ? { ...x, fas: undefined, status: "SLUTBESIKTNING" } : x)) };
    const ut = reducer(s, { type: "SATT_PROJEKTFAS", id: p.id, fas: 8 });
    expect(ut.andringslogg[0].text).toContain("Fas ändrad: 7. Slutbesiktning → 8. Avslut och garanti");
  });
});
