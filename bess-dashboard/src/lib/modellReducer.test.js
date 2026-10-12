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

describe("BCF-import i reducern", () => {
  const GUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const GUID2 = "4f2504e0-4f89-41d3-9a0c-0305e82c3302";
  const vp = { cameraPosition: [1, 2, 3], target: [0, 0, 0], fov: 55 };
  let rader = 0;
  /** nyAtaPost bygger id ur klockan — två i samma millisekund krockar, så id:n sätts här. */
  const nyRad = (s, pid, falt) => ({ ...nyAtaPost(s, pid, falt), id: `ubcf${(rader += 1)}` });

  it("skapar nya ärenden och loggar", () => {
    const { s, pid } = medArendeOchObjekt();
    const ny = nyRad(s, pid, { benamning: "Från BCF", bcfGuid: GUID, status: "godkand", klass: "hinder", viewpoint: vp });
    const ut = reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [ny], uppdatera: [] });
    const rad = ut.ur.find((r) => r.id === ny.id);
    expect(rad).toMatchObject({ benamning: "Från BCF", bcfGuid: GUID, status: "godkand", klass: "hinder", viewpoint: vp });
    expect(ut.andringslogg[0].text).toBe("BCF-import: 1 nya och 0 uppdaterade ärenden");
  });

  it("uppdaterar ett befintligt ärende men rör bara BCF-fält", () => {
    const { s, pid, u } = medArendeOchObjekt();
    const med = reducer(s, { type: "UPPDATERA", lista: "ur", id: u.id, falt: "belopp", varde: 12345 });
    const ut = reducer(med, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [], uppdatera: [{ id: u.id, falt: { benamning: "Ny titel", status: "stangd", belopp: 1, fakturaDatum: "2026-01-01", id: "hackat", projektId: "annat" } }] });
    const rad = ut.ur.find((r) => r.id === u.id);
    expect(rad.benamning).toBe("Ny titel");
    expect(rad.status).toBe("stangd");
    expect(rad.belopp).toBe(12345);
    expect(rad.fakturaDatum).toBe("");
    expect(rad.id).toBe(u.id);
    expect(rad.projektId).toBe(pid);
  });

  it("ogiltig status, klass, kameravy och låda tas bort i stället för att sparas", () => {
    const { s, pid, u } = medArendeOchObjekt();
    const ut = reducer(s, {
      type: "ATA_IMPORTERA_BCF",
      projektId: pid,
      nya: [],
      uppdatera: [{ id: u.id, falt: { benamning: "OK", status: "hackat", klass: "xx", viewpoint: { fov: 5 }, boundingBox: { min: [1, 1, 1], max: [0, 0, 0] }, bcfGuid: "inte-guid" } }],
    });
    const rad = ut.ur.find((r) => r.id === u.id);
    expect(rad.benamning).toBe("OK");
    expect(rad.status).toBe(u.status);
    expect(rad.klass).toBe(u.klass);
    expect("viewpoint" in rad).toBe(false);
    expect("bcfGuid" in rad).toBe(false);
  });

  it("en koppling till ett objekt som inte finns släpps, men kameran och komponenterna står kvar", () => {
    const { s, pid } = medArendeOchObjekt();
    const ny = nyRad(s, pid, { benamning: "X", bcfGuid: GUID, objectGuid: "finns-inte", boundingBox: { min: [0, 0, 0], max: [1, 1, 1] }, modelVersionId: "v1", viewpoint: vp, bcfKomponenter: ["abc"] });
    const rad = reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [ny], uppdatera: [] }).ur.find((r) => r.id === ny.id);
    expect("objectGuid" in rad).toBe(false);
    expect("boundingBox" in rad).toBe(false);
    expect(rad.viewpoint).toEqual(vp);
    expect(rad.bcfKomponenter).toEqual(["abc"]);
  });

  it("en koppling till ett objekt som finns behålls", () => {
    const { s, pid, o } = medArendeOchObjekt();
    const ny = nyRad(s, pid, { benamning: "X", bcfGuid: GUID, objectGuid: o.id, viewpoint: vp });
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [ny], uppdatera: [] }).ur.find((r) => r.id === ny.id).objectGuid).toBe(o.id);
  });

  it("samma fil två gånger ger inga dubbletter", () => {
    const { s, pid } = medArendeOchObjekt();
    const ny = nyRad(s, pid, { benamning: "Från BCF", bcfGuid: GUID });
    const a = reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [ny], uppdatera: [] });
    const dubbel = { ...ny, id: "annat-id" };
    expect(reducer(a, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [dubbel], uppdatera: [] })).toBe(a);
    expect(a.ur.filter((r) => r.bcfGuid === GUID)).toHaveLength(1);
  });

  it("avvisar nya rader för fel projekt, utan benämning eller med upptaget id, och okänt projekt", () => {
    const { s, pid, u } = medArendeOchObjekt();
    const bra = nyRad(s, pid, { benamning: "Bra", bcfGuid: GUID2 });
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: "finns-inte", nya: [bra], uppdatera: [] })).toBe(s);
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [{ ...bra, projektId: "annat" }], uppdatera: [] })).toBe(s);
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [{ ...bra, benamning: "  " }], uppdatera: [] })).toBe(s);
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [{ ...bra, id: u.id }], uppdatera: [] })).toBe(s);
    expect(reducer(s, { type: "ATA_IMPORTERA_BCF", projektId: pid, nya: [], uppdatera: [{ id: "finns-inte", falt: { benamning: "x" } }] })).toBe(s);
  });

  it("ATA_SATT_BCFGUID sparar giltiga guid och struntar i resten", () => {
    const { s, u } = medArendeOchObjekt();
    const ut = reducer(s, { type: "ATA_SATT_BCFGUID", guider: { [u.id]: GUID, nope: GUID2 } });
    expect(ut.ur.find((r) => r.id === u.id).bcfGuid).toBe(GUID);
    expect(reducer(ut, { type: "ATA_SATT_BCFGUID", guider: { [u.id]: GUID } })).toBe(ut);
    expect(reducer(s, { type: "ATA_SATT_BCFGUID", guider: { [u.id]: "inte-guid" } })).toBe(s);
  });
});
