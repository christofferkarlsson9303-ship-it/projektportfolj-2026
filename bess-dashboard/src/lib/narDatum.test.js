import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { ALLA_PUNKTER } from "../data/bessChecklistData.ts";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { ankardatum, faslage, plusDagar } from "./epc.js";
import { senastDatum, tolkaNar } from "./narDatum.js";

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const NU = "2026-10-26";

describe("tolkaNar", () => {
  it("tolkar veckor, månader och intervall bakåt från momentets start", () => {
    expect(tolkaNar("≥ 4 v före")).toEqual({ dagar: 28, handelse: "moment" });
    expect(tolkaNar("≥ 2 mån före")).toEqual({ dagar: 60, handelse: "moment" });
    // Intervall: sista godtagbara datum är det kortare måttet.
    expect(tolkaNar("2–3 v före")).toEqual({ dagar: 14, handelse: "moment" });
    expect(tolkaNar("1–2 v före schakt")).toEqual({ dagar: 7, handelse: "schaktstart" });
  });

  it("knyter namngivna händelser till rätt ankare", () => {
    expect(tolkaNar("≥ 2 v före SB")?.handelse).toBe("slutbesiktning");
    expect(tolkaNar("≥ 2 v före slutbesiktning")?.handelse).toBe("slutbesiktning");
    expect(tolkaNar("≥ 4 v före byggstart")?.handelse).toBe("byggstart");
    expect(tolkaNar("≥ 4 v före lyft")?.handelse).toBe("bessLeverans");
    expect(tolkaNar("≥ 6 v före provning")?.handelse).toBe("satStallverk");
    expect(tolkaNar("≥ 3 v före arbete")?.handelse).toBe("moment");
  });

  it("lämnar allt som inte är entydigt", () => {
    for (const t of ["Före gjutning", "NTP + 2 v", "≤ 24 h", "≤ 2 v", "Löpande", "≥ 2 v före FAT", "", undefined]) {
      expect(tolkaNar(t), String(t)).toBe(null);
    }
  });

  it("tolkar alla 'före'-texter i checklistan utom kända undantag", () => {
    const otolkade = ALLA_PUNKTER.filter((p) => /^\s*(≥\s*)?\d.*före/.test(p.nar) && !tolkaNar(p.nar)).map((p) => `${p.id}: ${p.nar}`);
    expect(otolkade).toEqual([]);
  });
});

describe("senastDatum", () => {
  it("räknar 11.2 fyra veckor före momentets start och 15.1 två veckor före slutbesiktning", () => {
    const s = seed();
    const faser = faslage(s, "36038", NU);
    const m = senastDatum(s, "36038", NU, faser);
    expect(m.get("11.2").datum).toBe(plusDagar(faser[11].start, -28));
    expect(m.get("11.2").grund).toMatch(/28 dagar före start av moment 11/);
    expect(m.get("15.1").datum).toBe(plusDagar(ankardatum(s, "36038", faser).slutbesiktning.datum, -14));
  });

  it("ger inget datum för undantag och för texter utan mönster", () => {
    const m = senastDatum(seed(), "36038", NU);
    expect(m.has("2.14")).toBe(false);
    expect(m.has("11.1")).toBe(false);
  });
});
