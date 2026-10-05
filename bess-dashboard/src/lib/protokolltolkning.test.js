import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hittaRubriker, meningar, moteBlock, stada, tolkaDeltagare, tolkaProtokoll, veckansMandag } from "./protokolltolkning.js";
import { raderUrTextbitar } from "./protokolltext.js";

const TEXT = readFileSync(new URL("./__fixtures__/byggmote-ingrid.txt", import.meta.url), "utf8");
const t = tolkaProtokoll(TEXT, { filnamn: "Byggmöte_10_Växjö.pdf" });
const atgard = (del) => t.atgarder.find((a) => a.text.includes(del));

describe("Byggmötesprotokoll i beställarens mall", () => {
  it("läser huvudet: möte, datum, plats och nästa möte", () => {
    expect(t).toMatchObject({ moteNr: "BM-10", datum: "2026-09-28", plats: "Digitalt via Teams", nasta: "2026-10-12" });
    expect(t.varningar).toEqual([]);
  });

  it("läser närvarande med organisation, utan roller och företag som namn", () => {
    expect(t.deltagare.map((d) => [d.namn, d.org])).toEqual([
      ["Alex Young", "Ingrid Capacity"],
      ["Henrik Gyllenklo", "Ingrid Capacity"],
      ["Kim Wilton", "One Nordic"],
      ["Christoffer Karlsson", "One Nordic"],
      ["Johan Adolfsson", "One Nordic"],
    ]);
    expect(tolkaDeltagare("Kim Wilton Ombud One Nordic KW")[0].initialer).toContain("KW");
  });

  it("tar aldrig med inloggningsuppgifter", () => {
    expect(t.dolda).toBe(2);
    expect(JSON.stringify(t)).not.toMatch(/hemligt|Testkonto|Lösenord|Användarnamn/i);
    expect(stada("a\nLösenord: x\nb").text).toBe("a\nb");
  });

  it("tar bara punkter från BM 10, inte från startmötet eller BM 9", () => {
    expect(t.punkter.every((p) => p.id.startsWith("pkt-10-"))).toBe(true);
    expect(atgard("stämmer av med CATL")).toBeUndefined();
    expect(atgard("tar fram nya deltider")).toBeUndefined();
  });

  it("hittar åtgärder med ansvarig, även genom stycke och pronomen", () => {
    expect(atgard("håller kontakt med Jinert")).toMatchObject({ ansvarig: "One Nordic", var: true });
    expect(atgard("upprättar underlag")).toMatchObject({ ansvarig: "Christoffer Karlsson", var: true });
    expect(atgard("Ny plåt tas fram")).toMatchObject({ ansvarig: "Christoffer Karlsson" });
    expect(atgard("De återkommer")).toMatchObject({ ansvarig: "A-Bygg", var: false });
  });

  it("det som redan är gjort, och påståenden, är inga åtgärder", () => {
    expect(atgard("Byggstaket bytt")).toBeUndefined();
    expect(atgard("är draget")).toBeUndefined();
    expect(atgard("skall detta vara testat")).toBeUndefined();
  });

  it("datum: angivet datum, veckans fredag, annars nästa möte", () => {
    expect(atgard("tillkallar ny provning")).toMatchObject({ forfaller: "2026-10-09", forfallerKalla: "vecka" });
    expect(atgard("upprättar underlag")).toMatchObject({ forfaller: "2026-10-12", forfallerKalla: "nasta" });
    expect(veckansMandag(2026, 41)).toBe("2026-10-05");
  });

  it("frågor blir åtgärder och avstavning över radbrytning lagas", () => {
    expect(atgard("brandtätningen")).toMatchObject({ fraga: true });
    expect(t.punkter.find((p) => p.avsnitt === "15").text).toContain("HSP-rummet");
    expect(atgard("måste vara utförda")?.text).toContain("AC-Block");
  });

  it("varje punkt får appens paragraf: ÄTA under §4", () => {
    expect(t.punkter.find((p) => p.avsnitt === "10.3")).toMatchObject({ para: "4", typ: "atgard" });
    expect(t.punkter.find((p) => p.avsnitt === "12").para).toBe("3");
  });

  it("varnar när mötesdatumet inte går ihop med nästa möte", () => {
    const fel = tolkaProtokoll(TEXT.replace("Datum: 2026-09-28", "Datum: 2025-09-28"));
    expect(fel.varningar.join(" ")).toMatch(/ser fel ut/);
  });

  it("text utan mallen ger en varning, inte påhittade punkter", () => {
    const r = tolkaProtokoll("Möte om allt möjligt. Vi pratade.");
    expect(r.punkter).toEqual([]);
    expect(r.varningar[0]).toMatch(/följer inte beställarens mall/);
  });
});

describe("Delar av tolkningen", () => {
  it("BM-markörer, men inte hänvisningar som 'till BM 2'", () => {
    const b = moteBlock("Grund. SM Start. Till BM1. CK BM 2 Andra. inför BM 3 inget BM 3 Tredje.");
    expect(b.map((x) => x.mote)).toEqual([null, 0, 2, 3]);
  });

  it("rubriker hittas i ordning", () => {
    expect(hittaRubriker(TEXT).map((r) => r.nr)).toEqual(["1", "3", "4", "7", "7.1", "10", "10.3", "12", "14", "15", "16"]);
  });

  it("meningar delas inte på förkortningar", () => {
    expect(meningar("Enl. ritning, t.ex. vid kap. 2. Nästa sak.")).toEqual(["Enl. ritning, t.ex. vid kap. 2.", "Nästa sak."]);
  });

  it("PDF-bitar fogas ihop utan falska mellanslag", () => {
    const bit = (str, x, w, y = 700) => ({ str, transform: [10, 0, 0, 10, x, y], width: w });
    expect(raderUrTextbitar([bit("20", 0, 10), bit("26", 10, 10), bit("Joh", 40, 15), bit("an", 55, 10)])).toBe("2026 Johan");
  });
});
