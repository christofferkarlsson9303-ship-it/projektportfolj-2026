import { describe, expect, it } from "vitest";
import {
  BESS_FALT,
  KOMPONENTGRUPPER,
  MALLAR,
  MALLORDNING,
  RUTNAT,
  TOMT,
  TYPFARG,
  KANTTROSKEL,
  kanPlaceras,
  kantSnappa,
  nyttObjekt,
  objektFel,
  parkSumma,
  placeringsText,
  provaPlacering,
  rektanglarOverlappar,
  roteraSteg,
  snappa,
  snappaRotation,
  yttermatt,
} from "./site.js";

/* Rutnät, snap och kollisionsregler för placering. Ren logik — inget WebGL. */

const container = (extra = {}) => ({ id: "c", typ: "container", namn: "Container 1", x: 0, z: 0, rotation: 0, ...MALLAR.container, ...extra });
const rot = (grader, mall = MALLAR.container) => ({ ...mall, rotation: grader });

describe("rotation i steg om 90°", () => {
  it("snappar till närmaste kvartsvarv och håller 0–359", () => {
    expect(snappaRotation(0)).toBe(0);
    expect(snappaRotation(44)).toBe(0);
    expect(snappaRotation(46)).toBe(90);
    expect(snappaRotation(-90)).toBe(270);
    expect(snappaRotation(360)).toBe(0);
    expect(snappaRotation(undefined)).toBe(0);
  });

  it("R går 0 → 90 → 180 → 270 → 0", () => {
    let r = 0;
    const set = [];
    for (let i = 0; i < 5; i += 1) {
      set.push(r);
      r = roteraSteg(r);
    }
    expect(set).toEqual([0, 90, 180, 270, 0]);
  });

  it("yttermåtten byter plats vid 90° och är oförändrade vid 180°", () => {
    expect(yttermatt(rot(0))).toEqual({ bredd: 6.1, djup: 2.5 });
    const a = yttermatt(rot(90));
    expect(a.bredd).toBeCloseTo(2.5, 9);
    expect(a.djup).toBeCloseTo(6.1, 9);
    const b = yttermatt(rot(180));
    expect(b.bredd).toBeCloseTo(6.1, 9);
  });
});

describe("snappa()", () => {
  it("lägger objektets hörn på rutnätet, inte centrum", () => {
    // 6,1 bred: vänsterkant på heltal ⇒ centrum på heltal + 0,05
    const q = snappa(-9.7, -10.2, rot(0));
    expect(q.x).toBeCloseTo(-9.95, 6);
    expect(q.z).toBeCloseTo(-9.75, 6); // 2,5 djup: kant −11,45 → −11 → centrum −9,75
  });

  it("är idempotent — att snappa ett snappat värde ändrar inget", () => {
    const o = rot(0);
    const a = snappa(3.37, 8.81, o);
    const b = snappa(a.x, a.z, o);
    expect(b).toEqual(a);
  });

  it("ett 90° vridet objekt snappar efter sina vridna mått", () => {
    const q = snappa(0.4, 0.4, rot(90));
    // vriden: 2,5 (X) × 6,1 (Z). Kanterna ska ligga på heltal.
    const kantX = q.x - 2.5 / 2;
    const kantZ = q.z - 6.1 / 2;
    expect(Math.abs(kantX - Math.round(kantX))).toBeLessThan(1e-6);
    expect(Math.abs(kantZ - Math.round(kantZ))).toBeLessThan(1e-6);
  });

  it("håller hela fotavtrycket inom tomten, också när musen är långt utanför", () => {
    const q = snappa(500, -500, rot(0));
    expect(q.x).toBeCloseTo(TOMT.bredd / 2 - 6.1 / 2, 6);
    expect(q.z).toBeCloseTo(-TOMT.djup / 2 + 2.5 / 2, 6);
  });

  it("rutnat = 0 stänger av snappen men behåller tomtgränsen", () => {
    const q = snappa(3.37, 4.11, rot(0), 0);
    expect(q).toEqual({ x: 3.37, z: 4.11 });
    expect(snappa(999, 0, rot(0), 0).x).toBeCloseTo(TOMT.bredd / 2 - 3.05, 6);
  });

  it("ett objekt större än tomten hamnar mitt på i stället för att kasta", () => {
    expect(snappa(10, 10, { bredd: 200, djup: 200, rotation: 0 })).toEqual({ x: 0, z: 0 });
  });

  it("rutnätet är en meter och tomtens kanter ligger på det", () => {
    expect(RUTNAT).toBe(1);
    expect(TOMT.bredd % RUTNAT).toBe(0);
    expect(TOMT.djup % RUTNAT).toBe(0);
  });
});

