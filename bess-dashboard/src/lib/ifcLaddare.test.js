import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { miniIfc, tomIfc } from "../test/miniIfc.js";
import { geometriStorlek, lasIfc } from "./ifcLaddare.js";

/* IFC-läsningen mot den riktiga web-ifc i Node (wasm laddas från node_modules). Utan webbläsare och utan WebGL. */

const require = createRequire(import.meta.url);
const WebIFC = require("web-ifc");
const wasmMapp = `${dirname(require.resolve("web-ifc/web-ifc-node.wasm"))}/`;
const bytes = (s) => new TextEncoder().encode(s);
let api;

beforeAll(async () => {
  api = new WebIFC.IfcAPI();
  api.SetWasmPath(wasmMapp, true);
  await api.Init(undefined, true);
}, 30000);

afterAll(() => {
  api?.Dispose?.();
});

const nara = (a, b, d = 2) => expect(a).toBeCloseTo(b, d);

describe("lasIfc() — metadata", () => {
  it("läser schema, GlobalId, expressID, namn och klass för varje objekt", () => {
    const r = lasIfc(api, bytes(miniIfc()), { centrera: false });
    expect(r.schema).toBe("IFC4");
    expect(r.objekt).toHaveLength(2);
    const c = r.objekt.find((o) => o.guid === "3YvctVUKr0kugbFTf53O9L");
    expect(c).toMatchObject({ eid: 41, namn: "Container A", klass: "IfcBuildingElementProxy" });
    const t = r.objekt.find((o) => o.guid === "4YvctVUKr0kugbFTf53O9L");
    expect(t).toMatchObject({ eid: 57, namn: "Trafo B", klass: "IfcBuildingElementProxy" });
    expect(r.antal).toBe(2);
    expect(r.avkortad).toBe(false);
  });

  it("omslutande lådan är rätt i Y upp och meter (Z upp i IFC blir höjd, IFC:s Y blir −Z)", () => {
    const r = lasIfc(api, bytes(miniIfc()), { centrera: false });
    const c = r.objekt.find((o) => o.eid === 41).bb;
    // Container 6,1 × 2,5 × 2,9 med mitt i IFC-punkt (10, 4, 0): x 6,95–13,05, höjd 0–2,9, z = −IFC-y = −5,25…−2,75.
    [6.95, 0, -5.25, 13.05, 2.9, -2.75].forEach((v, i) => nara(c[i], v));
    const t = r.objekt.find((o) => o.eid === 57).bb;
    [18.4, 0, -5.3, 21.6, 2.6, -2.7].forEach((v, i) => nara(t[i], v));
  });

  it("millimeter ger samma meter som meter-filen", () => {
    const m = lasIfc(api, bytes(miniIfc({ enhet: "metre" })), { centrera: false });
    const mm = lasIfc(api, bytes(miniIfc({ enhet: "mm" })), { centrera: false });
    for (let i = 0; i < 2; i += 1) mm.objekt[i].bb.forEach((v, k) => nara(v, m.objekt[i].bb[k], 1));
  });

  it("modellen centreras: fotavtrycket mitt på tomten och lägsta punkten på marken", () => {
    const r = lasIfc(api, bytes(miniIfc()));
    const [minX, minY, minZ, maxX, maxY, maxZ] = r.bb;
    nara((minX + maxX) / 2, 0);
    nara((minZ + maxZ) / 2, 0);
    nara(minY, 0);
    nara(maxY, 2.9);
    expect(r.forskjutning[0]).toBeLessThan(0); // flyttades mot origo
    // Objektens lådor följer med flytten.
    const c = r.objekt.find((o) => o.eid === 41).bb;
    nara(c[0], 6.95 + r.forskjutning[0]);
  });

  it("modellen ligger kvar där den är när centrera är av", () => {
    const r = lasIfc(api, bytes(miniIfc()), { centrera: false });
    expect(r.forskjutning).toEqual([0, 0, 0]);
    nara(r.bb[0], 6.95);
  });

  it("rapporterar framsteg och kan avkortas", () => {
    const steg = [];
    const r = lasIfc(api, bytes(miniIfc()), { onFramsteg: (p) => steg.push(p), maxObjekt: 1 });
    expect(steg.length).toBe(2);
    expect(steg.at(-1)).toEqual({ gjorda: 2, totalt: 2 });
    expect(r.objekt).toHaveLength(1);
    expect(r.antal).toBe(2);
    expect(r.avkortad).toBe(true);
    // Geometrin följer metadatan: bara det behållna objektet har geometri.
    expect(r.geometri.map((g) => g.eid)).toEqual([r.objekt[0].eid]);
  });
});

describe("lasIfc() — geometri", () => {
  it("varje objekt får triangelnät med positioner, normaler, index och färg", () => {
    const r = lasIfc(api, bytes(miniIfc()));
    expect(r.geometri).toHaveLength(2);
    for (const g of r.geometri) {
      expect(g.delar.length).toBeGreaterThan(0);
      for (const d of g.delar) {
        expect(d.pos).toBeInstanceOf(Float32Array);
        expect(d.nor).toBeInstanceOf(Float32Array);
        expect(d.idx).toBeInstanceOf(Uint32Array);
        expect(d.pos.length).toBe(d.nor.length);
        expect(d.pos.length % 3).toBe(0);
        expect(d.idx.length % 3).toBe(0);
        expect(d.farg).toHaveLength(4);
        // Alla index pekar på ett hörn.
        expect(Math.max(...d.idx)).toBeLessThan(d.pos.length / 3);
        // Normalerna är enhetsvektorer.
        for (let i = 0; i < d.nor.length; i += 3) nara(Math.hypot(d.nor[i], d.nor[i + 1], d.nor[i + 2]), 1, 3);
      }
    }
    const s = geometriStorlek(r.geometri);
    expect(s.trianglar).toBe(24); // två lådor, 12 trianglar var
    expect(s.horn).toBeGreaterThan(0);
  });

  it("lådan runt geometrin är densamma som objektets lagrade låda", () => {
    const r = lasIfc(api, bytes(miniIfc()));
    for (const o of r.objekt) {
      const g = r.geometri.find((x) => x.eid === o.eid);
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const d of g.delar) for (let i = 0; i < d.pos.length; i += 3) for (let k = 0; k < 3; k += 1) {
        min[k] = Math.min(min[k], d.pos[i + k]);
        max[k] = Math.max(max[k], d.pos[i + k]);
      }
      [...min, ...max].forEach((v, k) => nara(v, o.bb[k], 2));
    }
  });
});

describe("lasIfc() — fel", () => {
  it("en fil som inte är IFC ger ett begripligt fel", () => {
    expect(() => lasIfc(api, bytes("det här är ingen IFC-fil"))).toThrow(/IFC/);
    expect(() => lasIfc(api, new Uint8Array(0))).toThrow();
  });

  it("en IFC utan objekt med geometri ger ett eget fel", () => {
    expect(() => lasIfc(api, bytes(tomIfc()))).toThrow(/inga objekt med geometri/);
  });

  it("läsningen läcker inte modeller: den går att upprepa många gånger", () => {
    for (let i = 0; i < 5; i += 1) expect(lasIfc(api, bytes(miniIfc())).objekt).toHaveLength(2);
  });
});
