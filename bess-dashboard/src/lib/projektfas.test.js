import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { STEG } from "../data/projektstartSteg.js";
import { FASER, FAS_ANTAL, arFasNr, fasFranStatus } from "../data/projektfaser.ts";
import { RISKKATEGORI_ID, arRiskKategori } from "../data/riskTyper.ts";
import { PROJEKTSTATUS, RISKKATEGORI } from "../data/konstanter.js";
import { efterInlasning } from "../state/portfolj-reducer.js";
import { aktuellFas, alltGodkant, fasKrav, fasLage, godkandaFaser, pdfSparr, stegIFas, stegLast } from "./projektfas.js";
import { projektFranUtkast, projektstartDokument, tomtUtkast, utkastFranPost, utkastFranProjekt, kortAndringar } from "./projektstart.js";
import { stegPunkter } from "./stegpunkter.js";

/** Fyller i allt obligatoriskt i en fas: fält, tabellrader och kritiska kontrollpunkter. */
function godkannFas(u, nr, { bara = ["falt", "tabeller", "punkter"] } = {}) {
  for (const s of stegIFas(nr)) {
    if (bara.includes("falt")) {
      for (const f of s.falt || []) {
        if (!f.obligatoriskt) continue;
        u.v[f.id] = f.kravVarde ?? (f.typ === "select" ? (Array.isArray(f.alternativ[0]) ? f.alternativ[0][0] : f.alternativ[0]) : "Ifyllt");
      }
    }
    if (bara.includes("tabeller") && s.tabell?.obligatorisk) {
      const rad = { id: `rad-${s.tabell.id}` };
      for (const k of s.tabell.kolumner) rad[k.id] = k.typ === "date" ? "2028-01-01" : k.typ === "select" ? (Array.isArray(k.alternativ[0]) ? k.alternativ[0][0] || k.alternativ[1][0] : k.alternativ[0]) : "Ifyllt";
      u.rader[s.tabell.id] = [rad];
    }
    if (bara.includes("punkter")) {
      for (const p of stegPunkter(s).filter((x) => x.kritisk)) u.kryss[p.bucket] = { ...u.kryss[p.bucket], [p.id]: true };
    }
  }
  return u;
}

describe("Faserna som data", () => {
  it("är sex, i ordning, och varje status finns i PROJEKTSTATUS", () => {
    expect(FAS_ANTAL).toBe(6);
    expect(FASER.map((f) => f.nr)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const f of FASER) expect(PROJEKTSTATUS).toContain(f.status);
    expect(FASER.map((f) => f.kort)).toEqual(["Anbud", "Planering", "Etablering", "Genomförande", "Avslut", "Garanti"]);
  });
  it("ger varje guidesida en fas utom den sista, och varje fas minst en sida", () => {
    for (const s of STEG.slice(0, -1)) expect(arFasNr(s.fas)).toBe(true);
    expect(STEG.at(-1).fas).toBeNull();
    for (const f of FASER) expect(stegIFas(f.nr).length).toBeGreaterThan(0);
  });
  it("utgår från statusen för projekt som redan är igång", () => {
    expect(["Anbud", "Planering", "Produktion", "Slutbesiktning", "Avslutat", "okänd"].map(fasFranStatus)).toEqual([1, 2, 4, 5, 6, 1]);
  });
  it("delar kontrollpunkterna i avslutskatalogen mellan fas 5 och fas 6 utan att tappa eller dubblera någon", () => {
    const fas5 = stegPunkter(STEG.find((s) => s.id === "avslut")).map((p) => p.id);
    const fas6 = stegPunkter(STEG.find((s) => s.id === "garanti")).map((p) => p.id);
    expect(fas6.length).toBeGreaterThan(0);
    expect(fas5.filter((id) => fas6.includes(id))).toEqual([]);
    expect(fas5.length + fas6.length).toBe(stegPunkter({ katalog: ["closeout"] }).length);
  });
});

