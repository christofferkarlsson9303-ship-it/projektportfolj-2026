import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { PROJEKTKONTROLL_REVISION, PROJEKTMALLAR } from "../data/projektkontroll.js";
import { kontrollId } from "./projektkontroll.js";
import {
  VARNING_DAGAR,
  checklistsummering,
  erfarenheter,
  faslage,
  fasplan,
  grindSaknas,
  grindar,
  kommandeHallpunkter,
  kontrollage,
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
    expect(f[10]).toMatchObject({ punkter: 19, hp: 7 });
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

  it("larmar inte för ledtider vars moment passerat sin grind, men kallar dem inte klara", () => {
    let s = seed();
    // Transportvägen är punkt 2.7 och kranen 4.6 — moment 2 och 4 är passerade men ej registrerade.
    expect(ledtid(s, "36037", "transportvag")).toMatchObject({ status: "passerad", klar: false, markerad: false });
    expect(ledtid(s, "36037", "kranMv").status).toBe("passerad");
    s = punkt(s, "36037", "2.7", "klar");
    expect(ledtid(s, "36037", "transportvag")).toMatchObject({ status: "klar", klar: true });
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
    expect(hp).toHaveLength(17);
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
    expect(l.hp).toBe(55);
    // En passerad grind bockar inte av hållpunkterna (beslut 2026-10-17).
    expect(l.hpKlara).toBe(0);
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
  it("bockar inte av punkter i passerade moment — de är öppna och ej registrerade", () => {
    const pl = punktlage(seed(), "36037");
    expect(pl.get("1.1")).toMatchObject({ status: "oppen", kalla: "ejregistrerad" });
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
  it("summerar klara, kvar, hållpunkter och grindar över alla 306 punkter", () => {
    const { totalt, faser, lopande } = checklistsummering(seed(), "36037", NU);
    // Moment 0–9 är passerade men inga punkter är registrerade: grinden bockar inte av.
    expect(totalt).toMatchObject({ punkter: 306, klara: 0, ejAktuella: 0, kvar: 306, hp: 55, hpKlara: 0, grindar: 10 });
    expect(totalt.andel).toBe(0);
    expect(faser[10]).toMatchObject({ punkter: 19, klara: 0, kvar: 19, hp: 7, hpKvar: 7 });
    expect(lopande).toMatchObject({ punkter: 26, klara: 0 });
  });

  it("räknar andelen på det som är aktuellt", () => {
    let s = seed();
    for (const id of ["10.1", "10.2"]) s = punkt(s, "36037", id, "klar");
    s = punkt(s, "36037", "10.3", "ejaktuell");
    const { totalt, faser } = checklistsummering(s, "36037", NU);
    expect(faser[10]).toMatchObject({ klara: 2, ejAktuella: 1, kvar: 16 });
    expect(totalt.andel).toBe(Math.round((2 / 287) * 100));
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
    expect(k[3].orsak).toBe("Moment 10 pågår");
  });

  it("vaskar fram nästa punkt när den första bockas av", () => {
    const s = punkt(seed(), "36037", "13.1", "klar");
    expect(nastaUppgifter(s, "36037", NU)[0].punkt.id).toBe("10.11");
  });

  it("föreslår grinden när alla fasens punkter är klara", () => {
    let s = seed();
    for (const i of Array.from({ length: 19 }, (_, n) => n + 1)) s = punkt(s, "36037", `10.${i}`, "klar");
    const g = nastaUppgifter(s, "36037", NU).find((x) => x.typ === "grind");
    expect(g.fas.fas.grind.kod).toBe("G10");
    expect(g.orsak).toMatch(/dags för G10/);
  });

  it("börjar från fas 0 i ett projekt utan datum", () => {
    const k = nastaUppgifter(seed(), "goteborg", NU);
    expect(k[0]).toMatchObject({ typ: "punkt", orsak: "Nästa moment: 0" });
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

/* ---------- Verifiering: arbete färdigt / kontroll verifierad / fas godkänd ---------- */

/** Registrerar en komplett (eller avvikande) egenkontroll för varje punkt i fasens mall. */
function kontrollera(s, pid, fas, falt = {}) {
  for (const p of PROJEKTMALLAR[fas].punkter) {
    const rad = {
      id: kontrollId(pid, "Hela anläggningen", p.id),
      projektId: pid,
      omfattning: "Hela anläggningen",
      punktId: p.id,
      resultat: "ok",
      datum: "2026-09-20",
      kontrollant: "A. Kontrollant",
      referens: "EK-" + p.id,
      mallrevision: PROJEKTKONTROLL_REVISION,
      ...falt,
    };
    s = reducer(s, { type: "FALT_KONTROLL", rad });
  }
  return s;
}

describe("verifiering", () => {
  it("räknar inte en grind ur betalplanen som godkänd", () => {
    const f = faslage(seed(), "36037", NU)[7]; // G7 härledd ur fakturerad M3
    expect(f.status).toBe("klar"); // tidsläget är oförändrat
    expect(f.grind.kalla).toBe("betalplan");
    expect(f.verifiering).toMatchObject({ arbete: true, verifierad: false, godkand: false, lage: "fardigt" });
    expect(f.verifiering.harledda).toBeGreaterThan(0);
    expect(f.verifiering.saknas.join(" ")).toMatch(/egenkontroller ej verifierade/);
    expect(f.verifiering.saknas.join(" ")).toMatch(/klartecken/);
  });

  it("ger kontroll verifierad när alla egenkontroller är kompletta men grinddatum saknas", () => {
    const s = kontrollera(seed(), "36037", 7);
    const v = faslage(s, "36037", NU)[7].verifiering;
    expect(v.kontroll).toMatchObject({ verifierade: v.kontroll.totalt, kvar: 0, avvikelser: 0 });
    expect(v).toMatchObject({ verifierad: true, godkand: false, lage: "verifierad" });
    expect(v.saknas).toContain("klartecken (grinddatum) saknas");
  });

  it("ger fas godkänd först med verifierade kontroller och angivet grinddatum", () => {
    let s = reducer(seed(), { type: "EPC_FAS", pid: "36037", fas: 7, falt: "grindDatum", varde: "2026-09-21" });
    expect(faslage(s, "36037", NU)[7].verifiering.lage).toBe("fardigt"); // grind utan kontroller räcker inte
    s = kontrollera(s, "36037", 7);
    const v = faslage(s, "36037", NU)[7].verifiering;
    expect(v).toMatchObject({ arbete: true, verifierad: true, godkand: true, lage: "godkand", saknas: [] });
  });

  it("räknar ofullständiga kontroller och öppna avvikelser som ej verifierade", () => {
    let s = kontrollera(seed(), "36037", 7, { kontrollant: "" });
    expect(kontrollage(s, "36037")[7].verifierade).toBe(0);
    s = kontrollera(seed(), "36037", 7);
    const forsta = PROJEKTMALLAR[7].punkter[0];
    // En avvikelse i en annan omfattning gör punkten overifierad trots OK i helheten.
    s = reducer(s, {
      type: "FALT_KONTROLL",
      rad: { id: kontrollId("36037", "Container 3", forsta.id), projektId: "36037", omfattning: "Container 3",
        punktId: forsta.id, resultat: "ej-ok", datum: "2026-09-20", kontrollant: "B", referens: "R",
        mallrevision: PROJEKTKONTROLL_REVISION },
    });
    const k = kontrollage(s, "36037")[7];
    // Container 3 är nu en omfattning i fasen, så alla punkter saknar den utom den avvikande.
    expect(k).toMatchObject({ avvikelser: 1, verifierade: 0 });
    expect(faslage(s, "36037", NU)[7].verifiering.saknas.join(" ")).toMatch(/1 avvikelse öppen/);
  });

  it("kontrollplanens enheter räknas även när de aldrig registrerats (granskning #73)", () => {
    let s = kontrollera(seed(), "36037", 7);
    expect(kontrollage(s, "36037")[7].kvar).toBe(0);
    s = { ...s, projekt: s.projekt.map((p) => (p.id === "36037" ? { ...p, kontrollplan: { 7: ["Hela anläggningen", "SKID 1", "skid 1 "] } } : p)) };
    const k = kontrollage(s, "36037")[7];
    expect(k.omfattningar).toEqual(["Hela anläggningen", "SKID 1"]);
    expect(k).toMatchObject({ verifierade: 0, kvar: k.totalt });
    expect(k.tackning[PROJEKTMALLAR[7].punkter[0].id]).toEqual({ klara: 1, totalt: 2 });
  });

  it("en komplett omfattning döljer inte en ofullständig (granskning F12/T07)", () => {
    let s = kontrollera(seed(), "36037", 7);
    const forsta = PROJEKTMALLAR[7].punkter[0];
    s = reducer(s, {
      type: "FALT_KONTROLL",
      rad: { id: kontrollId("36037", "Container 3", forsta.id), projektId: "36037", omfattning: "Container 3",
        punktId: forsta.id, resultat: "ok", datum: "2026-09-20", kontrollant: "B", referens: "R",
        mallrevision: PROJEKTKONTROLL_REVISION },
    });
    const k = kontrollage(s, "36037")[7];
    // Bara första punkten har både helheten och Container 3; resten saknar Container 3.
    expect(k).toMatchObject({ verifierade: 1, kvar: k.totalt - 1, avvikelser: 0 });
    expect(k.omfattningar).toEqual(["Container 3", "Hela anläggningen"]);
    expect(faslage(s, "36037", NU)[7].verifiering.verifierad).toBe(false);
  });

  it("en ofullständig rad i en omfattning gör punkten overifierad även om en annan är komplett", () => {
    let s = kontrollera(seed(), "36037", 7);
    const forsta = PROJEKTMALLAR[7].punkter[0];
    for (const p of PROJEKTMALLAR[7].punkter) {
      s = reducer(s, {
        type: "FALT_KONTROLL",
        rad: { id: kontrollId("36037", "Container 1", p.id), projektId: "36037", omfattning: "Container 1",
          punktId: p.id, resultat: "ok", datum: "2026-09-20", kontrollant: p.id === forsta.id ? "" : "B", referens: "R",
          mallrevision: PROJEKTKONTROLL_REVISION },
      });
    }
    const k = kontrollage(s, "36037")[7];
    expect(k).toMatchObject({ verifierade: k.totalt - 1, kvar: 1 });
  });

  it("håller kontrollerna per projekt och lämnar faser som inte kommit så långt utan läge", () => {
    const s = kontrollera(seed(), "36037", 7);
    expect(kontrollage(s, "36038")[7].verifierade).toBe(0);
    const f = faslage(s, "36037", NU)[11];
    expect(f.status).toBe("kommande");
    expect(f.verifiering.lage).toBeNull();
    expect(f.verifiering.saknas).toEqual([]);
  });

  it("låter grindar och tidsstatus vara orörda så att planeringen räknar som förut", () => {
    const s = kontrollera(seed(), "36037", 7);
    expect(faslage(s, "36037", NU).map((f) => [f.status, f.grind.passerad])).toEqual(
      faslage(seed(), "36037", NU).map((f) => [f.status, f.grind.passerad])
    );
  });
});

/* ---------- Det som saknas för grinden ---------- */

describe("grindSaknas", () => {
  it("listar öppna punkter med hållpunkter först, egenkontroller och klartecknet", () => {
    const g = grindSaknas(seed(), "36037", 10, NU);
    expect(g.klart).toBe(false);
    expect(g.grinddatum).toBe(true);
    expect(g.punkter).toHaveLength(19);
    const hp = g.punkter.filter((p) => p.hp).length;
    expect(hp).toBe(7);
    expect(g.punkter.slice(0, hp).every((p) => p.hp)).toBe(true);
    expect(g.punkter.every((p) => !p.ejRegistrerad)).toBe(true);
  });

  it("markerar oregistrerade punkter i ett passerat moment och tar bort det som bockats", () => {
    let s = seed();
    let g = grindSaknas(s, "36037", 1, NU);
    expect(g.punkter.length).toBeGreaterThan(0);
    expect(g.punkter.every((p) => p.ejRegistrerad)).toBe(true);
    s = punkt(s, "36037", "1.1", "klar");
    g = grindSaknas(s, "36037", 1, NU);
    expect(g.punkter.some((p) => p.id === "1.1")).toBe(false);
  });

  it("gör inga nya uppgifter av oregistrerade punkter i passerade moment", () => {
    const u = nastaUppgifter(seed(), "36037", NU);
    const moment = (id) => Number(String(id).split(".")[0]);
    expect(u.filter((x) => x.typ === "punkt").every((x) => moment(x.punkt.id) >= 10)).toBe(true);
  });
});

describe("styrktaPunkter", () => {
  it("en verifierad egenkontroll bockar sin kopplade EPC-punkt, men inte tvärtom", async () => {
    const { kontrollId } = await import("./projektkontroll.js");
    const i = PROJEKTMALLAR.findIndex((m) => m.punkter.some((p) => p.epc.length));
    const mp = PROJEKTMALLAR[i].punkter.find((p) => p.epc.length);
    const epcId = mp.epc[0];
    let s = seed();
    expect(punktlage(s, "goteborg").get(epcId).status).toBe("oppen");
    s = { ...s, faltkontroller: [...(s.faltkontroller || []), { id: kontrollId("goteborg", "Hela anläggningen", mp.id), projektId: "goteborg", punktId: mp.id, omfattning: "Hela anläggningen", resultat: "ok", datum: "2026-09-20", kontrollant: "C. Karlsson", referens: "Protokoll 1", mallrevision: PROJEKTKONTROLL_REVISION }] };
    const l = punktlage(s, "goteborg").get(epcId);
    expect(l).toMatchObject({ status: "klar", kalla: "egenkontroll", kontroll: mp.id });
  });
});
