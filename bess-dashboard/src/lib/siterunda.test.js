import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { fotoSokvag, medSiterunda, nalPa, platser } from "./siterunda.js";
import { nyHandelse } from "./handelse.js";
import { nyttObjekt } from "./site.js";

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));

describe("siterunda", () => {
  it("lägger foton som metadata, plats och dagens datum på punkten", () => {
    const rad = nyHandelse("36037", { titel: "Skadad dörr på container 3" });
    const foto = { sokvag: fotoSokvag("36037", rad.id, 0), lagring: "lokal", storlek: 120000, namn: "a.jpg" };
    const ut = medSiterunda(rad, { foton: [foto], plats: { id: "so1", namn: "Container 3" } }, "2026-10-23");
    expect(ut.foton).toEqual([foto]);
    expect(foto.sokvag).toBe(`36037/foto/${rad.id}-1.jpg`);
    expect(ut.plats).toEqual({ objektId: "so1", namn: "Container 3" });
    expect(ut.uppfoljning).toBe("2026-10-23");
    // Ett satt datum skrivs aldrig över, och utan foto eller plats sätts inget.
    expect(medSiterunda({ ...rad, uppfoljning: "2026-11-01" }, { foton: [foto] }, "2026-10-23").uppfoljning).toBe("2026-11-01");
    expect(medSiterunda(rad, {}, "2026-10-23").uppfoljning).toBe("");
  });

  it("en plats ger en nål på objektet som pekar på punkten, och punkten syns i Idag", () => {
    let s = seed();
    const c = nyttObjekt("container", "36037", { x: 10, z: 5 }, [], { exakt: true });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: c });
    expect(platser(s, "36037").map((p) => p.namn)).toContain(c.namn);
    const rad = medSiterunda(nyHandelse("36037", { titel: "Läckage vid kylaggregat" }), { plats: { id: c.id, namn: c.namn } }, "2026-10-23");
    s = reducer(s, { type: "LAGG_TILL", lista: "punkter", rad });
    const nal = nalPa(s, "36037", c.id, rad.id);
    expect(nal).toMatchObject({ typ: "nal", punktId: rad.id, x: c.x, z: c.z });
    s = reducer(s, { type: "SITE_LAGG_TILL", rad: nal });
    expect(s.siteObjekt.some((o) => o.typ === "nal" && o.punktId === rad.id)).toBe(true);
    expect(platser(s, "36037").some((p) => p.typ === "nal")).toBe(false);
  });
});
