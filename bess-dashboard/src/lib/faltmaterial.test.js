import { describe, expect, it } from "vitest";
import { FALTMALLAR } from "../data/faltmaterial.js";
import { LAGMALLAR } from "../data/lagplan.js";
import { PUNKT_FOR_ID } from "../data/bessChecklistData.ts";
import { arbetsrader, byggFaltmaterial } from "./faltmaterial.js";
import { tolkaCelltal } from "./cellvarde.js";
import { skapaExcel } from "./export-xlsx.js";
import { byggCsvFranKolumner } from "./export.js";

describe("Fältmaterialets spårbarhet och urval", () => {
  it("alla 49 detaljer har unika ID och giltiga EPC-referenser", () => {
    const punkter = FALTMALLAR.flatMap((m) => m.punkter);
    expect(punkter).toHaveLength(49);
    expect(new Set(punkter.map((p) => p.id)).size).toBe(49);
    for (const p of punkter) for (const id of p.epc) expect(PUNKT_FOR_ID.get(id), `${p.id} → EPC ${id}`).toBeDefined();
    expect(FALTMALLAR.map((m) => m.punkter.length)).toEqual([7, 14, 12, 16]);
  });
  it("behåller källskillnader för förankring, pasta, mätning och MSD", () => {
    const punkter = FALTMALLAR.flatMap((m) => m.punkter);
    for (const id of ["M1.02", "M2.09", "M2.10", "M3.04", "M4.02", "M4.11"]) expect(punkter.find((p) => p.id === id).verifiering).not.toBe("");
  });
  it("filtrerar arbetslista per projekt, utförare och datum; inkluderar odaterade uppgifter", () => {
    const state = { punkter: [
      { id: "1", projektId: "p1", utforare: "Dan", status: "oppen", forfaller: "2026-10-02" },
      { id: "2", projektId: "p2", utforare: "Dan", status: "oppen" },
      { id: "3", projektId: "p1", utforare: "Adam", status: "oppen" },
      { id: "4", projektId: "p1", utforare: "Dan", status: "klarmarkerad" },
      { id: "5", projektId: "bada", agare: "Dan", status: "oppen" },
      { id: "6", projektId: "p1", utforare: "Dan", status: "oppen", forfaller: "2026-11-01" },
    ] };
    expect(arbetsrader(state, "p1", { utforare: "dan", fran: "2026-10-01", till: "2026-10-08" }).map((p) => p.id)).toEqual(["1", "5"]);
    expect(arbetsrader(state, "p1", { ids: ["6"] }).map((p) => p.id)).toEqual(["6"]);
  });
  it("delurval märks och dokumentet påverkar inte projektdata", () => {
    const projekt = { id: "p1", nr: "123", namn: "Park" };
    const before = JSON.stringify(projekt);
    const d = byggFaltmaterial({ projekt, mallIds: ["precheck"], referenser: { precheck: "Manual rev B s. 12" }, ansvar: { precheck: "Dan" }, metadata: { datum: "2026-10-01" } });
    expect(d.antal).toBe(7); expect(d.komplett).toBe(false);
    expect(d.moment[0].referens).toBe("Manual rev B s. 12"); expect(d.moment[0].utforare).toBe("Dan");
    d.moment[0].punkter[0].epc.push("test");
    expect(FALTMALLAR[0].punkter[0].epc).not.toContain("test"); expect(JSON.stringify(projekt)).toBe(before);
  });
});

describe("Kalkylblad och svensk talinmatning", () => {
  it("hanterar svenska decimaler och avvisar ogiltig numerisk inmatning", () => {
    expect(tolkaCelltal("1 234,50")).toBe(1234.5); expect(tolkaCelltal("-250,00")).toBe(-250);
    expect(tolkaCelltal("")).toBeNull(); expect(tolkaCelltal("abc")).toBeUndefined(); expect(tolkaCelltal("1,2,3")).toBeUndefined();
  });
  it("CSV neutraliserar formler utan att förstöra negativa numeriska belopp", () => {
    const csv = byggCsvFranKolumner([{ nyckel: "text", rubrik: "Text" }, { nyckel: "belopp", rubrik: "Belopp" }], [{ text: "=HYPERLINK(1)", belopp: -250 }]);
    expect(csv).toContain("'=HYPERLINK(1);-250");
  });
  it("Excel har numeriska celler, fryst rubrik och rätt exporttotal", async () => {
    const { default: ExcelJS } = await import("exceljs");
    const buffer = await skapaExcel([{ nyckel: "titel", rubrik: "Titel" }, { nyckel: "belopp", rubrik: "Belopp", typ: "sek", summera: true }], [{ titel: "=unsafe", belopp: 1250.5 }, { titel: "Kredit", belopp: -250 }], "ÄTA");
    const bok = new ExcelJS.Workbook(); await bok.xlsx.load(buffer);
    const blad = bok.worksheets[0];
    expect(blad.getCell("A2").value).toBe("=unsafe"); expect(blad.getCell("B2").value).toBe(1250.5);
    expect(blad.getCell("B4").value).toEqual({ formula: "SUBTOTAL(109,B2:B3)", result: 1000.5 });
    expect(blad.views[0].ySplit).toBe(1);
  });
});


describe("Sekventiell lagplan", () => {
  it("täcker tre lag och arbetsledning med stabila, unika kontroll-ID", () => {
    const points = LAGMALLAR.flatMap((m) => m.punkter);
    expect(points).toHaveLength(41);
    expect(new Set(points.map((p) => p.id)).size).toBe(41);
    expect(LAGMALLAR.filter((m) => m.lag).map((m) => m.lag)).toEqual(["A", "B", "C"]);
    for (const m of LAGMALLAR) expect(m.flode).toBeTruthy();
    expect(points.find((p) => p.id === "B.02").instruktion).toContain("innan DC-kablar");
    expect(points.findIndex((p) => p.id === "B.02")).toBeLessThan(points.findIndex((p) => p.id === "B.04"));
  });
  it("lagurval tar med båda namn, beroenden och källvillkor utan statusändring", () => {
    const d = byggFaltmaterial({ projekt: { id: "p1" }, mallpaket: "lagplan", mallIds: ["lag-b"], metadata: { lagmedlemmar: { B1: "Dan", B2: "Adam" } } });
    expect(d.moment).toHaveLength(1); expect(d.antal).toBe(9);
    expect(d.komplett).toBe(false); expect(d.momentTotal).toBe(5);
    expect(d.moment[0].utforare).toBe("Dan + Adam");
    expect(d.moment[0].flode).toContain("A.09");
    expect(d.moment[0].punkter.find((p) => p.id === "B.03").verifiering).toContain("400 A");
    expect(d.inledning).toContain("rätt kompetens");
    expect(d.moment[0].punkter.every((p) => !p.status)).toBe(true);
  });
});
