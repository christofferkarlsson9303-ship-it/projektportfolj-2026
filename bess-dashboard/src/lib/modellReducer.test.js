import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { sammanfoga } from "./sammanfoga.js";
import { byggKoppling } from "./modellKoppling.js";
import { nyAtaPost } from "./nyaPoster.js";
import { nyttObjekt } from "./site.js";

/* Ärende ↔ objekt och modellversioner i portfolj-reducern. */

const start = () => efterInlasning(normalisera(structuredClone(SEED)));

function medArendeOchObjekt() {
  let s = start();
  const pid = s.projekt[0].id;
  const o = nyttObjekt("container", pid, { x: 10, z: 0 }, []);
  s = reducer(s, { type: "SITE_LAGG_TILL", rad: o });
  const u = nyAtaPost(s, pid, { benamning: "Extra kabelränna vid container" });
  s = reducer(s, { type: "LAGG_TILL", lista: "ur", rad: u });
  return { s, pid, o, u };
}

describe("ATA_KOPPLA_OBJEKT", () => {
  it("sparar objectGuid, viewpoint, boundingBox och modelVersionId direkt på ärendet", () => {
    const { s, o, u } = medArendeOchObjekt();
    const k = byggKoppling(o, { modelVersionId: "mv1" });
    const ut = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: k });
    const rad = ut.ur.find((r) => r.id === u.id);
    expect(rad.objectGuid).toBe(o.id);
    expect(rad.viewpoint).toEqual(k.viewpoint);
    expect(rad.boundingBox).toEqual(k.boundingBox);
    expect(rad.modelVersionId).toBe("mv1");
    expect(ut.andringslogg[0].text).toMatch(/kopplad till Container 1 i 3D/);
  });

  it("övriga fält på ärendet rörs inte", () => {
    const { s, o, u } = medArendeOchObjekt();
    const rad = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o) }).ur.find((r) => r.id === u.id);
    expect(rad).toMatchObject({ nr: u.nr, benamning: u.benamning, status: u.status, projektId: u.projektId });
  });

  it("avvisas när objektet inte finns, ärendet inte finns eller kopplingen är trasig — state oförändrat", () => {
    const { s, o, u } = medArendeOchObjekt();
    const k = byggKoppling(o);
    expect(reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: { ...k, objectGuid: "finns-inte" } })).toBe(s);
    expect(reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: "nope", koppling: k })).toBe(s);
    expect(reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: { ...k, viewpoint: { fov: 55 } } })).toBe(s);
    expect(reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: { ...k, objectGuid: "" } })).toBe(s);
  });

  it("ett objekt i ett annat projekt kan inte kopplas", () => {
    const { s, o, u } = medArendeOchObjekt();
    const andra = s.projekt.find((p) => p.id !== u.projektId);
    const s2 = { ...s, siteObjekt: s.siteObjekt.map((x) => (x.id === o.id ? { ...x, projektId: andra.id } : x)) };
    expect(reducer(s2, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o) })).toBe(s2);
  });

  it("samma koppling igen är en no-op och loggas inte två gånger", () => {
    const { s, o, u } = medArendeOchObjekt();
    const k = byggKoppling(o);
    const a = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: k });
    expect(reducer(a, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: k })).toBe(a);
  });

  it("ATA_LOSS_OBJEKT tar bort de fyra fälten och bara dem", () => {
    const { s, o, u } = medArendeOchObjekt();
    const kopplad = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o, { modelVersionId: "mv1" }) });
    const los = reducer(kopplad, { type: "ATA_LOSS_OBJEKT", id: u.id });
    const rad = los.ur.find((r) => r.id === u.id);
    for (const f of ["objectGuid", "viewpoint", "boundingBox", "modelVersionId"]) expect(f in rad).toBe(false);
    expect(rad.benamning).toBe(u.benamning);
    expect(reducer(los, { type: "ATA_LOSS_OBJEKT", id: u.id })).toBe(los);
  });

  it("ett objekt som tas bort lämnar kopplingen kvar på ärendet (UI visar att objektet saknas)", () => {
    const { s, o, u } = medArendeOchObjekt();
    const kopplad = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o) });
    const borta = reducer(kopplad, { type: "SITE_TA_BORT", id: o.id });
    expect(borta.ur.find((r) => r.id === u.id).objectGuid).toBe(o.id);
  });

  it("överlever en omladdning och slås ihop fält för fält med någon annans ändring", () => {
    const { s, o, u } = medArendeOchObjekt();
    const bas = s;
    const mina = reducer(s, { type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(o) });
    const deras = reducer(s, { type: "UPPDATERA", lista: "ur", id: u.id, falt: "benamning", varde: "Ändrad av någon annan" });
    const { varde: resultat } = sammanfoga(bas, mina, deras);
    const rad = resultat.ur.find((r) => r.id === u.id);
    expect(rad.objectGuid).toBe(o.id);
    expect(rad.benamning).toBe("Ändrad av någon annan");
    expect(efterInlasning(normalisera(structuredClone(mina))).ur.find((r) => r.id === u.id).boundingBox).toEqual(byggKoppling(o).boundingBox);
  });
});

