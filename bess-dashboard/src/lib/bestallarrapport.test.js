import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { bestallarrapportData, statusrad } from "./bestallarrapport.js";

const NU = "2026-10-13";
const grund = () => efterInlasning(normalisera(structuredClone(SEED)));

describe("beställarrapportens data", () => {
  it("tar bara med påbörjade och klara faser, resten som återstår", () => {
    const s = grund();
    const p = s.projekt.find((x) => x.id === "36037");
    p.fas = 5;
    const d = bestallarrapportData(s, "36037", NU);
    expect(d.faser.map((f) => [f.nr, f.status])).toEqual([[1, "klar"], [2, "klar"], [3, "klar"], [4, "klar"], [5, "pagar"]]);
    expect(d.faser[4].titel).toBe("Leveranser, lyft och montage (eBoP)");
    expect(d.aterstar).toEqual([6, 7, 8]);
  });

  it("växer när projektet går till nästa fas", () => {
    const s = grund();
    s.projekt.find((x) => x.id === "36037").fas = 1;
    expect(bestallarrapportData(s, "36037", NU).faser).toHaveLength(1);
    s.projekt.find((x) => x.id === "36037").fas = 2;
    expect(bestallarrapportData(s, "36037", NU).faser).toHaveLength(2);
  });

  it("visar M1–M7 med fas och status ur betalplanen", () => {
    const d = bestallarrapportData(grund(), "36037", NU);
    expect(d.milstolpar.map((m) => [m.kod, m.fas])).toEqual([["M1", 1], ["M2", 2], ["M3", 4], ["M4", 4], ["M5", 6], ["M6", 7], ["M7", 7]]);
    for (const m of d.milstolpar) expect(["Fakturerad", "Aviserad / pågående", "Kvar"]).toContain(m.text);
  });

  it("har anläggningsdata ur projektkortet och nätanslutningens moment", () => {
    const a = bestallarrapportData(grund(), "36037", NU).anlaggning;
    expect([a.mw, a.mwh]).toEqual([16, 36]);
    expect(a.natagare).toBe("Växjö Energi");
    expect(a.natmoment.map((m) => m.nr)).toEqual([12, 13]);
  });

  it("räknar prognos mot kontraktet när datumen finns, annars ingen", () => {
    const s = grund();
    expect(bestallarrapportData(s, "36037", NU).tid?.kontrakt).toBe("2026-12-02");
    const g = s.projekt.find((x) => x.id === "goteborg");
    g.startdatum = "";
    g.fardigstallande = "";
    expect(bestallarrapportData(s, "goteborg", NU).tid).toBeNull();
  });

  it("finns inte för ett okänt projekt", () => {
    expect(bestallarrapportData(grund(), "finns-inte", NU)).toBeNull();
  });

  it("skriver site-status i klartext, och säger när inget är inlagt", () => {
    expect(statusrad({ antal: 0, lagen: [], utanStatus: 0 }, "MV-skid")).toBe("Inga MV-skid inlagda på siten");
    expect(statusrad({ antal: 3, lagen: [{ text: "Levererad", antal: 2 }], utanStatus: 1 }, "x")).toBe("3 st · 2 levererad · 1 utan status");
  });
});
