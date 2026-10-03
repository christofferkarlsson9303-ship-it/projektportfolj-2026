import { describe, expect, it } from "vitest";
import { kvarAktivitet, prognos, prognosLage, prognosrad, prognostrend } from "./prognos.js";

/** Ett litet projekt med jämna siffror:
 *  kontrakt 1 000 000, godkänd ÄTA 100 000, väntande ÄTA 50 000
 *  två aktiviteter: A budget 300 000 (utfall 200 000), B budget 200 000 (utfall 50 000)
 *  betalplan: 40 % fakturerat */
function grund() {
  return {
    projekt: [{ id: "p1", namn: "Test", kontraktsvarde: 1_000_000 }],
    ur: [
      { id: "u1", projektId: "p1", status: "godkand", belopp: 100_000 },
      { id: "u2", projektId: "p1", status: "skickad_best", belopp: 50_000 },
      { id: "u3", projektId: "p1", status: "oppen", belopp: null, klass: "oklar" },
      { id: "u4", projektId: "p1", status: "oppen", belopp: null, klass: "hinder" },
    ],
    betalplan: [
      { id: "b1", projektId: "p1", kod: "M1", andel: 40, status: "fakturerad" },
      { id: "b2", projektId: "p1", kod: "M2", andel: 60, status: "kvar" },
    ],
    medarbetare: [{ id: "m1", apris: 1000 }],
    aktiviteter: [
      { id: "a", projektId: "p1", namn: "A", budgetTim: 0, budgetMtrl: 300_000, budgetUE: 0 },
      { id: "b", projektId: "p1", namn: "B", budgetTim: 0, budgetMtrl: 0, budgetUE: 200_000 },
    ],
    tidrader: [{ id: "t1", projektId: "p1", aktivitetId: "b", personId: "m1", timmar: 50 }],
    kostnader: [{ id: "k1", projektId: "p1", aktivitetId: "a", typ: "material", belopp: 200_000 }],
    prognoser: [],
  };
}

