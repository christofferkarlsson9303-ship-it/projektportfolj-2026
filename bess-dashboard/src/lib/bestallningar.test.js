import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { behovsmoment, bestallningslage, leveransbindningar } from "./bestallningar.js";
import { ankardatum, faslage, plusDagar } from "./epc.js";
import { kritiskLinje } from "./kritiskLinje.js";
import { agendarader } from "./agenda.js";

const NU = "2026-09-26";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU + "T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const satt = (s, id, falt, varde) => reducer(s, { type: "UPPDATERA", lista: "leveranser", id, falt, varde });
const ny = (s, rad) => ({ ...s, leveranser: [...s.leveranser, { id: "lx", projektId: "36037", status: "preliminar", datum: "", leverantor: "", ...rad }] });
const rad = (s, id) => bestallningslage(s, "36037", NU).find((b) => b.id === id);

describe("behovsmoment", () => {
  it("gissar moment ur benämningen men låter ett uttryckligt moment gå före", () => {
    expect(behovsmoment({ benamning: "BESS-batteri" })).toEqual({ nr: 11, gissat: true });
    expect(behovsmoment({ benamning: "MV-station" })).toEqual({ nr: 10, gissat: true });
    expect(behovsmoment({ benamning: "Kabelströmstransformatorer (omleverans)" })).toEqual({ nr: 10, gissat: true });
    expect(behovsmoment({ benamning: "Markkabel 24 kV" })).toEqual({ nr: 9, gissat: true });
    expect(behovsmoment({ benamning: "Staket" })).toBe(null);
    expect(behovsmoment({ benamning: "BESS-batteri", moment: 12 })).toEqual({ nr: 12, gissat: false });
  });
});

describe("bestallningslage", () => {
  it("räknar beställ senast baklänges från momentets start med leverantörens ledtid", () => {
    let s = ny(seed(), { benamning: "Huvudtransformator", moment: 10, ledtidVeckor: 30 });
    const start = faslage(s, "36037", NU)[10].start;
    const b = rad(s, "lx");
    expect(b.behov).toBe(start);
    expect(b.senast).toBe(plusDagar(start, -210));
    expect(b.status).toBe("sen");
  });

  it("är gul inom två veckor, i tid annars, och underlag saknas utan ledtid", () => {
    let s = seed();
    const start = faslage(s, "36037", NU)[13].start;
    // Ledtid så att senast = idag + 10 d.
    const v = (Number(new Date(start)) - Number(new Date(plusDagar(NU, 10)))) / 86400000 / 7;
    s = ny(s, { benamning: "Reservdelspaket", moment: 13, ledtidVeckor: v });
    expect(rad(s, "lx").status).toBe("snart");
    s = satt(s, "lx", "ledtidVeckor", 1);
    expect(rad(s, "lx").status).toBe("i-tid");
    s = satt(s, "lx", "ledtidVeckor", "");
    expect(rad(s, "lx").status).toBe("underlag");
  });

  it("en lagd order larmar inte, men en leverans efter behovsdatumet försenar momentet", () => {
    let s = ny(seed(), { benamning: "Huvudtransformator", moment: 13, ledtidVeckor: 30, bestalld: "2026-03-01" });
    expect(rad(s, "lx").status).toBe("bestalld");
    const start = faslage(s, "36037", NU)[13].start;
    s = satt(s, "lx", "datum", plusDagar(start, 9));
    expect(rad(s, "lx")).toMatchObject({ status: "forsenar", forsenarDagar: 9 });
  });
});

describe("kritisk linje och Idag", () => {
  it("en leverans med uttryckligt moment binder momentets start, en gissad gör det inte", () => {
    let s = seed();
    const fore = kritiskLinje(s, "36037", NU).faser[13].prognosStart;
    s = ny(s, { benamning: "Huvudtransformator", datum: plusDagar(fore, 40) });
    expect(kritiskLinje(s, "36037", NU).faser[13].prognosStart).toBe(fore);
    s = satt(s, "lx", "moment", 13);
    expect(leveransbindningar(s, "36037").get(13).datum).toBe(plusDagar(fore, 40));
    const k = kritiskLinje(s, "36037", NU).faser[13];
    expect(k.prognosStart).toBe(plusDagar(fore, 40));
    expect(k.drivs).toMatchObject({ typ: "leverans" });
  });

  it("en order som inte lagts syns i agendan på beställ-senast-datumet", () => {
    const s = ny(seed(), { benamning: "Huvudtransformator", moment: 13, ledtidVeckor: 30 });
    const r = agendarader(s, 30, 365).find((x) => x.typ === "Beställning" && x.id === "lx" && x.pid === "36037");
    expect(r).toBeTruthy();
    expect(r.titel).toBe("Beställ senast: Huvudtransformator");
    expect(r.d).toBeLessThan(0);
  });
});

describe("granskningsfynd #102", () => {
  it("ledtid 0 veckor ger beställ senast = momentets start", () => {
    const s = ny(seed(), { benamning: "Lagerartikel", moment: 13, ledtidVeckor: 0 });
    const b = rad(s, "lx");
    expect(b.ledtidVeckor).toBe(0);
    expect(b.senast).toBe(b.behov);
    expect(b.status).not.toBe("underlag");
  });

  it("en BESS-leverans kopplad till ett annat moment styr inte också moment 11", () => {
    let s = seed();
    const bess = s.leveranser.find((l) => l.projektId === "36037" && /BESS/i.test(l.benamning));
    expect(ankardatum(s, "36037").bessLeverans).toMatchObject({ kalla: "leveranslistan", datum: bess.datum });
    s = satt(s, bess.id, "moment", 12);
    expect(ankardatum(s, "36037").bessLeverans.kalla).toBe("fasplan");
    expect(leveransbindningar(s, "36037").get(12).datum).toBe(bess.datum);
    // Kopplad till moment 11 uttryckligen gäller den fortfarande där.
    s = satt(s, bess.id, "moment", 11);
    expect(ankardatum(s, "36037").bessLeverans.kalla).toBe("leveranslistan");
  });
});