describe("överlapp mellan vridna rektanglar", () => {
  it("kant mot kant är inte överlapp — moduler får stå intill varandra", () => {
    const a = container({ x: 0, z: 0 });
    const b = container({ id: "d", x: 6.1, z: 0 });
    expect(rektanglarOverlappar(a, b)).toBe(false);
    expect(rektanglarOverlappar(a, { ...b, x: 6.0 })).toBe(true);
  });

  it("följer rotationen — vriden 90° tar plats i Z i stället för X", () => {
    const a = container({ x: 0, z: 0 });
    const vriden = container({ id: "d", x: 4, z: 0, rotation: 90 }); // 2,5 × 6,1
    expect(rektanglarOverlappar(a, vriden)).toBe(true); // 4 − 1,25 = 2,75 < 3,05
    expect(rektanglarOverlappar(a, { ...vriden, x: 4.5 })).toBe(false); // 4,5 − 1,25 = 3,25 > 3,05
  });

  it("vinklade rektanglar: hörnet mot sidan avgörs av separerande axel, inte av omslutande låda", () => {
    const a = { x: 0, z: 0, bredd: 4, djup: 4, rotation: 0 };
    // 45°-vriden kvadrat vars omslutande låda skär a, men själva kvadraten inte.
    const b = { x: 5.9, z: 0, bredd: 4, djup: 4, rotation: 45 }; // halv diagonal 2,83
    expect(rektanglarOverlappar(a, b)).toBe(false);
    expect(rektanglarOverlappar(a, { ...b, x: 4.5 })).toBe(true);
  });

  it("luft kräver ett fritt avstånd", () => {
    const a = container({ x: 0, z: 0 });
    const b = container({ id: "d", x: 6.5, z: 0 });
    expect(rektanglarOverlappar(a, b)).toBe(false);
    expect(rektanglarOverlappar(a, b, 1)).toBe(true);
  });
});

describe("kanPlaceras() — kollisionsregler", () => {
  const finns = [container({ id: "a", x: 0, z: 0 })];

  it("fri yta är ok", () => {
    expect(kanPlaceras(container({ id: "ny", x: 10, z: 0 }), finns)).toEqual({ ok: true });
  });

  it("upptagen yta ger krock och pekar ut vem som är i vägen", () => {
    const r = kanPlaceras(container({ id: "ny", x: 2, z: 0 }), finns);
    expect(r.ok).toBe(false);
    expect(r.orsak).toBe("krock");
    expect(r.med.id).toBe("a");
  });

  it("ett objekt krockar inte med sig självt (flytt och rotation)", () => {
    expect(kanPlaceras(container({ id: "a", x: 1, z: 0 }), finns, { ignorera: "a" })).toEqual({ ok: true });
  });

  it("utanför tomten är aldrig ok, med hänsyn till rotationen", () => {
    expect(kanPlaceras(container({ id: "n", x: 38, z: 0 }), []).orsak).toBe("utanfor"); // 38 + 3,05 > 40
    expect(kanPlaceras(container({ id: "n", x: 36.9, z: 0 }), []).ok).toBe(true); // 36,9 + 3,05 = 39,95
    expect(kanPlaceras(container({ id: "n", x: 38, z: 0, rotation: 90 }), []).ok).toBe(true); // vriden: 38 + 1,25
  });

  it("nålar och punkter utan yta kontrolleras inte, och en nål är inget hinder", () => {
    expect(kanPlaceras({ id: "nal", typ: "nal", x: 0, z: 0, punktId: "p" }, finns)).toEqual({ ok: true });
    const nal = { id: "n", typ: "nal", x: 0, z: 0, punktId: "p" };
    expect(kanPlaceras(container({ id: "ny", x: 0, z: 0 }), [nal])).toEqual({ ok: true });
  });

  it("texten säger vad som är fel, och inget när allt är ok", () => {
    expect(placeringsText({ ok: true })).toBeNull();
    expect(placeringsText({ ok: false, orsak: "utanfor" })).toMatch(/utanför tomten/);
    expect(placeringsText({ ok: false, orsak: "krock", med: { namn: "Container 1" } })).toBe("Platsen är upptagen av Container 1.");
  });
});

