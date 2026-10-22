import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { normalisera, reducer } from "../state/portfolj-reducer.js";
import { nyHandelse, nyKoppladPost } from "./handelse.js";

const start = () => normalisera(structuredClone(SEED));

describe("nyHandelse", () => {
  it("gör en öppen punkt utan påhittad ansvarig eller frist", () => {
    const p = nyHandelse("36037", { titel: "  Kabelskåp fel typ  ", uppfoljning: "2026-11-02" });
    expect(p).toMatchObject({ projektId: "36037", titel: "Kabelskåp fel typ", agare: "", forfaller: "", uppfoljning: "2026-11-02", status: "oppen", lankar: [] });
  });
});

describe("nyKoppladPost", () => {
  const punkt = { id: "p9", projektId: "36037", titel: "Kabelskåp fel typ", agare: "Anna", kalla: "Registrerad händelse" };

  it("ÄTA blir en UR-post med förifyllda grunduppgifter och backlänk", () => {
    const ata = nyKoppladPost("ata", start(), punkt);
    expect(ata.lista).toBe("ur");
    expect(ata.rad).toMatchObject({ projektId: "36037", benamning: "Kabelskåp fel typ", klass: "ata", punktId: "p9", orsak: "" });
    expect(ata.lank).toMatchObject({ id: ata.rad.id, lista: "ur", typ: "ata" });
  });

  it("risk blir en riskpost med ansvarig från händelsen", () => {
    const r = nyKoppladPost("risk", start(), punkt);
    expect(r.lista).toBe("risker");
    expect(r.rad).toMatchObject({ titel: "Kabelskåp fel typ", agare: "Anna", punktId: "p9" });
  });

  it("hinder är en orsak på ÄTA:n, inte en egen post", () => {
    expect(nyKoppladPost("hinder", start(), punkt)).toBeNull();
    const h = nyKoppladPost("ata", start(), punkt, { orsak: "best_atagande" });
    expect(h.rad).toMatchObject({ orsak: "best_atagande", klass: "hinder" });
    expect(nyKoppladPost("ata", start(), punkt, { orsak: "fel_uppgift" }).rad.klass).toBe("ata");
    expect(nyKoppladPost("ata", start(), punkt, { orsak: "one_vallande" }).rad.klass).toBe("ata");
  });

  it("okänd typ ger null", () => {
    expect(nyKoppladPost("hseq", start(), punkt)).toBeNull();
  });
});

describe("HANDELSE_KOPPLA", () => {
  const med = () => {
    const s0 = start();
    const punkt = nyHandelse("36037", { titel: "Kabelskåp fel typ" });
    const s1 = reducer(s0, { type: "LAGG_TILL", lista: "punkter", rad: punkt });
    return { s1, punkt };
  };

  it("lägger posten och länken tillsammans, och loggar", () => {
    const { s1, punkt } = med();
    const post = nyKoppladPost("ata", s1, punkt);
    const s2 = reducer(s1, { type: "HANDELSE_KOPPLA", punktId: punkt.id, ...post });
    expect(s2.ur).toHaveLength(s1.ur.length + 1);
    expect(s2.punkter.find((p) => p.id === punkt.id).lankar).toEqual([post.lank]);
    expect(s2.andringslogg[0].text).toContain("kopplad till");
  });

  it("samma länk läggs inte två gånger", () => {
    const { s1, punkt } = med();
    const post = nyKoppladPost("risk", s1, punkt);
    const s2 = reducer(s1, { type: "HANDELSE_KOPPLA", punktId: punkt.id, ...post });
    expect(reducer(s2, { type: "HANDELSE_KOPPLA", punktId: punkt.id, ...post })).toBe(s2);
  });

  it("ändrar inget om punkten saknas", () => {
    const s0 = start();
    const post = nyKoppladPost("ata", s0, { id: "x", projektId: "36037", titel: "t", kalla: "k" });
    expect(reducer(s0, { type: "HANDELSE_KOPPLA", punktId: "x", ...post })).toBe(s0);
  });

  it("två ÄTA från samma händelse får olika nummer och båda länkas", () => {
    const { s1, punkt } = med();
    const a = nyKoppladPost("ata", s1, punkt);
    const s2 = reducer(s1, { type: "HANDELSE_KOPPLA", punktId: punkt.id, ...a });
    const b = nyKoppladPost("ata", s2, punkt, { orsak: "ue_material" });
    const s3 = reducer(s2, { type: "HANDELSE_KOPPLA", punktId: punkt.id, ...b });
    expect(s3.punkter.find((p) => p.id === punkt.id).lankar).toHaveLength(2);
    expect(a.rad.nr).not.toBe(b.rad.nr);
  });
});
