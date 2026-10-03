import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { FASBEROENDEN } from "../data/fasberoenden.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { baslinjerad, drivtext, kritiskLinje } from "./kritiskLinje.js";
import { plusDagar } from "./epc.js";

/* Ett påhittat projekt helt i framtiden, så att inga grindar är passerade
   och inget har dragit över: start 2027-01-04, färdigställande 2027-12-01. */
const PID = "t1";
const NU = "2026-12-01";

function grund() {
  const s = efterInlasning(normalisera(structuredClone(SEED)));
  s.projekt.push({
    id: PID,
    namn: "Testpark",
    startdatum: "2027-01-04",
    fardigstallande: "2027-12-01",
    kontraktsvarde: null,
  });
  return s;
}

const fas = (k, nr) => k.faser.find((f) => f.nr === nr);
const egetDatum = (s, nr, falt, varde) => reducer(s, { type: "EPC_FAS", pid: PID, fas: nr, falt, varde });

describe("kritiskLinje — standardplanen", () => {
  it("en opåverkad plan ger ingen försening och prognos = plan", () => {
    const k = kritiskLinje(grund(), PID, NU);
    expect(k.referens).toBe("standardplan");
    expect(k.kontrakt).toBe("2027-12-01");
    expect(k.forsening).toBe(0);
    expect(k.slutPrognos).toBe("2027-12-01");
    expect(k.faser.every((f) => f.forskjutning === 0)).toBe(true);
    expect(k.milstolpar.every((m) => m.plan === m.prognos)).toBe(true);
  });

  it("slutbesiktningen ligger alltid på den kritiska linjen, och tidiga faser har buffert", () => {
    const k = kritiskLinje(grund(), PID, NU);
    expect(k.kritiska).toContain(14);
    expect(fas(k, 4).slack).toBeGreaterThan(0); // inköp har luft före leveransen
  });

  it("utan start eller slut finns ingen prognos", () => {
    const s = grund();
    s.projekt.find((p) => p.id === PID).startdatum = "";
    expect(kritiskLinje(s, PID, NU)).toBeNull();
  });
});

describe("kritiskLinje — förseningar förs vidare", () => {
  it("fundament som blir klara långt senare trycker leverans, idrifttagning och besiktning", () => {
    const fore = kritiskLinje(grund(), PID, NU);
    const s = egetDatum(grund(), 7, "slut", plusDagar(fas(fore, 7).planSlut, 120));
    const k = kritiskLinje(s, PID, NU);
    expect(fas(k, 7).forskjutning).toBe(120);
    expect(fas(k, 11).forskjutning).toBeGreaterThan(0);
    expect(fas(k, 11).drivs).toMatchObject({ typ: "fas", nr: 7 });
    expect(k.forsening).toBeGreaterThan(0);
    expect(k.milstolpar.find((m) => m.kod === "M6").forskjutning).toBe(k.forsening);
    expect(drivtext(fas(k, 11), k.faser)).toMatch(/^Fas 7 /);
  });

  it("en liten försening äts av bufferten och flyttar inte slutet", () => {
    const fore = kritiskLinje(grund(), PID, NU);
    const s = egetDatum(grund(), 4, "slut", plusDagar(fas(fore, 4).planSlut, 5));
    const k = kritiskLinje(s, PID, NU);
    expect(fas(k, 4).forskjutning).toBe(5);
    expect(k.forsening).toBe(0);
  });

  it("en senare BESS-leverans i leveranslistan flyttar montage och slutbesiktning", () => {
    const s = grund();
    const fore = kritiskLinje(s, PID, NU);
    const sen = plusDagar(fas(fore, 11).planStart, 30);
    s.leveranser.push({ id: "lx", projektId: PID, benamning: "BESS-batteri", datum: sen, status: "bekraftad" });
    // Leveransen är också standardplanens mittankare — spara baslinjen före
    // förseningen, annars flyttar planen med.
    const s2 = reducer(grund(), { type: "SPARA_BASLINJE", rad: baslinjerad(grund(), PID, NU) });
    s2.leveranser.push({ id: "lx", projektId: PID, benamning: "BESS-batteri", datum: sen, status: "bekraftad" });
    const k = kritiskLinje(s2, PID, NU);
    expect(k.referens).toBe("baslinje");
    expect(fas(k, 11).prognosStart).toBe(sen);
    expect(fas(k, 11).drivs).toMatchObject({ typ: "leverans" });
    expect(k.motBaslinje).toBeGreaterThan(0);
    expect(k.forsening).toBeGreaterThan(0);
  });

  it("en fas som dragit över kan inte bli klar i det förflutna", () => {
    // Faserna före fundamenten är klara (grind 6 passerad följer ner till 0).
    const s = egetDatum(grund(), 6, "grindDatum", "2027-05-01");
    const k0 = kritiskLinje(s, PID, NU);
    const efter = plusDagar(fas(k0, 7).planSlut, 10); // tio dagar efter fundamentens planerade slut
    const k = kritiskLinje(s, PID, efter);
    expect(fas(k, 7).status).toBe("sen");
    expect(fas(k, 7).prognosSlut).toBe(efter);
    expect(fas(k, 7).drivs.typ).toBe("sen");
  });

  it("en passerad grind ligger fast och räknas inte som kritisk", () => {
    const s = egetDatum(grund(), 1, "grindDatum", "2027-01-20");
    const k = kritiskLinje(s, PID, NU);
    expect(fas(k, 1)).toMatchObject({ klar: true, prognosSlut: "2027-01-20", slack: null, kritisk: false });
  });
});

describe("baslinje", () => {
  it("sparas per projekt, skrivs över vid ny sparning och används som referens", () => {
    let s = grund();
    s = reducer(s, { type: "SPARA_BASLINJE", rad: baslinjerad(s, PID, "2026-11-01", "CK") });
    s = reducer(s, { type: "SPARA_BASLINJE", rad: baslinjerad(s, PID, NU, "CK") });
    expect(s.epcBaslinje.filter((b) => b.projektId === PID)).toHaveLength(1);
    expect(s.epcBaslinje[0]).toMatchObject({ id: `bl-${PID}`, sparad: NU, av: "CK" });
    expect(s.epcBaslinje[0].faser).toHaveLength(16);
    const k = kritiskLinje(s, PID, NU);
    expect(k.motBaslinje).toBe(0);
  });
});

describe("beroendenätet", () => {
  it("går bara framåt i fasordningen och bara mellan kända faser", () => {
    for (const b of FASBEROENDEN) {
      expect(b.fran).toBeLessThan(b.till);
      expect(b.till).toBeLessThanOrEqual(15);
      expect(["FS", "SS"]).toContain(b.typ);
    }
  });

  it("varje fas före slutbesiktningen leder fram till den", () => {
    const efter = new Map();
    for (const b of FASBEROENDEN) efter.set(b.fran, [...(efter.get(b.fran) || []), b.till]);
    const nar = (nr) => nr === 14 || (efter.get(nr) || []).some(nar);
    for (let nr = 0; nr < 14; nr++) expect(nar(nr), `fas ${nr}`).toBe(true);
  });
});
