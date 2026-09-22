import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROND_KRAV_DAGAR, ROND_VARNING_DAGAR, rondHint, rondKlass } from "./hseqtriage.js";
import { ampAktuell, incidentLage, oppnaRondavvikelser } from "./berakningar.js";

const NU = "2026-09-22T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

describe("rondKlass", () => {
  it("är tyst inom intervallet", () => {
    expect(rondKlass(0)).toBe("");
    expect(rondKlass(10)).toBe("");
  });

  it("varnar tre dagar innan kravet bryts", () => {
    expect(rondKlass(ROND_VARNING_DAGAR)).toBe("warn");
    expect(rondKlass(13)).toBe("warn");
  });

  it("larmar när kravet är brutet", () => {
    expect(rondKlass(ROND_KRAV_DAGAR)).toBe("bad");
    expect(rondKlass(30)).toBe("bad");
  });

  it("säger ingenting när ingen rond finns", () => {
    expect(rondKlass(null)).toBe("");
    expect(rondKlass(undefined)).toBe("");
    expect(rondHint(null)).toBe("ingen rond registrerad");
  });

  it("låter varningsgränsen ligga före kravgränsen", () => {
    // Skyddsnät mot att någon skruvar på siffrorna åt fel håll.
    expect(ROND_VARNING_DAGAR).toBeLessThan(ROND_KRAV_DAGAR);
  });
});

describe("ampAktuell", () => {
  const state = {
    hseqAmp: [
      { id: "a1", projektId: "p1", version: "rev 1", datum: "2026-03-01" },
      { id: "a3", projektId: "p1", version: "rev 3", datum: "2026-08-01" },
      { id: "a2", projektId: "p1", version: "rev 2", datum: "2026-05-01" },
      { id: "b1", projektId: "p2", version: "rev 9", datum: "2026-09-01" },
    ],
  };

  it("väljer den senast reviderade för rätt projekt", () => {
    expect(ampAktuell(state, "p1").version).toBe("rev 3");
    expect(ampAktuell(state, "p2").version).toBe("rev 9");
  });


  it("ger null när projektet saknar plan", () => {
    expect(ampAktuell(state, "p3")).toBeNull();
    expect(ampAktuell({ hseqAmp: [] }, "p1")).toBeNull();
  });
});

describe("oppnaRondavvikelser", () => {
  const state = {
    hseqRonder: [
      {
        id: "r1",
        projektId: "p1",
        datum: "2026-09-01",
        avvikelser: [
          { id: "av1", text: "Trasigt räcke", niva: "akut", status: "oppen" },
          { id: "av2", text: "Städat", niva: "lag", status: "atgardad" },
        ],
      },
      { id: "r2", projektId: "p1", datum: "2026-09-15", avvikelser: [{ id: "av3", niva: "medium" }] },
      { id: "r3", projektId: "p2", datum: "2026-09-10", avvikelser: [{ id: "av4", status: "oppen" }] },
      { id: "r4", projektId: "p1", datum: "2026-09-20" },
    ],
  };

  it("plockar ut oåtgärdade avvikelser ur alla ronder i projektet", () => {
    const ut = oppnaRondavvikelser(state, "p1");
    expect(ut.map((a) => a.id)).toEqual(["av1", "av3"]);
  });

  it("bär med vilken rond avvikelsen kom från", () => {
    const [forsta] = oppnaRondavvikelser(state, "p1");
    expect(forsta.rondId).toBe("r1");
    expect(forsta.rondDatum).toBe("2026-09-01");
  });

  it("klarar ronder helt utan avvikelselista", () => {
    expect(() => oppnaRondavvikelser(state, "p1")).not.toThrow();
  });
});

describe("incidentLage — 24-timmarskravet", () => {
  it("är avklarad när rapporten är skickad", () => {
    expect(incidentLage({ rapporterad: true, rapportDatum: "2026-09-21" }).ok).toBe(true);
  });

  it("varnar när mer än ett dygn gått", () => {
    expect(incidentLage({ datum: "2026-09-20T08:00:00+02:00" }).varning).toBe(true);
  });

  it("varnar inte innan fristen gått ut", () => {
    expect(incidentLage({ datum: "2026-09-22T08:00:00+02:00" }).varning).toBe(false);
  });

  it("säger till när datum saknas i stället för att räkna fel", () => {
    const l = incidentLage({ datum: "" });
    expect(l.varning).toBe(false);
    expect(l.txt).toMatch(/saknas/i);
  });
});
