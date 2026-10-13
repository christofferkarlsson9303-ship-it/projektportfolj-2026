import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { modellFor, ritadMvStation } from "./siteTexturer.js";

describe("MV-station ritad i koden", () => {
  it("står på marken med kapslingens mått och skalas 1:1 mot profilens bredd", () => {
    const m = ritadMvStation();
    expect(m.userData.matt).toMatchObject({ x: 6.1, z: 2.5 });
    const box = new THREE.Box3().setFromObject(m);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(m.userData.matt.y);
    const k = modellFor(m, { bredd: 6.1, djup: 2.5, hojd: 2.9 });
    expect(k.scale.x).toBeCloseTo(1);
    expect(k.userData.delad).toBe(true);
  });
});
