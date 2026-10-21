import { describe, expect, it } from "vitest";
import { avstandMellan, avstandsbrott, kravMellan, luftFor, skyddsreglerFor } from "./siteSakerhet.js";
import { kanPlaceras, provaPlacering, sattAktivTomt, STANDARDTOMT, TOMT, tomtFor } from "./site.js";

const box = (id, x, z, extra = {}) => ({ id, typ: "container", x, z, bredd: 6.1, djup: 2.5, hojd: 2.9, rotation: 0, ...extra });

describe("skyddsavstånd (F11)", () => {
  it("varje regel har källa; CATL har verifierat 3,0 m, Sungrow saknar värde", () => {
    for (const id of ["catl-pe", "sungrow"]) for (const r of skyddsreglerFor(id)) expect(r.kalla).toBeTruthy();
    expect(kravMellan(skyddsreglerFor("catl-pe"), "container", "container")).toBe(3);
    expect(kravMellan(skyddsreglerFor("sungrow"), "container", "container")).toBe(0);
  });

  it("mäter fritt avstånd mellan fotavtryck, även vridna", () => {
    expect(avstandMellan(box("a", 0, 0), box("b", 0, 2.6))).toBeCloseTo(0.1);
    expect(avstandMellan(box("a", 0, 0), box("b", 0, 5.5))).toBeCloseTo(3);
    expect(avstandMellan(box("a", 0, 0), box("b", 0, 1))).toBe(0);
    expect(avstandMellan(box("a", 0, 0, { rotation: 90 }), box("b", 4.25, 0, { rotation: 90 }))).toBeCloseTo(1.75);
  });

  it("0,1 m mellan containrar ger ett avståndsbrott med kravet och källan", () => {
    const b = avstandsbrott([box("a", 0, 0), box("b", 0, 2.6), box("c", 0, 8.6)], skyddsreglerFor("catl-pe"));
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ avstand: 0.1, krav: 3 });
    expect(b[0].regel.kalla).toMatch(/CATL/);
  });

  it("kantsnappen drar en ny container till kravets avstånd, inte kant mot kant", () => {
    const regler = skyddsreglerFor("catl-pe");
    const ny = { typ: "container", bredd: 6.1, djup: 2.5, hojd: 2.9, rotation: 0 };
    const res = provaPlacering(ny, { x: 0, z: 5.4 }, [box("a", 0, 0)], { luft: 0, snappLuft: luftFor(regler, "container") });
    expect(res.z).toBeCloseTo(5.5);
    expect(res.ok).toBe(true);
  });
});

describe("projektets tomt (F11)", () => {
  it("läser projektets mått och faller tillbaka på standard", () => {
    expect(tomtFor({ siteTomt: { bredd: 120, djup: 60 } })).toEqual({ bredd: 120, djup: 60 });
    expect(tomtFor({ siteTomt: { bredd: 5, djup: 60 } })).toEqual(STANDARDTOMT);
    expect(tomtFor(null)).toEqual(STANDARDTOMT);
  });

  it("aktiv tomt styr vad som ryms", () => {
    const o = box("a", 50, 0);
    expect(kanPlaceras(o, []).ok).toBe(false);
    sattAktivTomt({ bredd: 120, djup: 60 });
    expect(TOMT.bredd).toBe(120);
    expect(kanPlaceras(o, []).ok).toBe(true);
    sattAktivTomt(STANDARDTOMT);
  });
});
