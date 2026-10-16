import { describe, expect, it } from "vitest";
import { VECKOFRAGOR } from "../data/veckofragor.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { BESS_STADIER, ANTAL_FRAGOR, ataPaverkan, bessStadier, bessStadierForProjekt, effektText, komponentLage, parkKomponenter, projektPrio, veckaSiffror } from "./veckoOversikt.js";

/* Veckokoll-översikten: siffror, prio, BESS-stadier och komponentlägen. Ren logik. */

const start = () => efterInlasning(normalisera(structuredClone(SEED)));
// Ett OK-svar per fråga: det svar som inte är flaggat.
const okSvar = (f) => f.alt.find((a) => !f.flagga.includes(a));
const rad = (extra = {}) => ({ projektId: "p1", vecka: "2026-W41", ...extra });
const allaOk = () => Object.fromEntries(VECKOFRAGOR.map((f) => ["q" + f.n, okSvar(f)]));

describe("veckaSiffror()", () => {
  it("en saknad rad ger nollor", () => {
    expect(veckaSiffror(null)).toEqual({ besvarade: 0, totalt: ANTAL_FRAGOR, andel: 0, ok: 0, varning: 0, avvikelse: 0 });
    expect(ANTAL_FRAGOR).toBe(9);
  });

  it("räknar besvarade och fördelar dem på OK, varning och avvikelse", () => {
    const f2 = VECKOFRAGOR[1]; // fråga 2: ja = avvikelse, osäker = varning, nej = ok
    const s = veckaSiffror(rad({ q1: "ja", q2: "ja", q3: "nej", q5: "osaker" }));
    expect(s.besvarade).toBe(4);
    expect(s.ok).toBe(2); // q1 ja, q3 nej
    expect(s.avvikelse).toBe(1);
    expect(s.varning).toBe(1);
    expect(s.andel).toBe(44);
    expect(f2.flagga).toContain("ja");
  });

  it("alla OK ger 100 % och inga anmärkningar", () => {
    const s = veckaSiffror(rad(allaOk()));
    expect(s).toMatchObject({ besvarade: 9, andel: 100, ok: 9, varning: 0, avvikelse: 0 });
  });

  it("tomma och okända svar räknas inte", () => {
    expect(veckaSiffror(rad({ q1: "", q2: undefined, q3: null })).besvarade).toBe(0);
  });
});

describe("projektPrio()", () => {
  const stat = (veckokoll) => ({ veckokoll });

  it("avvikelse går före varning, varning före OK, och ofullständigt är 'ingen'", () => {
    expect(projektPrio(stat([rad({ ...allaOk(), q2: "ja" })]), "p1", "2026-W41").prio).toBe("bad");
    expect(projektPrio(stat([rad({ ...allaOk(), q2: "osaker" })]), "p1", "2026-W41").prio).toBe("warn");
    expect(projektPrio(stat([rad(allaOk())]), "p1", "2026-W41").prio).toBe("ok");
    expect(projektPrio(stat([rad({ q1: "ja" })]), "p1", "2026-W41").prio).toBe("ingen");
    expect(projektPrio(stat([]), "p1", "2026-W41").prio).toBe("ingen");
  });

  it("en avvikelse syns även när allt inte är besvarat, och rätt vecka och projekt väljs", () => {
    expect(projektPrio(stat([rad({ q2: "ja" })]), "p1", "2026-W41").prio).toBe("bad");
    expect(projektPrio(stat([rad({ q2: "ja" })]), "p1", "2026-W40").prio).toBe("ingen");
    expect(projektPrio(stat([rad({ q2: "ja" })]), "annat", "2026-W41").prio).toBe("ingen");
  });

  it("bär genomgången med", () => {
    expect(projektPrio(stat([rad({ ...allaOk(), klar: true })]), "p1", "2026-W41").klar).toBe(true);
    expect(projektPrio(stat([rad(allaOk())]), "p1", "2026-W41").klar).toBe(false);
  });

  it("tål ett state utan veckokoll", () => {
    expect(projektPrio({}, "p1", "2026-W41").prio).toBe("ingen");
  });
});

describe("ataPaverkan()", () => {
  const ur = (extra) => ({ projektId: "p1", status: "oppen", belopp: null, ...extra });

  it("räknar öppna ärenden och pengarna: godkänt ej fakturerat och pågående prissättning", () => {
    const s = ataPaverkan(
      { ur: [ur({}), ur({ status: "prissattning", belopp: 10000 }), ur({ status: "godkand", belopp: 25000 }), ur({ status: "fakturerad", belopp: 5000 }), ur({ status: "stangd" }), ur({ projektId: "annat", belopp: 999 })] },
      "p1"
    );
    expect(s.oppna).toBe(4); // oppen, prissattning, godkand, fakturerad (alla utom stängd/utgår)
    expect(s.ejFakturerat).toBe(25000);
    expect(s.pagaende).toBe(10000);
    expect(s.godkant).toBe(30000); // godkänd + fakturerad
    expect(s.utanPris).toBe(1); // bara den öppna utan belopp — de övriga öppna har ett belopp
  });

  it("tomt state ger nollor", () => {
    expect(ataPaverkan({ ur: [] }, "p1")).toEqual({ oppna: 0, ejFakturerat: 0, pagaende: 0, godkant: 0, utanPris: 0 });
  });
});

