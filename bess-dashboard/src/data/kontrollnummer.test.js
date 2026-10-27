import { describe, expect, it } from "vitest";
import { PROJEKTMALLAR } from "./projektkontroll.js";
import { FALTMALLAR } from "./faltmaterial.js";
import { PUNKT_FOR_ID } from "./bessChecklistData.ts";
import { KONTROLL_FORALDER, KONTROLL_NR, SVAG_KOPPLING, kontrollNr } from "./kontrollnummer.js";

const rader = [...PROJEKTMALLAR.flatMap((m) => m.punkter), ...FALTMALLAR.flatMap((m) => m.punkter)];

describe("fältmaterialets nummer följer checklistan", () => {
  it("varje kontrollrad har en checklistpunkt som finns", () => {
    for (const p of rader) {
      expect(KONTROLL_FORALDER[p.id], p.id).toBeTruthy();
      expect(PUNKT_FOR_ID.has(KONTROLL_FORALDER[p.id]), p.id).toBe(true);
    }
  });

  it("numren är unika och är checklistpunkten plus en bokstav", () => {
    const nr = [...KONTROLL_NR.values()];
    expect(new Set(nr).size).toBe(nr.length);
    for (const [id, n] of KONTROLL_NR) expect(n, id).toBe(`${KONTROLL_FORALDER[id]}${n.slice(-1)}`);
    expect(nr.every((n) => /^\d{1,2}\.\d{1,2}[a-z]$/.test(n))).toBe(true);
  });

  it("ger stabila exempel", () => {
    expect(kontrollNr("P0.01")).toBe("0.4a");
    expect(kontrollNr("M2.05")).toBe("12.10a");
    expect(kontrollNr("B.02")).toBe("12.19a");
    expect(kontrollNr("okänd")).toBe("okänd");
  });

  it("listar inga överflödiga id och de svaga kopplingarna finns", () => {
    const ids = new Set(rader.map((p) => p.id));
    expect(Object.keys(KONTROLL_FORALDER).filter((id) => !ids.has(id))).toEqual([]);
    for (const id of SVAG_KOPPLING) expect(ids.has(id), id).toBe(true);
  });
});
