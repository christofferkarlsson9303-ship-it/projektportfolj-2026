import { describe, expect, it } from "vitest";
import { FRIST, PROFILSCHEMA, frist, fristText, granskaProfil, kontraktsprofil, rensaProfil, tomProfil, vitePerVecka, viteTak } from "./kontraktsprofil.js";
import { reducer } from "../state/portfolj-reducer.js";

/* Påhittad profil — riktiga avtalsvärden hör aldrig hemma i testerna. */
const projekt = [{ id: "p1", nr: "1", namn: "Testpark", kontraktsvarde: 1000000 }];
const profil = {
  schema: PROFILSCHEMA,
  projektId: "p1",
  kalla: { dokument: "Testavtal", datum: "2026-01-01" },
  kontraktssumma: 1000000,
  milstolpar: [{ kod: "M1", andel: 40, ref: "Bilaga 4" }, { kod: "M2", andel: 60, ref: "Bilaga 4" }],
  frister: [{ id: FRIST.hinder, rubrik: "Underrätta om hinder", varde: 10, enhet: "bankdagar", ref: "§18.2" }],
  viten: [{ id: "forsening", rubrik: "Försening", procentPerVecka: 0.5, takProcent: 5, ref: "§7.1" }],
};

describe("kontraktsprofil", () => {
  it("godkänner en komplett profil", () => {
    expect(granskaProfil(profil, projekt)).toEqual({ fel: [], varningar: [] });
  });

  it("stoppar fel format, okänt projekt och betalplan som inte blir 100 %", () => {
    expect(granskaProfil({ ...profil, schema: "x" }, projekt).fel[0]).toMatch(/Okänt format/);
    expect(granskaProfil({ ...profil, projektId: "okand" }, projekt).fel[0]).toMatch(/finns inte/);
    expect(granskaProfil({ ...profil, milstolpar: [{ kod: "M1", andel: 90 }] }, projekt).fel[0]).toMatch(/90 %/);
    expect(granskaProfil([], projekt).fel).toHaveLength(1);
  });

  it("varnar när kontraktssumman skiljer sig och när paragraf saknas", () => {
    const v = granskaProfil({ ...profil, kontraktssumma: 999, frister: [{ id: "x", rubrik: "X", varde: 1 }] }, projekt).varningar;
    expect(v.some((t) => t.includes("skiljer sig"))).toBe(true);
    expect(v.some((t) => t.includes("paragrafhänvisning"))).toBe(true);
  });

  it("räknar vite per vecka och tak i kronor", () => {
    expect(vitePerVecka(profil.viten[0], 1000000)).toBe(5000);
    expect(viteTak(profil.viten[0], 1000000)).toBe(50000);
    expect(viteTak({ takBelopp: 150000 }, 1000000)).toBe(150000);
    expect(vitePerVecka(profil.viten[0], null)).toBeNull();
  });

  it("rensar bort okända fält och skriver frister som text", () => {
    const r = rensaProfil({ ...profil, hemligt: "nej" }, { av: "Test", datum: "2026-02-01" });
    expect(r).not.toHaveProperty("hemligt");
    expect(r.inlast).toEqual({ av: "Test", datum: "2026-02-01" });
    expect(fristText(frist(r, FRIST.hinder))).toBe("10 bankdagar");
    expect(fristText({ varde: 1, enhet: "veckor" })).toBe("1 vecka");
  });

  it("sparar, ersätter och tar bort profilen via reducern med loggpost", () => {
    const bas = { projekt, kontrakt: [], andringslogg: [] };
    const s1 = reducer(bas, { type: "SPARA_KONTRAKT", profil, av: "Test", datum: "2026-02-01" });
    expect(kontraktsprofil(s1, "p1").kalla.dokument).toBe("Testavtal");
    expect(s1.andringslogg[0].text).toMatch(/inläst/);
    const s2 = reducer(s1, { type: "SPARA_KONTRAKT", profil: { ...profil, kalla: { dokument: "Rev B" } } });
    expect(s2.kontrakt).toHaveLength(1);
    expect(s2.andringslogg[0].text).toMatch(/uppdaterad/);
    expect(reducer(s2, { type: "SPARA_KONTRAKT", profil: { ...profil, schema: "x" } })).toBe(s2);
    const s3 = reducer(s2, { type: "TA_BORT_KONTRAKT", projektId: "p1" });
    expect(kontraktsprofil(s3, "p1")).toBeNull();
  });

  it("ger en tom mall som går att fylla i", () => {
    const t = tomProfil("p1");
    expect(t.schema).toBe(PROFILSCHEMA);
    expect(t.frister.map((f) => f.id)).toContain(FRIST.hinder);
  });
});
