import { describe, expect, it } from "vitest";
import { HARDVARUPROFILER, profilIdFor, vardeText } from "../data/hardvaruprofiler.js";
import { LAGER, kabelvagar, kameravinklar, mattFor, profilKpi, ritningslayout, standardlayout, tredjeSkid } from "./siteLager.js";
import { TOMT, objektFel, provaPlacering } from "./site.js";
import { flygBana, flygTid } from "./modellKoppling.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";

describe("hårdvaruprofiler", () => {
  it("ger Batch C CATL/PE och Vaggeryd Sungrow, och projektets eget val går före", () => {
    expect(profilIdFor({ id: "36037", namn: "Växjö Batteripark" })).toBe("catl-pe");
    expect(profilIdFor({ id: "36038", namn: "Alvesta Batteripark" })).toBe("catl-pe");
    expect(profilIdFor({ id: "v1", namn: "Vaggeryd 100 MW" })).toBe("sungrow");
    expect(profilIdFor({ id: "36037", namn: "Växjö", hardvaruprofil: "sungrow" })).toBe("sungrow");
    expect(profilIdFor({ id: "x", namn: "Okänt", hardvaruprofil: "finns-inte" })).toBe("catl-pe");
  });

  it("har källa på varje värde och märker det som inte är bekräftat", () => {
    for (const p of Object.values(HARDVARUPROFILER)) {
      for (const del of [p.container, p.skid]) {
        for (const [, v] of [["Mått", del.mattKalla], ...del.data]) {
          expect(v.kalla, `${p.id} ${del.benamning}`).toBeTruthy();
          expect(typeof v.verifierad).toBe("boolean");
        }
      }
    }
    const sg = HARDVARUPROFILER.sungrow.container;
    expect(sg.data.find(([n]) => n === "Kapacitet")[1]).toMatchObject({ varde: "6 904", verifierad: true });
    expect(sg.data.find(([n]) => n === "Vikt")[1].verifierad).toBe(false);
    expect(sg.mattKalla.verifierad).toBe(false);
  });

  it("skriver saknade värden som Saknas, aldrig som en siffra", () => {
    expect(vardeText({ varde: null, enhet: "MWh" })).toBe("Saknas");
    expect(vardeText({ varde: "13", enhet: "t" })).toBe("13 t");
  });

  it("ger profilens mått för container och skid", () => {
    expect(mattFor("sungrow", "container")).toEqual({ bredd: 6.058, djup: 2.438, hojd: 2.896 });
    expect(mattFor("catl-pe", "skid")).toEqual({ bredd: 6.1, djup: 2.5, hojd: 2.9 });
    expect(mattFor("catl-pe", "trafo")).toMatchObject({ bredd: 3.2 });
  });
});

describe("standardlayout", () => {
  for (const id of ["catl-pe", "sungrow"]) {
    it(`${id}: giltiga objekt inom tomten som inte krockar`, () => {
      const rader = standardlayout(id, "p1");
      expect(rader.length).toBeGreaterThan(10);
      for (const r of rader) {
        expect(objektFel(r, [])).toBeNull();
        expect(Math.abs(r.x)).toBeLessThan(TOMT.bredd / 2);
        expect(Math.abs(r.z)).toBeLessThan(TOMT.djup / 2);
      }
      for (const r of rader) {
        const res = provaPlacering(r, { x: r.x, z: r.z }, rader, { ignorera: r.id, rutnat: 0 });
        expect(res.ok, `${r.namn} krockar`).toBe(true);
      }
      expect(new Set(rader.map((r) => r.id)).size).toBe(rader.length);
    });
  }

  it("namnger enligt profilen", () => {
    const catl = standardlayout("catl-pe", "p1");
    expect(catl.filter((r) => r.typ === "skid").map((r) => r.namn)).toEqual(["SKID 1", "SKID 2", "SKID 3", "SKID 4", "SKID 5", "SKID 6"]);
    const sg = standardlayout("sungrow", "p1");
    expect(sg.filter((r) => r.typ === "skid").map((r) => r.namn)).toEqual(["MVS 1", "MVS 2", "MVS 3"]);
    expect(sg.find((r) => r.typ === "container")).toMatchObject({ bredd: 6.058, djup: 2.438 });
  });

  it("läggs in på en tom tomt, men aldrig över befintliga enheter", () => {
    let s = efterInlasning(normalisera(structuredClone(SEED)));
    const rader = standardlayout("catl-pe", "36037");
    s = reducer(s, { type: "SITE_STANDARDLAYOUT", projektId: "36037", rader, profil: "CATL / PE" });
    expect(s.siteObjekt.filter((o) => o.projektId === "36037")).toHaveLength(rader.length);
    const igen = reducer(s, { type: "SITE_STANDARDLAYOUT", projektId: "36037", rader: standardlayout("catl-pe", "36037") });
    expect(igen).toBe(s);
    // Rader för fel projekt avvisas.
    const fel = reducer(s, { type: "SITE_STANDARDLAYOUT", projektId: "36038", rader });
    expect(fel).toBe(s);
  });

  it("KPI räknar energi bara när kapaciteten per enhet är känd", () => {
    expect(profilKpi("sungrow", standardlayout("sungrow", "p"))).toMatchObject({ antalCont: 12, beraknadMwh: 82.8 });
    expect(profilKpi("catl-pe", standardlayout("catl-pe", "p")).beraknadMwh).toBeNull();
  });
});

