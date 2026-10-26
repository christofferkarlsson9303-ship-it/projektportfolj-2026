import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { nyttProjekt } from "./projektstart.js";
import { arvsrader } from "./projektmall.js";

const NU = "2026-09-26";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU + "T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const ALLA = ["risker", "leveranser", "ejaktuella", "momentplan", "lardomar"];

function medVaggeryd() {
  let s = seed();
  const p = nyttProjekt({ namn: "Vaggeryd", nr: "37001", bestallare: "Ingrid Capacity" }, "vaggeryd");
  s = reducer(s, { type: "SKAPA_PROJEKT", rad: p });
  // Erfarenhet och ej aktuell punkt i Växjö, egen momentplan och startdatum i båda.
  s = reducer(s, { type: "EPC_KOMMENTAR", pid: "36037", punkt: "11.3", typ: "lardom", text: "Kranytan räckte inte", gorSa: "Dimensionera kranytan för verklig vikt", paverkan: 3 });
  s = reducer(s, { type: "EPC_KOMMENTAR", pid: "36037", punkt: "11.4", typ: "notering", text: "Bara en notering" });
  s = reducer(s, { type: "EPC_PUNKT", pid: "36037", punkt: "2.14", status: "ejaktuell" });
  s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 6, falt: "start", varde: "2026-03-02" });
  s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 6, falt: "slut", varde: "2026-04-10" });
  s = { ...s, projekt: s.projekt.map((x) => (x.id === "36037" ? { ...x, startdatum: "2026-01-05" } : x.id === "vaggeryd" ? { ...x, startdatum: "2027-01-04" } : x)) };
  return s;
}

describe("projektmall", () => {
  it("ett nytt projekt startar fortfarande tomt", () => {
    const s = medVaggeryd();
    expect(s.risker.some((r) => r.projektId === "vaggeryd")).toBe(false);
    expect(s.leveranser.some((r) => r.projektId === "vaggeryd")).toBe(false);
  });

  it("ärver valda delar utan resultat, datum eller ägare, och flyttar momentplanen", () => {
    let s = medVaggeryd();
    const fore = arvsrader(s, "36037", "vaggeryd");
    expect(fore.forskjutning).toBe(364);
    s = reducer(s, { type: "PROJEKT_ARV", fran: "36037", till: "vaggeryd", delar: ALLA });

    const risker = s.risker.filter((r) => r.projektId === "vaggeryd");
    expect(risker.length).toBe(s.risker.filter((r) => r.projektId === "36037").length);
    expect(risker.every((r) => r.status === "oppen" && r.agare === "")).toBe(true);

    const lev = s.leveranser.filter((l) => l.projektId === "vaggeryd");
    expect(lev.length).toBeGreaterThan(0);
    expect(lev.every((l) => l.datum === "" && l.status === "preliminar")).toBe(true);

    expect(s.epcPunkter.find((r) => r.projektId === "vaggeryd" && r.punkt === "2.14")?.status).toBe("ejaktuell");
    expect(s.epcFaser.find((r) => r.projektId === "vaggeryd" && r.fas === 6)).toMatchObject({ start: "2027-03-01", slut: "2027-04-09" });

    const lardomar = s.punkter.filter((p) => p.projektId === "vaggeryd");
    expect(lardomar).toHaveLength(1);
    expect(lardomar[0].titel).toBe("Lärdom från 36037, punkt 11.3: Dimensionera kranytan för verklig vikt");
    expect(s.andringslogg[0].text).toMatch(/^Ärvt från 36037: /);
  });

  it("samma arv två gånger ger inga dubbletter, och bara valda delar följer med", () => {
    let s = medVaggeryd();
    s = reducer(s, { type: "PROJEKT_ARV", fran: "36037", till: "vaggeryd", delar: ["risker"] });
    const n = s.risker.length;
    expect(s.leveranser.some((l) => l.projektId === "vaggeryd")).toBe(false);
    const igen = reducer(s, { type: "PROJEKT_ARV", fran: "36037", till: "vaggeryd", delar: ["risker"] });
    expect(igen).toBe(s);
    expect(igen.risker.length).toBe(n);
  });
});

describe("granskningsfynd #104", () => {
  it("en ärvd risk tar inte med kopplad ÄTA, kostnad eller annat som hör till källprojektet", () => {
    let s = medVaggeryd();
    const r = s.risker.find((x) => x.projektId === "36037");
    s = { ...s, risker: s.risker.map((x) => (x.id === r.id ? { ...x, arendeId: "u1", estimeradKostnadSEK: 250000, forebygg: "Bekräfta vikt skriftligt" } : x)) };
    s = reducer(s, { type: "PROJEKT_ARV", fran: "36037", till: "vaggeryd", delar: ["risker"] });
    const arvd = s.risker.find((x) => x.id === `r-arv-vaggeryd-${r.id}`);
    expect(arvd).toMatchObject({ titel: r.titel, forebygg: "Bekräfta vikt skriftligt", status: "oppen", agare: "" });
    expect(arvd.arendeId).toBeUndefined();
    expect(arvd.estimeradKostnadSEK).toBeUndefined();
  });

  it("ett moment med bara start eller bara slut ärvs med det datum som finns", () => {
    let s = medVaggeryd();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 9, falt: "start", varde: "2026-05-04" });
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 10, falt: "slut", varde: "2026-06-12" });
    s = reducer(s, { type: "PROJEKT_ARV", fran: "36037", till: "vaggeryd", delar: ["momentplan"] });
    const rad = (fas) => s.epcFaser.find((r) => r.projektId === "vaggeryd" && r.fas === fas);
    expect(rad(9)).toMatchObject({ start: "2027-05-03" });
    expect(rad(9).slut).toBeUndefined();
    expect(rad(10)).toMatchObject({ slut: "2027-06-11" });
    expect(rad(10).start).toBeUndefined();
  });
});