describe("Riskmodellen", () => {
  it("behåller de ursprungliga kategorierna och har KMA, ekonomi och tid", () => {
    const ids = RISKKATEGORI.map(([id]) => id);
    expect(ids.slice(0, 5)).toEqual(["teknik", "mark", "leverans", "kontrakt", "hseq"]);
    for (const id of ["kma", "ekonomi", "tid", "kontrakt"]) expect(ids).toContain(id);
    expect(RISKKATEGORI_ID.size).toBe(ids.length);
    expect(arRiskKategori("kma")).toBe(true);
    expect(arRiskKategori("påhitt")).toBe(false);
  });
  it("ger äldre risker och projekt en fas vid inläsning och rör inte befintliga", () => {
    const state = structuredClone(SEED);
    const andrad = state.risker.at(-1);
    state.risker[state.risker.length - 1] = { ...andrad, fas: 3 };
    const ut = efterInlasning(state);
    expect(ut.projekt.every((p) => arFasNr(p.fas))).toBe(true);
    expect(ut.risker.every((r) => arFasNr(r.fas))).toBe(true);
    expect(ut.risker.at(-1).fas).toBe(3);
    // En risk för ett enskilt projekt får projektets fas, en för flera hamnar i genomförandet.
    const enskild = ut.risker.find((r) => r.id !== andrad.id && ut.projekt.some((p) => p.id === r.projektId));
    expect(enskild.fas).toBe(ut.projekt.find((p) => p.id === enskild.projektId).fas);
    const gemensam = ut.risker.find((r) => r.id !== andrad.id && !ut.projekt.some((p) => p.id === r.projektId));
    if (gemensam) expect(gemensam.fas).toBe(4);
    expect(efterInlasning(ut).risker).toEqual(ut.risker);
  });
  it("för risker från guiden över med fas och kategori, och faller tillbaka på aktuell fas", () => {
    const u = godkannFas(tomtUtkast(), 1);
    u.rader.risker = [
      { id: "a", titel: "Sen leverans", fas: "4", kategori: "tid", sannolikhet: "4", konsekvens: "5", agare: "PL", atgard: "Plan" },
      { id: "b", titel: "Utan val", fas: "", kategori: "", sannolikhet: "3", konsekvens: "3", agare: "", atgard: "" },
      { id: "c", titel: "Fel kategori", fas: "9", kategori: "påhitt", sannolikhet: "3", konsekvens: "3", agare: "", atgard: "" },
    ];
    const { risker } = projektFranUtkast(u, "p");
    expect(risker[0]).toMatchObject({ fas: 4, kategori: "tid", atgard: "Plan" });
    expect(risker[1].fas).toBe(aktuellFas(u));
    expect(risker[1]).not.toHaveProperty("kategori");
    expect(risker[2].fas).toBe(aktuellFas(u));
    expect(risker[2]).not.toHaveProperty("kategori");
  });
});

describe("Progressiv upplåsning", () => {
  it("startar i fas 1 med fas 2–6 låsta", () => {
    const u = tomtUtkast();
    expect(aktuellFas(u)).toBe(1);
    expect(godkandaFaser(u)).toBe(0);
    for (const s of STEG.slice(0, -1)) expect(stegLast(u, s)).toBe(s.fas > 1);
    expect(stegLast(u, STEG.at(-1))).toBe(false);
    expect(fasLage(u).map((f) => f.status)).toEqual(["aktuell", "last", "last", "last", "last", "last"]);
  });
  it("kräver obligatoriska fält, ett avropsbeslut om att gå vidare och alla kritiska punkter", () => {
    const u = tomtUtkast();
    const krav = fasKrav(u, 1);
    expect(krav.klar).toBe(false);
    expect(krav.falt.map((f) => f.id)).toEqual(expect.arrayContaining(["namn", "bestallare", "niva", "beslut", "mal", "offra"]));
    expect(krav.punkter.length).toBeGreaterThan(0);
    expect(krav.punkter.every((p) => p.kritisk)).toBe(true);
    godkannFas(u, 1);
    expect(fasKrav(u, 1).klar).toBe(true);
    u.v.beslut = "Skjut upp";
    expect(fasKrav(u, 1).falt.map((f) => f.id)).toEqual(["beslut"]);
    u.v.beslut = "Gå vidare";
    expect(fasKrav(u, 1).klar).toBe(true);
  });
  it("låser upp nästa fas först när allt i den förra är godkänt", () => {
    const u = godkannFas(tomtUtkast(), 1);
    expect(aktuellFas(u)).toBe(2);
    expect(stegLast(u, STEG.find((s) => s.id === "risker"))).toBe(false);
    expect(stegLast(u, STEG.find((s) => s.id === "hseq"))).toBe(true);
    // Bara fälten räcker inte, kritiska kontrollpunkter måste vara bockade.
    const bara = godkannFas(tomtUtkast(), 1, { bara: ["falt"] });
    expect(aktuellFas(bara)).toBe(1);
    // Att avbocka en punkt i fas 1 låser fas 2 igen.
    const p = stegPunkter(STEG.find((s) => s.id === "avrop")).find((x) => x.kritisk);
    u.kryss[p.bucket][p.id] = false;
    expect(aktuellFas(u)).toBe(1);
  });
  it("kan inte hoppa över en fas: fas 3 hjälper inte om fas 2 saknas", () => {
    const u = godkannFas(godkannFas(tomtUtkast(), 1), 3);
    expect(aktuellFas(u)).toBe(2);
    expect(fasLage(u).find((f) => f.nr === 3).status).toBe("last");
  });
  it("går hela vägen till fas 6 och markerar då alla som godkända", () => {
    const u = tomtUtkast();
    for (let nr = 1; nr <= 5; nr++) godkannFas(u, nr);
    expect(aktuellFas(u)).toBe(6);
    expect(alltGodkant(u)).toBe(false);
    godkannFas(u, 6);
    expect(aktuellFas(u)).toBe(6);
    expect(alltGodkant(u)).toBe(true);
    expect(fasLage(u).every((f) => f.status === "klar")).toBe(true);
  });
  it("låter ett projekt som redan är igång börja i sin fas, och för status vidare först när fasen ändras", () => {
    const u = utkastFranProjekt({ id: "x", namn: "Växjö", nr: "36037", status: "Produktion" }, SEED);
    expect(u.fasGolv).toBe(4);
    expect(aktuellFas(u)).toBe(4);
    expect(stegLast(u, STEG.find((s) => s.id === "avslut"))).toBe(true);
    expect(kortAndringar(u, { namn: "Växjö", nr: "36037", status: "Produktion", fas: 4 })).toEqual([]);
    const gammal = utkastFranPost({ utkast: { v: { namn: "A" }, rader: {}, kryss: {} } }, { status: "Slutbesiktning" });
    expect(aktuellFas(gammal)).toBe(5);
  });
});