describe("kabellager", () => {
  const rader = standardlayout("catl-pe", "p1");

  it("har filterknapparna i rätt ordning", () => {
    expect(LAGER.map((l) => l.namn)).toEqual(["Märkning", "DC", "HSP 12 kV", "LSP", "Fiber/tele", "Jord"]);
  });

  it("drar DC från varje container till närmaste skid och HSP till ställverk och trafo", () => {
    const v = kabelvagar(rader);
    expect(v.dc).toHaveLength(6);
    expect(v.hsp).toHaveLength(7); // 6 skid + ställverk–trafo
    expect(v.lsp).toHaveLength(12);
    expect(v.fiber).toHaveLength(12);
    // Första containern (x −22,5) går till skiden mitt emot, inte till en annan.
    expect(v.dc[0][0][0]).toBe(-22.5);
    expect(v.dc[0].at(-1)[0]).toBe(-22.5);
  });

  it("lägger en sluten jordring runt enheterna, inom tomten", () => {
    const [ring, ...grenar] = kabelvagar(rader).jord;
    expect(ring[0]).toEqual(ring.at(-1));
    for (const [x, z] of ring) {
      expect(Math.abs(x)).toBeLessThanOrEqual(TOMT.bredd / 2);
      expect(Math.abs(z)).toBeLessThanOrEqual(TOMT.djup / 2);
    }
    expect(grenar.length).toBe(rader.filter((r) => r.typ !== "lada").length);
  });

  it("är tomma utan enheter", () => {
    expect(kabelvagar([])).toEqual({ dc: [], hsp: [], lsp: [], fiber: [], jord: [] });
  });
});

describe("kameravinklar", () => {
  it("har de sex snabbknapparna", () => {
    expect(kameravinklar(standardlayout("catl-pe", "p")).map((v) => v.namn)).toEqual(["Plan & kran", "Grind", "SKID 3", "Batterigata", "Ställverk", "Drönarvy"]);
  });

  it("pekar SKID 3 på tredje skiden och lägger batterigatan mellan raderna", () => {
    const rader = standardlayout("catl-pe", "p");
    expect(tredjeSkid(rader).namn).toBe("SKID 3");
    const gata = kameravinklar(rader).find((v) => v.id === "batterigata").vy;
    expect(gata.cameraPosition[2]).toBe(-4); // containrar z 2, skid z −10
    expect(gata.cameraPosition[1]).toBe(1.7);
    const sg = kameravinklar(standardlayout("sungrow", "p")).find((v) => v.id === "batterigata").vy;
    expect(sg.cameraPosition[2]).toBe(-3); // mellan containerraderna z −9 och 3
  });

  it("stänger av vinklar vars mål saknas på en tom tomt", () => {
    const v = Object.fromEntries(kameravinklar([]).map((x) => [x.id, x.vy]));
    expect(v.skid3).toBeNull();
    expect(v.batterigata).toBeNull();
    expect(v.stallverk).toBeNull();
    expect(v.plan).not.toBeNull();
    expect(v.dronare).not.toBeNull();
  });
});

describe("kameraflygning", () => {
  const fran = { cameraPosition: [0, 10, 0], target: [0, 0, 0], fov: 50 };
  const till = { cameraPosition: [10, 10, 0], target: [0, 0, 0], fov: 50, bage: 8, tid: 1800 };

  it("lyfter i en båge mitt i flygningen och landar exakt", () => {
    expect(flygBana(fran, till, 0).cameraPosition).toEqual([0, 10, 0]);
    expect(flygBana(fran, till, 0.5).cameraPosition[1]).toBeCloseTo(18);
    expect(flygBana(fran, till, 1).cameraPosition).toEqual([10, 10, 0]);
  });

  it("använder vinkelns egen flygtid", () => {
    expect(flygTid(fran, till)).toBe(1800);
    expect(flygTid(fran, { ...till, tid: undefined })).toBeLessThanOrEqual(1400);
  });
});

describe("layout efter ritningen", () => {
  it("ger Växjö fem skid och nio batterienheter efter E-63-1-100, inom tomten och utan krockar", () => {
    const l = ritningslayout("36037");
    expect(l.ritning).toBe("E-63-1-100");
    expect(l.rader.filter((r) => r.typ === "skid").map((r) => r.namn)).toEqual(["SKID 1", "SKID 2", "SKID 3", "SKID 4", "SKID 5"]);
    expect(l.rader.filter((r) => r.typ === "container")).toHaveLength(9);
    for (const r of l.rader) {
      expect(objektFel(r, [])).toBeNull();
      expect(Math.abs(r.x)).toBeLessThan(TOMT.bredd / 2);
      expect(Math.abs(r.z)).toBeLessThan(TOMT.djup / 2);
      expect(provaPlacering(r, { x: r.x, z: r.z }, l.rader, { ignorera: r.id, rutnat: 0 }).ok, `${r.namn} krockar`).toBe(true);
    }
    // SKID 1 ligger i öster, avståndet mellan skid är ungefär 8 m (91–94 pt × 0,088 m).
    const skid = l.rader.filter((r) => r.typ === "skid");
    expect(skid[0].x).toBeGreaterThan(skid[4].x);
    expect(skid[0].x - skid[1].x).toBeCloseTo(8.3, 0);
  });

  it("saknas för projekt utan ritning", () => {
    expect(ritningslayout("36038")).toBeNull();
  });
});
