import { describe, expect, it } from "vitest";
import { rutinAntal, rutinKlar, rutinNyckel } from "./berakningar.js";
import { RUTINER } from "../data/rutiner.js";

const kapitel = {
  id: "2.4",
  titel: "Hinder och ÄTA",
  grupper: [
    { namn: "Före", punkter: [{ n: "a", t: "Läs kontraktet" }, { n: "b", t: "Kontrollera mängder" }] },
    { namn: "Under", text: ["Ren text utan punkter"] },
    { namn: "Efter", punkter: [{ n: "a", t: "Fakturera" }] },
  ],
};

const state = (rader) => ({ rutinstatus: rader });

describe("rutinNyckel", () => {
  it("binder ihop kapitel, grupp och punkt", () => {
    expect(rutinNyckel("2.4", 0, "a")).toBe("2.4|0|a");
  });

  it("skiljer samma punktnamn i olika grupper", () => {
    // Både grupp 0 och grupp 2 har en punkt som heter "a".
    expect(rutinNyckel("2.4", 0, "a")).not.toBe(rutinNyckel("2.4", 2, "a"));
  });
});

describe("rutinKlar", () => {
  it("är sant bara när raden är avbockad för rätt projekt", () => {
    const s = state([{ projektId: "p1", punkt: "2.4|0|a", klar: true }]);
    expect(rutinKlar(s, "p1", "2.4|0|a")).toBe(true);
    expect(rutinKlar(s, "p2", "2.4|0|a")).toBe(false);
    expect(rutinKlar(s, "p1", "2.4|0|b")).toBe(false);
  });

  it("räknar en urbockad rad som inte klar", () => {
    // Reducern behåller raden med klar:false i stället för att ta bort den.
    const s = state([{ projektId: "p1", punkt: "2.4|0|a", klar: false }]);
    expect(rutinKlar(s, "p1", "2.4|0|a")).toBe(false);
  });
});

describe("rutinAntal", () => {
  it("räknar punkter över alla grupper och hoppar över textgrupper", () => {
    expect(rutinAntal(state([]), "p1", kapitel)).toEqual({ tot: 3, klar: 0 });
  });

  it("räknar avbockade punkter", () => {
    const s = state([
      { projektId: "p1", punkt: "2.4|0|a", klar: true },
      { projektId: "p1", punkt: "2.4|2|a", klar: true },
      { projektId: "p2", punkt: "2.4|0|b", klar: true },
    ]);
    expect(rutinAntal(s, "p1", kapitel)).toEqual({ tot: 3, klar: 2 });
  });

  it("ger noll av noll för ett rent referenskapitel", () => {
    const ref = { id: "1", grupper: [{ namn: "Bara text", text: ["a", "b"] }] };
    expect(rutinAntal(state([]), "p1", ref)).toEqual({ tot: 0, klar: 0 });
  });
});

describe("handboken — det avbockningen bygger på", () => {
  it("ger varje punkt en unik nyckel i hela handboken", () => {
    // Två punkter med samma nyckel hade delat kryssruta mellan sig.
    const nycklar = [];
    for (const r of RUTINER) {
      r.grupper.forEach((g, gi) => (g.punkter || []).forEach((p) => nycklar.push(rutinNyckel(r.id, gi, p.n))));
    }
    expect(new Set(nycklar).size, "dubbletter bland rutinnycklarna").toBe(nycklar.length);
  });

  it("har titel och grupper i varje kapitel", () => {
    for (const r of RUTINER) {
      expect(r.id, "kapitel utan id").toBeTruthy();
      expect(r.titel, `kapitel ${r.id} saknar titel`).toBeTruthy();
      expect(Array.isArray(r.grupper), `kapitel ${r.id} saknar grupper`).toBe(true);
    }
  });

  it("har text på varje punkt", () => {
    for (const r of RUTINER) {
      for (const g of r.grupper) {
        for (const p of g.punkter || []) {
          expect(p.n, `punkt utan n i ${r.id}`).toBeDefined();
          expect(p.t, `punkt ${r.id}/${p.n} saknar text`).toBeTruthy();
        }
      }
    }
  });

  it("pekar bara på vyer som finns", async () => {
    const { GILTIGA_VYER } = await import("../data/vyer.js");
    for (const r of RUTINER) {
      if (!r.lank) continue;
      expect(GILTIGA_VYER.has(r.lank[0]), `kapitel ${r.id} länkar till okänd vy ${r.lank[0]}`).toBe(true);
      expect(r.lank[1], `kapitel ${r.id} saknar länktext`).toBeTruthy();
    }
  });
});
