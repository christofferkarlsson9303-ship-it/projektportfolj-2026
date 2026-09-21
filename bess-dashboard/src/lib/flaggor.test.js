import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { berakFlaggor } from "./flaggor.js";
import { SEED } from "../data/seed.js";

const NU = "2026-09-21T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

/* Tom portfölj med rätt form — varje test lägger bara till det som ska flagga,
   så en träff aldrig kan komma från grunddatan. */
function tomtState(over = {}) {
  const bas = structuredClone(SEED);
  for (const k of Object.keys(bas)) if (Array.isArray(bas[k])) bas[k] = [];
  return { ...bas, ...over };
}

const texter = (fl) => fl.map((f) => f.text);
const traff = (fl, re) => fl.find((f) => re.test(f.text));

describe("berakFlaggor", () => {
  it("är tyst på en tom portfölj", () => {
    expect(berakFlaggor(tomtState())).toEqual([]);
  });

  it("flaggar försenad milstolpe men inte en klarmarkerad", () => {
    const state = tomtState({
      milstolpar: [
        { id: "m1", projektId: "p1", titel: "Cold Comm.", datum: "2026-09-14", status: "planerad" },
        { id: "m2", projektId: "p1", titel: "Redan klar", datum: "2026-09-14", status: "klar" },
      ],
    });
    const fl = berakFlaggor(state);
    expect(texter(fl)).toHaveLength(1);
    expect(fl[0].niva).toBe("hog");
    expect(fl[0].vy).toBe("tidplan");
    expect(fl[0].text).toMatch(/Cold Comm/);
  });

  it("skiljer förfallen punkt från en som förfaller inom veckan", () => {
    const state = tomtState({
      punkter: [
        { id: "p1", projektId: "a", titel: "Förfallen", status: "oppen", forfaller: "2026-09-14" },
        { id: "p2", projektId: "a", titel: "Snart", status: "oppen", forfaller: "2026-09-25" },
        { id: "p3", projektId: "a", titel: "Långt bort", status: "oppen", forfaller: "2026-12-01" },
        { id: "p4", projektId: "a", titel: "Stängd", status: "klar", forfaller: "2026-09-01" },
      ],
    });
    const fl = berakFlaggor(state);
    expect(traff(fl, /Förfallen/).niva).toBe("hog");
    expect(traff(fl, /Snart/).niva).toBe("medel");
    expect(traff(fl, /Långt bort/)).toBeUndefined();
    expect(traff(fl, /Stängd/)).toBeUndefined();
  });

  it("flaggar ÄTA där underrättelsen dröjt mer än 24 h", () => {
    const state = tomtState({
      ur: [
        { id: "u1", projektId: "a", nr: "UR001", benamning: "Barriär", klass: "ata",
          status: "oppen", handelseDatum: "2026-09-18T10:00:00+02:00" },
      ],
    });
    const f = traff(berakFlaggor(state), /Underrättelse om störning saknas/);
    expect(f.niva).toBe("hog");
    expect(f.vy).toBe("ata");
  });

  it("flaggar arbete startat utan godkänt pris", () => {
    const state = tomtState({
      ur: [
        { id: "u1", projektId: "a", nr: "UR002", benamning: "Kabelskåp", klass: "ata",
          status: "oppen", underrattelseDatum: "2026-09-19", arbeteStartat: true },
      ],
    });
    expect(traff(berakFlaggor(state), /utan skriftligt godkänt pris/).niva).toBe("hog");
  });

  it("flaggar godkänd ÄTA som legat ofakturerad mer än en vecka", () => {
    const sent = tomtState({
      ur: [{ id: "u1", projektId: "a", nr: "UR003", benamning: "Grävning", klass: "ata",
             status: "godkand", godkantDatum: "2026-09-10", underrattelseDatum: "2026-09-01" }],
    });
    expect(traff(berakFlaggor(sent), /ej fakturerad/).niva).toBe("medel");

    const nyss = tomtState({
      ur: [{ id: "u1", projektId: "a", nr: "UR003", benamning: "Grävning", klass: "ata",
             status: "godkand", godkantDatum: "2026-09-18", underrattelseDatum: "2026-09-01" }],
    });
    expect(traff(berakFlaggor(nyss), /ej fakturerad/)).toBeUndefined();
  });

  it("flaggar röd risk, och saknad åtgärd som egen varning", () => {
    const state = tomtState({
      risker: [
        { id: "r1", projektId: "a", titel: "Utan åtgärd", sannolikhet: 5, konsekvens: 3, status: "oppen" },
        { id: "r2", projektId: "a", titel: "Med åtgärd", sannolikhet: 5, konsekvens: 3,
          status: "oppen", atgard: "Beställt reservdel" },
        { id: "r3", projektId: "a", titel: "Grön", sannolikhet: 1, konsekvens: 1, status: "oppen" },
      ],
    });
    const fl = berakFlaggor(state);
    expect(fl.filter((f) => /Röd risk \(RV/.test(f.text))).toHaveLength(2);
    expect(fl.filter((f) => /saknar förebyggande/.test(f.text))).toHaveLength(1);
    expect(traff(fl, /Grön/)).toBeUndefined();
  });

  it("flaggar skyddsrond äldre än två veckor", () => {
    const state = tomtState({
      projekt: [{ id: "a", namn: "Växjö" }],
      hseqRonder: [{ id: "h1", projektId: "a", datum: "2026-09-06" }],
      hseqAmp: [{ projektId: "a", datum: "2026-01-01" }],
    });
    expect(traff(berakFlaggor(state), /Skyddsronden är 15 dagar/).niva).toBe("hog");
  });

  it("flaggar mötespunkter under §4/§5 utan ärende som preskriptionsrisk", () => {
    const state = tomtState({
      byggmoten: [
        { id: "bm1", projektId: "a", nr: "BM9", punkter: [
          { id: "pt1", para: "4", text: "Tillkommande arbete", urId: "" },
          { id: "pt2", para: "5", text: "Hinder", urId: "" },
        ] },
      ],
    });
    const f = traff(berakFlaggor(state), /preskription/);
    expect(f.text).toMatch(/BM9: 2 punkter/);
    expect(f.niva).toBe("hog");
  });

  it("flaggar kärndata som saknas på projektet", () => {
    const state = tomtState({ projekt: [{ id: "a", nr: "36037", namn: "Växjö", kontraktsvarde: null }] });
    const f = traff(berakFlaggor(state), /Kärndata saknas/);
    expect(f.niva).toBe("medel");
    expect(f.extra).toBe("projektdata");
  });

  it("sorterar höga flaggor före medel", () => {
    const state = tomtState({
      projekt: [{ id: "a", nr: "36037", namn: "Växjö", kontraktsvarde: null }],
      milstolpar: [{ id: "m1", projektId: "a", titel: "Försenad", datum: "2026-09-01", status: "planerad" }],
    });
    const fl = berakFlaggor(state);
    expect(fl[0].niva).toBe("hog");
    expect(fl[fl.length - 1].niva).toBe("medel");
  });
});
