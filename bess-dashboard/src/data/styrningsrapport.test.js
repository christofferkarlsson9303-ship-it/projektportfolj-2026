import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STYRNINGSRAPPORT, rapportTillMarkdown } from "./styrningsrapport.js";
import { ANBUDSFRAGOR } from "./anbudsfragor.js";
import { FASER } from "./projektfaser.ts";

describe("Så styr appen projektet", () => {
  it("docs-filen är genererad ur datan (kör npm run docs:styrning)", () => {
    expect(readFileSync("docs/sa-styr-appen-projektet.md", "utf8")).toBe(rapportTillMarkdown());
  });

  it("tabellerna har lika många celler som kolumner", () => {
    for (const a of STYRNINGSRAPPORT.avsnitt)
      for (const b of a.block.filter((x) => x.typ === "tabell")) for (const r of b.rader) expect(r, `${a.id}: ${r[0]}`).toHaveLength(b.kolumner.length);
  });

  it("fastabellen har appens åtta faser och frågetabellen täcker alla tolv frågor", () => {
    const fastabell = STYRNINGSRAPPORT.avsnitt.find((a) => a.id === "faser").block.find((b) => b.typ === "tabell");
    expect(fastabell.rader.map((r) => Number(r[0].split(" ")[0]))).toEqual(FASER.map((f) => f.nr));
    const fragor = STYRNINGSRAPPORT.avsnitt.find((a) => a.id === "beslutsunderlag").block.find((b) => b.typ === "tabell");
    const nummer = fragor.rader.flatMap((r) => r[0].split(".")[0].split(",").map((n) => Number(n.trim())));
    expect(nummer.sort((a, b) => a - b)).toEqual(ANBUDSFRAGOR.map((_, i) => i + 1));
  });

  it("Markdown har rubriker och tabeller", () => {
    const md = rapportTillMarkdown();
    expect(md).toMatch(/^# Så styr appen projektet/);
    expect(md).toContain("## 2. Anbudshjulet, riskmatrisen och frågorna: ett beslutsunderlag");
    expect(md).toContain("| Fas (ONE-P) | Vad appen styr | Grind innan nästa fas |");
  });
});
