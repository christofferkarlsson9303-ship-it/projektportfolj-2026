import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { aterstallBilagor, bilagaSammanfattning, bilagekallor, byggSakerhetskopia, lasSakerhetskopia } from "./sakerhetskopia.js";
import { minneslager, skapaIfcCache } from "./ifcCache.js";

/* Återläsningsprov (F06): en miljö med ritning, IFC och protokoll packas, och läses
   tillbaka i en tom miljö. Allt ska komma fram byte för byte. */

function ritningsLager() {
  const filer = new Map();
  const arkiv = {
    hamta: async (s) => filer.get(s) || null,
    ladda: async (fil, s) => {
      filer.set(s, new Uint8Array(await fil.arrayBuffer()));
      return s;
    },
  };
  return { filer, arkiv: () => arkiv };
}

function protokollLager() {
  const rader = [];
  const filer = new Map();
  return {
    rader,
    filer,
    arkiv: {
      hamtaFil: async (r) => filer.get(r.id) || null,
      ladda: async (fil, { projektId, moteNr }) => {
        const r = { id: `p${rader.length + 1}`, filnamn: fil.name, projektId, moteNr, mime: fil.type };
        rader.push(r);
        filer.set(r.id, new Uint8Array(await fil.arrayBuffer()));
        return r;
      },
    },
  };
}

const STATE = {
  projekt: [{ id: "36037", namn: "Växjö" }],
  siteRitningar: [{ id: "r1", filnamn: "E-63-1-100.pdf", lagring: "lokal", sokvag: "36037/r1-E-63-1-100.pdf" }],
  ifcModeller: [{ id: "m1", filnamn: "park.ifc" }, { id: "m2", filnamn: "saknas.ifc" }],
};

describe("fullständig säkerhetskopia (F06)", () => {
  it("packar state och bilagor och läser tillbaka dem i en tom miljö", async () => {
    const ritning = ritningsLager();
    await ritning.arkiv().ladda(new Blob([new Uint8Array([37, 80, 68, 70, 1, 2, 3])]), "36037/r1-E-63-1-100.pdf");
    const ifc = skapaIfcCache(minneslager());
    await ifc.spara("m1", [{ eid: 1, delar: [{ pos: [0, 1, 2] }] }]);
    const prot = protokollLager();
    const bm = await prot.arkiv.ladda(new File(["BM10"], "BM10.pdf", { type: "application/pdf" }), { projektId: "36037", moteNr: "10" });

    const { data, manifest } = await byggSakerhetskopia({
      state: STATE,
      av: "Christoffer",
      kallor: bilagekallor(STATE, { ritningsArkiv: ritning.arkiv, ifcCache: ifc, protokoll: [bm], protokollArkiv: prot.arkiv }),
      nu: new Date("2026-10-21T12:00:00Z"),
    });
    expect(manifest.filer.map((f) => f.typ).sort()).toEqual(["ifc", "protokoll", "ritning", "state"]);
    expect(manifest.saknas).toEqual([expect.objectContaining({ id: "m2", typ: "ifc" })]);
    expect(bilagaSammanfattning(manifest)[1]).toMatch(/saknas\.ifc/);

    // Tom miljö.
    const las = await lasSakerhetskopia(data);
    expect(las.fel).toEqual([]);
    expect(JSON.parse(las.stateText).state).toEqual(STATE);
    const tomRitning = ritningsLager();
    const tomIfc = skapaIfcCache(minneslager());
    const tomProt = protokollLager();
    const res = await aterstallBilagor(las.filer, { ritningsArkiv: tomRitning.arkiv, ifcCache: tomIfc, protokollArkiv: tomProt.arkiv });
    expect(res).toEqual({ aterlagda: 3, hoppade: [], fel: [] });
    expect([...tomRitning.filer.get("36037/r1-E-63-1-100.pdf")]).toEqual([37, 80, 68, 70, 1, 2, 3]);
    expect(await tomIfc.hamta("m1")).toEqual([{ eid: 1, delar: [{ pos: [0, 1, 2] }] }]);
    expect(tomProt.rader[0]).toMatchObject({ filnamn: "BM10.pdf", projektId: "36037", moteNr: "10" });

    // En andra återläsning hoppar över det som redan finns.
    const igen = await aterstallBilagor(las.filer, { ritningsArkiv: tomRitning.arkiv, ifcCache: tomIfc, protokollArkiv: tomProt.arkiv, befintligaProtokoll: tomProt.rader });
    expect(igen.aterlagda).toBe(0);
    expect(igen.hoppade).toHaveLength(3);
  });

  it("en ändrad fil underkänns på kontrollsumman", async () => {
    const { data } = await byggSakerhetskopia({ state: STATE, kallor: [{ typ: "ritning", id: "x", namn: "x.pdf", sokvag: "ritningar/x.pdf", meta: {}, hamta: async () => "original" }] });
    const zip = await JSZip.loadAsync(data);
    zip.file("ritningar/x.pdf", "ändrad");
    const las = await lasSakerhetskopia(await zip.generateAsync({ type: "uint8array" }));
    expect(las.fel[0]).toMatch(/kontrollsumman stämmer inte/);
    expect(las.filer).toHaveLength(0);
  });
});
