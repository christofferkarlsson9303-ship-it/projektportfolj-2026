import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { sammanfoga } from "./sammanfoga.js";
import {
  INGANG,
  MALLAR,
  arOppenPunkt,
  punkterForSite,
  MARGINAL,
  OGONHOJD,
  PLAN_NYCKEL,
  forflyttning,
  framat,
  hoger,
  krockar,
  lasPlan,
  nyttObjekt,
  objektFel,
  planMatt,
  rensaPlan,
  siteObjekt,
  sparaPlan,
  steg,
  titta,
} from "./site.js";

const nara = (a, b) => expect(a).toBeCloseTo(b, 6);
const last = (state) => efterInlasning(normalisera(structuredClone(state)));

/** Minimal sessionStorage för testerna. */
function minneslagring() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    nycklar: () => [...m.keys()],
  };
}

describe("gång — three, högerhänt, +Y upp", () => {
  it("yaw 0 tittar mot −Z och höger är +X", () => {
    const f = framat(0);
    const h = hoger(0);
    nara(f.x, 0);
    nara(f.z, -1);
    nara(h.x, 1);
    nara(h.z, 0);
  });

  it("framåt är (−sin yaw, 0, −cos yaw) och höger (cos yaw, 0, −sin yaw)", () => {
    const yaw = 0.7;
    nara(framat(yaw).x, -Math.sin(yaw));
    nara(framat(yaw).z, -Math.cos(yaw));
    nara(hoger(yaw).x, Math.cos(yaw));
    nara(hoger(yaw).z, -Math.sin(yaw));
  });

  it("A är vänster relativt blickriktningen, för varje yaw", () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 3, 2.4]) {
      const d = forflyttning(yaw, { vanster: true }, 1);
      const h = hoger(yaw);
      const f = framat(yaw);
      // Rakt mot minus höger, ingenting framåt.
      expect(d.x * h.x + d.z * h.z).toBeLessThan(0);
      nara(d.x * f.x + d.z * f.z, 0);
      // Vänster ligger moturs från blicken sett ovanifrån: kryssprodukten
      // framåt × förflyttning pekar uppåt (+Y).
      expect(f.z * d.x - f.x * d.z).toBeGreaterThan(0);
    }
  });

  it("A tittande mot −Z går mot −X, D mot +X", () => {
    expect(forflyttning(0, { vanster: true }, 1).x).toBeLessThan(0);
    expect(forflyttning(0, { hoger: true }, 1).x).toBeGreaterThan(0);
  });

  it("piltangenterna är samma avsikter som WASD", async () => {
    const { TANGENTER } = await import("./site.js");
    expect(TANGENTER.ArrowLeft).toBe(TANGENTER.KeyA);
    expect(TANGENTER.ArrowRight).toBe(TANGENTER.KeyD);
    expect(TANGENTER.ArrowUp).toBe(TANGENTER.KeyW);
    expect(TANGENTER.ArrowDown).toBe(TANGENTER.KeyS);
  });

  it("Shift springer, diagonalen är inte snabbare än rakt fram, Q upp och E ner", () => {
    const gang = forflyttning(0, { fram: true }, 1);
    const spring = forflyttning(0, { fram: true, spring: true }, 1);
    expect(Math.abs(spring.z)).toBeGreaterThan(Math.abs(gang.z));
    const diag = forflyttning(0, { fram: true, hoger: true }, 1);
    nara(Math.hypot(diag.x, diag.z), Math.abs(gang.z));
    expect(forflyttning(0, { upp: true }, 1).y).toBeGreaterThan(0);
    expect(forflyttning(0, { ner: true }, 1).y).toBeLessThan(0);
  });

  it("musen: yaw −= movementX och pitch −= movementY", () => {
    const t = titta(0, 0, 10, 4, 0.01);
    nara(t.yaw, -0.1);
    nara(t.pitch, -0.04);
    // Pitch stannar före rakt upp.
    expect(titta(0, 0, 0, -100000).pitch).toBeLessThan(Math.PI / 2);
  });

  it("ingången står söder om tomten och tittar mot norr (−Z)", () => {
    expect(INGANG.z).toBeGreaterThan(26);
    expect(INGANG.yaw).toBe(0);
  });
});

