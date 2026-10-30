import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { createElement } from "react";

// Logotypen är en Vite-asset i appen. I Node pekar vi den till filen på disk.
vi.mock("../../assets/one-nordic-logo.png", () => ({ default: path.resolve("src/assets/one-nordic-logo.png") }));

const { renderToBuffer } = await import("@react-pdf/renderer");
const { EgenkontrollPdf } = await import("./EgenkontrollPdf.jsx");
const { arbetslistaDokument } = await import("../../lib/snabbutskrift.js");
const { SEED } = await import("../../data/seed.js");

/* Arbetslistans PDF bär samma "Ring vid frågor" som utskriften. Texten i PDF:en
   är komprimerad, så provet kontrollerar att dokumentet renderas med och utan
   kontakter — och att dokumentmodellen som båda läser har rätt kontakter. */
describe("EgenkontrollPdf – arbetslista", () => {
  const projekt = SEED.projekt.find((p) => p.id === "36037");

  it("dokumentet har plats och fältkontakter för projektet", () => {
    const d = arbetslistaDokument(SEED, projekt);
    expect(d.projekt.ort).toBe("Växjö");
    expect(d.kontakter.map((k) => k.namn)).toContain("Daniel Larsson");
    // Elsäkerhetsledaren är kopplad till Alvesta, inte Växjö.
    expect(d.kontakter.map((k) => k.namn)).not.toContain("Josef Fällman");
  });

  it("renderas med kontakter, utan, och med lärdomar", async () => {
    const med = arbetslistaDokument(SEED, projekt);
    const utan = arbetslistaDokument({ ...SEED, kontakter: [] }, projekt);
    expect(utan.kontakter).toEqual([]);
    const medLardomar = { ...med, lardomar: [{ text: "Boka kranen två veckor tidigare", fran: "36038", moment: 11 }] };
    for (const d of [med, utan, medLardomar]) {
      const buf = await renderToBuffer(createElement(EgenkontrollPdf, { dokument: d, typ: "arbetslista" }));
      expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    }
  }, 30_000);
});