describe("PDF för ledningen följer fasen", () => {
  it("är ackumulerande: bara sidor och risker för upplåsta faser", () => {
    const u = godkannFas(tomtUtkast(), 1);
    u.rader.risker = [
      { id: "a", titel: "Tidig risk", fas: "2", kategori: "kma", sannolikhet: "2", konsekvens: "2", agare: "", atgard: "" },
      { id: "b", titel: "Sen risk", fas: "4", kategori: "tid", sannolikhet: "5", konsekvens: "5", agare: "", atgard: "" },
    ];
    const d = projektstartDokument(u, { datum: "2026-10-09" });
    const ps = d.projektstart;
    expect(ps.fas).toMatchObject({ nr: 2, antal: 6, kort: "Planering", status: "Planering" });
    expect(ps.lage.skede).toBe("Planering");
    expect(new Set(ps.sektioner.map((x) => x.fasNr))).toEqual(new Set([1, 2]));
    expect(ps.sektioner.some((x) => x.id === "hseq")).toBe(false);
    const risker = ps.sektioner.find((x) => x.id === "risker").tabell;
    expect(risker.kolumner).toContain("Åtgärdsplan");
    expect(risker.kolumner.at(-1)).toBe("Värde");
    expect(risker.rader).toHaveLength(1);
    expect(risker.rader[0]).toContain("Tidig risk");
    expect(risker.rader[0]).toContain("KMA");
    expect(risker.rader[0].at(-1)).toBe("4");
    expect(ps.fas.faser.map((f) => f.status)).toEqual(["klar", "aktuell", "last", "last", "last", "last"]);
  });
  it("växer med projektet: fas 4 ger sidor för fas 1–4 och med fas 6 alla", () => {
    const u = tomtUtkast();
    for (let nr = 1; nr <= 3; nr++) godkannFas(u, nr);
    expect(Math.max(...projektstartDokument(u, { datum: "x" }).projektstart.sektioner.map((x) => x.fasNr))).toBe(4);
    for (let nr = 4; nr <= 5; nr++) godkannFas(u, nr);
    expect(projektstartDokument(u, { datum: "x" }).projektstart.sektioner).toHaveLength(STEG.length - 1);
  });
  it("spärras tills obligatoriska fält i den aktuella fasen är ifyllda, men inte av kontrollpunkterna", () => {
    const u = tomtUtkast();
    expect(pdfSparr(u).map((x) => x.id)).toEqual(expect.arrayContaining(["namn", "beslut", "mal"]));
    godkannFas(u, 1, { bara: ["falt"] });
    expect(pdfSparr(u)).toEqual([]);
    u.v.mal = "  ";
    expect(pdfSparr(u).map((x) => x.id)).toEqual(["mal"]);
    // När fas 1 godkänns blir fas 2 aktuell och dess obligatoriska fält spärrar.
    godkannFas(u, 1);
    const sparr = pdfSparr(u);
    expect(aktuellFas(u)).toBe(2);
    expect(sparr.map((x) => x.id)).toEqual(expect.arrayContaining(["roll_pl", "betalvillkor", "bankgaranti", "kritiskLinje", "natagare", "risker", "milstolpar"]));
    expect(sparr.find((x) => x.id === "risker").etikett).toMatch(/minst en ifylld rad/);
    godkannFas(u, 2, { bara: ["falt", "tabeller"] });
    expect(pdfSparr(u)).toEqual([]);
  });
});
