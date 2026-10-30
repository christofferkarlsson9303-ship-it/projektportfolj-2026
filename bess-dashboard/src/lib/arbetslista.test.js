import { describe, expect, it } from "vitest";
import { arStopp, meningar, stegTitel, vem, sidfot, SA_HAR_GOR_DU, faltkontakter } from "./arbetslista.js";

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


  it("vem faller tillbaka på momentets utförare", () => {
    expect(vem({ roll: "Montör" })).toBe("Montör");
    expect(vem({}, { utforare: "Dan + Adam" })).toBe("Dan + Adam");
  });

  it("sidfoten bär dokumentnummer, revision och källa", () => {
    expect(sidfot({ dokumentNr: "EK-1", revision: "r2", kalla: "Källa." })).toBe("EK-1 · Mallrevision r2 · Källa.");
  });

  it("reglerna är korta", () => {
    for (const r of SA_HAR_GOR_DU) expect(r.split(" ").length).toBeLessThanOrEqual(16);
  });
});

describe("faltkontakter", () => {
  const kontakter = [
    { namn: "Alex Young", roll: "Projektledare", org: "Ingrid Capacity", omr: "Båda" },
    { namn: "Christoffer Karlsson", roll: "Projektledare", org: "ONE Nordic", omr: "Båda" },
    { namn: "Johan Adolfsson", roll: "HMS", org: "ONE Nordic", omr: "Båda" },
    { namn: "Josef Fällman", roll: "Elsäkerhetsledare", org: "ONE Nordic", omr: "Alvesta" },
    { namn: "Daniel Larsson", roll: "BAS-U / platsansvarig", org: "ONE Nordic", omr: "Båda" },
    { namn: "Tina Strömberg", roll: "Nätägare", org: "Växjö Energi", omr: "Växjö" },
  ];
  const alvesta = { id: "36038", nr: "36038", namn: "Alvesta Batteripark", ort: "Alvesta" };
  const vaxjo = { id: "36037", nr: "36037", namn: "Växjö Batteripark", ort: "Växjö" };

  it("en kontakt per fältroll, i ringordning", () => {
    expect(faltkontakter(kontakter, alvesta).map((k) => `${k.etikett}: ${k.namn}`)).toEqual([
      "Arbetsledare / BAS-U: Daniel Larsson",
      "Elsäkerhet: Josef Fällman",
      "HMS: Johan Adolfsson",
      "Projektledare: Christoffer Karlsson",
    ]);
  });

  it("område begränsar till projektet; beställarens projektledare är inte vår", () => {
    const namn = faltkontakter(kontakter, vaxjo).map((k) => k.namn);
    expect(namn).not.toContain("Josef Fällman");
    expect(namn).not.toContain("Alex Young");
    expect(namn).not.toContain("Tina Strömberg");
  });

  it("tål saknade fält och tom lista", () => {
    expect(faltkontakter(undefined, vaxjo)).toEqual([]);
    expect(faltkontakter([{ roll: "HMS" }, { namn: "N N" }], vaxjo)).toEqual([]);
  });
});