describe("BESS-stadier", () => {
  const moment = (status, klara = 0, punkter = 10) => ({ status, klara, punkter, ejAktuella: 0, fas: { grind: { kod: "G" } } });
  const sexton = (over = {}) => Array.from({ length: 16 }, (_, i) => over[i] || moment("kommande"));

  it("fyra stadier i den ordning parken tas i drift, och varje moment ingår i högst ett", () => {
    expect(BESS_STADIER.map((s) => s.id)).toEqual(["mark", "containrar", "trafo", "sat"]);
    const alla = BESS_STADIER.flatMap((s) => s.moment);
    expect(new Set(alla).size).toBe(alla.length);
    for (const nr of alla) expect(nr).toBeGreaterThanOrEqual(0);
    for (const nr of alla) expect(nr).toBeLessThan(16);
  });

  it("inget påbörjat är 'ej_startat' med 0 %", () => {
    expect(bessStadier(sexton()).every((s) => s.status === "ej_startat" && s.andel === 0)).toBe(true);
  });

  it("alla moment klara ger 'klar', ett pågående ger 'pagaende', ett försenat ger 'sen'", () => {
    const klar = bessStadier(sexton({ 6: moment("klar", 10), 7: moment("klar", 10), 8: moment("klar", 10) }));
    expect(klar[0]).toMatchObject({ id: "mark", status: "klar", andel: 100 });
    const pagar = bessStadier(sexton({ 11: moment("pagar", 4) }));
    expect(pagar[1]).toMatchObject({ id: "containrar", status: "pagaende" });
    expect(pagar[1].andel).toBe(20); // 4 av 20 punkter i moment 11 och 12
    const sen = bessStadier(sexton({ 9: moment("sen"), 10: moment("klar", 10) }));
    expect(sen[2].status).toBe("sen");
  });

  it("ett klart moment av två gör stadiet pågående, inte klart", () => {
    const s = bessStadier(sexton({ 11: moment("klar", 10) }));
    expect(s[1].status).toBe("pagaende");
  });

  it("tål saknade moment och tom lista", () => {
    expect(bessStadier([]).every((s) => s.status === "ej_startat")).toBe(true);
    expect(bessStadier(undefined)).toHaveLength(4);
  });

  it("räknar ur ett riktigt state (EPC-checklistan) utan att kasta", () => {
    const s = start();
    const st = bessStadierForProjekt(s, s.projekt[0].id);
    expect(st).toHaveLength(4);
    for (const x of st) expect(["klar", "sen", "pagaende", "ej_startat"]).toContain(x.status);
    expect(bessStadierForProjekt({}, "x")).toEqual([]);
  });
});

describe("parkens komponenter", () => {
  const o = (typ, extra = {}) => ({ id: typ + "1", typ, namn: typ, ...extra });

  it("visar bara volymer med BESS-data, inte hägnad, låda eller nål", () => {
    const lista = [o("container"), o("skid"), o("ehouse"), o("trafo"), o("hagnad"), o("lada"), o("nal")];
    expect(parkKomponenter(lista).map((x) => x.typ)).toEqual(["container", "skid", "ehouse", "trafo"]);
    expect(parkKomponenter(undefined)).toEqual([]);
  });

  it("varning när ett öppet ärende är kopplat till objektet, annars OK", () => {
    const c = o("container", { status: "monterad" });
    const ur = [
      { id: "u1", objectGuid: c.id, status: "oppen" },
      { id: "u2", objectGuid: c.id, status: "stangd" },
      { id: "u3", objectGuid: "annat", status: "oppen" },
    ];
    const l = komponentLage(c, ur);
    expect(l.ton).toBe("varning");
    expect(l.oppnaArenden.map((u) => u.id)).toEqual(["u1"]);
    expect(l.text).toBe("1 öppet ärende");
    expect(l.statusText).toBe("Monterad");
    // Inga ärenden är ingen driftstatus: neutral ton, aldrig "ok" (granskning F14).
    expect(komponentLage(c, [])).toMatchObject({ ton: "ingen", text: "Inga öppna ärenden", statusText: "Monterad" });
    expect(komponentLage(o("trafo"), [])).toMatchObject({ statusText: "Status ej angiven" });
    expect(komponentLage(c, [{ id: "a", objectGuid: c.id, status: "oppen" }, { id: "b", objectGuid: c.id, status: "prissattning" }]).text).toBe("2 öppna ärenden");
  });

  it("effekttext: ur siten först, annars projektets egna fält, annars tom", () => {
    expect(effektText({}, { mw: 10, mwh: 20 })).toBe("10 MW / 20 MWh");
    expect(effektText({}, { mw: 2.55, mwh: 4.2 })).toBe("2,6 MW / 4,2 MWh");
    expect(effektText({ mw: 10, mwh: 20 }, { mw: 0, mwh: 0 })).toBe("10 MW / 20 MWh");
    expect(effektText({ mw: 10 }, null)).toBe("10 MW / — MWh");
    expect(effektText({}, null)).toBe("");
  });
});
