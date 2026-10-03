import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { nyttProjekt, projektstartFel } from "./projektstart.js";
import { efterInlasning, reducer } from "../state/portfolj-reducer.js";
import { GILTIGA_VYER, VYER, ENKEL_MENY } from "../data/vyer.js";
import { METODSTEG, SIDHJALP } from "../data/projektmetod.js";

describe("Återanvändbar projektmetod", () => {
  it("ger vägledning till alla sidor och behåller alla länkmål", () => {
    for (const [id] of VYER.filter(([id]) => id !== "_sek")) expect(SIDHJALP[id]?.length).toBe(4);
    for (const s of METODSTEG) for (const id of s.vyer) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(METODSTEG.flatMap((s) => s.faser)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    for (const id of ENKEL_MENY) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(GILTIGA_VYER.size).toBe(27);
    expect(ENKEL_MENY.size).toBe(10);
  });
  it("startar tomma projekt utan gamla resultat, antagna datum eller ekonomivärden", () => {
    const state = efterInlasning(structuredClone(SEED));
    const p = nyttProjekt({ namn: " Ny batteripark ", nr: " 90001 ", bestallare: " Ny kund " }, "nytt");
    const next = reducer(state, { type: "SKAPA_PROJEKT", rad: { ...p, kontraktsvarde: 999 } });
    expect(next.projekt.at(-1)).toMatchObject({ namn: "Ny batteripark", nr: "90001", bestallare: "Ny kund", kontraktsvarde: null, startdatum: "", startdatumAntagande: false });
    expect(next.handlingsplaner.some((r) => r.projektId === "nytt")).toBe(true);
    expect(next.hseqApd.some((r) => r.projektId === "nytt")).toBe(true);
    expect(next.slutdok.filter((r) => r.projektId === "nytt").every((r) => r.status === "ejpaborjad")).toBe(true);
    expect(next.faltkontroller.some((r) => r.projektId === "nytt")).toBe(false);
    expect(next.ur).toEqual(state.ur); expect(next.betalplan).toEqual(state.betalplan);
    expect(reducer(next, { type: "SKAPA_PROJEKT", rad: p })).toBe(next);
    expect(next.projekt.slice(0, -1)).toEqual(state.projekt);
    const reload = efterInlasning(next); expect(reload.slutdok).toEqual(next.slutdok);
    const cloud = structuredClone(next); delete cloud.projekt.at(-1).kontraktsvarde;
    expect(efterInlasning(cloud).projekt.at(-1).kontraktsvarde).toBe(null);
  });
  it("stoppar saknat namn, dubbla projektnummer och fel datumordning", () => {
    expect(projektstartFel(SEED, { namn: "" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny", nr: "36037" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny", startdatum: "2027-02-01", fardigstallande: "2027-01-01" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny" })).toBe("");
    expect(reducer(SEED, { type: "SKAPA_PROJEKT", rad: nyttProjekt({ namn: "Ny", nr: "36037" }, "nytt") })).toBe(SEED);
  });
});
