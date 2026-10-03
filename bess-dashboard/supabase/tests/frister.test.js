/* Frist-modulen för påminnelser mot appens egen fristlogik. Edge Functionen
   kör i UTC och kan inte importera appens moduler; det här testet ser till att
   de två ändå alltid ger samma svar. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fristrader } from "../../src/lib/agenda.js";
import { fristlage, meddelande, paminnelser, tidpunkt, timmarSedan } from "../functions/_shared/frister.js";

const ur = (id, falt) => ({ id, projektId: "36037", nr: id.toUpperCase(), benamning: "Test", status: "oppen", ...falt });

/** Ett urval poster runt alla gränser: 0, 11, 12, 24, 25 h, datum saknas,
 *  underrättelse skickad, stängd och utgår. */
function poster(nu) {
  const iso = (h) => new Date(nu - h * 3600000).toISOString();
  const dag = (d) => {
    const x = new Date(nu - d * 86400000);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  return {
    ur: [
      ur("u0", { handelseDatum: iso(0) }),
      ur("u11", { handelseDatum: iso(11) }),
      ur("u12", { handelseDatum: iso(12) }),
      ur("u24", { handelseDatum: iso(24) }),
      ur("u25", { handelseDatum: iso(25) }),
      ur("uidag", { handelseDatum: dag(0) }),
      ur("uigar", { handelseDatum: dag(1) }),
      ur("uforr", { handelseDatum: dag(2) }),
      ur("uutan", { handelseDatum: "" }),
      ur("uskickad", { handelseDatum: dag(3), underrattelseDatum: dag(3) }),
      ur("ustangd", { handelseDatum: dag(3), status: "stangd" }),
      ur("uutgar", { handelseDatum: dag(3), klass: "utgar" }),
    ],
    hseqIncidenter: [
      { id: "i5", projektId: "36038", typ: "tillbud", datum: iso(5) },
      { id: "i30", projektId: "36038", typ: "olycka", datum: iso(30) },
      { id: "iutan", projektId: "36038", typ: "miljo", datum: "" },
      { id: "irapp", projektId: "36038", typ: "tillbud", datum: iso(30), rapporterad: true },
    ],
  };
}

const sammaSom = (lista) => lista.map((f) => `${f.id}:${f.niva}`).sort();

afterEach(() => vi.useRealTimers());

describe("fristlage följer appens fristrader", () => {
  const tidpunkter = [
    "2026-09-29T20:40:00+02:00", // vanlig kväll
    "2026-09-30T00:30:00+02:00", // strax efter midnatt
    "2026-10-25T12:00:00+01:00", // dagen sommartiden slutar
    "2026-03-29T09:00:00+02:00", // dagen sommartiden börjar
    "2026-01-15T23:59:00+01:00", // vinter, sent
  ];

  for (const t of tidpunkter) {
    it(`samma frister och nivåer ${t}`, () => {
      const nu = new Date(t).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(nu);
      const state = poster(nu);
      const app = fristrader({ ...state, projekt: [] });
      expect(sammaSom(fristlage(state, nu))).toEqual(sammaSom(app));
    });
  }
});

describe("tid i svensk zon", () => {
  it("ett datum utan klockslag är midnatt svensk tid, sommar som vinter", () => {
    expect(new Date(tidpunkt("2026-07-01")).toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(new Date(tidpunkt("2026-12-01")).toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(new Date(tidpunkt("2026-10-25")).toISOString()).toBe("2026-10-24T22:00:00.000Z");
  });

  it("timmar sedan räknas mot svensk midnatt även när servern går i UTC", () => {
    const nu = new Date("2026-09-29T10:00:00Z").getTime(); // 12:00 svensk tid
    expect(timmarSedan("2026-09-29", nu)).toBe(12);
  });

  it("ogiltigt datum ger null", () => {
    expect(tidpunkt("29/9")).toBeNull();
    expect(timmarSedan("", 0)).toBeNull();
  });
});

describe("påminnelser och meddelande", () => {
  const nu = new Date("2026-09-29T20:40:00+02:00").getTime();

  it("bara akuta och förfallna påminns — inte snart eller oklar", () => {
    const n = new Set(paminnelser(poster(nu), nu).map((f) => f.niva));
    expect([...n].sort()).toEqual(["akut", "forfallen"]);
  });

  it("meddelandet har förfallet först och projektnamn", () => {
    const m = meddelande(paminnelser(poster(nu), nu), [{ id: "36037", namn: "Växjö Batteripark" }], "https://app");
    expect(m.amne).toMatch(/^Frister: \d+ passerade enligt er 24-timmarsrutin$/);
    expect(m.text).toContain("Se sidan Kontraktet");
    expect(m.text).not.toContain("ABT 06");
    const rader = m.text.split("\n").filter((r) => /^(PASSERAD|AKUT)/.test(r));
    const forstaAkut = rader.findIndex((r) => r.startsWith("AKUT"));
    expect(rader.slice(forstaAkut).every((r) => r.startsWith("AKUT"))).toBe(true);
    expect(m.text).toContain("Växjö Batteripark");
    expect(m.text).toContain("Öppna Idag: https://app");
  });

  it("bara akuta: ämnet säger inom 12 h", () => {
    const akut = paminnelser(poster(nu), nu).filter((f) => f.niva === "akut").slice(0, 1);
    expect(meddelande(akut).amne).toBe("Frister: 1 går ut inom 12 h enligt er 24-timmarsrutin");
  });

  it("skriver kontraktets gräns för hinder när projektet har en kontraktsprofil", () => {
    const s = { ...poster(nu), kontrakt: [{ projektId: "36037", frister: [{ id: "hinder", varde: 10, enhet: "bankdagar", ref: "§18.2" }] }] };
    const rad = fristlage(s, nu).find((f) => f.id === "u25");
    expect(rad.text).toContain("Kontraktets gräns: 10 bankdagar (§18.2)");
    expect(fristlage(poster(nu), nu).find((f) => f.id === "u25").text).not.toContain("Kontraktets");
  });
});
