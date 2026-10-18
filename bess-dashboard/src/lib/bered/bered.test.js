import { describe, expect, it } from "vitest";
import { hittaKod, KATALOG } from "./katalog.js";
import { hittaArtikel } from "./materiel.js";
import { kfMV, kontrollDC, kontrollMV, kontrollSpanningsfall, mvStrom, mvVal } from "./kabel.js";
import { byggKonstruktion, genereraBess, kontrollera } from "./bibliotek.js";
import { beraknaKalkyl, kabellista, kabellistaCsv, kodKostnad, materiellista } from "./kalkyl.js";

describe("katalog", () => {
  it("har KLG-urvalet och BESS-koderna", () => {
    expect(hittaKod("137.13")?.kat).toBe("P2");
    expect(hittaKod("B101.01")?.kat).toBe("BESS");
    expect(KATALOG.filter((k) => k.ue).every((k) => k.kod.startsWith("B160"))).toBe(true);
  });

  it("räknar arbete som KLG: 510.01 = 3,6 h beredare", () => {
    const v = kodKostnad("510.01", 1);
    expect(Math.round(v.arbete)).toBe(3877); // katalogen anger 3 875 kr, avrundning
  });

  it("UE-post utan pris ger 0 kr och flagga, aldrig en gissning", () => {
    const v = kodKostnad("B160.01", 8);
    expect(v.summa).toBe(0);
    expect(v.uePrisSaknas).toBe(true);
    expect(kodKostnad("B160.01", 8, { uePris: { "B160.01": 50000 } }).summa).toBe(400000);
  });
});

describe("kabel", () => {
  it("korrektionsfaktor ur NKT-tabellerna", () => {
    expect(kfMV({ marktemp: 15, rho: "1,0", djup: "0,25–0,70", grupper: 1, avst: 250, ror: "Nej" }).tot).toBe(1);
    expect(kfMV({ marktemp: 15, rho: "1,0", djup: "0,25–0,70", grupper: 3, avst: 250, ror: "Ja" }).tot).toBeCloseTo(0.79 * 0.8, 6);
  });

  it("ström 15 MW vid 20 kV ≈ 433 A", () => {
    expect(Math.round(mvStrom(15, 20))).toBe(433);
  });

  it("väljer parallella system när en kabel inte räcker", () => {
    const f = { marktemp: 17, rho: "1,0", djup: "0,71–0,90", grupper: 7, avst: 250, ror: "Nej" };
    const v = mvVal(15, 20, f);
    expect(v.sys).toBeGreaterThan(1);
    expect(kontrollMV({ ...v, mw: 15, kv: 20, ...f }).ok).toBe(true);
  });

  it("3-ledare saknar belastningsvärde och ger verifiera", () => {
    expect(kontrollMV({ kabel: "AXALJ-TT 3x240/50", mw: 5, kv: 20, sys: 1 }).ok).toBeNull();
  });

  it("DC 1500 V: mittpunktsjordat ok, ojordat verifiera, enpolsjordat underkänt", () => {
    expect(kontrollDC({ dcu: 1500, dcjord: "Mittpunktsjordat" }).ok).toBe(true);
    expect(kontrollDC({ dcu: 1500, dcjord: "Ojordat (IT) med isolationsövervakning" }).ok).toBeNull();
    expect(kontrollDC({ dcu: 1500, dcjord: "En pol jordad" }).ok).toBe(false);
  });

  it("spänningsfall hjälpkraft enligt NKT tabell 42", () => {
    const r = kontrollSpanningsfall({ art: "E00 046 55", kw: 60, langd: 40 });
    expect(r.ok).toBe(true);
  });
});

describe("generator", () => {
  const g = genereraBess({ mw: 20, mwh: 40 });

  it("räknar antal containrar, skids och radialer", () => {
    expect(g.antal).toEqual({ container: 8, skid: 4, radialer: 2, perSkid: 2 });
  });

  it("alla MV-sträckor klarar sin last", () => {
    const mv = g.konstruktioner.filter((k) => k.typ === "mv");
    expect(mv).toHaveLength(4);
    for (const k of mv) expect(kontrollera(k).ok).toBe(true);
  });

  it("100 MW / 400 MWh ger 80 containrar och dimensionerade radialer", () => {
    const s = genereraBess({ mw: 100, mwh: 400 });
    expect(s.antal.container).toBe(80);
    expect(s.konstruktioner.filter((k) => k.typ === "mv").every((k) => kontrollera(k).ok)).toBe(true);
  });

  it("varje kod och artikel finns i registren", () => {
    for (const k of g.konstruktioner) {
      for (const { kod } of k.k) expect(hittaKod(kod), kod).toBeTruthy();
      for (const { art } of k.m) expect(hittaArtikel(art), art).toBeTruthy();
    }
  });
});

describe("kalkyl och listor", () => {
  const g = genereraBess({ mw: 20, mwh: 40 });

  it("kalkylen summerar och flaggar UE-poster utan pris", () => {
    const k = beraknaKalkyl(g.konstruktioner, { risk: 5, vinst: 10 });
    expect(k.saknasKod).toEqual([]);
    expect(k.summa.summa).toBeGreaterThan(0);
    expect(k.uePrisSaknas).toContain("B160.01");
    expect(k.vinstkalkyl).toBeCloseTo(k.summa.summa * 1.05 * 1.1, 4);
  });

  it("BL-materiel prissätts inte men listas", () => {
    const bl = materiellista(g.konstruktioner).find((x) => x.art === "BL-BATT");
    expect(bl.bl).toBe(true);
    expect(bl.n).toBe(8);
  });

  it("kabellistan numreras per serie", () => {
    const l = kabellista(g.konstruktioner);
    expect(l.find((r) => r.serie === "DC").id).toBe("DC201");
    expect(l.find((r) => r.serie === "HSP").id).toBe("W1");
    expect(kabellistaCsv(l).split("\r\n")[0]).toContain("Kabel-ID");
  });

  it("konstruktion utan nollrader", () => {
    const k = byggKonstruktion("skid", "+MV01", { jord: 0, kct: 0 });
    expect(k.m.some((x) => x.n === 0)).toBe(false);
  });
});