describe("kollision mot volymens låda i lokal rotation", () => {
  const skid = { typ: "skid", x: 0, z: 0, rotation: 0, bredd: 6.1, djup: 2.5, hojd: 2.9 };

  it("marginalen är cirka 0,45 m", () => {
    expect(MARGINAL).toBeCloseTo(0.45, 2);
    expect(krockar(skid, 3.05 + 0.4, 0)).toBe(true);
    expect(krockar(skid, 3.05 + 0.5, 0)).toBe(false);
  });

  it("följer rotationen — vriden 90° är långsidan längs Z", () => {
    const vriden = { ...skid, rotation: 90 };
    expect(krockar(vriden, 0, 3.0)).toBe(true);
    expect(krockar(vriden, 3.0, 0)).toBe(false);
    expect(krockar(skid, 3.0, 0)).toBe(true);
  });

  it("ett blockerat steg stannar, ett fritt steg går", () => {
    const fran = { x: 0, y: OGONHOJD, z: 4 };
    const blockerat = steg(fran, { x: 0, y: 0, z: -2.5 }, [skid]);
    expect(blockerat.blockerad).toBe(true);
    expect(blockerat.z).toBe(4);
    const fritt = steg(fran, { x: 0, y: 0, z: -0.5 }, [skid]);
    expect(fritt.blockerad).toBe(false);
    expect(fritt.z).toBeCloseTo(3.5, 6);
  });

  it("över taket går man fritt, och man kommer aldrig under ögonhöjd", () => {
    expect(krockar(skid, 0, 0, OGONHOJD + 3)).toBe(false);
    expect(steg({ x: 0, y: OGONHOJD, z: 10 }, { x: 0, y: -5, z: 0 }, []).y).toBe(OGONHOJD);
  });

  it("en nål är ingen volym", () => {
    expect(krockar({ typ: "nal", x: 0, z: 0, punktId: "p2" }, 0, 0)).toBe(false);
  });
});

describe("objekt i state", () => {
  it("mallarna har specens mått", () => {
    expect(MALLAR.skid).toMatchObject({ bredd: 6.1, djup: 2.5, hojd: 2.9 });
    expect(MALLAR.container).toMatchObject({ bredd: 6.1, djup: 2.5, hojd: 2.9 });
    expect(MALLAR.ehouse).toMatchObject({ bredd: 12, djup: 3.2, hojd: 3.4 });
    expect(MALLAR.trafo).toMatchObject({ bredd: 3.2, djup: 2.6, hojd: 2.6 });
  });

  it("seedet har ingen park — siten börjar tom för varje projekt", () => {
    const s = last(SEED);
    expect(s.siteObjekt).toEqual([]);
  });

  it("placerar en skid, numrerar namnet och håller den inom tomten", () => {
    let s = last(SEED);
    const a = nyttObjekt("skid", "36037", { x: 0, z: 0 }, siteObjekt(s, "36037"));
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: a });
    const b = nyttObjekt("skid", "36037", { x: 999, z: -999 }, siteObjekt(s, "36037"));
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: b });
    expect(siteObjekt(s, "36037").map((o) => o.namn)).toEqual(["Skid 1", "Skid 2"]);
    expect(b).toMatchObject({ x: 40, z: -26 });
    expect(s.andringslogg[0].text).toBe("Site: Skid 2 placerad");
  });

  it("en nål utan punkt-id kan inte sparas", () => {
    const s = last(SEED);
    const nal = nyttObjekt("nal", "36037", { x: 1, z: 1 });
    expect(objektFel(nal, s.punkter)).toMatch(/punkt/);
    const efter = reducer(s, { type: "SITE_LAGG_TILL", rad: nal });
    expect(efter).toBe(s);
    expect(efter.siteObjekt).toHaveLength(0);
  });

  it("en nål på en punkt i projektet sparas, och kan inte tömmas på punkten efteråt", () => {
    let s = last(SEED);
    const nal = nyttObjekt("nal", "36037", { x: 1, z: 1 }, [], { punktId: "p2" });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: nal });
    expect(siteObjekt(s, "36037")).toHaveLength(1);
    expect(s.andringslogg[0].text).toMatch(/^Site: Nål på Vågkvitto/);
    const fore = s;
    s = reducer(s, { type: "SITE_ANDRA", id: nal.id, andring: { punktId: "" } });
    expect(s).toBe(fore);
    // En punkt i ett annat projekt duger inte heller.
    expect(reducer(s, { type: "SITE_ANDRA", id: nal.id, andring: { punktId: "p3" } })).toBe(fore);
  });

  it("en nål kan peka på projektets punkter och de gemensamma, öppna är samma som i arbetslistan", () => {
    const s = last(SEED);
    const ids = punkterForSite(s, "36037").map((p) => p.id);
    expect(ids).toContain("p1"); // båda projekten
    expect(ids).toContain("p2");
    expect(ids).not.toContain("p3"); // Alvesta
    expect(arOppenPunkt({ status: "oppen" })).toBe(true);
    expect(arOppenPunkt({ status: "klarmarkerad" })).toBe(false);
    expect(arOppenPunkt(undefined)).toBe(false);
  });

  it("flytt och mått sparas utan loggpost, mått måste vara större än 0", () => {
    let s = last(SEED);
    const a = nyttObjekt("trafo", "36037", { x: 0, z: 0 });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: a });
    const loggar = s.andringslogg.length;
    s = reducer(s, { type: "SITE_ANDRA", id: a.id, andring: { x: 12.5, rotation: 45, namn: "T1" } });
    expect(siteObjekt(s, "36037")[0]).toMatchObject({ x: 12.5, rotation: 45, namn: "T1", typ: "trafo" });
    expect(s.andringslogg).toHaveLength(loggar);
    expect(reducer(s, { type: "SITE_ANDRA", id: a.id, andring: { bredd: 0 } })).toBe(s);
  });

  it("återställ tömmer bara valt projekt", () => {
    let s = last(SEED);
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: nyttObjekt("skid", "36037", { x: 0, z: 0 }) });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: nyttObjekt("skid", "36038", { x: 0, z: 0 }) });
    s = reducer(s, { type: "SITE_ATERSTALL", projektId: "36037" });
    expect(siteObjekt(s, "36037")).toHaveLength(0);
    expect(siteObjekt(s, "36038")).toHaveLength(1);
    expect(s.andringslogg[0].text).toBe("Site: återställd till tom tomt");
  });

  it("överlever en omladdning och slås ihop rad för rad i sammanfoga", () => {
    let bas = last(SEED);
    bas = reducer(bas, { type: "SITE_LAGG_TILL", rad: { ...nyttObjekt("skid", "36037", { x: 0, z: 0 }), id: "so-a" } });
    expect(last(JSON.parse(JSON.stringify(bas))).siteObjekt).toHaveLength(1);

    const mina = reducer(bas, { type: "SITE_ANDRA", id: "so-a", andring: { x: 5 } });
    const deras = reducer(bas, { type: "SITE_ANDRA", id: "so-a", andring: { namn: "Skid A" } });
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(konflikter.filter((k) => k.startsWith("siteObjekt"))).toEqual([]);
    expect(varde.siteObjekt[0]).toMatchObject({ x: 5, namn: "Skid A" });
  });
});