describe("prognos", () => {
  it("räknar intäkt, slutkostnad och TB ur kontrakt, ÄTA och aktiviteter", () => {
    const pr = prognos(grund(), "p1");
    expect(pr.intakt).toBe(1_100_000); // kontrakt + godkänd ÄTA
    expect(pr.intaktMedVantande).toBe(1_150_000);
    expect(pr.budget).toBe(500_000);
    expect(pr.utfall).toBe(250_000); // 200 000 material + 50 h × 1 000
    expect(pr.kvar).toBe(250_000); // (300−200) + (200−50) tusen
    expect(pr.slutkostnad).toBe(500_000);
    expect(pr.tb).toBe(600_000);
    expect(Math.round(pr.tg * 10) / 10).toBe(54.5);
    expect(pr.kostnadsavvikelse).toBe(0);
  });

  it("projektledarens bedömning av kvar går före budget minus utfall", () => {
    const s = grund();
    s.aktiviteter[0].prognosKvar = 180_000; // A blir 80 000 dyrare än budget
    const pr = prognos(s, "p1");
    expect(pr.slutkostnad).toBe(580_000);
    expect(pr.kostnadsavvikelse).toBe(-80_000);
    expect(pr.aktiviteter.find((a) => a.id === "a")).toMatchObject({ kvarKalla: "bedomning", avvikelse: -80_000 });
  });

  it("kvar blir aldrig negativt när utfallet passerat budget", () => {
    expect(kvarAktivitet({}, 100, 150)).toEqual({ kr: 0, kalla: "budget" });
    expect(kvarAktivitet({ prognosKvar: -5 }, 100, 50)).toEqual({ kr: 0, kalla: "bedomning" });
    expect(kvarAktivitet({ prognosKvar: "" }, 100, 50)).toEqual({ kr: 50, kalla: "budget" });
  });

  it("färdigställandegrad och över-/underfakturering", () => {
    const pr = prognos(grund(), "p1");
    expect(pr.grad).toBe(50); // 250 000 / 500 000
    expect(pr.upparbetat).toBe(550_000);
    expect(pr.fakturerat).toBe(400_000); // 40 % av kontraktet
    expect(pr.overUnder).toBe(-150_000); // underfakturerat
  });

  it("fakturerad ÄTA räknas som fakturerad", () => {
    const s = grund();
    s.ur[0].status = "fakturerad";
    expect(prognos(s, "p1").fakturerat).toBe(500_000);
  });

  it("utfall utan aktivitet ingår i slutkostnaden och flaggas", () => {
    const s = grund();
    s.kostnader.push({ id: "k2", projektId: "p1", aktivitetId: "", typ: "ovrigt", belopp: 10_000 });
    const pr = prognos(s, "p1");
    expect(pr.slutkostnad).toBe(510_000);
    expect(pr.brister.join()).toMatch(/inte är kopplade/);
  });

  it("brister i underlaget sägs rakt ut", () => {
    const s = grund();
    s.projekt[0].kontraktsvarde = null;
    s.aktiviteter = [];
    const pr = prognos(s, "p1");
    expect(pr.intakt).toBeNull();
    expect(pr.tb).toBeNull();
    expect(pr.brister).toEqual([
      "Kontraktssumma saknas. Intäkt och vinst kan inte räknas.",
      "Budget per aktivitet saknas. Total kostnad, vinst och utfört arbete kan inte räknas.",
      "1 öppna ÄTA saknar belopp och ingår inte i intäkten.",
      "Det finns kostnader som inte är kopplade till någon aktivitet.",
    ]);
  });
  it("utan budget redovisas varken TB eller över-/underfakturering", () => {
    const s = grund();
    s.aktiviteter = [];
    s.tidrader = [];
    s.kostnader = [];
    const pr = prognos(s, "p1");
    expect(pr.intakt).toBe(1_100_000);
    expect([pr.tb, pr.tg, pr.upparbetat, pr.overUnder]).toEqual([null, null, null, null]);
    expect(prognosLage(pr)).toEqual({ ton: "neutral", text: "Uppgifter saknas" });
  });
});

describe("prognosLage", () => {
  it("rött vid förlust, rött vid mer än 5 % över budget", () => {
    const s = grund();
    s.aktiviteter[0].prognosKvar = 2_000_000;
    expect(prognosLage(prognos(s, "p1")).ton).toBe("bad");
    const s2 = grund();
    s2.aktiviteter[0].prognosKvar = 130_000; // +30 000 = 6 % över
    expect(prognosLage(prognos(s2, "p1"))).toEqual({ ton: "bad", text: "Kostar mer än budget" });
  });

  it("gult vid underfakturering, grönt när allt stämmer", () => {
    expect(prognosLage(prognos(grund(), "p1"))).toEqual({ ton: "warn", text: "Fakturera mer" });
    const s = grund();
    s.betalplan[0].andel = 60;
    expect(prognosLage(prognos(s, "p1"))).toEqual({ ton: "ok", text: "Enligt plan" });
  });
});

describe("veckoprognos och trend", () => {
  it("en rad per projekt och vecka, och förändring mot föregående vecka", () => {
    const s = grund();
    const v39 = prognosrad(s, "p1", "2026-v39");
    s.aktiviteter[0].prognosKvar = 180_000;
    const v40 = prognosrad(s, "p1", "2026-v40");
    expect(v39.id).toBe("pg-p1-2026-v39");
    s.prognoser = [v40, v39];
    const t = prognostrend(s, "p1");
    expect(t.map((r) => r.vecka)).toEqual(["2026-v39", "2026-v40"]);
    expect(t[1]).toMatchObject({ tbAndring: -80_000, slutkostnadAndring: 80_000 });
    expect(t[0].tbAndring).toBeNull();
  });
});
