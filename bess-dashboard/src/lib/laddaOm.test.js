import { describe, expect, it } from "vitest";
import { arDelfilFel } from "./laddaOm.js";

describe("arDelfilFel", () => {
  it("känner igen saknade delfiler i Chrome, Safari och Firefox", () => {
    expect(arDelfilFel(new TypeError("Failed to fetch dynamically imported module: https://x.vercel.app/assets/SiteScen-0_f6rd3K.js"))).toBe(true);
    expect(arDelfilFel(new TypeError("Importing a module script failed."))).toBe(true);
    expect(arDelfilFel(new TypeError("error loading dynamically imported module"))).toBe(true);
  });
  it("låter andra fel vara", () => {
    expect(arDelfilFel(new Error("WebGL saknas"))).toBe(false);
    expect(arDelfilFel(null)).toBe(false);
  });
});
