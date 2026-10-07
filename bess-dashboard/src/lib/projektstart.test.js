import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import {
  arLangText,
  kontrollLage,
  kontrolleraUnderlag,
  kortMilstolpe,
  ledningsunderlag,
  stegTabeller,
  textstycken,
  historikRad,
  medHistorik,
  milstolparUtanDatum,
  nyaRaderForProjekt,
  utkastFranProjekt,
  kortAndringar,
  lasUtkast,
  projektstartPost,
  utkastAndrat,
  utkastFranPost,
  luckor,
  nyttProjekt,
  projektFranUtkast,
  projektstartDokument,
  projektstartFel,
  tomtUtkast,
} from "./projektstart.js";
import { STEG } from "../data/projektstartSteg.js";
import { efterInlasning, reducer } from "../state/portfolj-reducer.js";
import { GILTIGA_VYER, VYER, ENKEL_MENY } from "../data/vyer.js";
import { METODSTEG, SIDHJALP } from "../data/projektmetod.js";

describe("Återanvändbar projektmetod", () => {
  it("ger vägledning till alla sidor och behåller alla länkmål", () => {
    for (const [id] of VYER.filter(([id]) => id !== "_sek")) expect(SIDHJALP[id]?.length).toBe(4);
    for (const s of METODSTEG) for (const id of s.vyer) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(METODSTEG.flatMap((s) => s.faser)).toEqual(Array.from({ length: 16 }, (_, i) => i));
    for (const id of ENKEL_MENY) expect(GILTIGA_VYER.has(id)).toBe(true);
    expect(GILTIGA_VYER.size).toBe(30);
    expect(ENKEL_MENY.size).toBe(7);
  });
  it("startar tomma projekt utan gamla resultat, antagna datum eller ekonomivärden", () => {
    const state = efterInlasning(structuredClone(SEED));
    const p = nyttProjekt({ namn: " Ny batteripark ", nr: " 90001 ", bestallare: " Ny kund " }, "nytt");
    const next = reducer(state, { type: "SKAPA_PROJEKT", rad: { ...p, kontraktsvarde: 999 } });
    expect(next.projekt.at(-1)).toMatchObject({
      namn: "Ny batteripark",
      nr: "90001",
      bestallare: "Ny kund",
      kontraktsvarde: null,
      startdatum: "",
      startdatumAntagande: false,
    });
    expect(next.handlingsplaner.some((r) => r.projektId === "nytt")).toBe(true);
    expect(next.hseqApd.some((r) => r.projektId === "nytt")).toBe(true);
    expect(next.slutdok.filter((r) => r.projektId === "nytt").every((r) => r.status === "ejpaborjad")).toBe(true);
    expect(next.faltkontroller.some((r) => r.projektId === "nytt")).toBe(false);
    expect(next.ur).toEqual(state.ur);
    expect(next.betalplan).toEqual(state.betalplan);
    expect(reducer(next, { type: "SKAPA_PROJEKT", rad: p })).toBe(next);
    expect(next.projekt.slice(0, -1)).toEqual(state.projekt);
    const reload = efterInlasning(next);
    expect(reload.slutdok).toEqual(next.slutdok);
    const cloud = structuredClone(next);
    delete cloud.projekt.at(-1).kontraktsvarde;
    expect(efterInlasning(cloud).projekt.at(-1).kontraktsvarde).toBe(null);
  });
  it("stoppar saknat namn, dubbla projektnummer och fel datumordning", () => {
    expect(projektstartFel(SEED, { namn: "" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny", nr: "36037" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny", startdatum: "2027-02-01", fardigstallande: "2027-01-01" })).not.toBe("");
    expect(projektstartFel(SEED, { namn: "Ny" })).toBe("");
    expect(reducer(SEED, { type: "SKAPA_PROJEKT", rad: nyttProjekt({ namn: "Ny", nr: "36037" }, "nytt") })).toBe(SEED);
  });
  it("skapar projekt, risker och milstolpar ur guidens utkast", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: " Kalmar batteripark ", nr: "90002", plats: "Kalmar", natagare: "Kalmar Energi", kritiskLinje: "Fundament" });
    u.rader.risker = [
      { id: "a", titel: "Leverans sen", sannolikhet: "4", konsekvens: "5", agare: "PL", atgard: "Bevaka" },
      { id: "b", titel: "  ", sannolikhet: "3", konsekvens: "3", agare: "", atgard: "" },
    ];
    u.rader.milstolpar = [
      { id: "c", namn: "M1", utlosare: "", datum: "2027-01-15" },
      { id: "d", namn: "Utan datum", utlosare: "", datum: "" },
    ];
    const { projekt, risker, milstolpar } = projektFranUtkast(u, "p1");
    expect(projekt).toMatchObject({
      id: "p1",
      namn: "Kalmar batteripark",
      nr: "90002",
      ort: "Kalmar",
      natagare: "Kalmar Energi",
      kontraktsvarde: null,
      status: "Planering",
    });
    expect(projekt.anteckning).toContain("Kritisk linje: Fundament");
    expect(risker).toEqual([
      { id: "r-p1-1", projektId: "p1", titel: "Leverans sen", sannolikhet: 4, konsekvens: 5, atgard: "Bevaka", agare: "PL", status: "oppen" },
    ]);
    expect(milstolpar).toEqual([{ id: "m-p1-1", projektId: "p1", titel: "M1", datum: "2027-01-15", status: "planerad" }]);
    let next = reducer(efterInlasning(structuredClone(SEED)), { type: "SKAPA_PROJEKT", rad: projekt });
    expect(next.projekt.at(-1).id).toBe("p1");
  });
  it("kräver att alla steg gåtts igenom och släpper bara in kända fält ur ett sparat utkast", () => {
    const u = tomtUtkast();
    expect(luckor(u).stegKvar.map((s) => s.id)).toEqual(STEG.slice(0, -1).map((s) => s.id));
    u.besokta = STEG.slice(0, -1).map((s) => s.id);
    expect(luckor(u).stegKvar).toEqual([]);
    expect(lasUtkast("inte json").v).toEqual(tomtUtkast().v);
    const l = lasUtkast(JSON.stringify({ steg: "finns-inte", v: { namn: "X", okant: "Y" }, kryss: { okand: { a: true }, calloff: { signed: true } } }));
    expect(l.steg).toBe("projekt");
    expect(l.v.namn).toBe("X");
    expect(l.v.okant).toBeUndefined();
    expect(l.kryss).toEqual({ calloff: { signed: true } });
  });
  it("bygger PDF-underlag med bara ifyllda fält, tabellrader och öppna kritiska punkter", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Kalmar", nr: "90003", bestallare: "Kund" });
    u.rader.risker = [{ id: "a", titel: "Leverans sen", sannolikhet: "4", konsekvens: "5", agare: "PL", atgard: "" }];
    u.kryss.calloff = { signed: true };
    const d = projektstartDokument(u, { datum: "2026-10-06", skapadAv: "CK" });
    expect(d.projekt).toMatchObject({ nr: "90003", namn: "Kalmar" });
    const kort = d.projektstart.sektioner.find((x) => x.id === "projekt");
    expect(kort.falt.map(([k]) => k)).toEqual(["Bolag", "Projektnamn", "Projektnummer", "Beställare", "Kontraktsform", "Skede"]);
    expect(d.projektstart.sektioner.find((x) => x.id === "risker").tabell.rader[0]).toContain("Leverans sen");
    expect(d.projektstart.sektioner.find((x) => x.id === "intressenter").tabell).toBeNull();
    const avrop = d.projektstart.sektioner.find((x) => x.id === "avrop");
    expect(avrop.kontroll.klara).toBe(1);
    expect(avrop.kontroll.kritiskaOppna.length).toBeGreaterThan(0);
    expect(d.projektstart.sektioner.some((x) => x.id === "sammanfattning")).toBe(false);
  });
  it("PDF-underlaget har alla steg numrerade och alla kontrollpunkter med avbockning", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Vaggeryd", nr: "-", plats: "Båramo" });
    u.kryss.calloff = { signed: true };
    const d = projektstartDokument(u, { datum: "2026-10-06" });
    const ps = d.projektstart;
    expect(ps.sektioner.map((x) => x.nr)).toEqual(ps.sektioner.map((_, i) => i + 1));
    expect(d.projekt.nr).toBe("");
    expect(ps.kort.plats).toBe("Båramo");
    const avrop = ps.sektioner.find((x) => x.id === "avrop");
    const punkter = avrop.kontroll.grupper.flatMap((g) => g.punkter);
    expect(punkter).toHaveLength(avrop.kontroll.totalt);
    expect(punkter.filter((p) => p.klar)).toHaveLength(1);
    expect(avrop.tomma).toContain("Därför ska vi gå vidare");
    const risker = ps.sektioner.find((x) => x.id === "risker");
    expect(risker.tabell.vikter[0]).toBeGreaterThan(risker.tabell.vikter[1]);
    expect(ps.sektioner.find((x) => x.id === "intressenter").tomTabell).toBe("Intressenter");
  });
  it("sparar guiden på projektet och öppnar den igen med alla steg genomgångna", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Kalmar", nr: "90004", plats: "Kalmar" });
    const post = projektstartPost("p9", u, "2026-10-06T10:00:00Z");
    expect(post).toMatchObject({ id: "ps-p9", projektId: "p9", skapad: "2026-10-06T10:00:00Z" });
    const igen = utkastFranPost(JSON.parse(JSON.stringify(post)));
    expect(igen.v.namn).toBe("Kalmar");
    expect(luckor(igen).stegKvar).toEqual([]);
    expect(utkastAndrat(igen, utkastFranPost(post))).toBe(false);
    igen.v.namn = "Kalmar Syd";
    expect(utkastAndrat(igen, utkastFranPost(post))).toBe(true);
  });
  it("för bara ändrade projektkortsfält över till projektet", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Nytt namn", nr: "90004", plats: "Kalmar", bestallare: "" });
    const projekt = { namn: "Gammalt namn", nr: "90004", ort: "Kalmar", bestallare: "Kund", status: "Planering" };
    expect(kortAndringar(u, projekt)).toEqual([
      ["namn", "Nytt namn"],
      ["bestallare", ""],
    ]);
    u.v.namn = "";
    expect(kortAndringar(u, projekt).some(([f]) => f === "namn")).toBe(false);
  });
  it("skede blir projektets status, och tomt skede eller bindestreck i numret skriver aldrig över", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Vaggeryd", nr: "-", skede: "Anbud" });
    const { projekt } = projektFranUtkast(u, "p-v");
    expect(projekt).toMatchObject({ nr: "", status: "Anbud" });
    expect(kortAndringar(u, { namn: "Vaggeryd", nr: "", status: "Planering" })).toEqual([["status", "Anbud"]]);
    u.v.skede = "";
    expect(kortAndringar(u, { namn: "Vaggeryd", nr: "", status: "Planering" })).toEqual([]);
  });
  it("stoppar dubbletter på namn när projektnummer saknas", () => {
    const state = { projekt: [{ id: "a", nr: "", namn: "Vaggeryd 100MW" }] };
    expect(projektstartFel(state, { namn: "vaggeryd 100mw", nr: "-" })).toMatch(/samma namn/);
    expect(projektstartFel(state, { namn: "Vaggeryd 100MW", nr: "90100" })).toBe("");
  });
  it("för bara över nya risker och milstolpar till ett befintligt projekt", () => {
    const u = tomtUtkast();
    u.rader.risker = [
      { id: "1", titel: "Leveranstid för batteri och ställverk" },
      { id: "2", titel: "Ny risk" },
    ];
    u.rader.milstolpar = [
      { id: "m", namn: "M1", datum: "2027-01-01" },
      { id: "n", namn: "M2", datum: "" },
    ];
    const state = { risker: [{ projektId: "p", titel: "leveranstid för batteri och ställverk" }], milstolpar: [] };
    const nya = nyaRaderForProjekt(u, "p", state, 5);
    expect(nya.risker.map((r) => r.titel)).toEqual(["Ny risk"]);
    expect(nya.risker[0].id).toBe("r-p-5-1");
    expect(nya.milstolpar.map((m) => m.titel)).toEqual(["M1"]);
    expect(milstolparUtanDatum(u)).toBe(1);
  });
  it("loggar en rad per dag i uppdateringshistoriken", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { skede: "Anbud", nulage: "Anbud in 23/10" });
    const r1 = historikRad(u, { datum: "2026-10-06", av: "CK" });
    expect(r1).toMatchObject({ skede: "Anbud", nulage: "Anbud in 23/10", klara: 0 });
    let h = medHistorik([], r1);
    h = medHistorik(h, { ...r1, nulage: "Ändrat samma dag" });
    expect(h).toHaveLength(1);
    expect(h[0].nulage).toBe("Ändrat samma dag");
    h = medHistorik(h, { ...r1, datum: "2026-10-07" });
    expect(h).toHaveLength(2);
    const d = projektstartDokument(u, { datum: "2026-10-07", historik: h, sparad: "2026-10-07" });
    expect(d.projektstart.historik).toHaveLength(2);
    expect(d.projektstart.lage).toMatchObject({ skede: "Anbud", nulage: "Anbud in 23/10" });
  });
  it("delar långa texter i stycken, milstolpskort och fetstilta nycklar", () => {
    const t =
      "Förslag:\n\nMilstolpe 3 (Kablering, Förläggning & Station - 20–25 %):\nBetalas när kablarna är förlagda.\n\nAvtalsform: Totalentreprenad.\nKvalitet & Säkerhet: Enligt ESA.";
    expect(textstycken(t)).toEqual([
      { typ: "stycke", text: "Förslag:" },
      { typ: "milstolpe", kod: "M3", namn: "Kablering, Förläggning & Station", andel: "20–25 %", text: "Betalas när kablarna är förlagda." },
      { typ: "stycke", nyckel: "Avtalsform", text: "Totalentreprenad." },
      { typ: "stycke", nyckel: "Kvalitet & Säkerhet", text: "Enligt ESA." },
    ]);
    expect(arLangText("kort")).toBe(false);
    expect(arLangText("a\n\nb")).toBe(true);
    expect(arLangText("x".repeat(231))).toBe(true);
  });
  it("skriver Ej skapat när projektnummer saknas och listar det inte som ej ifyllt", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Vaggeryd", nr: "-" });
    const kort = projektstartDokument(u, { datum: "2026-10-07" }).projektstart.sektioner.find((x) => x.id === "projekt");
    expect(kort.falt.find(([k]) => k === "Projektnummer")[1]).toBe("Ej skapat");
    expect(kort.tomma).not.toContain("Projektnummer");
  });
  it("fyller guiden för ett befintligt projekt ur projektkort, risker och milstolpar", () => {
    const state = efterInlasning(structuredClone(SEED));
    const projekt = state.projekt.find((p) => p.id === "36037");
    const u = utkastFranProjekt(projekt, state);
    expect(u.v).toMatchObject({ namn: "Växjö Batteripark", nr: "36037", plats: "Växjö", natagare: "Växjö Energi", fardigdatum: "2026-12-02" });
    expect(u.rader.risker.some((r) => r.titel.includes("Marginal mellan batterileverans") && r.sannolikhet === "3")).toBe(true);
    expect(u.rader.milstolpar.map((m) => m.namn)).toContain("BESS-batteri leverans");
    expect(luckor(u).stegKvar).toEqual([]);
    const tomt = utkastFranProjekt({ id: "x", namn: "Tomt" }, state);
    expect(tomt.rader.risker.length).toBeGreaterThan(0);
  });
});

