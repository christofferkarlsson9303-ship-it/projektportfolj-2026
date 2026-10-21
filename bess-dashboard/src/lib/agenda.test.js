import { describe, expect, it } from "vitest";
import { arbetslage, punktDatum } from "./agenda.js";
import { lokaltDatum } from "./datum.js";

const dag = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return lokaltDatum(d);
};

const punkt = (id, projektId, extra = {}) => ({ id, projektId, titel: `Punkt ${id}`, agare: "Anna", status: "oppen", forfaller: "", ...extra });

const tom = (punkter, ur = []) => ({
  ur,
  hseqIncidenter: [],
  milstolpar: [],
  leveranser: [],
  betalplan: [],
  byggmoten: [],
  projekt: [],
  punkter,
});

describe("punktDatum", () => {
  it("använder uppföljningen när fristen inte har passerat", () => {
    expect(punktDatum({ forfaller: dag(10), uppfoljning: dag(2) })).toBe(dag(2));
  });

  it("låter en passerad frist vinna över en uppföljning längre fram", () => {
    expect(punktDatum({ forfaller: dag(-3), uppfoljning: dag(5) })).toBe(dag(-3));
  });

  it("faller tillbaka på fristen, och på ingenting", () => {
    expect(punktDatum({ forfaller: dag(4) })).toBe(dag(4));
    expect(punktDatum({})).toBe("");
  });

  it("ignorerar ett ogiltigt uppföljningsdatum", () => {
    expect(punktDatum({ forfaller: dag(4), uppfoljning: "ej-datum" })).toBe(dag(4));
  });
});

describe("arbetslage med projektfilter", () => {
  const state = tom([punkt("a", "36037", { forfaller: dag(-1) }), punkt("b", "36038", { forfaller: dag(-1) }), punkt("c", "bada", { forfaller: dag(-2) })]);

  it("utan projekt ser man hela portföljen", () => {
    expect(arbetslage(state).forfallet.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("med projekt ser man bara det projektet och rader för båda parkerna", () => {
    expect(arbetslage(state, 30, "36037").forfallet.map((r) => r.id).sort()).toEqual(["a", "c"]);
    expect(arbetslage(state, 30, "36038").forfallet.map((r) => r.id).sort()).toEqual(["b", "c"]);
  });

  it("ett annat projekt ser inget", () => {
    expect(arbetslage(state, 30, "annat").forfallet).toEqual([]);
  });

  it("filtrerar även ärenden utan händelsedatum", () => {
    const s = tom([], [
      { id: "u1", projektId: "36037", nr: "UR001", status: "oppen" },
      { id: "u2", projektId: "36038", nr: "UR002", status: "oppen" },
    ]);
    expect(arbetslage(s, 30, "36037").utanDatum.map((u) => u.nr)).toEqual(["UR001"]);
    expect(arbetslage(s).utanDatum).toHaveLength(2);
  });
});

describe("uppföljning i arbetslistan", () => {
  it("flyttar en punkt till uppföljningsdagen utan att röra fristen", () => {
    const s = tom([punkt("a", "36037", { forfaller: dag(20), uppfoljning: dag(0) })]);
    const l = arbetslage(s, 30, "36037");
    expect(l.idag.map((r) => r.id)).toEqual(["a"]);
    expect(l.idag[0]).toMatchObject({ forfaller: dag(20), uppfoljning: dag(0), agare: "Anna" });
    expect(s.punkter[0].forfaller).toBe(dag(20));
  });

  it("håller en förfallen punkt förfallen trots uppföljning framåt", () => {
    const s = tom([punkt("a", "36037", { forfaller: dag(-2), uppfoljning: dag(6) })]);
    expect(arbetslage(s, 30, "36037").forfallet.map((r) => r.id)).toEqual(["a"]);
  });

  it("tar bort klarmarkerade punkter", () => {
    const s = tom([punkt("a", "36037", { forfaller: dag(0), status: "klarmarkerad" })]);
    expect(arbetslage(s, 30, "36037").idag).toEqual([]);
  });
});
