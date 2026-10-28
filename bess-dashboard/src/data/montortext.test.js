import { describe, expect, it } from "vitest";
import { MONTOR } from "./montortext.js";
import { PROJEKTMALLAR } from "./projektkontroll.js";
import { arbetsSteg, momentRubrik } from "../lib/arbetslista.js";
import { byggFaltmaterial } from "../lib/faltmaterial.js";
import { montorlistaDokument } from "../lib/snabbutskrift.js";
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
    const steg = arbetsSteg({ ...mall, profil: "catl-pe" });
    expect(kontrollNr(steg[0].p.id)).toBe("12.19a");
    expect(steg[0].stopp).toBe(true);
    expect(steg.at(-1).stopp).toBe(true);
    expect(steg.map((s) => s.p.id)).not.toContain("M2.09");
    expect(steg.map((s) => s.p.id)).not.toContain("M3.11");
    expect(steg.every((s) => !s.tank && !s.vem)).toBe(true);
    expect(momentRubrik({ ...mall, profil: "catl-pe" })).toBe("Moment 12 – Koppla in batterier och växelriktare");
  });

  it("visar bara CATL/PE-instruktioner för rätt hårdvaruprofil", () => {
    const projekt = { id: "p1", nr: "1", namn: "Testprojekt", hardvaruprofil: "sungrow" };
    const d = byggFaltmaterial({ projekt, mallpaket: "projekt", mallIds: ["projekt-12"] });
    const steg = arbetsSteg(d.moment[0]);
    const moment = steg.find((s) => s.p.id === "M2.05");
    expect(moment.gor.join(" ")).toContain("verifierat OEM-värde");
    expect(moment.gor.join(" ")).not.toContain("50 Nm");
    expect(montorlistaDokument(projekt, 12)).toBeNull();
    expect(momentRubrik(d.moment[0])).toBe(d.moment[0].titel);
    const catl = byggFaltmaterial({ projekt: { ...projekt, hardvaruprofil: "catl-pe" }, mallpaket: "projekt", mallIds: ["projekt-12"] });
    expect(arbetsSteg(catl.moment[0]).find((s) => s.p.id === "M2.05").gor.join(" ")).toContain("50 Nm");
  });

  it("kräver PE:s dokumenterade klartecken före DC-anslutning", () => {
    const mall = PROJEKTMALLAR.find((m) => m.id === "projekt-12");
    const stopp = arbetsSteg({ ...mall, profil: "catl-pe" }).find((s) => s.p.id === "B.02");
    expect(stopp.stopp).toBe(true);
    expect(stopp.gor.join(" ")).toContain("PE:s dokumenterade klartecken");
  });

  it("moment utan montörtext visar alla rader som förut", () => {
    const mall = PROJEKTMALLAR.find((m) => m.id === "projekt-13");
    expect(arbetsSteg(mall)).toHaveLength(mall.punkter.length);
  });
});
