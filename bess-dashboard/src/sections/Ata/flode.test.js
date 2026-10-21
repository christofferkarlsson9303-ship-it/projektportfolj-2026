import { describe, expect, it } from "vitest";
import { KOLUMNER, checklista, kolumnFor, slappAtgard } from "./flode.js";

const post = (extra = {}) => ({ id: "u1", status: "oppen", underrattelseDatum: "", handelseDatum: "2026-10-20", belopp: null, ...extra });

describe("ÄTA-flödet har fyra kolumner", () => {
  it("heter Identifierad, ÄTA-granskning, Godkänd, Fakturerad", () => {
    expect(KOLUMNER.map((k) => k[1])).toEqual(["Identifierad", "ÄTA-granskning", "Godkänd", "Fakturerad"]);
  });

  it("en post hamnar i rätt kolumn", () => {
    expect(kolumnFor(post())).toBe("identifierad");
    expect(kolumnFor(post({ underrattelseDatum: "2026-10-21" }))).toBe("granskning");
    expect(kolumnFor(post({ status: "prissattning" }))).toBe("granskning");
    expect(kolumnFor(post({ status: "skickad_best", underrattelseDatum: "2026-10-21" }))).toBe("granskning");
    expect(kolumnFor(post({ status: "godkand" }))).toBe("godkand");
    expect(kolumnFor(post({ status: "fakturerad" }))).toBe("fakturerad");
    expect(kolumnFor(post({ status: "stangd" }))).toBeNull();
    expect(kolumnFor(post({ status: "utgar" }))).toBeNull();
  });

  it("att dra ett kort till granskning stämplar underrättelsen, men skriver aldrig över ett datum", () => {
    const ny = slappAtgard(post(), "granskning");
    expect(ny.status).toBe("oppen");
    expect(ny.falt.underrattelseDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(slappAtgard(post({ underrattelseDatum: "2026-10-01" }), "granskning").falt).toEqual({});
  });

  it("ett pris- eller beslutsläge som redan är satt ligger kvar", () => {
    expect(slappAtgard(post({ status: "skickad_best" }), "granskning").status).toBe("skickad_best");
  });

  it("tillbaka till Identifierad rensar underrättelsen", () => {
    const r = slappAtgard(post({ underrattelseDatum: "2026-10-21" }), "identifierad");
    expect(r).toEqual({ status: "oppen", falt: { underrattelseDatum: "" } });
  });
});

describe("checklista", () => {
  const klara = (u) => checklista(u).filter((s) => s.klar).map((s) => s.id);

  it("en ny post har inget klart", () => {
    expect(klara(post())).toEqual([]);
  });

  it("härleds ur fälten: underrättad, art, pris och beslut", () => {
    expect(klara(post({ underrattelseDatum: "2026-10-21", art: "tillagg" }))).toEqual(["underratta", "art"]);
    expect(klara(post({ underrattelseDatum: "2026-10-21", art: "andring", belopp: 12000 }))).toEqual(["underratta", "art", "pris"]);
    expect(klara(post({ underrattelseDatum: "2026-10-21", art: "andring", status: "godkand" }))).toEqual(["underratta", "art", "pris", "beslut"]);
  });

  it("ett belopp på 0 räknas som angivet, tomt gör det inte", () => {
    expect(klara(post({ belopp: 0 }))).toContain("pris");
    expect(klara(post({ belopp: "" }))).not.toContain("pris");
  });
});
