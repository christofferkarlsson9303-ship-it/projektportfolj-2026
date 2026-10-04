import { describe, expect, it } from "vitest";
import {
  franGammalKalkyl,
  kalkylCsv,
  kalkylRader,
  kalkylSummor,
  medResurs,
  nyKalkylRad,
  radSumma,
  tidrapportRader,
} from "./atakalkyl.js";
import { kalkylResurser } from "./planering.js";
import { reducer } from "../state/portfolj-reducer.js";

const resurser = kalkylResurser({ medarbetare: [] });
const resurs = (namn) => resurser.find((r) => r.namn === namn);

const rad = (namn, falt) => ({ ...nyKalkylRad(resurs(namn)), ...falt });

describe("radSumma", () => {
  it("en montör 2 × 945 utan övertid är 1 890", () => {
    expect(radSumma(rad("Montör", { antal: 2 }))).toBe(1890);
  });

  it("material 10 000 kr är 11 000 före moms (10 % påslag)", () => {
    const m = rad("Material", { antal: 10000 });
    expect(m.apris).toBe(1);
    expect(m.paslag).toBe(10);
    expect(radSumma(m)).toBeCloseTo(11000);
  });

  it("övertid 50 och 100 % är faktor 1,5 och 2", () => {
    expect(radSumma(rad("Montör", { antal: 2, ot: 50 }))).toBe(2835);
    expect(radSumma(rad("Montör", { antal: 2, ot: 100 }))).toBe(3780);
  });

  it("fordon räknas per km utan tillägg", () => {
    const f = rad("Servicebil / Personbil", { antal: 100 });
    expect(f.enhet).toBe("km");
    expect(radSumma(f)).toBe(1600);
  });

  it("tid ur tidrapporten bär tidslaget, även storhelg (faktor 3)", () => {
    expect(radSumma({ antal: 2, apris: 945, faktor: 3, ot: 0, paslag: 0 })).toBe(5670);
  });
});

describe("kalkylSummor", () => {
  it("visar netto, moms 25 % och att betala", () => {
    const s = kalkylSummor([rad("Montör", { antal: 2 }), rad("Material", { antal: 10000 })]);
    expect(s).toEqual({ netto: 12890, moms: 3223, attBetala: 16113 });
  });

  it("tom kalkyl är noll", () => {
    expect(kalkylSummor([])).toEqual({ netto: 0, moms: 0, attBetala: 0 });
  });
});

describe("resurser", () => {
  it("befintliga priser gäller före startvärdena, och inget döps om", () => {
    expect(resurs("Montör").apris).toBe(945);
    expect(resurs("Eldriftledare / kopplingsledare")).toBeTruthy();
    expect(resurser.find((r) => r.namn === "Eldriftledare/kopplingsledare")).toBeUndefined();
    expect(resurs("Grävmaskin 15–18 ton").kalla).toBe("Startvärde");
  });

  it("medarbetare med eget á-pris finns med", () => {
    const r = kalkylResurser({ medarbetare: [{ id: "m1", namn: "Daniel Larsson", roll: "Ledande montör", apris: 1050, aktiv: true }] });
    expect(r.find((x) => x.namn === "Daniel Larsson").apris).toBe(1050);
  });

  it("byte till material sätter á-pris 1 och påslag 10, och nollar övertid", () => {
    const r = medResurs(rad("Montör", { antal: 5, ot: 50 }), resurs("Underentreprenör / konsult"));
    expect(r).toMatchObject({ kategori: "material", apris: 1, paslag: 10, ot: 0, enhet: "kr" });
  });
});

