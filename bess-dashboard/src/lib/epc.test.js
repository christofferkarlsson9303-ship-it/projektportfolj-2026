import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import {
  VARNING_DAGAR,
  checklistsummering,
  erfarenheter,
  faslage,
  fasplan,
  grindar,
  kommandeHallpunkter,
  lagesbild,
  ledtiderPortfolj,
  ledtidslage,
  mallDatum,
  milstolpslage,
  nastaUppgifter,
  planAnkare,
  punktlage,
  tidigareErfarenheter,
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
    expect(f[10]).toMatchObject({ punkter: 15, hp: 5 });
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
  it("räknar sista startdatum mot bekräftade datum och flaggar rött och gult", () => {
    const s = seed();
    // Cold Commissioning start 2026-11-11: testplanen ≥ 2 mån före = 2026-09-11.
    expect(ledtid(s, "36037", "testplan")).toMatchObject({ senast: "2026-09-11", dagarKvar: -15, status: "sen" });
    expect(ledtid(s, "36037", "testplan").ank).toMatchObject({ datum: "2026-11-11", kalla: "tidplanen" });
    // BESS-leverans 2026-10-12: kranytan 2 v före = 2026-09-28.
    expect(ledtid(s, "36037", "kranyta")).toMatchObject({ senast: "2026-09-28", dagarKvar: 2, status: "snart" });
    expect(ledtid(s, "36037", "kranyta").ank).toMatchObject({ datum: "2026-10-12", kalla: "leveranslistan" });
  });

  it("räknar ledtider vars fas har passerat sin grind som klara", () => {
    const s = seed();
    // Transportvägen är punkt 2.7 och kranen 4.6 — fas 2 och 4 är passerade.
    expect(ledtid(s, "36037", "transportvag")).toMatchObject({ status: "klar", markerad: false });
    expect(ledtid(s, "36037", "kranMv").status).toBe("klar");
  });

  it("blir klar när ledtiden markeras, per projekt, och loggas", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_LEDTID", pid: "36037", ledtid: "testplan", klar: true });
    expect(ledtid(s, "36037", "testplan")).toMatchObject({ status: "klar", markerad: true });
    expect(ledtid(s, "36038", "testplan").status).toBe("sen");
    expect(s.andringslogg[0]).toMatchObject({ projektId: "36037", text: "Ledtid klar: Test- och kontrollplan" });
    s = reducer(s, { type: "EPC_LEDTID", pid: "36037", ledtid: "testplan", klar: false });
    expect(ledtid(s, "36037", "testplan").status).toBe("sen");
    expect(s.epcLedtider).toHaveLength(1);
  });

  it("gulmarkerar inte det som ligger utanför varningsgränsen", () => {
    const l = ledtid(seed(), "36037", "slutdok"); // SB 2026-12-02 − 14 = 2026-11-18
    expect(l.senast).toBe("2026-11-18");
    expect(l.dagarKvar).toBeGreaterThan(VARNING_DAGAR);
    expect(l.status).toBe("i-tid");
  });

  it("bevakar nätanslutningen utan datum", () => {
    // Punkt 2.2 ligger i passerad fas 2 — då är den klar i stället för bevakad.
    let s = seed();
    s.betalplan = s.betalplan.map((b) => ({ ...b, status: "kvar" }));
    expect(ledtid(s, "36037", "natanslutning")).toMatchObject({ status: "bevaka", senast: null });
  });

  it("sorterar portföljen med sena först och tar bara projekt med plan", () => {
    const alla = ledtiderPortfolj(seed(), NU);
    expect(new Set(alla.map((l) => l.projektId))).toEqual(new Set(["36037", "36038"]));
    const forstaEjSen = alla.findIndex((l) => l.status !== "sen");
    expect(alla.slice(forstaEjSen).some((l) => l.status === "sen")).toBe(false);
  });
});

/* ---------- Hållpunkter och lägesbild ---------- */

