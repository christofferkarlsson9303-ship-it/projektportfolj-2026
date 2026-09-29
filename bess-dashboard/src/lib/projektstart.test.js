import { describe, expect, it } from "vitest";
import { PUNKT_FOR_ID } from "../data/bessChecklistData.ts";
import { DIREKTIV_FALT, PROJEKTSTART_EPC, TRIANGEL, UPPSTART_FRAGOR, UPPSTART_OMRADEN } from "../data/projektstart.js";
import { PUNKT_UNDERLAG } from "../data/punktUnderlag.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { direktivLage, projektstartRad, signatur, tolkaProcent, triangelLage, uppstartLage } from "./projektstart.js";

const last = (state) => efterInlasning(normalisera(structuredClone(state)));

/** State med projektstart-raden för 36037 ändrad. */
const med = (state, andring) => ({
  ...state,
  projektstart: state.projektstart.map((r) => (r.projektId === "36037" ? { ...r, ...andring } : r)),
});

/** Alla obligatoriska fält ifyllda och triangeln 30/10/60. */
const komplett = () =>
  Object.fromEntries([
    ...DIREKTIV_FALT.filter((f) => f.krav).map((f) => [f.id, `Text för ${f.rubrik}`]),
    ["prioKostnad", 30],
    ["prioKvalitet", 10],
    ["prioTid", 60],
  ]);

describe("projektstartens data", () => {
  it("har elva direktivfält varav sju obligatoriska, tre triangelparametrar och 18 frågor med stabila id:n", () => {
    expect(DIREKTIV_FALT).toHaveLength(11);
    expect(DIREKTIV_FALT.filter((f) => f.krav)).toHaveLength(7);
    expect(new Set(DIREKTIV_FALT.map((f) => f.id)).size).toBe(DIREKTIV_FALT.length);
    expect(TRIANGEL.map((t) => t.namn)).toEqual(["Kostnad", "Kvalitet", "Tid"]);
    expect(UPPSTART_FRAGOR.map((f) => f.id)).toEqual(UPPSTART_FRAGOR.map((_, i) => `us.${i + 1}`));
    expect(UPPSTART_FRAGOR).toHaveLength(18);
    expect(UPPSTART_OMRADEN.every((o) => o.namn && o.fragor.length)).toBe(true);
    expect(UPPSTART_FRAGOR.every((f) => f.badges.every((b) => ["HP", "K", "L"].includes(b)))).toBe(true);
  });

  it("pekar på EPC-punkter som finns: 1.22 och 1.23 är hållpunkter och alla tre har underlagslänk", () => {
    expect(PUNKT_FOR_ID.get(PROJEKTSTART_EPC.direktiv).badges).toContain("HP");
    expect(PUNKT_FOR_ID.get(PROJEKTSTART_EPC.uppstart).badges).toContain("HP");
    for (const id of Object.values(PROJEKTSTART_EPC)) {
      expect(PUNKT_FOR_ID.has(id), id).toBe(true);
      expect(PUNKT_UNDERLAG[id].vy, id).toBe("projektstart");
    }
  });
});

describe("sådden", () => {
  it("ger varje projekt exakt en tom rad och bevarar det som skrivits", () => {
    const s = last(SEED);
    expect(s.projektstart).toHaveLength(s.projekt.length);
    expect(projektstartRad(s, "36037")).toMatchObject({ id: "ps-36037", bakgrund: "", prioTid: null, uppstart: {} });

    const igen = last(med(s, { bakgrund: "Avrop Batch C" }));
    expect(igen.projektstart).toHaveLength(s.projekt.length);
    expect(projektstartRad(igen, "36037").bakgrund).toBe("Avrop Batch C");
  });
});

describe("projekttriangeln", () => {
  it("tolkar procent och kräver summan 100", () => {
    expect([tolkaProcent(""), tolkaProcent(null), tolkaProcent("60 %"), tolkaProcent("12,6"), tolkaProcent(140)]).toEqual([
      null,
      null,
      60,
      13,
      100,
    ]);
    expect(triangelLage({ prioKostnad: 30, prioKvalitet: 10, prioTid: 60 })).toMatchObject({ summa: 100, ok: true });
    expect(triangelLage({ prioKostnad: 30, prioKvalitet: 10, prioTid: 60 }).hogst.namn).toBe("Tid");
    expect(triangelLage({ prioKostnad: 30, prioKvalitet: 10, prioTid: 50 })).toMatchObject({ summa: 90, ok: false });
    expect(triangelLage({ prioKostnad: 50, prioKvalitet: 50 })).toMatchObject({ komplett: false, ok: false });
  });

  it("har ingen högst prioriterad parameter vid delad förstaplats", () => {
    expect(triangelLage({ prioKostnad: 45, prioKvalitet: 10, prioTid: 45 })).toMatchObject({ ok: true, hogst: null });
  });
});

