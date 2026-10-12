import { describe, expect, it } from "vitest";
import {
  IFC_MAX_OBJEKT,
  bbFranPositioner,
  centreringsFlytt,
  flyttaBb,
  fmtStorlek,
  ifcModellFel,
  ifcModellRad,
  ifcObjektForProjekt,
  ifcObjektSomSite,
  kompaktaObjekt,
  kortKlass,
  slaIhopBb,
  sokIfcObjekt,
} from "./ifcModell.js";

const o = (guid, extra = {}) => ({ guid, eid: 1, namn: guid, klass: "IfcWall", bb: [0, 0, 0, 1, 1, 1], ...extra });

describe("lådor", () => {
  it("omslutande låda ur positioner", () => {
    expect(bbFranPositioner([1, 2, 3, -1, 5, 0, 4, 0, 2])).toEqual([-1, 0, 0, 4, 5, 3]);
    expect(bbFranPositioner([])).toBeNull();
    expect(bbFranPositioner(null)).toBeNull();
    expect(bbFranPositioner(new Float32Array([0.5, 0.5, 0.5]))).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  });

  it("slår ihop lådor och hoppar över null", () => {
    expect(slaIhopBb([[0, 0, 0, 1, 1, 1], null, [-2, 0, 0.5, 0.5, 3, 2]])).toEqual([-2, 0, 0, 1, 3, 2]);
    expect(slaIhopBb([null])).toBeNull();
    expect(slaIhopBb([])).toBeNull();
  });

  it("centreringen lägger fotavtrycket på tomtens mitt och lägsta punkten på marken", () => {
    const bb = [100, 5, 200, 120, 15, 230];
    const flytt = centreringsFlytt(bb);
    expect(flytt).toEqual([-110, -5, -215]);
    const ny = flyttaBb(bb, flytt);
    expect(ny).toEqual([-10, 0, -15, 10, 10, 15]);
    expect(centreringsFlytt(null)).toEqual([0, 0, 0]);
  });
});

describe("kompaktaObjekt()", () => {
  it("behåller guid, eid, namn, klass och låda och avrundar lådan", () => {
    const r = kompaktaObjekt([o("A", { eid: 41, namn: "Container A", klass: "IfcBuildingElementProxy", bb: [6.9501, 0, -5.25, 13.05, 2.9, -2.75] })]);
    expect(r.objekt).toEqual([{ guid: "A", eid: 41, namn: "Container A", klass: "IfcBuildingElementProxy", bb: [6.95, 0, -5.25, 13.05, 2.9, -2.75] }]);
    expect(r).toMatchObject({ antal: 1, avkortad: false });
  });

  it("hoppar över rum, öppningar, objekt utan GUID eller låda, och dubbletter", () => {
    const r = kompaktaObjekt([o("A"), o("B", { klass: "IfcSpace" }), o("C", { klass: "IfcOpeningElement" }), o("", {}), o("D", { bb: null }), o("A"), o("E")]);
    expect(r.objekt.map((x) => x.guid)).toEqual(["A", "E"]);
    expect(r.antal).toBe(2);
  });

  it("avkortar vid taket men räknar alla", () => {
    const lista = Array.from({ length: 10 }, (_, i) => o(`G${i}`));
    const r = kompaktaObjekt(lista, 4);
    expect(r.objekt).toHaveLength(4);
    expect(r.antal).toBe(10);
    expect(r.avkortad).toBe(true);
    expect(kompaktaObjekt(lista).avkortad).toBe(false);
    expect(IFC_MAX_OBJEKT).toBe(3000);
  });

  it("tål saknad lista och klipper långa namn", () => {
    expect(kompaktaObjekt(undefined)).toEqual({ objekt: [], antal: 0, avkortad: false });
    expect(kompaktaObjekt([o("A", { namn: "x".repeat(500) })]).objekt[0].namn).toHaveLength(120);
  });
});

