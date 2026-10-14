import { describe, expect, it } from "vitest";
import { etiketterUrText, nyRitning, pappersformat, placeraEfterEtiketter, ritningsFel, ritningsMatt, ritningsText, skalaUrText } from "./ritningar.js";

// Sidmått i punkter för ritningarna från Växjö (pdfinfo).
const A3 = { b: 1191, h: 842 };
const A1_STAENDE = { b: 1684, h: 2384 };

describe("skala ur ritningshuvudet", () => {
  it("väljer skalan för sidans format när huvudet anger flera", () => {
    const t = "BYGGHANDLING SKALA A3 1:250 A1 1:500 NUMMER E-63-1-100";
    expect(skalaUrText(t, "A3")).toBe(250);
    expect(skalaUrText(t, "A1")).toBe(500);
  });

  it("tar skalan närmast ordet skala, inte måttangivelser", () => {
    expect(skalaUrText("1:21 SKALA 1:100 0 1 2 METER 5 10 SKALA 1:100 1:200 NUMMER", "A1")).toBe(100);
    expect(skalaUrText("plan 1:50")).toBe(50);
    expect(skalaUrText("ingen skala här")).toBeNull();
    expect(skalaUrText("1:2 och 1:9")).toBeNull();
  });

  it("känner igen pappersformatet, liggande och stående", () => {
    expect(pappersformat(A3.b, A3.h)).toBe("A3");
    expect(pappersformat(A1_STAENDE.b, A1_STAENDE.h)).toBe("A1");
    expect(pappersformat(500, 500)).toBe("");
  });
});

describe("mått på marken", () => {
  it("räknar PDF-sidan i skala till meter", () => {
    const r = nyRitning({ id: "r1", projektId: "36037", filnamn: "E-63-1-100.pdf", sida: A3, text: "SKALA A3 1:250 A1 1:500" });
    expect(r.skala).toBe(250);
    expect(r.skalaKalla).toBe("ritningen");
    const m = ritningsMatt(r);
    expect(m.bredd).toBeCloseTo(105.0, 0);
    expect(m.djup).toBeCloseTo(74.3, 0);
    expect(ritningsText(r)).toBe("A3 · 1:250 · 105 × 74,3 m");
  });

  it("antar 1:100 och säger det när skalan saknas", () => {
    const r = nyRitning({ id: "r2", projektId: "p", filnamn: "x.pdf", sida: A3, text: "" });
    expect(r.skala).toBe(100);
    expect(ritningsText(r)).toContain("(antagen)");
  });

  it("använder angiven bredd och bildens proportion för en bild", () => {
    const r = nyRitning({ id: "r3", projektId: "p", filnamn: "plan.png", proportion: 0.5 });
    expect(r.namn).toBe("plan");
    expect(ritningsMatt({ ...r, bredd: 60 })).toEqual({ bredd: 60, djup: 30 });
  });
});

describe("ändringar", () => {
  it("tillåter placering och skala men inte fil eller projekt", () => {
    expect(ritningsFel({ x: 3, z: -2, rotation: 90, skala: 200, opacitet: 0.5, synlig: false, namn: "Plan" })).toBeNull();
    expect(ritningsFel({ skala: 0 })).toMatch(/större än noll/);
    expect(ritningsFel({ opacitet: 2 })).toMatch(/0,1 och 1/);
    expect(ritningsFel({ sokvag: "x" })).toMatch(/kan inte ändras/);
    expect(ritningsFel({ x: 9999 })).toMatch(/för långt/);
  });
});

describe("placering efter beteckningar", () => {
  const A3s = { b: 1191, h: 842 };
  // Etiketter som pdfjs ger dem (y uppåt från sidans botten).
  const bit = (str, x, y) => ({ str, width: 0, transform: [8, 0, 0, 8, x, 842 - y - 4] });

  it("plockar SKID- och +B-beteckningar men inte förklaringar", () => {
    const e = etiketterUrText([bit("SKID 1", 759, 386), bit("+B1a", 773, 252), bit("+B1 / B2", 1056, 105), bit("TRAFO", 922, 496), bit("SKID 1", 10, 10)], 842);
    expect(e.map((x) => x.namn)).toEqual(["SKID 1", "+B1a"]);
    expect(e[0]).toMatchObject({ x: 759, y: 386 });
  });

  it("lägger ritningen så att beteckningarna hamnar över enheterna", () => {
    const m = (0.0254 / 72) * 250;
    // Enheterna står där ritningen säger, förskjutna (3, −2) m från ritningens mitt.
    const objekt = [
      { typ: "skid", namn: "SKID 1", x: 3 + (759 - 595.5) * m, z: -2 + (386 - 421) * m },
      { typ: "container", namn: "+B1a", x: 3 + (773 - 595.5) * m, z: -2 + (252 - 421) * m },
    ];
    const p = placeraEfterEtiketter([{ namn: "SKID 1", x: 759, y: 386 }, { namn: "+B1a", x: 773, y: 252 }], objekt, A3s, 250);
    expect(p).toMatchObject({ x: 3, z: -2, antal: 2, avvikelse: 0 });
    expect(placeraEfterEtiketter([{ namn: "SKID 9", x: 1, y: 1 }], objekt, A3s, 250)).toBeNull();
  });
});
