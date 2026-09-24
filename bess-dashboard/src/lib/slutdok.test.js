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
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { berakFlaggor } from "./flaggor.js";

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

/* Portföljperspektivet: index, grind och larm ska räknas per projekt, så att
   ett projekts godkända handlingar aldrig kan öppna ett annat projekts grind. */
describe("slutdok över hela portföljen", () => {
  const godkannKritiska = (state, pid) => ({
    ...state,
    slutdok: state.slutdok.map((d) =>
      d.projektId === pid && KRITISKA.includes(d.kategori) ? { ...d, status: "godkand" } : d
    ),
  });

  /* Färdigställande om tio dagar för varje projekt — innanför larmgränsen. */
  const alltInomTvaVeckor = (state) => ({
    ...state,
    milstolpar: state.projekt.map((p) => ({
      id: `m6-${p.id}`,
      projektId: p.id,
      titel: "Färdigställande (M6)",
      datum: "2026-10-02",
      status: "planerad",
    })),
  });

  const slutdokLarm = (state) => berakFlaggor(state).filter((f) => f.vy === "slutdok");

  it("M6-grinden i ett projekt påverkar inte de andra", () => {
    const state = godkannKritiska(last(SEED), "36037");
    expect(slutdokKritisktKlart(state, "36037")).toBe(true);
    for (const p of state.projekt.filter((x) => x.id !== "36037")) {
      expect(slutdokKritisktKlart(state, p.id), `projekt ${p.id}`).toBe(false);
    }
  });

  it("indexet räknas per projekt och summerar inte portföljen", () => {
    const state = godkannKritiska(last(SEED), "36037");
    expect(slutdokIndex(state, "36037").proc).toBeGreaterThan(0);
    expect(slutdokIndex(state, "36038").proc).toBe(0);
  });

  it("flaggmotorn larmar för varje projekt under 80 % med under fjorton dagar kvar", () => {
    const state = alltInomTvaVeckor(last(SEED));
    const larm = slutdokLarm(state);

    expect(larm.map((f) => f.projektId).sort()).toEqual(state.projekt.map((p) => p.id).sort());
    for (const f of larm) expect(f.niva).toBe("hog");
  });

  it("flaggmotorn tystnar bara för det projekt som nått 80 %", () => {
    let state = alltInomTvaVeckor(last(SEED));
    state = {
      ...state,
      slutdok: state.slutdok.map((d) => (d.projektId === "36038" ? { ...d, status: "godkand" } : d)),
    };

    const projekt = slutdokLarm(state).map((f) => f.projektId);
    expect(projekt).not.toContain("36038");
    expect(projekt).toContain("36037");
  });

  it("larmar inte när färdigställandet ligger längre bort än fjorton dagar", () => {
    const state = last(SEED); // Växjö och Alvesta färdigställs i december.
    expect(slutdokLarm(state)).toEqual([]);
  });
});

describe("statusbyte i slutdokumentationen", () => {
  it("loggas med handlingens namn i ändringsloggen", () => {
    const state = last(SEED);
    const rad = slutdokRader(state, "36037")[0];

    const ut = reducer(state, {
      type: "UPPDATERA_STATUS",
      lista: "slutdok",
      id: rad.id,
      falt: "status",
      varde: "godkand",
    });

    expect(ut.slutdok.find((d) => d.id === rad.id).status).toBe("godkand");
    expect(ut.andringslogg[0].projektId).toBe("36037");
    expect(ut.andringslogg[0].text).toBe(`Slutdok: ${rad.krav}: status ändrad Ej påbörjad → Godkänd`);
  });

  it("kommentaren sparas på raden utan att röra sådden", () => {
    const state = last(SEED);
    const rad = slutdokRader(state, "36037")[0];
    const ut = reducer(state, {
      type: "UPPDATERA",
      lista: "slutdok",
      id: rad.id,
      falt: "kommentar",
      varde: "Väntar på rev B från Harju",
    });

    const efter = efterInlasning(ut);
    expect(efter.slutdok).toHaveLength(state.slutdok.length);
    expect(efter.slutdok.find((d) => d.id === rad.id).kommentar).toBe("Väntar på rev B från Harju");
  });
});
