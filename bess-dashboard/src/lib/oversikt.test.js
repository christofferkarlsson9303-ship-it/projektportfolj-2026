import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { fmtRelativ } from "./datum.js";
import { fmtKompakt } from "./format.js";
import { nyAtaPost, nyDagboksrad, nySkyddsrond } from "./nyaPoster.js";
import {
  aktivitetPerDag,
  ataLage,
  budgetLage,
  framstegLage,
  hseqLage,
  klustra,
  kommandeFonster,
  paminnelser,
  uppmarksamhet,
} from "./oversikt.js";

const NU = "2026-09-25T10:00:00+02:00";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));

/* ---------- Budget ---------- */

describe("budgetLage", () => {
  it("väger fakturerad andel med kontraktsvärdet", () => {
    const s = seed();
    // Växjö 11 446 000 och Alvesta 5 600 000, båda 80 % fakturerat, 15 % pågår.
    const b = budgetLage(s);
    expect(b.kv).toBe(11446000 + 5600000);
    expect(b.faktProc).toBe(80);
    expect(b.pagProc).toBe(15);
    expect(b.fakt).toBe(Math.round((11446000 + 5600000) * 0.8));
  });

  it("räknar inte in projekt utan kontraktsvärde, men redovisar dem", () => {
    const s = seed();
    s.projekt = s.projekt.map((p) => (p.id === "36038" ? { ...p, kontraktsvarde: null } : p));
    s.betalplan = s.betalplan.map((b) =>
      b.projektId === "36038" ? { ...b, status: "kvar" } : b
    );
    const b = budgetLage(s);
    expect(b.kv).toBe(11446000);
    expect(b.faktProc).toBe(80); // Alvestas 0 % drar inte ner snittet
    expect(b.saknarKv.map((p) => p.id)).toContain("36038");
  });

  it("ger noll i stället för NaN när inget kontraktsvärde finns", () => {
    const s = seed();
    s.projekt = s.projekt.map((p) => ({ ...p, kontraktsvarde: null }));
    expect(budgetLage(s).faktProc).toBe(0);
  });
});

/* ---------- Framsteg ---------- */

describe("framstegLage", () => {
  it("räknar M1–M7 per projekt med betalplan", () => {
    const f = framstegLage(seed());
    expect(f.rader.map((r) => r.p.id)).toEqual(["36037", "36038"]);
    expect(f.rader[0].steg.map((x) => x.status)).toEqual(["klar", "klar", "klar", "klar", "pagar", "kvar", "kvar"]);
    expect(f.klara).toBe(8);
    expect(f.tot).toBe(14);
    expect(f.proc).toBe(57);
    expect(f.utanBetalplan).toBe(2);
    expect(f.rader[0].nasta.kod).toBe("M5");
  });

  it("hittar närmaste färdigställande", () => {
    const f = framstegLage(seed());
    expect(f.naermast.p.id).toBe("36037");
    expect(f.naermast.d).toBe(68); // 2026-09-25 → 2026-12-02
  });
});

/* ---------- ÄTA ---------- */

describe("ataLage", () => {
  it("fördelar aktiva ärenden på tavlans steg och hoppar över stängda", () => {
    const s = seed();
    const a = ataLage(s);
    const stangda = s.ur.filter((u) => u.status === "stangd").length;
    expect(a.oppna).toBe(s.ur.length - stangda);
    expect(a.steg.map((x) => x.id)).toEqual(["identifierad", "underrattad", "underlag", "godkand", "fakturerad"]);
    expect(a.steg.reduce((sum, x) => sum + x.antal, 0)).toBe(a.oppna);
  });

  it("larmar när underrättelse saknas mer än 24 h efter händelsen", () => {
    const s = seed();
    s.ur = [nyAtaPost(s, "36037", { benamning: "Berg i schakt", handelseDatum: "2026-09-20" })];
    const a = ataLage(s);
    expect(a.larm).toBe(1);
    expect(a.perProjekt).toEqual([{ p: expect.objectContaining({ id: "36037" }), antal: 1 }]);
  });
});

/* ---------- HSEQ ---------- */

describe("hseqLage", () => {
  it("skiljer på site utan rond och site med försenad rond", () => {
    const s = seed();
    s.hseqRonder = [
      nySkyddsrond("36037", {
        datum: "2026-09-01",
        avvikelser: [{ id: "a", status: "oppen" }, { id: "b", status: "atgardad" }],
      }),
    ];
    const h = hseqLage(s);
    expect(h.rader.map((r) => r.p.id)).toEqual(["36037", "36038"]);
    expect(h.rader[0].dagar).toBe(24);
    expect(h.forsenade).toBe(1);
    expect(h.utanRond).toBe(1);
    expect(h.avvikelser).toBe(1);
  });
});

