import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { STEG } from "../data/projektstartSteg.js";
import { efterInlasning, reducer } from "../state/portfolj-reducer.js";
import { aktivVy, aktivaProjekt, forlorade } from "./arkiv.js";
import { aktuellFas, arEjVunnetUtkast, fasKrav, fasLage, godkandaFaser, stegLast, pdfSparr } from "./projektfas.js";
import { kortAndringar, projektFranUtkast, projektstartDokument, synligaSteg, tomtUtkast } from "./projektstart.js";

const grund = () => efterInlasning(structuredClone(SEED));
const markera = (state, id, orsak = "pris", text = "För dyrt") => reducer(state, { type: "MARKERA_EJ_VUNNET", id, orsak, text });

describe("Förlorade anbud i portföljen", () => {
  it("flyttar anbudet till arkivet med orsak, fas 1 och datum, och loggar det", () => {
    const s = grund();
    const id = s.projekt.find((p) => p.status === "PLANERING_OCH_UPPSTART").id;
    const ut = markera(s, id);
    const p = ut.projekt.find((x) => x.id === id);
    expect(p).toMatchObject({ status: "ANBUD_EJ_VUNNET", fas: 1, orsakEjVunnet: "pris", orsakEjVunnetText: "För dyrt" });
    expect(p.ejVunnetDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ut.andringslogg[0].text).toMatch(/ej vunnet \(Pris\)/);
    // Okänd orsak ändrar inget.
    expect(markera(s, id, "påhitt")).toBe(s);
  });

  it("utesluter förlorade anbud och deras rader ur den aktiva vyn, men behåller dem i datan", () => {
    const s = grund();
    const id = "goteborg";
    const ut = markera(s, id);
    expect(aktivaProjekt(ut).map((p) => p.id)).not.toContain(id);
    expect(forlorade(ut).map((p) => p.id)).toEqual([id]);
    const vy = aktivVy(ut);
    expect(vy.projekt.some((p) => p.id === id)).toBe(false);
    for (const v of Object.values(vy)) if (Array.isArray(v)) expect(v.some((r) => r?.projektId === id)).toBe(false);
    // Hela datan är orörd.
    expect(ut.projekt.some((p) => p.id === id)).toBe(true);
    // Utan förlorade anbud är vyn samma objekt.
    expect(aktivVy(s)).toBe(s);
  });

  it("tappar inte arkivet när en vy ersätter en lista", () => {
    const ut = markera(grund(), "goteborg");
    const vy = aktivVy(ut);
    const ny = reducer(ut, { type: "SATT_LISTA", lista: "projekt", rader: [...vy.projekt].reverse() });
    expect(ny.projekt.some((p) => p.id === "goteborg" && p.status === "ANBUD_EJ_VUNNET")).toBe(true);
    expect(ny.projekt).toHaveLength(ut.projekt.length);
  });

  it("räknar om lagrade förlorade anbud rätt och rör dem inte två gånger", () => {
    const ut = markera(grund(), "goteborg");
    const igen = efterInlasning(ut);
    expect(igen.projekt.find((p) => p.id === "goteborg")).toMatchObject({ status: "ANBUD_EJ_VUNNET", fas: 1 });
  });
});

describe("Förlorat anbud i guiden", () => {
  const tackaNej = () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Förlorat anbud", beslut: "Tacka nej" });
    return u;
  };

  it("döljer fas 2–8, kräver bara namn och orsak och godkänner fas 1", () => {
    const u = tackaNej();
    expect(arEjVunnetUtkast(u)).toBe(true);
    expect(aktuellFas(u)).toBe(1);
    expect(synligaSteg(u).every((s) => s.fas === null || s.fas === 1)).toBe(true);
    expect(synligaSteg(u)).toHaveLength(STEG.filter((s) => s.fas === 1).length + 1);
    expect(fasKrav(u, 1).falt.map((f) => f.id)).toEqual(["orsakEjVunnet"]);
    expect(fasKrav(u, 1).klar).toBe(false);
    u.v.orsakEjVunnet = "tid";
    expect(fasKrav(u, 1).klar).toBe(true);
    expect(godkandaFaser(u)).toBe(1);
    expect(stegLast(u, STEG.find((s) => s.id === "risker"))).toBe(true);
    expect(fasLage(u).filter((f) => f.status !== "last")).toHaveLength(1);
    expect(pdfSparr(u)).toEqual([]);
  });

  it("visar orsaksfälten bara vid Tacka nej", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "x", beslut: "Gå vidare" });
    expect(fasKrav(u, 1).falt.map((f) => f.id)).not.toContain("orsakEjVunnet");
    const d = projektstartDokument(Object.assign(u, {}), { datum: "x" });
    expect(JSON.stringify(d.projektstart.sektioner)).not.toContain("Orsak till ej vunnet anbud");
  });

  it("skapar projektet som ej vunnet utan risker och milstolpar", () => {
    const u = tackaNej();
    u.v.orsakEjVunnet = "kvalitet";
    u.v.orsakEjVunnetText = "  Sämre referenser ";
    u.rader.risker = [{ id: "a", titel: "En risk", sannolikhet: "3", konsekvens: "3", agare: "PL", atgard: "" }];
    const { projekt, risker, milstolpar } = projektFranUtkast(u, "p-nej");
    expect(projekt).toMatchObject({ status: "ANBUD_EJ_VUNNET", fas: 1, orsakEjVunnet: "kvalitet", orsakEjVunnetText: "Sämre referenser" });
    expect(projekt.ejVunnetDatum).toBeTruthy();
    expect(risker).toEqual([]);
    expect(milstolpar).toEqual([]);
  });

  it("för ett befintligt projekt över till arkivet, och tillbaka om beslutet ändras", () => {
    const u = tackaNej();
    u.v.orsakEjVunnet = "pris";
    const aktivt = { namn: "Förlorat anbud", status: "PLANERING_OCH_UPPSTART", fas: 1 };
    const a = kortAndringar(u, aktivt);
    expect(a).toEqual(expect.arrayContaining([["fas", 1], ["status", "ANBUD_EJ_VUNNET"], ["orsakEjVunnet", "pris"]]));
    u.v.beslut = "Gå vidare";
    expect(kortAndringar(u, { ...aktivt, status: "ANBUD_EJ_VUNNET" })).toEqual(expect.arrayContaining([["status", "PLANERING_OCH_UPPSTART"]]));
  });
});
