import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { sammanfoga } from "./sammanfoga.js";
import { byggKoppling, boundingBoxFor } from "./modellKoppling.js";
import { IFC_MAX_MODELLER, ifcModellRad, ifcObjektForProjekt } from "./ifcModell.js";
import { nyAtaPost } from "./nyaPoster.js";

/* IFC-modeller och ärenden kopplade till IFC-objekt i portfolj-reducern. */

const start = () => efterInlasning(normalisera(structuredClone(SEED)));
const GUID = "3YvctVUKr0kugbFTf53O9L";
const modell = (pid, id = "m1", extra = {}) =>
  ifcModellRad({ id, projektId: pid, namn: "Hall A", filnamn: "a.ifc", objekt: [{ guid: GUID, eid: 41, namn: "Container A", klass: "IfcBuildingElementProxy", bb: [0, 0, 0, 6, 2.5, 3] }], ...extra });

describe("IFC_MODELL_LAGG_TILL / IFC_MODELL_TA_BORT", () => {
  it("sparar modellen och loggar", () => {
    const s = start();
    const pid = s.projekt[0].id;
    const ut = reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) });
    expect(ut.ifcModeller).toHaveLength(1);
    expect(ut.andringslogg[0].text).toMatch(/IFC-modell tillagd: Hall A \(1 objekt\)/);
  });

  it("avvisar ogiltig modell, okänt projekt, dubblett och fler än taket", () => {
    const s = start();
    const pid = s.projekt[0].id;
    expect(reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell("finns-inte") })).toBe(s);
    expect(reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: { ...modell(pid), objekt: [{ guid: "", bb: [] }] } })).toBe(s);
    let ut = reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) });
    expect(reducer(ut, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) })).toBe(ut);
    for (let i = 2; i <= IFC_MAX_MODELLER; i += 1) ut = reducer(ut, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid, `m${i}`) });
    expect(ut.ifcModeller).toHaveLength(IFC_MAX_MODELLER);
    expect(reducer(ut, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid, "m9") })).toBe(ut);
  });

  it("tar bort modellen men lämnar ärendets koppling", () => {
    let s = start();
    const pid = s.projekt[0].id;
    s = reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) });
    const u = nyAtaPost(s, pid, { benamning: "Kabelränna" });
    s = reducer(s, { type: "LAGG_TILL", lista: "ur", rad: u });
    const o = ifcObjektForProjekt(s, pid)[0];
    s = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o) });
    s = reducer(s, { type: "IFC_MODELL_TA_BORT", id: "m1" });
    expect(s.ifcModeller).toHaveLength(0);
    expect(s.ur.find((r) => r.id === u.id).objectGuid).toBe(GUID);
    expect(reducer(s, { type: "IFC_MODELL_TA_BORT", id: "m1" })).toBe(s);
  });
});

describe("ärenden på IFC-objekt", () => {
  it("boundingBoxFor läser lådan ur ett IFC-objekt", () => {
    const o = ifcObjektForProjekt({ ifcModeller: [modell("p")] }, "p")[0];
    expect(boundingBoxFor(o)).toEqual({ min: [0, 0, 0], max: [6, 2.5, 3] });
  });

  it("ATA_KOPPLA_OBJEKT accepterar GlobalId från en IFC-modell i samma projekt, inte ett annat projekt", () => {
    let s = start();
    const pid = s.projekt[0].id;
    s = reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) });
    const u = nyAtaPost(s, pid, { benamning: "Kabelränna" });
    s = reducer(s, { type: "LAGG_TILL", lista: "ur", rad: u });
    const k = byggKoppling(ifcObjektForProjekt(s, pid)[0]);
    expect(k.objectGuid).toBe(GUID);
    expect(reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: k }).ur.find((r) => r.id === u.id).objectGuid).toBe(GUID);
    const annat = s.projekt[1];
    if (annat) {
      const u2 = { ...nyAtaPost(s, annat.id, { benamning: "Annat" }), id: "u-annat" };
      const s2 = reducer(s, { type: "LAGG_TILL", lista: "ur", rad: u2 });
      expect(reducer(s2, { type: "ATA_KOPPLA_OBJEKT", id: u2.id, koppling: k })).toBe(s2);
    }
  });

  it("BCF-import behåller IFC-GUID som objectGuid", () => {
    let s = start();
    const pid = s.projekt[0].id;
    s = reducer(s, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid) });
    const ut = reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [{ ...nyAtaPost(s, pid, { benamning: "Från BCF" }), id: "ubcf-ifc", bcfGuid: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", objectGuid: GUID }], uppdatera: [] });
    expect(ut.ur.find((r) => r.id === "ubcf-ifc")?.objectGuid).toBe(GUID);
  });
});

describe("sammanfoga med ifcModeller", () => {
  it("modeller som läggs till på två ställen finns kvar efter sammanslagning", () => {
    const bas = start();
    const pid = bas.projekt[0].id;
    const a = reducer(bas, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid, "ma") });
    const b = reducer(bas, { type: "IFC_MODELL_LAGG_TILL", modell: modell(pid, "mb") });
    const { varde: ut } = sammanfoga(bas, a, b);
    expect(ut.ifcModeller.map((m) => m.id).sort()).toEqual(["ma", "mb"]);
  });
});
