import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { lasUtkast, luckor, nyttProjekt, projektFranUtkast, projektstartDokument, projektstartFel, tomtUtkast } from "./projektstart.js";
import { STEG } from "../data/projektstartSteg.js";
import { efterInlasning, reducer } from "../state/portfolj-reducer.js";
import { GILTIGA_VYER, VYER, ENKEL_MENY } from "../data/vyer.js";
import { METODSTEG, SIDHJALP } from "../data/projektmetod.js";

describe("Återanvändbar projektmetod", () => {
  it("ger vägledning till alla sidor och behåller alla länkmål", () => {
    for (const [id] of VYER.filter(([id]) => id !== "_sek")) expect(SIDHJALP[id]?.length).toBe(4);
    for (const s of METODSTEG) for (const id of s.vyer) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(METODSTEG.flatMap((s) => s.faser)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    for (const id of ENKEL_MENY) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(GILTIGA_VYER.size).toBe(30);
    expect(ENKEL_MENY.size).toBe(12);
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
  it("skapar projekt, risker och milstolpar ur guidens utkast", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: " Kalmar batteripark ", nr: "90002", plats: "Kalmar", natagare: "Kalmar Energi", kritiskLinje: "Fundament" });
    u.rader.risker = [{ id: "a", titel: "Leverans sen", sannolikhet: "4", konsekvens: "5", agare: "PL", atgard: "Bevaka" }, { id: "b", titel: "  ", sannolikhet: "3", konsekvens: "3", agare: "", atgard: "" }];
    u.rader.milstolpar = [{ id: "c", namn: "M1", utlosare: "", datum: "2027-01-15" }, { id: "d", namn: "Utan datum", utlosare: "", datum: "" }];
    const { projekt, risker, milstolpar } = projektFranUtkast(u, "p1");
    expect(projekt).toMatchObject({ id: "p1", namn: "Kalmar batteripark", nr: "90002", ort: "Kalmar", natagare: "Kalmar Energi", kontraktsvarde: null, status: "Planering" });
    expect(projekt.anteckning).toContain("Kritisk linje: Fundament");
    expect(risker).toEqual([{ id: "r-p1-1", projektId: "p1", titel: "Leverans sen", sannolikhet: 4, konsekvens: 5, atgard: "Bevaka", agare: "PL", status: "oppen" }]);
    expect(milstolpar).toEqual([{ id: "m-p1-1", projektId: "p1", titel: "M1", datum: "2027-01-15", status: "planerad" }]);
    let next = reducer(efterInlasning(structuredClone(SEED)), { type: "SKAPA_PROJEKT", rad: projekt });
    expect(next.projekt.at(-1).id).toBe("p1");
  });
  it("kräver att alla steg gåtts igenom och släpper bara in kända fält ur ett sparat utkast", () => {
    const u = tomtUtkast();
    expect(luckor(u).stegKvar.map((s) => s.id)).toEqual(STEG.slice(0, -1).map((s) => s.id));
    u.besokta = STEG.slice(0, -1).map((s) => s.id);
    expect(luckor(u).stegKvar).toEqual([]);
    expect(lasUtkast("inte json").v).toEqual(tomtUtkast().v);
    const l = lasUtkast(JSON.stringify({ steg: "finns-inte", v: { namn: "X", okant: "Y" }, kryss: { okand: { a: true }, calloff: { signed: true } } }));
    expect(l.steg).toBe("projekt");
    expect(l.v.namn).toBe("X");
    expect(l.v.okant).toBeUndefined();
    expect(l.kryss).toEqual({ calloff: { signed: true } });
  });
  it("bygger PDF-underlag med bara ifyllda fält, tabellrader och öppna kritiska punkter", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Kalmar", nr: "90003", bestallare: "Kund" });
    u.rader.risker = [{ id: "a", titel: "Leverans sen", sannolikhet: "4", konsekvens: "5", agare: "PL", atgard: "" }];
    u.kryss.calloff = { signed: true };
    const d = projektstartDokument(u, { datum: "2026-10-06", skapadAv: "CK" });
    expect(d.projekt).toMatchObject({ nr: "90003", namn: "Kalmar" });
    const kort = d.projektstart.sektioner.find((x) => x.id === "projekt");
    expect(kort.falt.map(([k]) => k)).toEqual(["Bolag", "Projektnamn", "Projektnummer", "Beställare", "Kontraktsform"]);
    expect(d.projektstart.sektioner.find((x) => x.id === "risker").tabell.rader[0]).toContain("Leverans sen");
    expect(d.projektstart.sektioner.find((x) => x.id === "intressenter").tabell).toBeNull();
    const avrop = d.projektstart.sektioner.find((x) => x.id === "avrop");
    expect(avrop.kontroll.klara).toBe(1);
    expect(avrop.kontroll.kritiskaOppna.length).toBeGreaterThan(0);
    expect(d.projektstart.sektioner.some((x) => x.id === "sammanfattning")).toBe(false);
  });
});
