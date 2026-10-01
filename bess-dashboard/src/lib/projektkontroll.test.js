import { describe, expect, it } from "vitest";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../data/projektkontroll.js";
import { FALTMALLAR } from "../data/faltmaterial.js";
import { kontrollId, kontrollBrister, rapportStatus } from "./projektkontroll.js";
import { byggFaltmaterial } from "./faltmaterial.js";
import { normalisera, reducer } from "../state/portfolj-reducer.js";
import { SEED } from "../data/seed.js";
import { sammanfoga } from "./sammanfoga.js";

const pid = "36037", rev = PROJEKTKONTROLL_REVISION;
const row = (id, extra = {}) => ({ id: kontrollId(pid, "Hela anläggningen", id), projektId: pid, punktId: id, omfattning: "Hela anläggningen", mallrevision: rev, resultat: "ok", datum: "2026-10-01", kontrollant: "Kontrollant", referens: "KP-01 rev B / provprotokoll", ...extra });
const doc = (kontroller, ids = PROJEKTMALLAR.map((m) => m.id), enhet = "") => byggFaltmaterial({ projekt: SEED.projekt[0], mallpaket: "projekt", mallIds: ids, kontroller, metadata: { visaResultat: true, kontrollplan: "KP-01 B", enhet } });

describe("Projektets egenkontroll", () => {
  it("täcker hela livscykeln och bevarar alla tekniska kontroll-ID", () => {
    const p = PROJEKTMALLAR.flatMap((m) => m.punkter);
    expect(PROJEKTMALLAR).toHaveLength(16); expect(p).toHaveLength(115);
    expect(new Set(p.map((x) => x.id)).size).toBe(115);
    for (const old of FALTMALLAR.flatMap((m) => m.punkter)) expect(p.some((x) => x.id === old.id)).toBe(true);
    expect(p.some((x) => x.id === "B.02")).toBe(true);
    expect(PROJEKTMALLAR.at(-1).titel).toContain("garanti");
  });
  it("kräver verklig spårbarhet och markerar gamla resultat och avvikelser", () => {
    expect(kontrollBrister(row("P0.01"), rev)).toEqual([]);
    for (const extra of [{ datum: "" }, { datum: "2099-01-01" }, { kontrollant: "" }, { referens: "" }, { mallrevision: "gammal" }, { resultat: "ej-ok" }, { resultat: "ej-tillamplig", notering: "" }]) expect(kontrollBrister(row("P0.01", extra), rev).length).toBeGreaterThan(0);
    expect(kontrollBrister(row("P0.01", { resultat: "ej-tillamplig", notering: "Ingen sådan utrustning i avtalad omfattning" }), rev)).toEqual([]);
  });
  it("skiljer kompletta rapporter från delurval och blandar inte enheter/projekt", () => {
    const records = PROJEKTMALLAR.flatMap((m) => m.punkter.map((p) => row(p.id)));
    const d = doc(records); expect(d.sammanstallning.klara).toBe(115); expect(rapportStatus(d)).toContain("redo för granskning");
    expect(rapportStatus(doc(records, ["projekt-0"]))).toContain("Delurval");
    expect(doc(records, undefined, "Container 2").sammanstallning.klara).toBe(0);
    expect(doc(records.map((r) => ({ ...r, id: kontrollId("36038", r.omfattning, r.punktId), projektId: "36038" }))).sammanstallning.klara).toBe(0);
    d.moment[0].punkter[0].kontroll.resultat = "ej-ok"; expect(records[0].resultat).toBe("ok");
    expect(rapportStatus({ ...d, visaResultat: false })).toContain("Blank");
  });
  it("sparar utan dubletter, bevarar JSON-backup och slår ihop skilda kontrollfält", () => {
    let state = structuredClone(SEED);
    state = reducer(state, { type: "FALT_KONTROLL", rad: row("P0.01") });
    state = reducer(state, { type: "FALT_KONTROLL", rad: row("P0.01", { notering: "Mätning utförd" }) });
    expect(state.faltkontroller).toHaveLength(1); expect(state.andringslogg[0].text).toContain("Egenkontroll");
    const saved = normalisera(JSON.parse(JSON.stringify(state)));
    expect(saved.faltkontroller[0].notering).toBe("Mätning utförd");
    const mina = structuredClone(saved), deras = structuredClone(saved);
    mina.faltkontroller[0].referens = "Foto A"; deras.faltkontroller[0].kontrollant = "Tekniker B";
    const merged = sammanfoga(saved, mina, deras).varde;
    expect(merged.faltkontroller[0].referens).toBe("Foto A"); expect(merged.faltkontroller[0].kontrollant).toBe("Tekniker B");
    expect(reducer(saved, { type: "FALT_KONTROLL", rad: row("P0.01", { projektId: "saknas" }) })).toBe(saved);
  });
});