describe("kommandeHallpunkter", () => {
  it("tar hållpunkter i pågående fas och faser som startar inom 30 dagar", () => {
    const hp = kommandeHallpunkter(seed(), "36037", 30, NU);
    expect(new Set(hp.map((x) => x.fas.fas.nr))).toEqual(new Set([10, 11, 12]));
    // Fas 10–12 har 5 + 5 + 4 hållpunkter.
    expect(hp).toHaveLength(14);
  });

  it("släpper fasens hållpunkter när grinden passeras", () => {
    let s = seed();
    s = reducer(s, { type: "EPC_FAS", pid: "36037", fas: 10, falt: "grindDatum", varde: "2026-09-25" });
    expect(kommandeHallpunkter(s, "36037", 30, NU).some((x) => x.fas.fas.nr === 10)).toBe(false);
  });
});

describe("lagesbild", () => {
  it("visar pågående fas, nästa grind och nästa betalning", () => {
    const l = lagesbild(seed(), "36037", NU);
    expect(l.harPlan).toBe(true);
    expect(l.aktuella.map((f) => f.fas.nr)).toEqual([10]);
    expect(l.nastaGrind.fas.grind.kod).toBe("G10");
    expect(l.nastaBetalning).toMatchObject({ kod: "M5", status: "pagaende" });
    expect(l.grindarPasserade).toBe(10);
    expect(l.hp).toBe(47);
    // Hållpunkterna i fas 0–9: 0+1+2+1+1+2+4+8+3+2.
    expect(l.hpKlara).toBe(24);
    expect(l.dagarTillSlutbesiktning).toBe(67);
  });

  it("saknar plan men visar ändå grindar för projekt utan datum", () => {
    const l = lagesbild(seed(), "goteborg", NU);
    expect(l.harPlan).toBe(false);
    expect(l.aktuella).toEqual([]);
    expect(l.nastaGrind.fas.nr).toBe(0);
  });
});

/* ---------- Status per punkt ---------- */

const punkt = (s, pid, id, status) => reducer(s, { type: "EPC_PUNKT", pid, punkt: id, status });

describe("punktlage", () => {
  it("räknar punkter i passerade faser som klara via grinden", () => {
    const pl = punktlage(seed(), "36037");
    expect(pl.get("1.1")).toMatchObject({ status: "klar", kalla: "grind" });
    expect(pl.get("10.1")).toMatchObject({ status: "oppen", kalla: null });
    expect(pl.get("lop.1").status).toBe("oppen");
  });

  it("tar en avbockad punkt som klar och låter ej aktuell gå före grinden", () => {
    let s = punkt(seed(), "36037", "10.1", "klar");
    s = punkt(s, "36037", "2.14", "ejaktuell");
    const pl = punktlage(s, "36037");
    expect(pl.get("10.1")).toMatchObject({ status: "klar", kalla: "markerad", datum: NU });
    expect(pl.get("2.14")).toMatchObject({ status: "ejaktuell", kalla: "markerad" });
    expect(punktlage(s, "36038").get("10.1").status).toBe("oppen");
  });

  it("loggar en godkänd hållpunkt och en återöppnad punkt", () => {
    let s = punkt(seed(), "36037", "10.7", "klar");
    expect(s.andringslogg[0]).toMatchObject({ projektId: "36037", text: "EPC 10.7 hållpunkt godkänd" });
    s = punkt(s, "36037", "10.7", "");
    expect(s.andringslogg[0].text).toBe("EPC 10.7 återöppnad");
    expect(punktlage(s, "36037").get("10.7").status).toBe("oppen");
  });
});

describe("checklistsummering", () => {
  it("summerar klara, kvar, hållpunkter och grindar över alla 286 punkter", () => {
    const { totalt, faser, lopande } = checklistsummering(seed(), "36037", NU);
    // Fas 0–9 är passerade: 22+21+17+20+15+18+13+16+9+13 punkter.
    expect(totalt).toMatchObject({ punkter: 286, klara: 164, ejAktuella: 0, kvar: 122, hp: 47, hpKlara: 24, grindar: 10 });
    expect(totalt.andel).toBe(57);
    expect(faser[10]).toMatchObject({ punkter: 15, klara: 0, kvar: 15, hp: 5, hpKvar: 5 });
    expect(lopande).toMatchObject({ punkter: 24, klara: 0 });
  });

  it("räknar andelen på det som är aktuellt", () => {
    let s = seed();
    for (const id of ["10.1", "10.2"]) s = punkt(s, "36037", id, "klar");
    s = punkt(s, "36037", "10.3", "ejaktuell");
    const { totalt, faser } = checklistsummering(s, "36037", NU);
    expect(faser[10]).toMatchObject({ klara: 2, ejAktuella: 1, kvar: 12 });
    expect(totalt.andel).toBe(Math.round((166 / 285) * 100));
  });
});

