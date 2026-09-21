import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dagarSedanRond,
  dagarTillM6,
  incidentLage,
  motesFlagga,
  prisGrind,
  riskKlass,
  riskMatrisFarg,
  riskvarde,
  saknarKarndata,
  slutdokIndex,
  underrattelseLage,
} from "./berakningar.js";

const NU = "2026-09-21T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

/* ---------- ABT 06: underrättelse inom 24 h ---------- */

describe("underrattelseLage", () => {
  it("är avklarad när underrättelsen är skickad", () => {
    const l = underrattelseLage({ underrattelseDatum: "2026-09-20", handelseDatum: "2026-09-19" });
    expect(l.ok).toBe(true);
  });

  it("varnar inte men flaggar när händelsedatum saknas", () => {
    // Det här är läget för 13 poster i skarp data — fristen kan inte räknas.
    const l = underrattelseLage({ handelseDatum: "" });
    expect(l.ok).toBe(false);
    expect(l.varning).toBe(false);
    expect(l.txt).toMatch(/kan inte räknas/);
  });

  it("varnar när mer än 24 h passerat", () => {
    const l = underrattelseLage({ handelseDatum: "2026-09-19T10:00:00+02:00" });
    expect(l.varning).toBe(true);
    expect(l.txt).toMatch(/2 dygn/);
  });

  it("varnar inte på exakt 24 h — gränsen är strikt över", () => {
    const l = underrattelseLage({ handelseDatum: "2026-09-20T10:00:00+02:00" });
    expect(l.varning).toBe(false);
  });

  it("varnar en timme senare", () => {
    const l = underrattelseLage({ handelseDatum: "2026-09-20T09:00:00+02:00" });
    expect(l.varning).toBe(true);
  });

  it("räknar ned återstående tid innan fristen gått ut", () => {
    const l = underrattelseLage({ handelseDatum: "2026-09-21T00:00:00+02:00" });
    expect(l.txt).toMatch(/inom 14 h/);
  });

  it("gäller inte poster som utgått", () => {
    expect(underrattelseLage({ klass: "utgar", handelseDatum: "2026-01-01" })).toBeNull();
    expect(underrattelseLage({ status: "utgar", handelseDatum: "2026-01-01" })).toBeNull();
  });
});

/* ---------- ABT 06: pris godkänt före arbetsstart ---------- */

describe("prisGrind", () => {
  it("är avklarad när priset är skriftligt godkänt", () => {
    expect(prisGrind({ godkantDatum: "2026-09-01" }).ok).toBe(true);
  });

  it("varnar när arbetet startat utan godkänt pris", () => {
    const g = prisGrind({ arbeteStartat: true });
    expect(g.varning).toBe(true);
  });

  it("påminner utan att varna när arbetet inte startat", () => {
    const g = prisGrind({ arbeteStartat: false });
    expect(g.varning).toBe(false);
    expect(g.txt).toMatch(/ska inte starta/);
  });

  it("gäller inte hinder — de har ingen prissättning", () => {
    expect(prisGrind({ klass: "hinder", arbeteStartat: true })).toBeNull();
  });
});

/* ---------- HSEQ ---------- */

describe("incidentLage", () => {
  it("är avklarad när incidenten är rapporterad", () => {
    expect(incidentLage({ rapporterad: true, rapportDatum: "2026-09-20" }).ok).toBe(true);
  });

  it("varnar när rapporten dröjt mer än ett dygn", () => {
    expect(incidentLage({ datum: "2026-09-19T08:00:00+02:00" }).varning).toBe(true);
  });

  it("klämmer aldrig fram en negativ återstående tid", () => {
    const l = incidentLage({ datum: "2026-09-20T10:00:00+02:00" });
    expect(l.txt).toMatch(/inom 0 h/);
  });
});

describe("dagarSedanRond", () => {
  const medRond = (datum) => ({ hseqRonder: datum ? [{ projektId: "p1", datum }] : [] });

  it("räknar dagar sedan senaste ronden", () => {
    expect(dagarSedanRond(medRond("2026-09-07"), "p1")).toBe(14);
  });

  it("ger noll för en rond i dag", () => {
    expect(dagarSedanRond(medRond("2026-09-21"), "p1")).toBe(0);
  });

  it("ger null när ingen rond finns", () => {
    expect(dagarSedanRond(medRond(null), "p1")).toBeNull();
  });

  it("väljer den senaste ronden när flera finns", () => {
    const state = {
      hseqRonder: [
        { projektId: "p1", datum: "2026-08-01" },
        { projektId: "p1", datum: "2026-09-14" },
        { projektId: "p2", datum: "2026-09-20" },
      ],
    };
    expect(dagarSedanRond(state, "p1")).toBe(7);
  });
});

