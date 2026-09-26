import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import {
  VARNING_DAGAR,
  arKlar,
  checklistlage,
  faslage,
  fasplan,
  grindar,
  kommandeHallpunkter,
  ledtiderPortfolj,
  ledtidslage,
  mallDatum,
  milstolpslage,
  planAnkare,
} from "./epc.js";

const NU = "2026-09-26";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU + "T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const ledtid = (s, pid, id) => ledtidslage(s, pid, NU).find((l) => l.id === id);

/* ---------- Startdatum och ankare ---------- */

describe("startdatum vid inläsning", () => {
  it("sätter antaget startdatum för Batch C och tomt för övriga", () => {
    const s = seed();
    const p = Object.fromEntries(s.projekt.map((x) => [x.id, x]));
    expect(p["36037"]).toMatchObject({ startdatum: "2026-02-02", startdatumAntagande: true });
    expect(p.goteborg).toMatchObject({ startdatum: "", startdatumAntagande: false });
  });

  it("skriver inte över ett startdatum som någon tömt", () => {
    const s = seed();
    s.projekt[0].startdatum = "";
    expect(efterInlasning(s).projekt[0].startdatum).toBe("");
  });
});

describe("planAnkare och mallDatum", () => {
  it("använder BESS-leveransen som mitt i planen", () => {
    expect(planAnkare(seed(), "36037")).toMatchObject({
      start: "2026-02-02",
      mitt: "2026-10-12",
      slut: "2026-12-02",
      mittKalla: "leverans",
      startAntagande: true,
    });
  });

  it("saknar plan när start eller slut saknas", () => {
    expect(planAnkare(seed(), "goteborg")).toBeNull();
    expect(fasplan(seed(), "goteborg").every((f) => f.start === null && f.slut === null)).toBe(true);
  });

  it("översätter skalan till datum i alla fyra segmenten", () => {
    const a = { start: "2026-01-01", mitt: "2026-03-02", slut: "2026-04-01" };
    expect(mallDatum(-1, a)).toBe("2025-11-06"); // 56 d före start
    expect(mallDatum(0.5, a)).toBe("2026-01-31"); // halvvägs till leverans
    expect(mallDatum(1.5, a)).toBe("2026-03-17"); // halvvägs leverans → SB
    expect(mallDatum(3, a)).toBe("2026-05-13"); // 42 d efter SB
  });
});

/* ---------- Fasplan och grindar ---------- */

describe("fasplan", () => {
  it("lägger fas 11 på leveransen och fas 14 slut på slutbesiktningen", () => {
    const plan = fasplan(seed(), "36037");
    expect(plan[0]).toMatchObject({ start: "2025-12-08", slut: "2026-02-02" });
    expect(plan[11].start).toBe("2026-10-12");
    expect(plan[14].slut).toBe("2026-12-02");
    expect(plan[15].slut).toBe("2027-01-13");
  });

  it("låter egna datum gå före standardplanen", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 11, falt: "start", varde: "2026-10-20" });
    const plan = fasplan(s, "36037");
    expect(plan[11]).toMatchObject({ start: "2026-10-20", egen: true });
    expect(plan[12].egen).toBe(false);
  });
});

describe("grindar", () => {
  it("härleder passerade grindar ur fakturerade milstolpar och ordningen", () => {
    const g = grindar(seed(), "36037");
    // M1–M4 fakturerade: G1, G3, G7, G9 ur betalplanen, allt före G9 följer.
    expect(g.filter((x) => x.kalla === "betalplan").map((x) => x.nr)).toEqual([1, 3, 7, 9]);
    expect(g.filter((x) => x.kalla === "följd").map((x) => x.nr)).toEqual([0, 2, 4, 5, 6, 8]);
    expect(g.slice(10).every((x) => !x.passerad)).toBe(true);
  });

  it("tar angiven grind som källa och loggar passagen", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 10, falt: "grindDatum", varde: "2026-09-25" });
    expect(grindar(s, "36037")[10]).toMatchObject({ passerad: true, kalla: "angiven", datum: "2026-09-25" });
    expect(s.andringslogg[0]).toMatchObject({ projektId: "36037", text: "G10 passerad 2026-09-25" });
  });
});

describe("faslage", () => {
  it("ger klar, pågår och kommande utifrån grind och datum", () => {
    const f = faslage(seed(), "36037", NU);
    expect(f[7].status).toBe("klar");
    expect(f[10].status).toBe("pagar"); // 2026-09-04 → 2026-11-04
    expect(f[11].status).toBe("kommande");
    expect(f[10]).toMatchObject({ totalt: 11, hp: 3, klara: 0 });
  });

  it("markerar en fas som sen när slutet passerat utan grind", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 10, falt: "slut", varde: "2026-09-20" });
    expect(faslage(s, "36037", NU)[10].status).toBe("sen");
  });
});

describe("milstolpslage", () => {
  it("tar status ur betalplanen och lägger M7 två veckor efter slutbesiktning", () => {
    const m = milstolpslage(seed(), "36037");
    expect(m.map((x) => x.status)).toEqual(["fakturerad", "fakturerad", "fakturerad", "fakturerad", "pagaende", "kvar", "kvar"]);
    expect(m.find((x) => x.kod === "M6").datum).toBe("2026-12-02");
    expect(m.find((x) => x.kod === "M7").datum).toBe("2026-12-16");
  });
});

