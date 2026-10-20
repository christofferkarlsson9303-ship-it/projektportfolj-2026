import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ANBUDSMODELLER, anbudsmodellFor } from "./anbudsmodeller.js";
import { kompassVinkel } from "./site.js";

describe("anbudsmodellFor", () => {
  it("hittar Vaggeryd på namn, ort eller plats", () => {
    expect(anbudsmodellFor({ namn: "Vaggeryd 100 MW" })?.id).toBe("vaggeryd-100mw");
    expect(anbudsmodellFor({ namn: "BESS anbud", ort: "vaggeryd" })?.id).toBe("vaggeryd-100mw");
    expect(anbudsmodellFor({ namn: "Nytt", plats: "Båramo 1:17" })?.id).toBe("vaggeryd-100mw");
  });

  it("ger null för andra projekt och utan projekt", () => {
    expect(anbudsmodellFor({ namn: "Växjö Batteripark", ort: "Växjö" })).toBeNull();
    expect(anbudsmodellFor({})).toBeNull();
    expect(anbudsmodellFor(null)).toBeNull();
  });

  it("varje modell har sin fil i src/sections/Site/anbud", () => {
    for (const m of ANBUDSMODELLER) {
      const fil = fileURLToPath(new URL(`../sections/Site/anbud/${m.fil}`, import.meta.url));
      expect(existsSync(fil), m.fil).toBe(true);
    }
  });
});

describe("kompassVinkel", () => {
  const nara = (a, b) => expect(a).toBeCloseTo(b, 6);

  it("norr uppåt när kameran står i söder och tittar mot norr (−Z)", () => {
    nara(kompassVinkel({ x: 0, z: 50 }, { x: 0, z: 0 }), 0);
  });

  it("norr åt höger när kameran står i öster och tittar mot väster", () => {
    nara(kompassVinkel({ x: 50, z: 0 }, { x: 0, z: 0 }), 90);
  });

  it("norr nedåt när kameran tittar mot söder", () => {
    nara(Math.abs(kompassVinkel({ x: 0, z: -50 }, { x: 0, z: 0 })), 180);
  });

  it("i gåläget blir vinkeln yaw i grader", () => {
    const yaw = 0.7;
    const pos = { x: 3, z: -2 };
    const mal = { x: pos.x - Math.sin(yaw), z: pos.z - Math.cos(yaw) };
    nara(kompassVinkel(pos, mal), (yaw * 180) / Math.PI);
  });

  it("rakt ovanifrån ger 0 i stället för NaN", () => {
    expect(kompassVinkel({ x: 1, z: 1 }, { x: 1, z: 1 })).toBe(0);
  });
});
