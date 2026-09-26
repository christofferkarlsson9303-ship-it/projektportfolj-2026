import { describe, expect, it } from "vitest";
import {
  ALLA_PUNKTER,
  FASER,
  LARDOMAR,
  LEDTIDER,
  LOPANDE,
  MILSTOLPAR,
  PUNKT_FOR_ID,
  SUMMERING,
} from "./bessChecklistData.ts";

/* Checklistan är ett kontrollerat dokument (v1.0, 2026-09-26). Antalen står
   på försättsbladet — ändras de här ska det vara för att checklistan fått en
   ny version, inte för att en punkt råkat försvinna. */

describe("checklistans omfattning", () => {
  it("har 16 faser, 199 kontrollpunkter, 33 hållpunkter och 7 milstolpar", () => {
    expect(SUMMERING).toEqual({ faser: 16, punkter: 199, hallpunkter: 33, milstolpar: 7 });
  });

  it("numrerar faserna 0–15 med grindarna G0–G15", () => {
    expect(FASER.map((f) => f.nr)).toEqual([...Array(16).keys()]);
    expect(FASER.map((f) => f.grind.kod)).toEqual(FASER.map((f) => "G" + f.nr));
    expect(FASER.every((f) => f.grind.text && f.titel && f.syfte && f.kort)).toBe(true);
  });

  it("har 21 löpande punkter utanför faserna", () => {
    expect(LOPANDE.sektioner.flatMap((s) => s.punkter)).toHaveLength(21);
  });

  it("har unika id:n på formen fas.nr eller lop.nr", () => {
    const id = ALLA_PUNKTER.map((p) => p.id);
    expect(new Set(id).size).toBe(id.length);
    expect(id.every((x) => /^(\d{1,2}|lop)\.\d{1,2}$/.test(x))).toBe(true);
  });

  it("har text, ansvar och tidpunkt på varje punkt och bara kända markeringar", () => {
    for (const p of ALLA_PUNKTER) {
      expect(p.text.length, p.id).toBeGreaterThan(10);
      expect(p.ansvar, p.id).not.toBe("");
      expect(p.nar, p.id).not.toBe("");
      expect(p.badges.every((b) => ["HP", "K", "L"].includes(b)), p.id).toBe(true);
    }
  });

  it("fördelar hållpunkterna som checklistan", () => {
    const perFas = FASER.map((f) => f.sektioner.flatMap((s) => s.punkter).filter((p) => p.badges.includes("HP")).length);
    expect(perFas).toEqual([0, 0, 1, 1, 0, 2, 3, 6, 3, 2, 3, 3, 3, 5, 1, 0]);
  });
});

describe("betalplan och grindar", () => {
  it("summerar M1–M7 till 100 % med Batch C-fördelningen", () => {
    expect(MILSTOLPAR.map((m) => m.andel)).toEqual([10, 25, 25, 20, 15, 3, 2]);
    expect(MILSTOLPAR.reduce((s, m) => s + m.andel, 0)).toBe(100);
  });

  it("kopplar varje milstolpe till en grind som finns, och faserna tillbaka", () => {
    const grindar = new Set(FASER.map((f) => f.grind.kod));
    expect(MILSTOLPAR.every((m) => grindar.has(m.grind))).toBe(true);
    for (const f of FASER.filter((x) => x.milstolpe)) {
      expect(MILSTOLPAR.find((m) => m.kod === f.milstolpe).grind).toBe(f.grind.kod);
    }
  });

  it("lägger standardplanens faser i ordning på skalan", () => {
    for (const f of FASER) expect(f.mall.fran, `fas ${f.nr}`).toBeLessThan(f.mall.till);
    expect(FASER[0].mall.fran).toBe(-1);
    expect(FASER[14].mall.till).toBe(2);
  });
});

describe("ledtider och lärdomar", () => {
  it("pekar varje ledtid på en kontrollpunkt som finns", () => {
    for (const l of LEDTIDER) expect(PUNKT_FOR_ID.has(l.punkt), l.id).toBe(true);
  });

  it("har dagar och ankare på allt som går att räkna", () => {
    for (const l of LEDTIDER) expect(l.dagar === null, l.id).toBe(l.ankare === null);
  });

  it("har tio lärdomar", () => {
    expect(LARDOMAR).toHaveLength(10);
  });
});
