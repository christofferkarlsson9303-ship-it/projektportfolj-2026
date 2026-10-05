import { describe, expect, it } from "vitest";
import { arStopp, meningar, stegTitel, vem, sidfot, SA_HAR_GOR_DU } from "./arbetslista.js";
import { LAGMALLAR } from "../data/lagplan.js";

describe("Arbetslista i klartext", () => {
  it("delar instruktionen i en mening per rad", () => {
    expect(meningar("Mät höjd och lutning. Jämför mot ritningen. Ta foto.")).toEqual([
      "Mät höjd och lutning.",
      "Jämför mot ritningen.",
      "Ta foto.",
    ]);
  });

  it("delar inte på förkortningar eller decimaltal", () => {
    expect(meningar("Följ ABT 06 kap. 2 § 7, t.ex. vid hinder. Lutning högst 0,25 %.")).toEqual([
      "Följ ABT 06 kap. 2 § 7, t.ex. vid hinder.",
      "Lutning högst 0,25 %.",
    ]);
    expect(meningar("")).toEqual([]);
  });

  it("känner igen STOPP och tar bort det ur rubriken", () => {
    const p = { titel: "STOPP – frigör lyftområdet" };
    expect(arStopp(p)).toBe(true);
    expect(stegTitel(p)).toBe("Frigör lyftområdet");
    expect(arStopp({ titel: "Placera BESS-containrar" })).toBe(false);
  });

  it("varje lagmall har minst en STOPP och alla steg får minst en mening", () => {
    for (const m of LAGMALLAR) {
      expect(m.punkter.some(arStopp)).toBe(true);
      for (const p of m.punkter) expect(meningar(p.instruktion).length).toBeGreaterThan(0);
    }
  });

  it("vem faller tillbaka på momentets utförare", () => {
    expect(vem({ roll: "Lag A" })).toBe("Lag A");
    expect(vem({}, { utforare: "Dan + Adam" })).toBe("Dan + Adam");
  });

  it("sidfoten bär dokumentnummer, revision och källa", () => {
    expect(sidfot({ dokumentNr: "EK-1", revision: "r2", kalla: "Källa." })).toBe("EK-1 · Mallrevision r2 · Källa.");
  });

  it("reglerna är korta", () => {
    for (const r of SA_HAR_GOR_DU) expect(r.split(" ").length).toBeLessThanOrEqual(16);
  });
});