/* ---------- Byggmöten: preskriptionsrisk ---------- */

describe("motesFlagga", () => {
  it("fångar punkter under §4 och §5 utan registrerat ärende", () => {
    const mote = {
      punkter: [
        { para: "4", text: "Tillkommande barriär", urId: "" },
        { para: "5", text: "Hinder i mark", urId: null },
        { para: "5", text: "Redan registrerad", urId: "ur-1" },
        { para: "3", text: "Övrigt", urId: "" },
        { para: "4", text: "", urId: "" },
      ],
    };
    expect(motesFlagga(mote).map((p) => p.text)).toEqual([
      "Tillkommande barriär",
      "Hinder i mark",
    ]);
  });

  it("klarar möten utan punkter", () => {
    expect(motesFlagga({})).toEqual([]);
  });
});

/* ---------- Riskmatrisen ---------- */

describe("riskmatrisen", () => {
  it("ger rött i det höga hörnet och grönt i det låga", () => {
    expect(riskMatrisFarg(5, 3)).toBe("rod");
    expect(riskMatrisFarg(1, 1)).toBe("gron");
  });

  it("klamrar värden utanför skalan i stället för att krascha", () => {
    expect(riskMatrisFarg(99, 99)).toBe("rod");
    expect(riskMatrisFarg(0, 0)).toBe("gron");
    expect(riskMatrisFarg(null, undefined)).toBe("gron");
  });

  it("klassar riskvärdet på rätt sida om gränserna", () => {
    expect(riskKlass(15)).toBe("h");
    expect(riskKlass(14)).toBe("m");
    expect(riskKlass(8)).toBe("m");
    expect(riskKlass(7)).toBe("l");
  });

  it("multiplicerar sannolikhet och konsekvens", () => {
    expect(riskvarde({ sannolikhet: 4, konsekvens: 5 })).toBe(20);
  });
});

/* ---------- Slutdokumentation och M6 ---------- */

describe("slutdokIndex", () => {
  const state = {
    slutdok: [
      { projektId: "p1", status: "godkand" },
      { projektId: "p1", status: "godkand" },
      { projektId: "p1", status: "kvar" },
      { projektId: "p2", status: "kvar" },
    ],
  };

  it("räknar andelen godkända per projekt", () => {
    const ix = slutdokIndex(state, "p1");
    expect(ix.godkanda).toBe(2);
    expect(ix.av).toBe(3);
    expect(ix.proc).toBe(67);
  });

  it("ger noll procent i stället för division med noll", () => {
    expect(slutdokIndex({ slutdok: [] }, "p1").proc).toBe(0);
  });
});

describe("dagarTillM6", () => {
  it("hittar milstolpen på färdigställande", () => {
    const state = { milstolpar: [{ projektId: "p1", titel: "Färdigställandetid", datum: "2026-12-02" }] };
    expect(dagarTillM6(state, "p1")).toBe(72);
  });

  it("hittar även slutbesiktning", () => {
    const state = { milstolpar: [{ projektId: "p1", titel: "Slutbesiktning", datum: "2026-10-01" }] };
    expect(dagarTillM6(state, "p1")).toBe(10);
  });

  it("ger null när milstolpen saknas", () => {
    expect(dagarTillM6({ milstolpar: [] }, "p1")).toBeNull();
  });
});

describe("saknarKarndata", () => {
  const helt = {
    kontraktsvarde: 1000, mw: 16, mwh: 36, natagare: "Växjö Energi", fardigstallande: "2026-12-02",
  };

  it("är tyst när allt finns", () => {
    expect(saknarKarndata(helt)).toEqual([]);
  });

  it("skiljer nollställt kontraktsvärde från saknat", () => {
    expect(saknarKarndata({ ...helt, kontraktsvarde: 0 })).toEqual([]);
    expect(saknarKarndata({ ...helt, kontraktsvarde: null })).toEqual(["kontraktsvärde"]);
  });

  it("listar allt som fattas", () => {
    expect(saknarKarndata({})).toEqual([
      "kontraktsvärde", "MW", "MWh", "nätägare", "färdigställandetid",
    ]);
  });
});