describe("situationsplanen ligger utanför state", () => {
  const bild = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";

  it("sparas i sessionStorage per projekt med bredd, norr och proportion", () => {
    const lagring = minneslagring();
    expect(sparaPlan("36037", { bild, bredd: 120, norr: 15, proportion: 0.5 }, lagring)).toBeNull();
    expect(lagring.nycklar()).toEqual([PLAN_NYCKEL("36037")]);
    expect(lasPlan("36037", lagring)).toMatchObject({ bild, bredd: 120, norr: 15 });
    expect(planMatt(lasPlan("36037", lagring))).toEqual({ bredd: 120, djup: 60 });
    expect(lasPlan("36038", lagring)).toBeNull();
    rensaPlan("36037", lagring);
    expect(lasPlan("36037", lagring)).toBeNull();
  });

  it("bilden skrivs inte in i state-objektet som synkas", () => {
    const lagring = minneslagring();
    let s = last(SEED);
    sparaPlan("36037", { bild, bredd: 80, norr: 0, proportion: 0.65 }, lagring);
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: nyttObjekt("ehouse", "36037", { x: -32, z: -4 }) });
    s = reducer(s, { type: "SITE_ATERSTALL", projektId: "36037" });
    const synkas = JSON.stringify(s);
    expect(synkas).not.toContain("data:image");
    expect(synkas).not.toContain("situationsplan");
    // Normaliseringen släpper en nyckel som inte finns i SEED, så en plan som
    // ändå hamnat på toppnivå följer inte med vid nästa inläsning.
    expect(JSON.stringify(last({ ...s, situationsplan: { bild } }))).not.toContain("data:image");
  });

  it("en full lagring ger ett fel i text, inget kastas", () => {
    const full = { setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(sparaPlan("36037", { bild, bredd: 80 }, full)).toMatch(/får inte plats/);
  });
});
