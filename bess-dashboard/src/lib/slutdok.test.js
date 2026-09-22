import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dagarTillM6,
  slutdokArLast,
  slutdokIndex,
  slutdokKritisktKlart,
  slutdokRader,
} from "./berakningar.js";
import { SLUTDOK_MALL } from "../data/konstanter.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";

const NU = "2026-09-22T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

const last = (state) => efterInlasning(normalisera(structuredClone(state)));
const KRITISKA = SLUTDOK_MALL.slice(0, 4).map(([k]) => k);

describe("sådden av slutdokumentationen", () => {
  it("ger varje projekt en rad per krav i mallen", () => {
    const state = last(SEED);
    const perProjekt = SLUTDOK_MALL.reduce((s, [, krav]) => s + krav.length, 0);

    for (const p of state.projekt) {
      expect(slutdokRader(state, p.id), `projekt ${p.id}`).toHaveLength(perProjekt);
    }
  });

  it("är idempotent — en andra inläsning skapar inga dubbletter", () => {
    const ett = last(SEED);
    const tva = efterInlasning(ett);

    expect(tva.slutdok).toHaveLength(ett.slutdok.length);
    expect(new Set(tva.slutdok.map((d) => d.id)).size).toBe(tva.slutdok.length);
  });

  it("bevarar status som användaren redan satt", () => {
    const ett = last(SEED);
    const id = ett.slutdok[0].id;
    ett.slutdok = ett.slutdok.map((d) =>
      d.id === id ? { ...d, status: "godkand", ansvarig: "Tina" } : d
    );

    const tva = efterInlasning(ett);
    const rad = tva.slutdok.find((d) => d.id === id);
    expect(rad.status).toBe("godkand");
    expect(rad.ansvarig).toBe("Tina");
  });

  it("kompletterar ett projekt som tillkommit senare", () => {
    const ett = last(SEED);
    ett.projekt = [...ett.projekt, { id: "nytt", nr: "", namn: "Nytt projekt" }];

    const tva = efterInlasning(ett);
    expect(slutdokRader(tva, "nytt").length).toBeGreaterThan(0);
  });
});

describe("slutdokIndex", () => {
  it("räknar andelen godkända per projekt", () => {
    const state = last(SEED);
    const pid = state.projekt[0].id;
    const rader = slutdokRader(state, pid);

    state.slutdok = state.slutdok.map((d) =>
      d.id === rader[0].id || d.id === rader[1].id ? { ...d, status: "godkand" } : d
    );

    const ix = slutdokIndex(state, pid);
    expect(ix.godkanda).toBe(2);
    expect(ix.av).toBe(rader.length);
    expect(ix.proc).toBe(Math.round((2 / rader.length) * 100));
  });

  it("börjar på noll procent innan något är godkänt", () => {
    const state = last(SEED);
    expect(slutdokIndex(state, state.projekt[0].id).proc).toBe(0);
  });
});

describe("M6-grinden", () => {
  const medKritiskaKlara = () => {
    const state = last(SEED);
    const pid = state.projekt[0].id;
    state.slutdok = state.slutdok.map((d) =>
      d.projektId === pid && KRITISKA.includes(d.kategori) ? { ...d, status: "godkand" } : d
    );
    return { state, pid };
  };

  it("är spärrad så länge en kritisk handling saknas", () => {
    const state = last(SEED);
    expect(slutdokKritisktKlart(state, state.projekt[0].id)).toBe(false);
  });

  it("öppnar när kategori 1–4 är godkända", () => {
    const { state, pid } = medKritiskaKlara();
    expect(slutdokKritisktKlart(state, pid)).toBe(true);
  });

  it("bryr sig inte om kategorierna efter de fyra kritiska", () => {
    const { state, pid } = medKritiskaKlara();
    // Resterande kategorier är fortfarande ejpaborjad.
    const ovriga = slutdokRader(state, pid).filter((d) => !KRITISKA.includes(d.kategori));
    expect(ovriga.some((d) => d.status !== "godkand")).toBe(true);
    expect(slutdokKritisktKlart(state, pid)).toBe(true);
  });
});

describe("slutdokArLast", () => {
  it("låser slutbesiktningsprotokollet tills grinden öppnat", () => {
    const state = last(SEED);
    const pid = state.projekt[0].id;
    const protokoll = slutdokRader(state, pid).find((d) => /slutbesiktningsprotokoll/i.test(d.krav));

    expect(protokoll, "mallen saknar slutbesiktningsprotokoll").toBeTruthy();
    expect(slutdokArLast(protokoll, pid, state)).toBe(true);
  });

  it("låser inte upp andra handlingar", () => {
    const state = last(SEED);
    const pid = state.projekt[0].id;
    const ovriga = slutdokRader(state, pid).filter((d) => !/slutbesiktningsprotokoll/i.test(d.krav));

    for (const d of ovriga) expect(slutdokArLast(d, pid, state), d.krav).toBe(false);
  });

  it("släpper låset när kategori 1–4 är godkända", () => {
    const state = last(SEED);
    const pid = state.projekt[0].id;
    state.slutdok = state.slutdok.map((d) =>
      d.projektId === pid && KRITISKA.includes(d.kategori) ? { ...d, status: "godkand" } : d
    );

    const protokoll = slutdokRader(state, pid).find((d) => /slutbesiktningsprotokoll/i.test(d.krav));
    expect(slutdokArLast(protokoll, pid, state)).toBe(false);
  });
});

describe("dagarTillM6", () => {
  it("räknar mot färdigställandetiden i tidplanen", () => {
    const state = last(SEED);
    const pid = "36037"; // Växjö har färdigställande 2026-12-02.
    expect(dagarTillM6(state, pid)).toBe(71);
  });

  it("ger null för projekt utan milstolpe", () => {
    const state = last(SEED);
    expect(dagarTillM6(state, "gotene")).toBeNull();
  });
});
