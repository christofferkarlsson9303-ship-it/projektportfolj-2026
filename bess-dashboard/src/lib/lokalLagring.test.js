import { describe, expect, it } from "vitest";
import { lokalFelText, skrivLokalt } from "./lokalLagring.js";

const lagringSomKastar = (namn, kod) => ({
  setItem() {
    const e = new Error("fel");
    e.name = namn;
    if (kod) e.code = kod;
    throw e;
  },
});

describe("skrivLokalt", () => {
  it("skriver JSON och rapporterar ok", () => {
    const lagrat = {};
    const r = skrivLokalt("n", { a: 1 }, { setItem: (k, v) => (lagrat[k] = v) });
    expect(r).toEqual({ ok: true });
    expect(JSON.parse(lagrat.n)).toEqual({ a: 1 });
  });

  it("säger full lagring när kvoten är slut", () => {
    expect(skrivLokalt("n", {}, lagringSomKastar("QuotaExceededError"))).toEqual({ ok: false, orsak: "full" });
    expect(skrivLokalt("n", {}, lagringSomKastar("Error", 22))).toEqual({ ok: false, orsak: "full" });
  });

  it("säger blockerad när lagringen vägras eller saknas", () => {
    expect(skrivLokalt("n", {}, lagringSomKastar("SecurityError"))).toEqual({ ok: false, orsak: "blockerad" });
    expect(skrivLokalt("n", {}, undefined)).toEqual({ ok: false, orsak: "blockerad" });
  });

  it("felet skrivs aldrig som att något är sparat", () => {
    expect(lokalFelText("full")).toMatch(/^Kunde inte spara/);
    expect(lokalFelText("blockerad")).toMatch(/^Kunde inte spara/);
    expect(lokalFelText("full")).not.toMatch(/sparad/);
  });
});
