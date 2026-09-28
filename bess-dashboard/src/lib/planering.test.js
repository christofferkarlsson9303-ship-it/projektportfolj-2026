import { describe, expect, it } from "vitest";
import {
  angraFakturaunderlag,
  belaggningsniva,
  budgetAktivitet,
  budgetlage,
  ofakturerat,
  planeratPerson,
  resurslage,
  skapaFakturaunderlag,
  timkostnad,
  tidraderVecka,
  utfallAktivitet,
} from "./planering.js";
import { reducer } from "../state/portfolj-reducer.js";

const bas = () => ({
  projekt: [{ id: "p1", namn: "Växjö" }],
  medarbetare: [
    { id: "m1", namn: "A", kapacitet: 40, apris: 1000, aktiv: true },
    { id: "m2", namn: "B", kapacitet: 20, apris: 1200, aktiv: true },
    { id: "m3", namn: "C", kapacitet: 40, apris: 800, aktiv: false },
  ],
  bemanning: [
    { id: "b1", personId: "m1", projektId: "p1", vecka: "2026-v40", timmar: 30 },
    { id: "b2", personId: "m1", projektId: "p2", vecka: "2026-v40", timmar: 20 },
    { id: "b3", personId: "m2", projektId: "p1", vecka: "2026-v40", timmar: 10 },
  ],
  tidrader: [
    { id: "t1", datum: "2026-09-28", personId: "m1", projektId: "p1", aktivitetId: "a1", timmar: 8, ot: 1, debiterbar: true, fakturerad: false, ataRef: "UR004" },
    { id: "t2", datum: "2026-09-29", personId: "m1", projektId: "p1", aktivitetId: "a1", timmar: 2, ot: 1.5, debiterbar: false, fakturerad: false },
    { id: "t3", datum: "2026-10-05", personId: "m2", projektId: "p1", aktivitetId: "a2", timmar: 4, ot: 1, debiterbar: true, fakturerad: false },
  ],
  aktiviteter: [
    { id: "a1", projektId: "p1", namn: "Mark", budgetTim: 20, budgetMtrl: 5000, budgetUE: 0 },
    { id: "a2", projektId: "p1", namn: "MV", budgetTim: 0, budgetMtrl: 0, budgetUE: 0 },
  ],
  kostnader: [
    { id: "k1", projektId: "p1", aktivitetId: "a1", datum: "2026-09-30", typ: "material", belopp: 3000, debiterbar: true, fakturerad: false },
    { id: "k2", projektId: "p1", aktivitetId: "a1", datum: "2026-09-30", typ: "resa", belopp: 500, debiterbar: false, fakturerad: false },
  ],
  fakturor: [],
  andringslogg: [],
});

describe("timkostnad", () => {
  it("räknar timmar × á-pris × tidslag", () => {
    const s = bas();
    expect(timkostnad(s, s.tidrader[0])).toBe(8000);
    expect(timkostnad(s, s.tidrader[1])).toBe(3000); // 2 h × 1000 × 1,5
  });

  it("ger 0 för en okänd person", () => {
    expect(timkostnad(bas(), { personId: "x", timmar: 8, ot: 1 })).toBe(0);
  });
});