describe("Ledningsunderlag i anbudsskedet", () => {
  const anbud = () => {
    const u = tomtUtkast();
    Object.assign(u.v, {
      namn: "Vaggeryd",
      skede: "Anbud",
      startdatum: "2027-02-01",
      fardigdatum: "2029-11-30",
      anbudsdatum: "2026-10-23",
      beslutSenast: "2026-10-16",
      forslag: "Lämna anbud.",
      scenarioA: "2h",
      prisA: "40",
      tbA: "12",
      scenarioB: "4h",
      prisB: "60",
      bankgarantiProcent: "10",
      vitestakProcent: "12,5",
    });
    u.rader.milstolpar = [
      { id: "m1", namn: "Milstolpe 1 (Projektering - 10–15 %)", datum: "2027-03-01", andel: "40" },
      { id: "m2", namn: "Mark", datum: "2027-02-15", andel: "50" },
    ];
    u.rader.beslutLista = [{ id: "b1", beslut: "Prisnivå", forslag: "A ≤40" }];
    u.rader.risker = [
      { id: "r1", titel: "Liten", sannolikhet: "1", konsekvens: "2" },
      { id: "r2", titel: "Stor", sannolikhet: "4", konsekvens: "4" },
    ];
    return u;
  };

  it("räknar ekonomi och betalplan per scenario", () => {
    const l = ledningsunderlag(anbud());
    expect(l.anbudsdatumText).toBe("23 oktober 2026");
    expect(l.scenarier.map((x) => [x.id, x.pris, x.tb])).toEqual([
      ["A", 40, 12],
      ["B", 60, null],
    ]);
    expect(l.ekonomi.find((e) => e.etikett.startsWith("Bankgaranti")).varden).toEqual([4, 6]);
    expect(l.ekonomi.find((e) => e.etikett.startsWith("Vitestak")).varden).toEqual([5, 7.5]);
    expect(l.milstolpar[0]).toMatchObject({ kod: "M1", namn: "Projektering", andel: 40, belopp: [16, 24] });
    expect(l.andelSumma).toBe(90);
    expect(l.toppRisker.map((r) => r.titel)).toEqual(["Stor", "Liten"]);
    expect(l.beslut).toEqual([{ beslut: "Prisnivå", forslag: "A ≤40" }]);
  });

  it("kontrollerar ordning, andelar och saknat TB", () => {
    const k = kontrolleraUnderlag(anbud());
    expect(k).toContain("Mark (2027-02-15) ligger före Projektering (2027-03-01) i tiden men efter i ordningen.");
    expect(k).toContain("Milstolparnas andelar summerar till 90 %, inte 100 %.");
    expect(k).toContain("Kalkylerat TB saknas för scenario B.");
    expect(k.some((x) => x.includes("före projektstart"))).toBe(false);
  });

  it("bygger ledningsunderlaget bara i skedet Anbud", () => {
    const u = anbud();
    expect(projektstartDokument(u, { datum: "2026-10-07" }).projektstart.ledning).not.toBeNull();
    u.v.skede = "Planering";
    expect(projektstartDokument(u, { datum: "2026-10-07" }).projektstart.ledning).toBeNull();
    expect(kontrolleraUnderlag(u).some((x) => x.includes("TB"))).toBe(false);
  });

  it("grupperar kontrollpunkterna efter när de blir aktuella", () => {
    const g = kontrollLage(tomtUtkast());
    expect(g.map((x) => x.id)).toEqual(["anbud", "kontrakt", "bygg"]);
    expect(g.every((x) => x.klara === 0 && x.totalt > 0)).toBe(true);
    expect(g.reduce((a, x) => a + x.totalt, 0)).toBe(luckor(tomtUtkast()).totalt);
  });

  it("kortar milstolpenamn och listar alla tabeller i ett steg", () => {
    expect(kortMilstolpe("Milstolpe 2 (Markarbeten & Fundament - 25–30 %)")).toBe("Markarbeten & Fundament");
    expect(kortMilstolpe("Mark")).toBe("Mark");
    const avrop = STEG.find((x) => x.tabeller);
    expect(stegTabeller(avrop).map((t) => t.id)).toEqual(["beslutLista", "atgarder"]);
    expect(stegTabeller(STEG.find((x) => x.tabell))).toHaveLength(1);
  });
});