/* ---------- Ledtider ---------- */

describe("ledtidslage", () => {
  it("räknar sista startdatum mot bekräftad leverans och flaggar rött och gult", () => {
    const s = seed();
    // BESS-leverans 2026-10-12: transportväg 4 v före = 2026-09-14, kranyta 2 v före = 2026-09-28.
    expect(ledtid(s, "36037", "transportvag")).toMatchObject({ senast: "2026-09-14", dagarKvar: -12, status: "sen" });
    expect(ledtid(s, "36037", "kranyta")).toMatchObject({ senast: "2026-09-28", dagarKvar: 2, status: "snart" });
    expect(ledtid(s, "36037", "transportvag").ank).toMatchObject({ datum: "2026-10-12", kalla: "leveranslistan" });
  });

  it("använder MV-leveransen och idrifttagningen ur tidplanen", () => {
    const s = seed();
    expect(ledtid(s, "36037", "kranMv")).toMatchObject({ senast: "2026-09-22", status: "sen" });
    // Cold Commissioning start 2026-11-11, testplanen ≥ 2 mån före.
    expect(ledtid(s, "36037", "testplan").ank).toMatchObject({ datum: "2026-11-11", kalla: "tidplanen" });
  });

  it("räknar ledtider i faser med passerad grind som passerade, inte sena", () => {
    expect(ledtid(seed(), "36037", "p28").status).toBe("passerad");
  });

  it("blir klar när kontrollpunkten bockas av, och gäller alla ledtider på punkten", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "4.6", klar: true });
    expect(ledtid(s, "36037", "kranBess").status).toBe("klar");
    expect(ledtid(s, "36037", "kranMv").status).toBe("klar");
    expect(ledtid(s, "36038", "kranBess").status).not.toBe("klar");
  });

  it("gulmarkerar exakt inom varningsgränsen", () => {
    const s = seed();
    const l = ledtid(s, "36037", "slutdok"); // SB 2026-12-02 − 14 = 2026-11-18
    expect(l.senast).toBe("2026-11-18");
    expect(l.dagarKvar).toBeGreaterThan(VARNING_DAGAR);
    expect(l.status).toBe("i-tid");
  });

  it("bevakar nätanslutningen utan datum", () => {
    expect(ledtid(seed(), "36037", "natanslutning")).toMatchObject({ status: "bevaka", senast: null });
  });

  it("sorterar portföljen med sena först och tar bara projekt med plan", () => {
    const alla = ledtiderPortfolj(seed(), NU);
    expect(new Set(alla.map((l) => l.projektId))).toEqual(new Set(["36037", "36038"]));
    const forstaEjSen = alla.findIndex((l) => l.status !== "sen");
    expect(alla.slice(forstaEjSen).some((l) => l.status === "sen")).toBe(false);
  });
});

/* ---------- Hållpunkter och avbockning ---------- */

describe("kommandeHallpunkter", () => {
  it("tar hållpunkter i pågående fas och faser som startar inom 30 dagar", () => {
    const hp = kommandeHallpunkter(seed(), "36037", 30, NU);
    expect(new Set(hp.map((x) => x.fas.fas.nr))).toEqual(new Set([10, 11, 12]));
    expect(hp).toHaveLength(9);
  });

  it("släpper en hållpunkt när den godkänns, och loggar det", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "11.4", klar: true });
    expect(kommandeHallpunkter(s, "36037", 30, NU).some((x) => x.punkt.id === "11.4")).toBe(false);
    expect(s.andringslogg[0].text).toMatch(/^EPC 11\.4 hållpunkt godkänd: Lyftplan/);
  });
});

describe("avbockning", () => {
  it("loggar inte vanliga punkter och kan bockas ur igen", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "4.1", klar: true });
    expect(s.andringslogg).toHaveLength(0);
    expect(arKlar(s, "36037", "4.1")).toBe(true);
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "4.1", klar: false });
    expect(arKlar(s, "36037", "4.1")).toBe(false);
    expect(s.epcStatus).toHaveLength(1);
  });

  it("kopplar en UR till punkten utan att bocka av den", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_KOPPLA_UR", pid: "36037", punkt: "6.5", urId: "u1", urNr: "UR007" });
    expect(s.epcStatus[0]).toMatchObject({ punkt: "6.5", urId: "u1", klar: false });
    expect(s.andringslogg[0].text).toBe("EPC 6.5: UR007 skapad vid avvikelse");
  });

  it("summerar mot checklistans 199 punkter och 33 hållpunkter", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "7.1", klar: true });
    s = reducer(s, { type: "EPC_VAXLA", pid: "36037", punkt: "lop.1", klar: true });
    s.epcStatus.push({ projektId: "36037", punkt: "99.1", klar: true }); // borttagen punkt
    expect(checklistlage(s, "36037")).toEqual({ klara: 2, totalt: 199, hp: 33, hpKlara: 1 });
  });
});
