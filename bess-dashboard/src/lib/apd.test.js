import { describe, expect, it } from "vitest";
import { APD_EPC, APD_OMRADEN, APD_PUNKTER, ARBETSPLATSTAVLA } from "../data/apd.js";
import { PUNKT_FOR_ID } from "../data/bessChecklistData.ts";
import { PUNKT_UNDERLAG } from "../data/punktUnderlag.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { apdLage, apdRad, nastaRevision } from "./apd.js";

const last = (state) => efterInlasning(normalisera(structuredClone(state)));

/** State med APD-raden för 36037 ändrad. */
const med = (state, andring) => ({
  ...state,
  hseqApd: state.hseqApd.map((r) => (r.projektId === "36037" ? { ...r, ...andring } : r)),
});

describe("APD-datan", () => {
  it("har 27 punkter i planen och 8 anslag på tavlan, med stabila id:n utan luckor", () => {
    expect(APD_PUNKTER.map((p) => p.id)).toEqual(APD_PUNKTER.map((_, i) => `apd.${i + 1}`));
    expect(ARBETSPLATSTAVLA.map((t) => t.id)).toEqual(ARBETSPLATSTAVLA.map((_, i) => `tavla.${i + 1}`));
    expect(APD_PUNKTER).toHaveLength(27);
    expect(ARBETSPLATSTAVLA).toHaveLength(8);
    expect(APD_OMRADEN.every((o) => o.namn && o.punkter.length)).toBe(true);
  });

  it("använder bara kända markeringar och kända källor", () => {
    for (const p of [...APD_PUNKTER, ...ARBETSPLATSTAVLA]) {
      expect(p.text.length, p.id).toBeGreaterThan(10);
      expect(p.badges.every((b) => ["HP", "K", "L"].includes(b)), p.id).toBe(true);
    }
    expect(ARBETSPLATSTAVLA.filter((t) => t.kalla).every((t) => ["amp", "apd", "rond"].includes(t.kalla))).toBe(true);
  });

  it("pekar på EPC-punkter som finns: 5.19 är hållpunkt och alla har underlagslänk", () => {
    expect(PUNKT_FOR_ID.get(APD_EPC.plan).badges).toContain("HP");
    expect(PUNKT_FOR_ID.get(APD_EPC.tavla).badges).toContain("K");
    for (const id of Object.values(APD_EPC)) {
      expect(PUNKT_FOR_ID.has(id), id).toBe(true);
      expect(PUNKT_UNDERLAG[id], id).toMatchObject({ vy: "hseq", id: "hseq-apd" });
    }
  });
});

describe("sådden", () => {
  it("ger varje projekt exakt en tom APD-rad", () => {
    const s = last(SEED);
    expect(s.hseqApd).toHaveLength(s.projekt.length);
    expect(apdRad(s, "36037")).toMatchObject({ id: "apd-36037", punkter: {}, tavla: {}, godkandDatum: "" });
  });

  it("är idempotent och bevarar det som bockats", () => {
    const s = med(last(SEED), { punkter: { "apd.1": true } });
    const igen = last(s);
    expect(igen.hseqApd).toHaveLength(s.projekt.length);
    expect(apdRad(igen, "36037").punkter).toEqual({ "apd.1": true });
  });
});

describe("apdLage", () => {
  it("räknar avbockade punkter och kräver beställarens godkännande för 5.19", () => {
    let s = med(last(SEED), { punkter: { "apd.1": true, "apd.2": true, "apd.99": true } });
    let l = apdLage(s, "36037");
    expect(l).toMatchObject({ klara: 2, totalt: 27, godkand: false, planRedo: false });

    s = med(s, { godkandDatum: "2026-02-10", godkandAv: "Alex Young" });
    l = apdLage(s, "36037");
    expect(l).toMatchObject({ godkand: true, planRedo: true });
  });

  it("markerar ett anslag som inaktuellt när en nyare rond, AMP eller APD-revision finns", () => {
    const alla = Object.fromEntries(ARBETSPLATSTAVLA.map((t) => [t.id, "2026-03-01"]));
    let s = med(last(SEED), { tavla: alla, revisionDatum: "2026-02-20" });
    s = { ...s, hseqRonder: [], hseqAmp: [] };
    let l = apdLage(s, "36037");
    expect(l).toMatchObject({ tavlaUppsatta: 8, tavlaInaktuella: 0, tavlaRedo: true });

    s = {
      ...s,
      hseqRonder: [{ id: "r1", projektId: "36037", datum: "2026-03-10" }],
      hseqAmp: [{ id: "a1", projektId: "36037", version: "rev 2", datum: "2026-03-05" }],
    };
    s = med(s, { revisionDatum: "2026-03-02" });
    l = apdLage(s, "36037");
    const status = Object.fromEntries(l.tavla.map((t) => [t.id, t.status]));
    expect(status).toMatchObject({ "tavla.2": "inaktuell", "tavla.6": "inaktuell", "tavla.7": "inaktuell", "tavla.1": "uppsatt" });
    expect(l.tavla.find((t) => t.id === "tavla.7").krav).toBe("2026-03-10");
    expect(l).toMatchObject({ tavlaInaktuella: 3, tavlaRedo: false });
  });

  it("räknar ett anslag utan datum som saknat och tål att raden saknas", () => {
    const s = { ...last(SEED), hseqApd: [] };
    const l = apdLage(s, "36037");
    expect(l.tavla.every((t) => t.status === "saknas")).toBe(true);
    expect(l).toMatchObject({ klara: 0, tavlaUppsatta: 0, tavlaRedo: false, planRedo: false });
  });
});

describe("nastaRevision", () => {
  it("räknar upp revisionsnumret", () => {
    expect(nastaRevision("")).toBe("rev 1");
    expect(nastaRevision("rev 1")).toBe("rev 2");
    expect(nastaRevision("Rev 9")).toBe("rev 10");
  });
});
