import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handlingsplan, hpAtgarder, hpForsenad, hpSammanfattning } from "./berakningar.js";
import { berakFlaggor } from "./flaggor.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";

const NU = "2026-09-23T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

const last = (state) => efterInlasning(normalisera(structuredClone(state)));

const atgard = (over) => ({
  id: "a" + Math.random(),
  projektId: "36037",
  titel: "Åtgärd",
  resurser: "",
  status: "ejpaborjad",
  datum: "",
  resultat: "",
  kommentar: "",
  ...over,
});

describe("sådden av handlingsplanen", () => {
  it("ger varje projekt exakt ett tomt planhuvud", () => {
    const state = last(SEED);
    for (const p of state.projekt) {
      const plan = handlingsplan(state, p.id);
      expect(plan, `projekt ${p.id}`).toBeTruthy();
      expect(plan).toMatchObject({ mal: "", drivkraft: "", strategi: "", slutresultat: "" });
    }
    expect(state.handlingsplaner).toHaveLength(state.projekt.length);
  });

  it("sår inga påhittade åtgärder", () => {
    expect(last(SEED).hpAtgarder).toEqual([]);
  });

  it("är idempotent och bevarar det som skrivits", () => {
    const ett = last(SEED);
    const plan = handlingsplan(ett, "36037");
    const skrivet = reducer(ett, {
      type: "UPPDATERA",
      lista: "handlingsplaner",
      id: plan.id,
      falt: "mal",
      varde: "Driftsatt i tid",
    });

    const tva = efterInlasning(skrivet);
    expect(tva.handlingsplaner).toHaveLength(ett.handlingsplaner.length);
    expect(handlingsplan(tva, "36037").mal).toBe("Driftsatt i tid");
  });

  it("kompletterar ett projekt som tillkommit senare", () => {
    const ett = last(SEED);
    ett.projekt = [...ett.projekt, { id: "nytt", nr: "", namn: "Nytt projekt" }];
    expect(handlingsplan(efterInlasning(ett), "nytt")).toBeTruthy();
  });

  it("överlever en omladdning — samlingarna finns i SEED och tappas inte av normalisera", () => {
    const state = last(SEED);
    state.hpAtgarder = [atgard({ titel: "Kvar efter omladdning" })];
    const igen = last(JSON.parse(JSON.stringify(state)));
    expect(hpAtgarder(igen, "36037")[0].titel).toBe("Kvar efter omladdning");
  });
});

describe("hpForsenad", () => {
  it("är sann för en ej klar åtgärd med passerat datum", () => {
    expect(hpForsenad(atgard({ datum: "2026-09-20" }))).toBe(true);
  });
  it("är falsk när åtgärden är klar, saknar datum eller ligger framåt", () => {
    expect(hpForsenad(atgard({ datum: "2026-09-20", status: "klar" }))).toBe(false);
    expect(hpForsenad(atgard({ datum: "" }))).toBe(false);
    expect(hpForsenad(atgard({ datum: "2026-10-01" }))).toBe(false);
  });
});

describe("hpSammanfattning", () => {
  it("räknar per projekt", () => {
    const state = last(SEED);
    state.hpAtgarder = [
      atgard({ status: "klar" }),
      atgard({ status: "pagaende", datum: "2026-09-01" }),
      atgard({ status: "ejpaborjad" }),
      atgard({ projektId: "36038", status: "klar" }),
    ];
    expect(hpSammanfattning(state, "36037")).toEqual({
      antal: 3,
      klara: 1,
      pagaende: 1,
      forsenade: 1,
      proc: 33,
    });
    expect(hpSammanfattning(state, "36038").proc).toBe(100);
    expect(hpSammanfattning(state, "gotene").proc).toBe(0);
  });

  it("behåller ordningen åtgärderna lades till i — det är stegnumret", () => {
    const state = last(SEED);
    state.hpAtgarder = [atgard({ titel: "Först", datum: "2026-12-01" }), atgard({ titel: "Sedan", datum: "2026-10-01" })];
    expect(hpAtgarder(state, "36037").map((a) => a.titel)).toEqual(["Först", "Sedan"]);
  });
});

describe("flaggmotorn och handlingsplanen", () => {
  const hpFlaggor = (state) => berakFlaggor(state).filter((f) => f.vy === "handlingsplan");

  it("flaggar projekt med åtgärder som passerat datum", () => {
    const state = last(SEED);
    state.hpAtgarder = [atgard({ datum: "2026-09-10" }), atgard({ datum: "2026-09-11" })];
    const fl = hpFlaggor(state);
    expect(fl).toHaveLength(1);
    expect(fl[0]).toMatchObject({ niva: "medel", projektId: "36037" });
    expect(fl[0].text).toMatch(/2 åtgärder/);
  });

  it("är tyst när de sena åtgärderna är klara", () => {
    const state = last(SEED);
    state.hpAtgarder = [atgard({ datum: "2026-09-10", status: "klar" })];
    expect(hpFlaggor(state)).toEqual([]);
  });
});

describe("statusbyte på en åtgärd", () => {
  it("loggas med åtgärdens titel", () => {
    const state = last(SEED);
    const a = atgard({ titel: "Genomföra skyddsrond" });
    state.hpAtgarder = [a];
    const ut = reducer(state, { type: "UPPDATERA_STATUS", lista: "hpAtgarder", id: a.id, falt: "status", varde: "klar" });
    expect(ut.andringslogg[0]).toMatchObject({
      projektId: "36037",
      text: "Handlingsplan: Genomföra skyddsrond: status ändrad Ej påbörjad → Klar",
    });
  });
});