describe("provaPlacering() — snappa och kontrollera i ett steg", () => {
  it("snappar och godkänner fri yta", () => {
    const r = provaPlacering({ typ: "container", ...rot(0) }, { x: 10.3, z: 4.2 }, []);
    expect(r.ok).toBe(true);
    expect(Math.abs(r.x - 3.05 - Math.round(r.x - 3.05))).toBeLessThan(1e-6);
  });

  it("två moduler i rad snappar kant mot kant utan krock", () => {
    const m = { typ: "container", ...rot(0) };
    const f = provaPlacering(m, { x: -10, z: 0 }, []);
    const forsta = container({ id: "1", x: f.x, z: f.z });
    // Musen ligger strax in i första containern — snappen hamnar vid sidan om? Nej: den krockar.
    const inne = provaPlacering(m, { x: f.x + 3, z: f.z }, [forsta]);
    expect(inne.ok).toBe(false);
    // Musen precis intill ger exakt anslutande kant.
    const intill = provaPlacering(m, { x: f.x + 6.1, z: f.z }, [forsta]);
    expect(intill.ok).toBe(true);
    expect(intill.x - f.x).toBeCloseTo(6.1, 6);
  });

  it("flytt av ett befintligt objekt ignorerar objektet självt", () => {
    const a = container({ id: "a", x: 0, z: 0 });
    const r = provaPlacering(a, { x: 1, z: 0 }, [a], { ignorera: "a" });
    expect(r.ok).toBe(true);
  });

  it("en nål snappar inte men hålls inom tomten", () => {
    const r = provaPlacering({ typ: "nal" }, { x: 3.37, z: 999 }, []);
    expect(r.ok).toBe(true);
    expect(r.x).toBe(3.4);
    expect(r.z).toBe(TOMT.djup / 2);
  });
});

describe("kantSnappa() — kant mot kant trots mått som inte går jämnt ut", () => {
  const a = container({ id: "a", x: -10, z: 0 }); // höger kant −6,95

  it("dras mot grannens kant inom tröskeln så att de möts exakt", () => {
    const q = kantSnappa({ x: -3.9, z: 0 }, rot(0), [a]); // vänster kant −6,95 − 0,1 … nära
    expect(q.x - 3.05).toBeCloseTo(-6.95, 6);
  });

  it("rör inte objektet utanför tröskeln", () => {
    const q = kantSnappa({ x: 0, z: 0 }, rot(0), [a]);
    expect(q).toEqual({ x: 0, z: 0 });
    expect(KANTTROSKEL).toBeLessThan(1);
  });

  it("ignorerar grannar i en annan rad som inte ligger i höjd", () => {
    const q = kantSnappa({ x: -3.9, z: 20 }, rot(0), [a]);
    expect(q.x).toBe(-3.9);
  });

  it("lägger kanterna i linje på tvären när de nästan är det", () => {
    const q = kantSnappa({ x: -10, z: 2.8 }, rot(0), [a]); // z-kant mot grannens z-kant (2,5 djup)
    expect(q.z).toBeCloseTo(2.5, 6); // grannens undersida 1,25 + 1,25 = 2,5 kant mot kant
  });

  it("ignorerar objektet självt och nålar", () => {
    expect(kantSnappa({ x: -3.9, z: 0 }, rot(0), [a], { ignorera: "a" }).x).toBe(-3.9);
    expect(kantSnappa({ x: -3.9, z: 0 }, rot(0), [{ id: "n", typ: "nal", x: -6, z: 0 }]).x).toBe(-3.9);
  });

  it("luft ger ett fritt avstånd i stället för att stå kant mot kant", () => {
    const q = kantSnappa({ x: -3.5, z: 0 }, rot(0), [a], { luft: 0.5 });
    expect(q.x - 3.05).toBeCloseTo(-6.95 + 0.5, 6);
  });
});

describe("hägnad och komponentmeny", () => {
  it("hägnad är en tunn volym med egen färg och finns i menyn", () => {
    expect(MALLAR.hagnad).toMatchObject({ bredd: 5, djup: 0.2, hojd: 2.2 });
    expect(TYPFARG.hagnad).toBeTruthy();
    expect(MALLORDNING).toContain("hagnad");
  });

  it("varje mall finns i exakt en menygrupp", () => {
    const alla = KOMPONENTGRUPPER.flatMap((g) => g.typer).sort();
    expect(alla).toEqual([...MALLORDNING].sort());
    expect(new Set(alla).size).toBe(alla.length);
  });

  it("menyn har de fyra grupperna som beställdes", () => {
    const namn = KOMPONENTGRUPPER.map((g) => g.namn);
    expect(namn).toEqual(expect.arrayContaining(["Containers", "Inverters / MV-skids", "Transformatorer", "Hägnad"]));
  });

  it("hägnad går att placera kant mot kant i en rad", () => {
    const h = { typ: "hagnad", ...MALLAR.hagnad, rotation: 0 };
    const a = provaPlacering(h, { x: -20, z: -20 }, []);
    const raden = { id: "h1", ...h, x: a.x, z: a.z, namn: "Hägnad 1" };
    const b = provaPlacering(h, { x: a.x + 5, z: a.z }, [raden]);
    expect(b.ok).toBe(true);
  });
});

