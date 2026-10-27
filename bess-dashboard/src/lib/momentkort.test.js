import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { faslage, grindSaknas } from "./epc.js";
import { datumSpann, saknasSammanfattning, styrandeLeveranser, tidslage } from "./momentkort.js";

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const lage = (over = {}) => ({
  fas: { nr: 11, grind: { kod: "G11" } },
  start: "2026-11-09",
  slut: "2026-11-15",
  egenPlan: false,
  grind: { passerad: false, datum: null },
  ...over,
});

describe("datumSpann", () => {
  it("skriver månaden en gång när den är densamma", () => {
    expect(datumSpann("2026-11-09", "2026-11-15")).toBe("9–15 nov");
    expect(datumSpann("2026-09-28", "2026-11-20")).toBe("28 sep – 20 nov");
    expect(datumSpann("", "2026-11-15")).toBe("");
  });
});

describe("tidslage", () => {
  it("räknar dagar till start före momentet", () => {
    expect(tidslage(lage(), "2026-10-26")).toEqual({ datum: "9–15 nov", lage: "start om 14 d", plan: "standardplan", ton: "info" });
  });
  it("räknar dagar kvar medan momentet pågår och dagar sen efter slut", () => {
    expect(tidslage(lage(), "2026-11-12").lage).toBe("pågår, 3 d kvar");
    expect(tidslage(lage(), "2026-11-15").lage).toBe("pågår, slut idag");
    expect(tidslage(lage(), "2026-11-18")).toMatchObject({ lage: "3 d sen", ton: "bad" });
  });
  it("visar egna datum och grinddatum när grinden är passerad", () => {
    expect(tidslage(lage({ egenPlan: true }), "2026-10-26").plan).toBe("egna datum");
    expect(tidslage(lage({ grind: { passerad: true, datum: "2026-10-22" } }), "2026-10-26")).toMatchObject({
      lage: "G11 passerad 22 okt",
      plan: null,
      ton: "ok",
    });
  });
  it("säger till när momentet saknar datum", () => {
    expect(tidslage(lage({ start: null, slut: null }), "2026-10-26").lage).toMatch(/Datum saknas/);
  });
});

describe("styrandeLeveranser", () => {
  const NU = "2026-10-26";
  const med = (rader) => {
    const s = seed();
    return { ...s, leveranser: [...s.leveranser, ...rader] };
  };

  it("tar bara leveranser med uttryckligt moment", () => {
    const s = med([{ id: "skid", projektId: "36038", benamning: "MV-skid", datum: "2026-09-01", status: "preliminar", moment: 11 }]);
    const m = styrandeLeveranser(s, "36038", NU);
    expect(m.get(11).map((r) => r.id)).toEqual(["skid"]);
    // Seedens "MV-ställverk / MV-station" har inget moment och gissas bara till 10.
    expect(m.has(10)).toBe(false);
    expect(m.get(11)[0]).toMatchObject({ statusText: "preliminär", ton: "warn" });
  });

  it("markerar en ej levererad leverans efter momentets start som försenande", () => {
    let s = med([]);
    const start = faslage(s, "36038", NU)[11].start;
    s = med([{ id: "sen", projektId: "36038", benamning: "MV-skid", datum: "2099-01-01", status: "bekraftad", moment: 11 }]);
    const r = styrandeLeveranser(s, "36038", NU).get(11)[0];
    expect(start).toBeTruthy();
    expect(r.forsenarDagar).toBeGreaterThan(0);
    expect(r.ton).toBe("bad");
  });

  it("räknar aldrig en levererad leverans som försenande", () => {
    const s = med([{ id: "lev", projektId: "36038", benamning: "MV-skid", datum: "2099-01-01", status: "klar", moment: 11 }]);
    expect(styrandeLeveranser(s, "36038", NU).get(11)[0]).toMatchObject({ forsenarDagar: 0, ton: "ok", statusText: "levererad" });
  });
});

describe("saknasSammanfattning", () => {
  it("räknar per typ med hållpunkter först och pekar på första raden", () => {
    const { delar: s, ejRegistrerade } = saknasSammanfattning({
      punkter: [
        { id: "11.4", hp: true },
        { id: "11.5", hp: true },
        { id: "11.1", hp: false, ejRegistrerad: true },
      ],
      kontroller: [{ id: "a" }, { id: "b" }],
      avvikelser: 0,
      grinddatum: true,
      klart: false,
    });
    expect(s.map((d) => [d.typ, d.antal, d.forsta])).toEqual([
      ["hp", 2, "11.4"],
      ["punkter", 1, "11.1"],
      ["kontroller", 2, null],
      ["klartecken", 1, null],
    ]);
    expect(s[1].etikett).toBe("punkt");
    expect(ejRegistrerade).toBe(1);
  });

  it("är tom när grinden kan passeras", () => {
    expect(saknasSammanfattning({ klart: true }).delar).toEqual([]);
  });

  it("fungerar mot grindSaknas för seedens projekt", () => {
    const { delar: s } = saknasSammanfattning(grindSaknas(seed(), "36038", 11, "2026-10-26"));
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].typ).toBe("hp");
  });
});
