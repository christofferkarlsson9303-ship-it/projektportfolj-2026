import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { parkVy } from "./siteKamera.js";

describe("kameran ramar in rätt park", () => {
  for (const aspect of [0.5, 1, 2.2]) it(`visar hela tomten vid bildförhållande ${aspect}`, () => {
    const vy = parkVy([], { bredd: 160, djup: 110 }, aspect);
    const k = new THREE.PerspectiveCamera(vy.fov, aspect, 0.1, 5000);
    k.position.set(...vy.cameraPosition); k.lookAt(...vy.target); k.updateMatrixWorld();
    for (const x of [-80, 80]) for (const z of [-55, 55]) {
      const p = new THREE.Vector3(x, 0, z).project(k);
      expect(Math.abs(p.x)).toBeLessThan(1);
      expect(Math.abs(p.y)).toBeLessThan(1);
    }
  });
  it("tar med roterade objekt utanför standardtomten", () => {
    const vy = parkVy([{x: 180, z: 60, bredd: 40, djup: 10, hojd: 5, rotation: 90}], {bredd:80,djup:52});
    expect(vy.target[0]).toBeGreaterThan(60);
    expect(vy.target[1]).toBe(2.5);
  });
});