describe("resurser", () => {
  it("summerar planerad tid per person och vecka över alla projekt", () => {
    expect(planeratPerson(bas(), "m1", "2026-v40")).toBe(50);
  });

  it("räknar beläggning, ledigt och överbelastning bara för aktiva", () => {
    const l = resurslage(bas(), ["2026-v40", "2026-v41"]);
    expect(l.personer.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(l.kapTot).toBe(120); // (40 + 20) × 2 veckor
    expect(l.planTot).toBe(60);
    expect(l.belaggning).toBe(50);
    expect(l.ledigt).toBe(60);
    expect(l.overbelastningar).toHaveLength(1);
    expect(l.overbelastningar[0]).toMatchObject({ vecka: "2026-v40", planerat: 50, kapacitet: 40 });
  });

  it("delar in beläggningen i nivåer", () => {
    expect(belaggningsniva(0)).toBe("tom");
    expect(belaggningsniva(40)).toBe("del");
    expect(belaggningsniva(85)).toBe("full");
    expect(belaggningsniva(100)).toBe("full");
    expect(belaggningsniva(101)).toBe("over");
  });
});

describe("tidrapport", () => {
  it("hämtar en persons rader för veckan måndag–söndag", () => {
    const r = tidraderVecka(bas(), "m1", "2026-v40");
    expect(r.map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});

describe("budget och utfall", () => {
  it("räknar arbetsbudget med snittet av á-priserna", () => {
    const s = bas();
    const snitt = (1000 + 1200 + 800) / 3;
    expect(budgetAktivitet(s, s.aktiviteter[0]).kr).toBeCloseTo(20 * snitt + 5000);
  });

  it("räknar utfall med personens á-pris och kostnadernas typ", () => {
    const u = utfallAktivitet(bas(), "a1");
    expect(u.timmar).toBe(10);
    expect(u.arbKr).toBe(11000);
    expect(u.mtrl).toBe(3000);
    expect(u.ovr).toBe(500);
    expect(u.kr).toBe(14500);
  });

  it("summerar projektet och andelen förbrukat", () => {
    const l = budgetlage(bas(), "p1");
    expect(l.utf.tim).toBe(14);
    expect(l.utf.kr).toBe(14500 + 4800);
    expect(l.kvar).toBeCloseTo(l.bud.kr - l.utf.kr);
    expect(l.forbrukat).toBe(Math.round((l.utf.kr / l.bud.kr) * 100));
  });
});

describe("fakturaunderlag", () => {
  it("tar bara debiterbart som inte redan är fakturerat, plus 10 % arvode på kostnader", () => {
    const o = ofakturerat(bas(), "p1");
    expect(o.tid.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(o.kost.map((k) => k.id)).toEqual(["k1"]);
    expect(o.arbete).toBe(8000 + 4800);
    expect(o.arvode).toBe(300);
    expect(o.summa).toBe(8000 + 4800 + 3000 + 300);
  });

  it("skapar underlaget och låser raderna i samma steg", () => {
    const s = skapaFakturaunderlag(bas(), "p1", "2026-10-06");
    expect(s.fakturor).toHaveLength(1);
    expect(s.fakturor[0]).toMatchObject({
      nr: "FU001",
      status: "utkast",
      period: "2026-09-28 – 2026-10-05",
      timmar: 12,
      summa: 16100,
      atan: "UR004",
    });
    expect(s.tidrader.filter((t) => t.fakturerad).map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(s.kostnader.find((k) => k.id === "k1").fakturerad).toBe(true);
    // Allt är sammanställt — ett andra underlag blir inte av.
    expect(skapaFakturaunderlag(s, "p1")).toBe(s);
  });

  it("ångra låser upp raderna men inte ett fakturerat underlag", () => {
    const s = skapaFakturaunderlag(bas(), "p1");
    const id = s.fakturor[0].id;
    const upp = angraFakturaunderlag(s, id);
    expect(upp.fakturor).toHaveLength(0);
    expect(upp.tidrader.some((t) => t.fakturerad)).toBe(false);

    const fakt = { ...s, fakturor: s.fakturor.map((f) => ({ ...f, status: "fakturerad" })) };
    expect(angraFakturaunderlag(fakt, id)).toBe(fakt);
  });

  it("reducern loggar skapande och ångring", () => {
    const s = reducer(bas(), { type: "SKAPA_FAKTURAUNDERLAG", pid: "p1" });
    expect(s.andringslogg[0].text).toMatch(/^Fakturaunderlag FU001 skapat/);
    const t = reducer(s, { type: "ANGRA_FAKTURAUNDERLAG", id: s.fakturor[0].id });
    expect(t.andringslogg[0].text).toMatch(/FU001 ångrat/);
    expect(reducer(t, { type: "SKAPA_FAKTURAUNDERLAG", pid: "p2" })).toBe(t);
  });
});