/* ---------- Nästa uppgift ---------- */

describe("nastaUppgifter", () => {
  it("tar försenade och akuta ledtider först och sedan pågående fas i ordning", () => {
    const k = nastaUppgifter(seed(), "36037", NU);
    // Test- och kontrollplan (13.1) och provresurser (10.11) är försenade, kranytan (11.3) ska startas nu.
    expect(k.slice(0, 4).map((x) => x.punkt.id)).toEqual(["13.1", "10.11", "11.3", "10.1"]);
    expect(k[0]).toMatchObject({ typ: "punkt", ton: "bad" });
    expect(k[0].orsak).toBe("Ledtid försenad — skulle ha startat 11 sep");
    expect(k[2].orsak).toBe("Ledtid — starta senast 28 sep");
    expect(k[3].orsak).toBe("Fas 10 pågår");
  });

  it("vaskar fram nästa punkt när den första bockas av", () => {
    const s = punkt(seed(), "36037", "13.1", "klar");
    expect(nastaUppgifter(s, "36037", NU)[0].punkt.id).toBe("10.11");
  });

  it("föreslår grinden när alla fasens punkter är klara", () => {
    let s = seed();
    for (const i of Array.from({ length: 15 }, (_, n) => n + 1)) s = punkt(s, "36037", `10.${i}`, "klar");
    const g = nastaUppgifter(s, "36037", NU).find((x) => x.typ === "grind");
    expect(g.fas.fas.grind.kod).toBe("G10");
    expect(g.orsak).toMatch(/dags för G10/);
  });

  it("börjar från fas 0 i ett projekt utan datum", () => {
    const k = nastaUppgifter(seed(), "goteborg", NU);
    expect(k[0]).toMatchObject({ typ: "punkt", orsak: "Nästa fas: 0" });
    expect(k[0].punkt.id).toBe("0.1");
  });
});

/* ---------- Erfarenheter ---------- */

const kommentar = (s, pid, id, typ, text, paverkan = 2, kostnad = "") =>
  reducer(s, { type: "EPC_KOMMENTAR", pid, punkt: id, typ, text, gorSa: "Gör så", paverkan, kostnad });

describe("erfarenheter", () => {
  it("rangordnar avvikelser och lärdomar och hoppar över noteringar", () => {
    let s = seed();
    s = kommentar(s, "36037", "4.6", "lardom", "Kranen bokad för sent", 2);
    s = kommentar(s, "36038", "7.3", "avvikelse", "Armering underkänd", 3, "45 000");
    s = kommentar(s, "36038", "4.6", "avvikelse", "Kran saknades på lyftdagen", 2, "12 000");
    s = kommentar(s, "36037", "10.1", "notering", "Bara en anteckning");
    const e = erfarenheter(s);
    expect(e.map((x) => x.text)).toEqual(["Armering underkänd", "Kran saknades på lyftdagen", "Kranen bokad för sent"]);
    expect(e[1]).toMatchObject({ aterkommer: 2, kostnadKr: 12000 });
    expect(erfarenheter(s, "36037").map((x) => x.punkt)).toEqual(["4.6"]);
    expect(s.andringslogg[1].text).toBe("Avvikelse på EPC 4.6: Kran saknades på lyftdagen");
  });

  it("visar andra projekts erfarenheter på samma punkt", () => {
    let s = seed();
    s = kommentar(s, "36038", "4.6", "avvikelse", "Kran saknades på lyftdagen");
    s = kommentar(s, "36037", "4.6", "lardom", "Egen lärdom");
    expect(tidigareErfarenheter(s, "4.6", "36037").map((x) => x.projektId)).toEqual(["36038"]);
  });

  it("sparar ingen tom kommentar", () => {
    const s = seed();
    expect(kommentar(s, "36037", "4.6", "notering", "   ")).toBe(s);
  });
});