/* ---------- Aktivitet ---------- */

describe("aktivitetPerDag", () => {
  it("räknar per lokalt dygn och fyller tomma dagar med noll", () => {
    const logg = [
      { ts: "2026-09-25T07:00:00Z" },
      { ts: "2026-09-25T08:00:00Z" },
      // 23:30 UTC den 23:e är 01:30 svensk tid den 24:e.
      { ts: "2026-09-23T23:30:00Z" },
      { ts: "2026-08-01T10:00:00Z" }, // utanför fönstret
      { ts: "trasig" },
    ];
    const ut = aktivitetPerDag(logg, 3, "2026-09-25");
    expect(ut).toEqual([
      { datum: "2026-09-23", antal: 0 },
      { datum: "2026-09-24", antal: 1 },
      { datum: "2026-09-25", antal: 2 },
    ]);
  });

  it("klarar månadsskiften", () => {
    const ut = aktivitetPerDag([], 3, "2026-10-01");
    expect(ut.map((d) => d.datum)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});

/* ---------- Kräver uppmärksamhet ---------- */

describe("uppmarksamhet", () => {
  it("lägger akuta först och tar med veckochecklistan", () => {
    const s = seed();
    const lista = uppmarksamhet(s, "2026-v39");
    const forstaMedel = lista.findIndex((f) => f.niva !== "hog");
    expect(lista.slice(forstaMedel).every((f) => f.niva !== "hog")).toBe(true);
    expect(lista.some((f) => f.vy === "vecka" && /v\. 39 2026/.test(f.text))).toBe(true);
  });

  it("påminner om dagboksrader utan underlag men inte om fakturerade", () => {
    const s = seed();
    s.dagbok = [nyDagboksrad("36037"), nyDagboksrad("36037", { fakturerad: true })];
    const p = paminnelser(s, "2026-v39").filter((x) => x.vy === "dagbok");
    expect(p).toHaveLength(1);
    expect(p[0].text).toMatch(/^1 dagboksrad saknar/);
  });
});

/* ---------- Kommande ---------- */

describe("kommandeFonster", () => {
  it("tar leveranser och grindar inom fönstret, utan dubbletter av leveransmilstolpar", () => {
    const k = kommandeFonster(seed(), 30);
    expect(k.daterade[0]).toMatchObject({ titel: "BESS-batteri (CATL)", pid: "36037", d: 17, bess: true });
    expect(k.daterade.some((r) => r.titel === "BESS-batteri leverans")).toBe(false);
    expect(k.daterade.every((r) => r.d <= 30)).toBe(true);
    expect(k.utanDatum.map((r) => r.pid)).toEqual(["36037", "36038"]);
  });
});

describe("klustra", () => {
  it("slår ihop händelser inom tre dagar från gruppens första", () => {
    const g = klustra([{ d: 45 }, { d: 47 }, { d: 49 }, { d: 60 }]);
    expect(g.map((x) => [x.d, x.poster.length])).toEqual([
      [45, 2],
      [49, 1],
      [60, 1],
    ]);
  });
});

/* ---------- Hjälpare ---------- */

describe("fmtRelativ", () => {
  const nu = new Date(NU).getTime();
  it("går från minuter till timmar till gårdagen", () => {
    expect(fmtRelativ("2026-09-25T09:59:40+02:00", nu)).toBe("Just nu");
    expect(fmtRelativ("2026-09-25T09:48:00+02:00", nu)).toBe("12 min sedan");
    expect(fmtRelativ("2026-09-25T07:00:00+02:00", nu)).toBe("3 h sedan");
    expect(fmtRelativ("2026-09-24T14:20:00+02:00", nu)).toBe("Igår 14:20");
    expect(fmtRelativ("2026-09-20T14:20:00+02:00", nu)).toMatch(/^20 sep\.? 14:20$/);
  });
});

describe("fmtKompakt", () => {
  it("komprimerar till Mkr och tkr", () => {
    expect(fmtKompakt(13_437_000)).toBe("13,4 Mkr");
    expect(fmtKompakt(450_000)).toBe("450 tkr");
    expect(fmtKompakt(900)).toBe("900 kr");
    expect(fmtKompakt(null)).toBe("—");
  });
});

describe("nyaPoster", () => {
  it("numrerar UR-serien per projekt", () => {
    const s = seed();
    const antal = s.ur.filter((u) => u.projektId === "36038").length;
    const post = nyAtaPost(s, "36038", { benamning: "X" });
    expect(post.nr).toBe("UR" + String(antal + 1).padStart(3, "0"));
    expect(post).toMatchObject({ status: "oppen", klass: "oklar", handelseDatum: "2026-09-25", benamning: "X" });
  });
});