describe("modellrad och validering", () => {
  const rad = (extra = {}) => ifcModellRad({ id: "m1", projektId: "p1", namn: "Park", filnamn: "park.ifc", storlek: 1234, schema: "IFC4", objekt: [{ guid: "A", eid: 1, namn: "A", klass: "IfcWall", bb: [0, 0, 0, 1, 1, 1] }], ...extra });

  it("bygger en rad med standardvärden", () => {
    const r = rad();
    expect(r).toMatchObject({ id: "m1", projektId: "p1", namn: "Park", filnamn: "park.ifc", storlek: 1234, schema: "IFC4", antal: 1, avkortad: false, forskjutning: [0, 0, 0] });
    expect(r.datum).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rad({ namn: "  ", filnamn: "x.ifc" }).namn).toBe("x.ifc");
  });

  it("en bra modell har inget fel", () => {
    expect(ifcModellFel(rad())).toBeNull();
  });

  it("avvisar saknat id, projekt och objekt, för många objekt, saknat GUID och ogiltig låda", () => {
    expect(ifcModellFel(null)).toMatch(/saknas/);
    expect(ifcModellFel({ ...rad(), id: "" })).toMatch(/id/);
    expect(ifcModellFel({ ...rad(), projektId: "" })).toMatch(/projekt/);
    expect(ifcModellFel({ ...rad(), objekt: null })).toMatch(/objekt/);
    expect(ifcModellFel({ ...rad(), objekt: Array.from({ length: IFC_MAX_OBJEKT + 1 }, (_, i) => ({ guid: `G${i}`, bb: [0, 0, 0, 1, 1, 1] })) })).toMatch(/fler än/);
    expect(ifcModellFel({ ...rad(), objekt: [{ guid: "", bb: [0, 0, 0, 1, 1, 1] }] })).toMatch(/GlobalId/);
    expect(ifcModellFel({ ...rad(), objekt: [{ guid: "A", bb: [0, 0, 0] }] })).toMatch(/ogiltig låda/);
    expect(ifcModellFel({ ...rad(), objekt: [{ guid: "A", bb: [0, 0, 0, 1, 1, Number.NaN] }] })).toMatch(/ogiltig låda/);
    expect(ifcModellFel({ ...rad(), objekt: [{ guid: "A", bb: [2, 0, 0, 1, 1, 1] }] })).toMatch(/min är större än max/);
  });
});

describe("objekt på siten", () => {
  const m = { id: "m1", projektId: "p1", objekt: [{ guid: "G1", eid: 7, namn: "Vägg 1", klass: "IfcWall", bb: [0, 0, 0, 1, 2, 3] }, { guid: "G2", eid: 8, namn: "", klass: "IfcSlab", bb: [0, 0, 0, 1, 1, 1] }] };

  it("GlobalId blir objektets id, så att ärenden och BCF pratar om samma sak", () => {
    const x = ifcObjektSomSite(m.objekt[0], m);
    expect(x).toMatchObject({ id: "G1", typ: "ifc", namn: "Vägg 1", klass: "IfcWall", eid: 7, modellId: "m1", projektId: "p1" });
    expect(ifcObjektSomSite(m.objekt[1], m).namn).toBe("IfcSlab");
  });

  it("samlar bara projektets modeller", () => {
    const state = { ifcModeller: [m, { ...m, id: "m2", projektId: "p2", objekt: [{ guid: "X", bb: [0, 0, 0, 1, 1, 1] }] }] };
    expect(ifcObjektForProjekt(state, "p1").map((x) => x.id)).toEqual(["G1", "G2"]);
    expect(ifcObjektForProjekt(state, "p3")).toEqual([]);
    expect(ifcObjektForProjekt({}, "p1")).toEqual([]);
  });

  it("sökning på namn, klass och GlobalId, högst max träffar", () => {
    const lista = ["Vägg 1", "Vägg 2", "Pelare"].map((n, i) => ifcObjektSomSite({ guid: `ABC${i}`, eid: i, namn: n, klass: i < 2 ? "IfcWall" : "IfcColumn", bb: [0, 0, 0, 1, 1, 1] }, m));
    expect(sokIfcObjekt(lista, "vägg").map((x) => x.namn)).toEqual(["Vägg 1", "Vägg 2"]);
    expect(sokIfcObjekt(lista, "column")).toHaveLength(1);
    expect(sokIfcObjekt(lista, "abc2")).toHaveLength(1);
    expect(sokIfcObjekt(lista, "vägg", 1)).toHaveLength(1);
    expect(sokIfcObjekt(lista, "  ")).toEqual([]);
    expect(sokIfcObjekt(lista, "finns inte")).toEqual([]);
  });
});

describe("hjälpare", () => {
  it("storlek och klassnamn", () => {
    expect(fmtStorlek(512)).toBe("512 B");
    expect(fmtStorlek(2048)).toBe("2 kB");
    expect(fmtStorlek(12.4 * 1024 * 1024)).toBe("12,4 MB");
    expect(fmtStorlek(undefined)).toBe("0 B");
    expect(kortKlass("IfcBuildingElementProxy")).toBe("BuildingElementProxy");
    expect(kortKlass("")).toBe("Okänd");
  });
});