describe("direktivLage", () => {
  it("listar det som saknas och är inte komplett förrän allt obligatoriskt och triangeln är klart", () => {
    let l = direktivLage(last(SEED), "36037");
    expect(l).toMatchObject({ kravIfyllda: 0, kravTotalt: 7, komplett: false, signerat: false });
    expect(l.saknas.map((f) => f.id)).toContain("konflikt");

    l = direktivLage(med(last(SEED), { ...komplett(), prioTid: 50 }), "36037");
    expect(l).toMatchObject({ kravIfyllda: 7, komplett: false });

    l = direktivLage(med(last(SEED), komplett()), "36037");
    expect(l).toMatchObject({ komplett: true, signerat: false });
  });

  it("kräver två giltiga signaturer för hållpunkt 1.22", () => {
    const bas = med(last(SEED), { ...komplett(), andrad: "2026-01-20" });
    expect(direktivLage(med(bas, { ibNamn: "Chef", ibDatum: "2026-01-21" }), "36037").signerat).toBe(false);
    const l = direktivLage(med(bas, { ibDatum: "2026-01-21", plDatum: "2026-01-21" }), "36037");
    expect(l).toMatchObject({ signerat: true });
    expect(l.ib.status).toBe("giltig");
  });

  it("gör en signatur inaktuell när direktivet ändras efteråt", () => {
    const signerad = { ...komplett(), ibDatum: "2026-01-21", plDatum: "2026-01-21" };
    const l = direktivLage(med(last(SEED), { ...signerad, andrad: "2026-02-03" }), "36037");
    expect(l.ib.status).toBe("inaktuell");
    expect(l.signerat).toBe(false);
  });
});

describe("signatur", () => {
  it("jämför tidsstämplar samma dag och faller tillbaka på dag utan tidsstämpel", () => {
    const rad = { ibDatum: "2026-09-29", andrad: "2026-09-29" };
    // Samma dag utan tidsstämpel räknas som giltig.
    expect(signatur(rad, "ib").status).toBe("giltig");
    // Ändrat efter signering samma dag.
    expect(
      signatur({ ...rad, ibTid: "2026-09-29T08:00:00.000Z", andradTid: "2026-09-29T09:00:00.000Z" }, "ib").status
    ).toBe("inaktuell");
    // Signerat efter ändringen.
    expect(
      signatur({ ...rad, ibTid: "2026-09-29T10:00:00.000Z", andradTid: "2026-09-29T09:00:00.000Z" }, "ib").status
    ).toBe("giltig");
    expect(signatur({}, "pl").status).toBe("saknas");
  });
});

describe("uppstartLage", () => {
  it("räknar frågor och ger klartecken som hållpunkt 1.23", () => {
    const svar = Object.fromEntries(UPPSTART_FRAGOR.slice(0, 3).map((f) => [f.id, { klar: true, not: "ok" }]));
    let l = uppstartLage(med(last(SEED), { uppstart: svar }), "36037");
    expect(l).toMatchObject({ klara: 3, totalt: 18, alla: false, hallen: false, godkand: false, redo: false });
    expect(l.fragor[0]).toMatchObject({ klar: true, not: "ok" });

    const alla = Object.fromEntries(UPPSTART_FRAGOR.map((f) => [f.id, { klar: true }]));
    l = uppstartLage(med(last(SEED), { uppstart: alla, uppstartDatum: "2026-01-22", uppstartOk: "2026-01-22" }), "36037");
    expect(l).toMatchObject({ alla: true, hallen: true, godkand: true, redo: true });
  });

  it("tål att raden saknas", () => {
    const l = uppstartLage({ ...last(SEED), projektstart: [] }, "36037");
    expect(l).toMatchObject({ klara: 0, godkand: false });
  });
});
