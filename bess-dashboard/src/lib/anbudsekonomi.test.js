import { describe, expect, it } from "vitest";
import { anbudsEkonomi, rangordnadeRisker, tolkaBelopp } from "./anbudsekonomi.js";
import { anbudsSammanfattning, projektstartDokument, tomtUtkast } from "./projektstart.js";
import { ANBUDSFRAGOR, anbudsfragaId } from "../data/anbudsfragor.js";

describe("tolkaBelopp", () => {
  it.each([
    ["12 500 000", 12_500_000],
    ["12 500 000 kr", 12_500_000],
    ["12,5 Mkr", 12_500_000],
    ["12.5 MSEK", 12_500_000],
    ["450 tkr", 450_000],
    ["12.500.000", 12_500_000],
    ["-2,4 Mkr", -2_400_000],
    ["−900", -900],
    ["1 200 000", 1_200_000],
  ])("%s → %d", (text, kr) => expect(tolkaBelopp(text)).toBe(kr));

  it.each(["", null, undefined, "ca tolv miljoner", "12 äpplen", "Se kalkyl"])("%s är inget belopp", (text) => expect(tolkaBelopp(text)).toBeNull());
});

describe("anbudsEkonomi", () => {
  it("räknar täckningsbidrag i kronor och procent av anbudssumman", () => {
    const e = anbudsEkonomi({ anbudssumma: "50 Mkr", kalkylkostnad: "45 Mkr", riskreserv: "1 Mkr", kassaflodeLagst: "-3 Mkr", kalkylRev: " rev C " });
    expect(e).toMatchObject({ summa: 50e6, kostnad: 45e6, tb: 5e6, riskreserv: 1e6, kassaLagst: -3e6, kalkylRev: "rev C" });
    expect(e.tbProcent).toBeCloseTo(10);
  });

  it("ger null, aldrig noll, när ett belopp saknas", () => {
    expect(anbudsEkonomi({ anbudssumma: "50 Mkr" })).toMatchObject({ kostnad: null, tb: null, tbProcent: null, riskreserv: null, riskSumma: null });
  });

  it("summerar riskregistrets belopp och visar hur många risker som är prissatta", () => {
    const e = anbudsEkonomi({}, [{ titel: "A", belopp: "1 Mkr" }, { titel: "B", belopp: "250 tkr" }, { titel: "C" }, { titel: " ", belopp: "9 Mkr" }]);
    expect(e).toMatchObject({ riskSumma: 1_250_000, prissattaRisker: 2, antalRisker: 3 });
  });
});

it("rangordnar risker efter S × K", () => {
  const r = rangordnadeRisker([{ titel: "Låg", sannolikhet: "1", konsekvens: "2" }, { titel: "Hög", sannolikhet: "5", konsekvens: "4" }, { titel: "Mitt" }]);
  expect(r.map((x) => [x.titel, x.varde])).toEqual([["Hög", 20], ["Mitt", 9], ["Låg", 2]]);
});

describe("sammanfattningen på försättsbladet i fas 1", () => {
  it("har ekonomi, PL:s rekommendation, de tre största riskerna och vad som saknas", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { anbudssumma: "48,5 Mkr", kalkylkostnad: "42 300 000", beslut: "Gå vidare", motivering: "Bra kund." });
    u.v[anbudsfragaId({ id: "rekommendation" })] = "Lämna anbud med villkor.";
    u.v[anbudsfragaId(ANBUDSFRAGOR[0])] = "Svar";
    u.rader.risker = [1, 5, 3, 4].map((k) => ({ titel: `R${k}`, sannolikhet: "3", konsekvens: String(k) }));
    const s = anbudsSammanfattning(u);
    expect(s.ekonomi.tb).toBe(6_200_000);
    expect(s.rekommendation).toEqual({ beslut: "Gå vidare", text: "Lämna anbud med villkor.", motivering: "Bra kund." });
    expect(s.toppRisker.map((r) => r.titel)).toEqual(["R5", "R4", "R3"]);
    expect(s.fullstandighet).toMatchObject({ fragorTotalt: ANBUDSFRAGOR.length, obesvarade: ANBUDSFRAGOR.length - 2 });
    expect(s.fullstandighet.kvar).toBe(s.fullstandighet.saknas.length);
    expect(s.fullstandighet.kvar).toBeGreaterThan(0);
  });

  it("finns bara i fas 1", () => {
    const u = tomtUtkast();
    expect(projektstartDokument(u, { datum: "2026-10-18" }).projektstart.sammanfattning).not.toBeNull();
    u.fasGolv = 2;
    expect(projektstartDokument(u, { datum: "2026-10-18" }).projektstart.sammanfattning).toBeNull();
  });

  it("nuläget till ledningen står inte en gång till i projektdirektivet", () => {
    const u = tomtUtkast();
    u.v.nulage = "Nuläge";
    const etiketter = projektstartDokument(u, { datum: "2026-10-18" }).projektstart.direktiv.flatMap((x) => x.falt.map(([k]) => k));
    expect(etiketter).not.toContain("Nuläge till ledningen");
  });
});
