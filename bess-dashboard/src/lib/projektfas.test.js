import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { STEG } from "../data/projektstartSteg.js";
import { FASER, FAS_ANTAL, arFasNr, faseFranGammal, fasFranStatus, riskFasFranGammal } from "../data/projektfaser.ts";
import { RISKKATEGORI_ID, arRiskKategori } from "../data/riskTyper.ts";
import { PROJEKTSTATUS, RISKKATEGORI } from "../data/konstanter.js";
import { efterInlasning } from "../state/portfolj-reducer.js";
import { aktuellFas, alltGodkant, fasKrav, fasLage, godkandaFaser, pdfArUtkast, pdfKvar, rapportFas, stegIFas, stegLast } from "./projektfas.js";
import { lasUtkast, projektFranUtkast, projektstartDokument, projektstartPost, tomtUtkast, utkastAndrat, utkastFranPost, utkastFranProjekt, kortAndringar } from "./projektstart.js";
import { stegPunkter } from "./stegpunkter.js";

/** Fyller i allt obligatoriskt i en fas: fält, tabellrader och kritiska kontrollpunkter. */
function godkannFas(u, nr, { bara = ["falt", "tabeller", "punkter"] } = {}) {
  if (nr === 1 && bara.includes("falt")) u.v.anbudsutfall = "Vunnet anbud";
  for (const s of stegIFas(nr)) {
    if (bara.includes("falt")) {
      for (const f of s.falt || []) {
        if (!f.obligatoriskt) continue;
        u.v[f.id] = f.kravVarde ?? (f.typ === "select" ? (Array.isArray(f.alternativ[0]) ? f.alternativ[0][0] : f.alternativ[0]) : "Ifyllt");
      }
      // Projektdirektivets regel: kostnad, kvalitet och tid ska summera till 100 %.
      if (s.regler?.some((r) => r.id === "styrparametrar100")) Object.assign(u.v, { prioritetKostnad: "60", prioritetKvalitet: "10", prioritetTid: "30" });
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
  it("är åtta, i ordning, och varje status finns i PROJEKTSTATUS", () => {
    expect(FAS_ANTAL).toBe(8);
    expect(FASER.map((f) => f.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Statusarna följer faserna: 1–2 planering och uppstart, 3–6 produktion, 7 slutbesiktning, 8 avslutat.
    expect(FASER.map((f) => f.status)).toEqual(["PLANERING_OCH_UPPSTART", "PLANERING_OCH_UPPSTART", "PRODUKTION", "PRODUKTION", "PRODUKTION", "PRODUKTION", "SLUTBESIKTNING", "AVSLUTAT_OCH_GARANTI"]);
    for (const f of FASER) expect(PROJEKTSTATUS.map(([id]) => id)).toContain(f.status);
    expect(FASER.map((f) => f.kort)).toEqual(["Anbud", "Planering", "Etablering", "Mark och betong", "Montage", "Provning", "Slutbesiktning", "Avslut och garanti"]);
  });
  it("ger varje guidesida en fas utom den sista, och varje fas minst en sida", () => {
    for (const s of STEG.slice(0, -1)) expect(arFasNr(s.fas)).toBe(true);
    expect(STEG.at(-1).fas).toBeNull();
    for (const f of FASER) expect(stegIFas(f.nr).length).toBeGreaterThan(0);
  });
  it("utgår från statusen för projekt som redan är igång", () => {
    expect(["Anbud", "Uppstart", "Planering", "Produktion", "Slutbesiktning", "Avslutat", "PLANERING_OCH_UPPSTART", "PRODUKTION", "okänd"].map(fasFranStatus)).toEqual([1, 2, 2, 4, 7, 8, 1, 4, 1]);
    // Fyra aktiva statusar; fas 1–2 hör till Planering och uppstart.
    expect(PROJEKTSTATUS.map(([id]) => id)).toEqual(["PLANERING_OCH_UPPSTART", "PRODUKTION", "SLUTBESIKTNING", "AVSLUTAT_OCH_GARANTI"]);
    expect(FASER[1].status).toBe("PLANERING_OCH_UPPSTART");
  });
  it("delar kontrollpunkterna i avslutskatalogen mellan sidorna i fas 7 och 8 utan att tappa eller dubblera någon", () => {
    const sidor = ["avslut", "ekonomi", "garanti"].map((id) => stegPunkter(STEG.find((s) => s.id === id)).map((p) => p.id));
    for (const s of sidor) expect(s.length).toBeGreaterThan(0);
    const alla = sidor.flat();
    expect(new Set(alla).size).toBe(alla.length);
    expect(alla.length).toBe(stegPunkter({ katalog: ["closeout"] }).length);
  });
  it("har 19 sidor över åtta faser: mark och betong, montage och ekonomiskt avslut är egna sidor", () => {
    expect(STEG).toHaveLength(19);
    expect(STEG.map((s) => [s.id, s.fas])).toEqual([
      ["projekt", 1], ["avrop", 1], ["anbudsfragor", 1], ["kontrakt", 1], ["direktiv", 1], ["intressenter", 1],
      ["organisation", 2], ["risker", 2], ["tidplan", 2], ["losning", 2], ["tillstand", 2],
      ["hseq", 3], ["cbop", 4], ["ebop", 5], ["provning", 6], ["avslut", 7], ["ekonomi", 8], ["garanti", 8], ["sammanfattning", null],
    ]);
  });
  it("räknar om sexfasmodellen en gång: 5 → 7, 6 → 8 och genomförande delas på kategori Mark", () => {
    expect([1, 2, 3, 4, 5, 6].map(faseFranGammal)).toEqual([1, 2, 3, 4, 7, 8]);
    expect(riskFasFranGammal(4, "mark")).toBe(4);
    expect(riskFasFranGammal(4, "tid")).toBe(5);
    expect(riskFasFranGammal(4)).toBe(5);
    expect(riskFasFranGammal(5, "hseq")).toBe(7);
    expect(riskFasFranGammal(6)).toBe(8);
    expect(riskFasFranGammal(9)).toBeNull();
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
  it("startar i fas 1 med fas 2–8 låsta", () => {
    const u = tomtUtkast();
    expect(aktuellFas(u)).toBe(1);
    expect(godkandaFaser(u)).toBe(0);
    for (const s of STEG.slice(0, -1)) expect(stegLast(u, s)).toBe(s.fas > 1);
    expect(stegLast(u, STEG.at(-1))).toBe(false);
    expect(fasLage(u).map((f) => f.status)).toEqual(["aktuell", "last", "last", "last", "last", "last", "last", "last"]);
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
  it("går hela vägen till fas 8 och markerar då alla som godkända", () => {
    const u = tomtUtkast();
    for (let nr = 1; nr <= 7; nr++) godkannFas(u, nr);
    expect(aktuellFas(u)).toBe(8);
    expect(alltGodkant(u)).toBe(false);
    godkannFas(u, 8);
    expect(aktuellFas(u)).toBe(8);
    expect(alltGodkant(u)).toBe(true);
    expect(fasLage(u).every((f) => f.status === "klar")).toBe(true);
  });
  it("låter ett projekt som redan är igång börja i sin fas, och för status vidare först när fasen ändras", () => {
    const u = utkastFranProjekt({ id: "x", namn: "Växjö", nr: "36037", status: "PRODUKTION" }, SEED);
    expect(u.fasGolv).toBe(4);
    expect(aktuellFas(u)).toBe(4);
    expect(stegLast(u, STEG.find((s) => s.id === "ebop"))).toBe(true);
    expect(kortAndringar(u, { namn: "Växjö", nr: "36037", status: "PRODUKTION", fas: 4 })).toEqual([]);
    const gammal = utkastFranPost({ utkast: { v: { namn: "A" }, rader: {}, kryss: {} } }, { status: "Slutbesiktning" });
    expect(aktuellFas(gammal)).toBe(7);
  });
});

describe("PDF för ledningen följer de upplåsta faserna", () => {
  it.each(["", "Inför anbudsinlämning", "Genomförande"])("är ackumulerande och skiljer metodfas från valt rapporteringsskede (%s)", (skede) => {
    const u = godkannFas(godkannFas(tomtUtkast(), 1), 2);
    u.v.rapporteringsskede = skede;
    u.rader.risker = [
      { id: "a", titel: "Tidig risk", fas: "2", kategori: "kma", sannolikhet: "2", konsekvens: "2", agare: "PL", atgard: "" },
      { id: "b", titel: "Sen risk", fas: "4", kategori: "tid", sannolikhet: "5", konsekvens: "5", agare: "PL", atgard: "" },
    ];
    const d = projektstartDokument(u, { datum: "2026-10-09" });
    const ps = d.projektstart;
    // Fas 1 och 2 är godkända och fas 3 är aktuell (upplåst, inte godkänd): de tre ingår, fas 4 och uppåt inte.
    expect(ps.fas).toMatchObject({ nr: 3, omfattar: 3, utkast: true, antal: 8, kort: "Etablering", status: "Produktion", statusId: "PRODUKTION" });
    expect(ps.lage.skede).toBe(skede || "Etablering");
    expect(new Set(ps.sektioner.map((x) => x.fasNr))).toEqual(new Set([1, 2, 3]));
    expect(ps.sektioner.some((x) => x.id === "hseq")).toBe(true);
    expect(ps.sektioner.some((x) => x.id === "cbop")).toBe(false);
    const risker = ps.sektioner.find((x) => x.id === "risker").tabell;
    expect(risker.kolumner).toContain("Åtgärdsplan");
    expect(risker.kolumner.at(-1)).toBe("Värde");
    expect(risker.rader).toHaveLength(1);
    expect(risker.rader[0]).toContain("Tidig risk");
    expect(risker.rader[0]).toContain("KMA");
    expect(risker.rader[0].at(-1)).toBe("4");
    expect(ps.fas.faser.map((f) => f.status)).toEqual(["klar", "klar", "aktuell", "last", "last", "last", "last", "last"]);
  });
  it("växer med projektet: rapporten omfattar de upplåsta faserna, alla åtta ger alla sidor", () => {
    const u = tomtUtkast();
    for (let nr = 1; nr <= 3; nr++) godkannFas(u, nr);
    // Fas 1–3 godkända ⇒ fas 4 är upplåst och ingår, fas 5 och uppåt inte.
    expect(Math.max(...projektstartDokument(u, { datum: "x" }).projektstart.sektioner.map((x) => x.fasNr))).toBe(4);
    for (let nr = 4; nr <= 8; nr++) godkannFas(u, nr);
    expect(projektstartDokument(u, { datum: "x" }).projektstart.sektioner).toHaveLength(STEG.length - 1);
  });
  it("omfattar faserna före golvet och aktuell fas för ett projekt som redan är igång", () => {
    const u = utkastFranProjekt({ id: "x", namn: "Växjö", nr: "36037", status: "PRODUKTION" }, SEED);
    expect(rapportFas(u)).toBe(aktuellFas(u));
    expect(rapportFas(u)).toBeGreaterThan(1);
    expect(Math.max(...projektstartDokument(u, { datum: "x" }).projektstart.sektioner.map((x) => x.fasNr))).toBe(rapportFas(u));
  });
  it("spärras aldrig: ett nytt utkast ger en PDF med fas 1, märkt utkast, och listar vad som återstår", () => {
    const u = tomtUtkast();
    expect(rapportFas(u)).toBe(1);
    const kvar = pdfKvar(u);
    expect(kvar.map((x) => x.id)).toEqual(expect.arrayContaining(["namn", "beslut", "mal"]));
    expect(kvar.some((x) => /kritiska kontrollpunkter/.test(x.etikett))).toBe(true);
    expect(pdfArUtkast(u)).toBe(true);
    const d = projektstartDokument(u, { datum: "x" }).projektstart;
    expect(d.fas).toMatchObject({ utkast: true, omfattar: 1 });
    expect(d.fas.kvar).toBe(kvar.length);
    expect(d.sektioner.every((x) => x.fasNr === 1)).toBe(true);
    // Bara fälten räcker inte. Fas 1 ska vara godkänd, kontrollpunkterna med.
    godkannFas(u, 1, { bara: ["falt", "tabeller"] });
    expect(pdfKvar(u).length).toBeGreaterThan(0);
    expect(pdfKvar(u).every((x) => /kritisk/.test(x.etikett))).toBe(true);
    godkannFas(u, 1);
    expect(pdfArUtkast(godkannFas(u, 1))).toBe(true); // fas 2 är nu aktuell och inte godkänd
  });
  it("fas 2 ingår i PDF:en så fort den är upplåst, märkt utkast, och en helt godkänd fas ger ingen utkastmärkning", () => {
    const u = godkannFas(tomtUtkast(), 1);
    expect(aktuellFas(u)).toBe(2);
    expect(rapportFas(u)).toBe(2);
    expect(fasKrav(u, 2).falt.length).toBeGreaterThan(0);
    const d = projektstartDokument(u, { datum: "x" }).projektstart;
    expect(Math.max(...d.sektioner.map((x) => x.fasNr))).toBe(2);
    expect(d.fas.utkast).toBe(true);
    // Allt godkänt: inget utkast.
    for (let nr = 2; nr <= 8; nr++) godkannFas(u, nr);
    expect(pdfArUtkast(u)).toBe(false);
    expect(projektstartDokument(u, { datum: "x" }).projektstart.fas.utkast).toBe(false);
  });
  it("blir utkast igen om en kritisk punkt i fas 1 avbockas", () => {
    const u = godkannFas(tomtUtkast(), 1);
    const p = stegPunkter(STEG.find((s) => s.id === "avrop")).find((x) => x.kritisk);
    u.kryss[p.bucket][p.id] = false;
    expect(aktuellFas(u)).toBe(1);
    expect(pdfKvar(u).length).toBeGreaterThan(0);
  });
  it("organisation och uppstart är inte ett krav för att godkänna fas 1 (anbudet), men för fas 2", () => {
    const u = godkannFas(tomtUtkast(), 1);
    expect(fasKrav(u, 1).klar).toBe(true);
    expect(fasKrav(u, 2).falt.map((f) => f.id)).toContain("roll_pl");
    expect(fasKrav(godkannFas(structuredClone(u), 2), 2).klar).toBe(true);
  });
});

describe("Metodens delar i guiden", () => {
  it("kräver att projektdirektivet är signerat av projektledare och intern beställare för att godkänna fas 1", () => {
    const u = godkannFas(tomtUtkast(), 1);
    expect(fasKrav(u, 1).klar).toBe(true);
    for (const id of ["signPL", "signBestallare", "signDatum"]) {
      const kopia = structuredClone(u);
      kopia.v[id] = "";
      expect(fasKrav(kopia, 1).falt.map((f) => f.id)).toEqual([id]);
      expect(aktuellFas(kopia)).toBe(1);
    }
  });
  it("har uppstartsavstämningen som kontrollpunkter i organisationssteget, med genomförd avstämning som kritisk", () => {
    const org = STEG.find((s) => s.id === "organisation");
    const punkter = stegPunkter(org).filter((p) => p.bucket === "kickoff");
    expect(punkter.length).toBeGreaterThanOrEqual(8);
    expect(punkter.find((p) => p.id === "kickoffHeld").kritisk).toBe(true);
    // Uppstarten hör till fas 2: fas 1 (anbudet) godkänns utan den, men fas 2 gör det inte.
    expect(org.fas).toBe(2);
    const u = godkannFas(tomtUtkast(), 1);
    expect(aktuellFas(u)).toBe(2);
    const klar = godkannFas(godkannFas(tomtUtkast(), 1), 2);
    expect(aktuellFas(klar)).toBe(3);
    klar.kryss.kickoff.kickoffHeld = false;
    expect(aktuellFas(klar)).toBe(2);
  });
  it("har en interface-lista med de fem gränssnitten i metoden som startrader", () => {
    const t = STEG.find((s) => s.id === "losning").tabell;
    expect(t.id).toBe("interface");
    expect(t.start.map((r) => r.granssnitt)).toEqual(["Mark/betong ↔ el", "Leverantör ↔ site", "El/MV ↔ nätägare", "Kommunikation", "Brand ↔ drift"]);
    const u = godkannFas(godkannFas(tomtUtkast(), 1), 2);
    const d = projektstartDokument(u, { datum: "x" });
    expect(d.projektstart.sektioner.find((x) => x.id === "losning").tabell.rader).toHaveLength(5);
  });
  it("har kick-out och slutrapport som fält i ekonomiskt avslut", () => {
    const ids = STEG.find((s) => s.id === "ekonomi").falt.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["kickoutDatum", "kickoutBra", "kickoutKostade", "kickoutAldrigIgen", "kickoutOverraskade", "slutrapportResultat", "lardomar"]));
  });
  it("sparar projektledarens trafikljus per fas och släpper bara in giltiga värden", () => {
    const u = tomtUtkast();
    u.trafikljus = { 1: { ljus: "gron", kommentar: "Enligt plan" }, 2: { ljus: "rod", kommentar: "x".repeat(400) }, 3: { ljus: "lila", kommentar: "" }, 9: { ljus: "gul", kommentar: "" } };
    const post = projektstartPost("p", u);
    const igen = utkastFranPost(JSON.parse(JSON.stringify(post)));
    expect(Object.keys(igen.trafikljus)).toEqual(["1", "2"]);
    expect(igen.trafikljus[1]).toEqual({ ljus: "gron", kommentar: "Enligt plan" });
    expect(igen.trafikljus[2].kommentar).toHaveLength(300);
    expect(utkastAndrat(igen, tomtUtkast())).toBe(true);
  });
  it("tar med trafikljuset i rapportens fasrad", () => {
    const u = godkannFas(tomtUtkast(), 1);
    u.trafikljus = { 1: { ljus: "gron", kommentar: "" }, 2: { ljus: "rod", kommentar: "Behöver beslut om leverantör" } };
    const faser = projektstartDokument(u, { datum: "x" }).projektstart.fas.faser;
    expect(faser[0]).toMatchObject({ ljus: "gron", kommentar: "" });
    expect(faser[1]).toMatchObject({ ljus: "rod", kommentar: "Behöver beslut om leverantör" });
    expect(faser[2].ljus).toBe("");
  });
});

describe("Omräkning från sexfasmodellen", () => {
  it("räknar om lagrade projekt och risker en gång och är sedan idempotent", () => {
    const state = structuredClone(SEED);
    state.projekt = [
      { ...state.projekt[2], id: "a", fas: 5, status: "SLUTBESIKTNING" },
      { ...state.projekt[2], id: "b", fas: 6, status: "AVSLUTAT_OCH_GARANTI" },
      { ...state.projekt[2], id: "c", fas: 3, status: "PRODUKTION" },
    ];
    state.risker = [
      { id: "ra", projektId: "a", titel: "x", fas: 5 },
      { id: "rb", projektId: "b", titel: "x", fas: 6 },
      { id: "rc1", projektId: "c", titel: "x", fas: 4, kategori: "mark" },
      { id: "rc2", projektId: "c", titel: "x", fas: 4, kategori: "tid" },
      { id: "rg", projektId: "flera", titel: "x", fas: 6 },
    ];
    const ut = efterInlasning(state);
    expect(ut.projekt.map((p) => p.fas)).toEqual([7, 8, 3]);
    expect(ut.risker.map((r) => r.fas)).toEqual([7, 8, 4, 5, 8]);
    const igen = efterInlasning(ut);
    expect(igen.projekt.map((p) => p.fas)).toEqual([7, 8, 3]);
    expect(igen.risker.map((r) => r.fas)).toEqual([7, 8, 4, 5, 8]);
    // En risk som läggs till efteråt i ett omräknat projekt rörs inte.
    const ny = efterInlasning({ ...ut, risker: [...ut.risker, { id: "ny", projektId: "a", titel: "y", fas: 5 }] });
    expect(ny.risker.at(-1).fas).toBe(5);
  });
  it("ger Växjö och Alvesta fas ur EPC-checklistan, med fas 1–8 som resultat", () => {
    const ut = efterInlasning(structuredClone(SEED));
    for (const id of ["36037", "36038"]) expect(arFasNr(ut.projekt.find((p) => p.id === id).fas)).toBe(true);
  });
  it("räknar om ett sparat utkast: golv, trafikljus, risker och besökta sidor", () => {
    const u = lasUtkast({
      v: {},
      rader: { risker: [{ id: "1", titel: "A", fas: "4", kategori: "mark" }, { id: "2", titel: "B", fas: "4", kategori: "tid" }, { id: "3", titel: "C", fas: "5", kategori: "" }] },
      kryss: {},
      fasGolv: 5,
      trafikljus: { 2: { ljus: "gul", kommentar: "" }, 6: { ljus: "gron", kommentar: "ok" } },
      besokta: ["projekt", "produktion", "avslut"],
    });
    expect(u.fasGolv).toBe(7);
    expect(u.rader.risker.map((r) => r.fas)).toEqual(["4", "5", "7"]);
    expect(Object.keys(u.trafikljus).sort()).toEqual(["2", "8"]);
    expect(u.besokta).toEqual(["projekt", "cbop", "ebop", "avslut", "ekonomi"]);
    // Redan omräknat utkast (fm) lämnas orört.
    const igen = lasUtkast(JSON.parse(JSON.stringify(u)));
    expect(igen.fasGolv).toBe(7);
    expect(igen.rader.risker.map((r) => r.fas)).toEqual(["4", "5", "7"]);
    expect(igen.besokta).toEqual(u.besokta);
  });
});



describe("Anbudsgenomgång och vunnet anbud", () => {
  it.each(["Anbudsarbete pågår", "Anbud inlämnat", ""])("öppnar inte uppstarten vid %s även om anbudsunderlaget är komplett", (utfall) => {
    const u = godkannFas(tomtUtkast(), 1);
    u.v.anbudsutfall = utfall;
    expect(fasKrav(u, 1).klar).toBe(true);
    expect(aktuellFas(u)).toBe(1);
    expect(stegLast(u, STEG.find((x) => x.id === "organisation"))).toBe(true);
    expect(pdfArUtkast(u)).toBe(false);
    const d = projektstartDokument(u, { datum: "2026-10-15" });
    expect(d.projektstart.sektioner.every((x) => x.fasNr === 1)).toBe(true);
    expect(d.projektstart.direktiv.map((x) => x.titel)).toContain("HSEQ och arbetsmiljö");
    u.v.anbudsutfall = "Vunnet anbud";
    expect(aktuellFas(u)).toBe(2);
    expect(projektstartDokument(u, { datum: "2026-10-15" }).projektstart.sektioner.some((x) => x.id === "organisation")).toBe(true);
  });
  it("lägger kontroller för system och fakturering i uppstarten utan att tappa avbockningar", () => {
    const tidigt = stegPunkter(STEG.find((x) => x.id === "kontrakt"));
    const senare = stegPunkter(STEG.find((x) => x.id === "organisation"));
    expect(tidigt.some((p) => p.grupp === "System")).toBe(false);
    expect(senare.some((p) => p.grupp === "System")).toBe(true);
    const alla = [...tidigt, ...senare.filter((p) => p.bucket === "contract")];
    expect(new Set(alla.map((p) => p.id)).size).toBe(18);
  });
  it("fas 1 kräver entreprenadform, förfrågningsunderlag, anbudsutvärdering och anbudet som underlag", () => {
    const avrop = stegPunkter(STEG.find((x) => x.id === "avrop"));
    const kontrakt = stegPunkter(STEG.find((x) => x.id === "kontrakt"));
    const nya = [...avrop.filter((p) => p.grupp === "Anbud och upphandling"), ...kontrakt.filter((p) => p.id === "tenderBasis")];
    expect(nya.map((p) => p.id)).toEqual(["contractForm", "tenderDocs", "tenderReview", "tenderBasis"]);
    expect(nya.every((p) => p.kritisk)).toBe(true);
    const oppna = fasKrav(tomtUtkast(), 1).punkter.map((p) => p.id);
    expect(oppna).toEqual(expect.arrayContaining(["contractForm", "tenderDocs", "tenderReview", "tenderBasis"]));
  });
  it("bevarar anbudsutfall, planerade roller och gemensamma risker vid sparning", () => {
    const u = tomtUtkast();
    Object.assign(u.v, { anbudsutfall: "Anbud inlämnat", roll_pl: "Christoffer", anbudHseq: "Planerad BAS-U" });
    u.rader.risker = [{ id: "r1", titel: "Känd framtida risk", fas: "5", agare: "PL", atgard: "Bevaka" }];
    const p = projektstartPost("p1", u);
    const laddat = utkastFranPost(p);
    expect(laddat.v.anbudsutfall).toBe("Anbud inlämnat");
    const d = projektstartDokument(laddat, { datum: "2026-10-15" });
    expect(d.projektstart.direktiv[1].tabell.rader[0][0]).toBe("Känd framtida risk");
    expect(d.projektstart.direktiv[5].falt.some(([k, v]) => k === "Projektledare" && v === "Christoffer")).toBe(true);
  });
});