describe("modellversioner", () => {
  it("MODELLVERSION_SKAPA tar en bild av projektets objekt ur state", () => {
    const { s, pid, o } = medArendeOchObjekt();
    const ut = reducer(s, { type: "MODELLVERSION_SKAPA", projektId: pid, id: "mv1", namn: "Före ändring" });
    expect(ut.modellVersioner).toHaveLength(1);
    expect(ut.modellVersioner[0]).toMatchObject({ id: "mv1", projektId: pid, namn: "Före ändring" });
    expect(ut.modellVersioner[0].objekt.map((x) => x.id)).toEqual([o.id]);
    // Bilden är en kopia — att flytta objektet efteråt ändrar inte versionen.
    const flyttad = reducer(ut, { type: "SITE_ANDRA", id: o.id, andring: { x: 30 } });
    expect(flyttad.modellVersioner[0].objekt[0].x).toBe(10);
  });

  it("tomt namn blir 'Modellversion', och samma id två gånger ger ingen dubblett", () => {
    const { s, pid } = medArendeOchObjekt();
    const a = reducer(s, { type: "MODELLVERSION_SKAPA", projektId: pid, id: "mv1", namn: "  " });
    expect(a.modellVersioner[0].namn).toBe("Modellversion");
    expect(reducer(a, { type: "MODELLVERSION_SKAPA", projektId: pid, id: "mv1", namn: "x" })).toBe(a);
  });

  it("okänt projekt avvisas, och bara de 20 senaste per projekt sparas", () => {
    const { s, pid } = medArendeOchObjekt();
    expect(reducer(s, { type: "MODELLVERSION_SKAPA", projektId: "finns-inte", id: "x", namn: "x" })).toBe(s);
    let t = s;
    for (let i = 0; i < 23; i += 1) t = reducer(t, { type: "MODELLVERSION_SKAPA", projektId: pid, id: `mv${i}`, namn: `v${i}` });
    const egna = t.modellVersioner.filter((v) => v.projektId === pid);
    expect(egna).toHaveLength(20);
    expect(egna[0].id).toBe("mv3");
    expect(egna.at(-1).id).toBe("mv22");
  });

  it("MODELLVERSION_TA_BORT tar bort rätt version", () => {
    const { s, pid } = medArendeOchObjekt();
    let t = reducer(s, { type: "MODELLVERSION_SKAPA", projektId: pid, id: "a", namn: "A" });
    t = reducer(t, { type: "MODELLVERSION_SKAPA", projektId: pid, id: "b", namn: "B" });
    t = reducer(t, { type: "MODELLVERSION_TA_BORT", id: "a" });
    expect(t.modellVersioner.map((v) => v.id)).toEqual(["b"]);
    expect(reducer(t, { type: "MODELLVERSION_TA_BORT", id: "a" })).toBe(t);
  });

  it("seedet har en tom lista", () => {
    expect(SEED.modellVersioner).toEqual([]);
  });
});
