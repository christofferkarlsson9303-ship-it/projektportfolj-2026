import { describe, expect, it } from "vitest";
import { bedomLagring, laggTillMatning, p95 } from "./matning.js";
import { SEED } from "../data/seed.js";

describe("mätning av portföljdokumentet (F15)", () => {
  it("räknar p95 och håller ringbufferten", () => {
    expect(p95([100, 200, 300, 400, 5000])).toBe(5000);
    expect(p95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
    expect(p95([])).toBeNull();
    expect(laggTillMatning([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });

  it("varnar över gränserna", () => {
    expect(bedomLagring({ kB: 300, p95Ms: 400 }).ton).toBe("ok");
    expect(bedomLagring({ kB: 2000, p95Ms: 400 }).text).toMatch(/2000 kB/);
  });

  it("realistisk portfölj: grunddata plus ett års drift för fyra projekt ligger under gränsen", () => {
    const s = structuredClone(SEED);
    // Antagande om ett års drift: 400 punkter, 120 ÄTA/UR, 600 egenkontroller, 300 siteobjekt.
    const fyll = (lista, n, mall) => Array.from({ length: n }, (_, i) => ({ ...mall, id: `${lista}-${i}` }));
    s.punkter = [...(s.punkter || []), ...fyll("p", 400, { projektId: "36037", titel: "Kontrollera kabelstege vid SKID 3 och dokumentera", status: "oppen", forfaller: "2026-11-01", agare: "Montör A", kommentarer: [] })];
    s.ur = [...(s.ur || []), ...fyll("u", 120, { projektId: "36037", nr: "UR123", benamning: "Tillkommande kabelförläggning", status: "oppen", handelseDatum: "2026-10-01", belopp: 125000 })];
    s.faltkontroller = fyll("k", 600, { projektId: "36037", omfattning: "SKID 1", punktId: "P11.01", resultat: "ok", datum: "2026-10-01", kontrollant: "A. Kontrollant", referens: "EK-2026-001", mallrevision: "2026-10-17.1", notering: "" });
    s.siteObjekt = fyll("o", 300, { projektId: "36037", typ: "container", x: 1.5, z: -4.2, bredd: 6.1, djup: 2.5, hojd: 2.9, rotation: 90, namn: "+B1a", status: "monterad" });
    const kB = Math.round(new TextEncoder().encode(JSON.stringify(s)).length / 1024);
    expect(kB).toBeLessThan(1024);
    // Storleken syns i testutskriften när den behöver följas upp.
    console.info(`F15: uppskattad portfölj efter ett år ${kB} kB`);
  });
});
