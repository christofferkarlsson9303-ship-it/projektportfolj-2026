import { describe, expect, it } from "vitest";
import { MONTOR } from "./montortext.js";
import { PROJEKTMALLAR } from "./projektkontroll.js";
import { arbetsSteg, momentRubrik } from "../lib/arbetslista.js";
import { kontrollNr } from "./kontrollnummer.js";

describe("montörens lista i klartext", () => {
  for (const [fas, mt] of Object.entries(MONTOR)) {
    const mall = PROJEKTMALLAR.find((m) => m.id === `projekt-${fas}`);
    it(`moment ${fas}: varje steg pekar på en kontrollrad i momentet`, () => {
      const ids = new Set(mall.punkter.map((p) => p.id));
      for (const s of mt.steg) expect(ids.has(s.id), s.id).toBe(true);
      expect(new Set(mt.steg.map((s) => s.id)).size).toBe(mt.steg.length);
    });
    it(`moment ${fas}: korta steg, högst fem meningar, ingen projektledarjargong`, () => {
      for (const s of mt.steg) {
        expect(s.gor.length, s.id).toBeGreaterThan(0);
        expect(s.gor.length, s.id).toBeLessThanOrEqual(5);
        for (const r of s.gor) expect(r.length, `${s.id}: ${r}`).toBeLessThanOrEqual(80);
        expect(`${s.titel} ${s.gor.join(" ")}`, s.id).not.toMatch(/AC2C|FACP|HEM\/HEMK|OEM|mallrevision|EPC|verifier/i);
      }
    });
  }

  it("moment 12 börjar med skylten, har STOPP först och sist och tar inte med kvittenser", () => {
    const mall = PROJEKTMALLAR.find((m) => m.id === "projekt-12");
    const steg = arbetsSteg(mall);
    expect(kontrollNr(steg[0].p.id)).toBe("12.19a");
    expect(steg[0].stopp).toBe(true);
    expect(steg.at(-1).stopp).toBe(true);
    expect(steg.map((s) => s.p.id)).not.toContain("M2.09");
    expect(steg.map((s) => s.p.id)).not.toContain("M3.11");
    expect(steg.every((s) => !s.tank && !s.vem)).toBe(true);
    expect(momentRubrik(mall)).toBe("Moment 12 – Koppla in batterier och växelriktare");
  });

  it("moment utan montörtext visar alla rader som förut", () => {
    const mall = PROJEKTMALLAR.find((m) => m.id === "projekt-13");
    expect(arbetsSteg(mall)).toHaveLength(mall.punkter.length);
  });
});