describe("nyttObjekt() med snappad position och rotation", () => {
  it("exakt position avrundas inte till en decimal", () => {
    const q = snappa(0, 0, rot(0));
    const o = nyttObjekt("container", "p1", q, [], { exakt: true, rotation: 90 });
    expect(o.x).toBe(q.x);
    expect(o.rotation).toBe(90);
  });

  it("utan exakt avrundas som förut", () => {
    expect(nyttObjekt("container", "p1", { x: 1.234, z: 2.345 }, []).x).toBe(1.2);
  });
});

describe("BESS-data på volymer", () => {
  const rad = (extra) => ({ ...nyttObjekt("container", "p1", { x: 0, z: 0 }, []), ...extra });

  it("tomma fält är ok — data är valfri", () => {
    expect(objektFel(rad({}))).toBeNull();
    expect(objektFel(rad({ mwh: "", mw: null }))).toBeNull();
  });

  it("negativt, ogiltigt och SoC över 100 avvisas", () => {
    expect(objektFel(rad({ mwh: -1 }))).toMatch(/Energi/);
    expect(objektFel(rad({ mw: "abc" }))).toMatch(/Effekt/);
    expect(objektFel(rad({ soc: 101 }))).toMatch(/högst vara 100/);
    expect(objektFel(rad({ soc: 100 }))).toBeNull();
    expect(objektFel(rad({ soc: 0 }))).toBeNull();
  });

  it("okänd status avvisas, kända godtas", () => {
    expect(objektFel(rad({ status: "trasig" }))).toBe("Okänd status.");
    for (const s of ["planerad", "levererad", "monterad", "driftsatt"]) expect(objektFel(rad({ status: s }))).toBeNull();
  });

  it("fält per typ: container har MWh, MW och SoC, trafo har MVA, hägnad inget", () => {
    expect(BESS_FALT.container.map((f) => f[0])).toEqual(["mwh", "mw", "soc"]);
    expect(BESS_FALT.trafo.map((f) => f[0])).toEqual(["mva"]);
    expect(BESS_FALT.hagnad).toBeUndefined();
  });

  it("parkSumma summerar och viktar SoC på energi", () => {
    const s = parkSumma([
      container({ id: "1", mwh: 4, mw: 2, soc: 80, status: "driftsatt" }),
      container({ id: "2", mwh: 1, mw: 0.5, soc: 30 }),
      { id: "3", typ: "skid", x: 0, z: 0, rotation: 0, ...MALLAR.skid, mw: 2.5 },
      { id: "4", typ: "trafo", x: 0, z: 0, rotation: 0, ...MALLAR.trafo, mva: 5 },
      { id: "5", typ: "hagnad", x: 0, z: 0, rotation: 0, ...MALLAR.hagnad },
    ]);
    expect(s.mwh).toBe(5);
    expect(s.mw).toBe(2.5);
    expect(s.inverterMw).toBe(2.5);
    expect(s.trafoMva).toBe(5);
    expect(s.soc).toBeCloseTo((4 * 80 + 1 * 30) / 5, 9); // 70
    expect(s.antal).toBe(4);
    expect(s.driftsatta).toBe(1);
  });

  it("SoC är null när ingen container har angett den — inte 0", () => {
    expect(parkSumma([container({ id: "1", mwh: 4 })]).soc).toBeNull();
    expect(parkSumma([]).soc).toBeNull();
  });
});

describe("reducern och BESS-data", () => {
  it("SITE_ANDRA sparar BESS-fält men avvisar SoC över 100 och okänd status", async () => {
    const { SEED } = await import("../data/seed.js");
    const { efterInlasning, normalisera, reducer } = await import("../state/portfolj-reducer.js");
    const start = efterInlasning(normalisera(structuredClone(SEED)));
    const rad = nyttObjekt("container", start.projekt[0].id, { x: 0, z: 0 }, []);
    let s = reducer(start, { type: "SITE_LAGG_TILL", rad });
    s = reducer(s, { type: "SITE_ANDRA", id: rad.id, andring: { mwh: 4, mw: 2, soc: 65, status: "monterad", spec: "LFP, vätskekyld" } });
    expect(s.siteObjekt[0]).toMatchObject({ mwh: 4, mw: 2, soc: 65, status: "monterad", spec: "LFP, vätskekyld" });
    const avvisad = reducer(s, { type: "SITE_ANDRA", id: rad.id, andring: { soc: 150 } });
    expect(avvisad).toBe(s);
    expect(reducer(s, { type: "SITE_ANDRA", id: rad.id, andring: { status: "trasig" } })).toBe(s);
  });
});
