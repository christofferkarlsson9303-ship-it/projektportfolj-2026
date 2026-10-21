import { describe, expect, it } from "vitest";
import { byggFaltmaterial } from "./faltmaterial.js";
import { FALTMALLAR } from "../data/faltmaterial.js";
import { gallerProfil } from "./tillampning.js";

const alla = FALTMALLAR.map((m) => m.id);
const text = (d) => JSON.stringify(d.moment);

describe("hårdvaruprofilen styr fältmallarna (F09)", () => {
  it("CATL/PE-projekt får alla punkter", () => {
    const d = byggFaltmaterial({ projekt: { id: "36037", namn: "Växjö Batteripark" }, mallIds: alla });
    expect(d.profil).toBe("catl-pe");
    expect(d.undantagna).toEqual([]);
    expect(d.antal).toBe(FALTMALLAR.reduce((s, m) => s + m.punkter.length, 0));
  });

  it("ett Sungrow-projekt får inga CATL-instruktioner, men de listas som öppet beslut", () => {
    const d = byggFaltmaterial({ projekt: { id: "v", namn: "Vaggeryd", hardvaruprofil: "sungrow" }, mallIds: alla });
    expect(d.profil).toBe("sungrow");
    expect(text(d)).not.toMatch(/CATL|JX5|XT0|torkpåsar/i);
    expect(d.undantagna.length).toBeGreaterThan(0);
    expect(d.oppnaBeslut[0]).toMatch(/gäller CATL \/ PE och är borttagna.*Sungrow/);
    expect(d.moment.flatMap((m) => m.punkter.map((p) => p.id))).toContain("M2.14");
  });

  it("varje CATL-punkt bär källa och manualrevision", () => {
    const catl = FALTMALLAR.flatMap((m) => m.punkter).filter((p) => p.tillampning);
    expect(catl.length).toBeGreaterThan(20);
    for (const p of catl) expect(p.tillampning).toMatchObject({ profil: "catl-pe", manualRev: expect.any(String) });
    expect(gallerProfil({}, "sungrow")).toBe(true);
  });
});