describe("originalets kalkyl", () => {
  const gammal = {
    form: "lopande",
    arbete: [{ roll: "Montör", timmar: 8, apris: 945, ot: 1.5 }, { roll: "Montör", timmar: 2, apris: 945, ot: 3 }],
    maskin: [{ text: "Grävmaskin", timmar: 4, apris: 1000 }],
    kostnad: [{ text: "Kabel", belopp: 5000, typ: "material" }],
    km: 50,
    arvode: 12,
    uppdaterad: "2026-09-01",
  };

  it("läses om till rader med samma belopp som originalet räknade", () => {
    const rader = franGammalKalkyl(gammal);
    // Originalet: arbete 8×945×1,5 + 2×945×3 = 11 340 + 5 670; maskin och kostnad med 12 % arvode; km × 16.
    const original = 11340 + 5670 + 4000 * 1.12 + 5000 * 1.12 + 50 * 16;
    expect(kalkylSummor(rader).netto).toBe(Math.round(original));
    expect(rader.find((r) => r.id === "gammal-arbete-1").faktor).toBe(3);
  });

  it("rader på posten gäller före originalets kalkyl", () => {
    expect(kalkylRader({ kalkyl: { ...gammal, rader: [] } })).toEqual([]);
    expect(kalkylRader({})).toEqual([]);
  });
});

describe("tid ur tidrapporten", () => {
  const state = {
    medarbetare: [{ id: "m1", namn: "Daniel Larsson", apris: 1010 }],
    aktiviteter: [],
    tidrader: [
      { id: "t1", projektId: "p1", personId: "m1", datum: "2026-10-01", timmar: 3, ot: 2, ataRef: "UR004" },
      { id: "t2", projektId: "p1", personId: "m1", datum: "2026-10-01", timmar: 8, ot: 1, ataRef: "UR005" },
    ],
  };

  it("hämtar ärendets tidrader med tidslaget, en gång", () => {
    const u = { id: "u4", projektId: "p1", nr: "UR004" };
    const rader = tidrapportRader(state, u);
    expect(rader).toHaveLength(1);
    expect(rader[0]).toMatchObject({ tidradId: "t1", faktor: 2, antal: 3, apris: 1010 });
    expect(radSumma(rader[0])).toBe(6060);
    expect(tidrapportRader(state, { ...u, kalkyl: { rader } })).toHaveLength(0);
  });
});

describe("CSV", () => {
  it("har BOM, semikolon och kolumnerna i rätt ordning", () => {
    const csv = kalkylCsv([rad("Montör", { antal: 2, beskrivning: "Byte; kabel", datum: "2026-10-04", ot: 50 })]);
    const [rubrik, forsta] = csv.split("\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(rubrik.replace("﻿", "")).toBe("Datum;Beskrivning;Resurs;Antal;ÖT %;Påslag %;Summa");
    expect(forsta).toBe('2026-10-04;"Byte; kabel";Montör;2;50;0;2835');
  });
});

describe("reducern", () => {
  const bas = () => ({
    projekt: [{ id: "p1" }],
    ur: [{ id: "u4", projektId: "p1", nr: "UR004", belopp: null }],
    andringslogg: [],
  });

  it("raderna ligger på posten och sparat belopp är nettot, loggat", () => {
    let s = reducer(bas(), { type: "ATA_KALKYL_LAGG_TILL", id: "u4", rader: [rad("Montör", { id: "r1", antal: 2 })] });
    s = reducer(s, { type: "ATA_KALKYL_LAGG_TILL", id: "u4", rader: [rad("Material", { id: "r2", antal: 10000 })] });
    s = reducer(s, { type: "ATA_KALKYL_ANDRA", id: "u4", radId: "r1", andring: { antal: 4 } });
    expect(s.ur[0].kalkyl.rader.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(s.ur[0].belopp).toBe(null);

    s = reducer(s, { type: "ATA_KALKYL_SPARA", id: "u4" });
    expect(s.ur[0].belopp).toBe(3780 + 11000);
    expect(s.andringslogg[0].text).toMatch(/^UR004: belopp ur kalkylen utan belopp → 14\s780 kr/);

    s = reducer(s, { type: "ATA_KALKYL_TA_BORT", id: "u4", radId: "r2" });
    expect(s.ur[0].kalkyl.rader).toHaveLength(1);
  });

  it("en ny rad kan läggas direkt efter en annan", () => {
    let s = reducer(bas(), { type: "ATA_KALKYL_LAGG_TILL", id: "u4", rader: [rad("Montör", { id: "a" }), rad("Montör", { id: "c" })] });
    s = reducer(s, { type: "ATA_KALKYL_LAGG_TILL", id: "u4", efter: "a", rader: [rad("Montör", { id: "b" })] });
    expect(s.ur[0].kalkyl.rader.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
