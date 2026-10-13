import { describe, expect, it } from "vitest";
import { FASER, FAS_ANTAL } from "../data/projektfaser.ts";
import { FASER as MOMENT, MILSTOLPAR } from "../data/bessChecklistData.ts";
import {
  FASSTATUS,
  MOMENTGRUPPER,
  fasAvvikelse,
  fasEtikett,
  fasStatus,
  fasStatusFranLage,
  grupperaMoment,
  milstolparIFas,
  momentIFas,
  projektetsFaser,
  projektfasForMilstolpe,
  projektfasForMoment,
  projektfasFranMomentlage,
} from "./fasmappning.js";

describe("fas 1–8 är den enda numreringen", () => {
  it("har de åtta namnen i ordning", () => {
    expect(FASER.map((f) => `${f.nr}. ${f.titel}`)).toEqual([
      "1. Anbud, kontrakt och uppstart",
      "2. Projekterings- och planeringsfasen",
      "3. Etableringsfasen",
      "4. Mark och betong (cBoP)",
      "5. Leveranser, lyft och montage (eBoP)",
      "6. Provning och driftsättning",
      "7. Slutbesiktning och överlämning",
      "8. Ekonomiskt avslut, lärdomar och garanti",
    ]);
  });

  it("ger varje moment 0–15 en fas, i stigande ordning", () => {
    const faser = MOMENT.map((m) => m.projektfas);
    expect(faser).toEqual([1, 1, 2, 2, 2, 3, 4, 4, 4, 4, 5, 5, 5, 6, 7, 8]);
    expect([...faser].sort((a, b) => a - b)).toEqual(faser);
  });

  it("har minst ett moment i varje fas", () => {
    for (const { fas, moment } of MOMENTGRUPPER) expect(moment.length, `fas ${fas.nr}`).toBeGreaterThan(0);
    expect(MOMENTGRUPPER.flatMap((g) => g.moment)).toEqual(MOMENT.map((m) => m.nr));
  });

  it("lägger kabel och kanalisation i Mark och betong, som fasens beskrivning säger", () => {
    expect(MOMENT[9].kort).toMatch(/Kabel/);
    expect(projektfasForMoment(9)).toBe(4);
    expect(momentIFas(4)).toEqual([6, 7, 8, 9]);
    expect(momentIFas(5)).toEqual([10, 11, 12]);
  });
});

describe("milstolparna M1–M7 hör till en fas via sin grind", () => {
  it("mappar varje milstolpe", () => {
    expect(Object.fromEntries(MILSTOLPAR.map((m) => [m.kod, projektfasForMilstolpe(m.kod)]))).toEqual({
      M1: 1, M2: 2, M3: 4, M4: 4, M5: 6, M6: 7, M7: 7,
    });
  });

  it("listar milstolparna per fas", () => {
    expect(milstolparIFas(4)).toEqual(["M3", "M4"]);
    expect(milstolparIFas(3)).toEqual([]);
    expect(milstolparIFas(7)).toEqual(["M6", "M7"]);
  });
});

describe("fasstatus är samma i alla vyer", () => {
  it("räknar klar, pågår och låst ur aktiv fas", () => {
    expect([1, 4, 5, 6, 8].map((nr) => fasStatus(nr, 5))).toEqual(["klar", "klar", "pagar", "last", "last"]);
  });

  it("är ej påbörjad när framdriften är känd och inget är gjort", () => {
    expect(fasStatus(2, 2, { klara: 0, totalt: 7 })).toBe("ejPaborjad");
    expect(fasStatus(2, 2, { klara: 1, totalt: 7 })).toBe("pagar");
  });

  it("mappar projektstartens lägen", () => {
    expect(fasStatusFranLage({ status: "klar" })).toBe("klar");
    expect(fasStatusFranLage({ status: "upplast", klara: 2, totalt: 5 })).toBe("pagar");
    expect(fasStatusFranLage({ status: "aktuell", klara: 0, totalt: 5 })).toBe("ejPaborjad");
    expect(fasStatusFranLage({ status: "last" })).toBe("last");
  });

  it("har text och ton för varje status", () => {
    for (const v of Object.values(FASSTATUS)) expect(v.text).toBeTruthy();
    expect(FASSTATUS.last.text).toBe("Låst");
  });

  it("ger projektets faser och etikett", () => {
    const f = projektetsFaser({ fas: 3, status: "PRODUKTION" });
    expect(f).toHaveLength(FAS_ANTAL);
    expect(f.map((x) => x.status)).toEqual(["klar", "klar", "pagar", "last", "last", "last", "last", "last"]);
    expect(projektetsFaser({ fas: 1, status: "ANBUD_EJ_VUNNET" })).toHaveLength(1);
    expect(fasEtikett(5)).toBe("Fas 5 av 8 · Montage");
  });
});

describe("gruppering och avvikelse", () => {
  const lage = (passerade) => MOMENT.map((m) => ({ fas: m, status: m.nr < passerade ? "klar" : "kommande", grind: { passerad: m.nr < passerade } }));

  it("grupperar moment under faserna och hoppar över tomma", () => {
    const g = grupperaMoment(lage(0).filter((f) => f.fas.nr >= 10));
    expect(g.map((x) => x.fas.nr)).toEqual([5, 6, 7, 8]);
    expect(g[0].rader.map((r) => r.fas.nr)).toEqual([10, 11, 12]);
  });

  it("räknar fasen ur första ej passerade grinden", () => {
    expect(projektfasFranMomentlage(lage(10))).toBe(5);
    expect(projektfasFranMomentlage(lage(9))).toBe(4);
    expect(projektfasFranMomentlage(lage(16))).toBe(8);
  });

  it("flaggar när projektkortet och tidplanen pekar på olika faser", () => {
    expect(fasAvvikelse({ fas: 4, status: "PRODUKTION" }, lage(10))).toEqual({ kort: 4, tidplan: 5 });
    expect(fasAvvikelse({ fas: 5, status: "PRODUKTION" }, lage(10))).toBeNull();
    // Ingen grind passerad: tidplanen säger ingenting.
    expect(fasAvvikelse({ fas: 3, status: "PRODUKTION" }, lage(0))).toBeNull();
    expect(fasAvvikelse({ fas: 1, status: "ANBUD_EJ_VUNNET" }, lage(10))).toBeNull();
  });
});
