import { crc32, deflateRawSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { excelDatum, kolIndex, lasXlsx } from "./xlsx.js";
import {
  filtyp,
  forslagBackup,
  forslagCsv,
  forslagProtokoll,
  forslagUrLogg,
  hittaProjekt,
  kanTillampas,
  lasCsv,
  listaForCsv,
  moteNrUrFilnamn,
  tillampaForslag,
  tolkaDatum,
  tolkaTal,
} from "./importera.js";
import { byggCsv } from "./export.js";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { medNyMaster, perProjekt } from "../state/protokoll-arkiv.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-24T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const last = () => efterInlasning(normalisera(structuredClone(SEED)));

/* ---------- En riktig .xlsx i minnet ---------- */

function zip(filer) {
  const lokala = [];
  const katalog = [];
  let pos = 0;
  for (const [namn, text] of Object.entries(filer)) {
    const namnB = Buffer.from(namn);
    const ra = Buffer.from(text);
    const data = deflateRawSync(ra);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc32(ra), 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(ra.length, 22);
    lh.writeUInt16LE(namnB.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc32(ra), 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(ra.length, 24);
    ch.writeUInt16LE(namnB.length, 28);
    ch.writeUInt32LE(pos, 42);
    lokala.push(lh, namnB, data);
    katalog.push(ch, namnB);
    pos += 30 + namnB.length + data.length;
  }
  const kat = Buffer.concat(katalog);
  const slut = Buffer.alloc(22);
  slut.writeUInt32LE(0x06054b50, 0);
  slut.writeUInt16LE(katalog.length / 2, 8);
  slut.writeUInt16LE(katalog.length / 2, 10);
  slut.writeUInt32LE(kat.length, 12);
  slut.writeUInt32LE(pos, 16);
  const b = Buffer.concat([...lokala, kat, slut]);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const xmlText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const KOL = "ABCDEFGHIJ";

/** Bygger en arbetsbok med ett blad. Text blir delade strängar, tal blir tal. */
function byggXlsx(rader, bladnamn = "Logg") {
  const strangar = [];
  const sIdx = (s) => {
    let i = strangar.indexOf(s);
    if (i < 0) i = strangar.push(s) - 1;
    return i;
  };
  const radXml = rader
    .map((rad, r) => {
      const celler = rad
        .map((v, c) => {
          if (v === "" || v === null || v === undefined) return "";
          const ref = `${KOL[c]}${r + 1}`;
          return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${sIdx(v)}</v></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${celler}</row>`;
    })
    .join("");
  return zip({
    "xl/workbook.xml": `<workbook xmlns:r="r"><sheets><sheet name="${bladnamn}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Type="ws" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/sharedStrings.xml": `<sst>${strangar.map((s) => `<si><t xml:space="preserve">${xmlText(s)}</t></si>`).join("")}</sst>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${radXml}</sheetData></worksheet>`,
  });
}

const RUBRIK = ["", "Nummer", "Rubrik", "Datum skapad", "Skapad av", "Öppen/Stängd", "Datum stängd", "Påverkan", "Kostnad", "Kommentar"];
const urLogg = (projekt, rader) => byggXlsx([["", "", "UR/ÄTA-logg"], [], ["", "", `Projekt: ${projekt}`], [], RUBRIK, ...rader]);

/* ---------- xlsx ---------- */

describe("lasXlsx", () => {
  it("läser blad, delade strängar och tal ur en riktig zip", async () => {
    const bok = await lasXlsx(byggXlsx([["Nummer", "Kostnad"], ["UR001", 25000], ["Å & Ö <test>", 1.5]]));
    expect(bok.blad[0].namn).toBe("Logg");
    expect(bok.blad[0].rader).toEqual([["Nummer", "Kostnad"], ["UR001", 25000], ["Å & Ö <test>", 1.5]]);
  });

  it("avvisar filer som inte är zip", async () => {
    await expect(lasXlsx(new TextEncoder().encode("inte excel").buffer)).rejects.toThrow(/Excel/);
  });

  it("räknar kolumnbokstäver och Excel-datum rätt", () => {
    expect(kolIndex("A1")).toBe(0);
    expect(kolIndex("AA7")).toBe(26);
    expect(excelDatum(46055)).toBe("2026-02-02");
    expect(excelDatum("")).toBe("");
  });
});

/* ---------- Tolkning ---------- */

describe("tolkning av värden", () => {
  it("läser tal skrivna som text", () => {
    expect(tolkaTal(" 6985")).toBe(6985);
    expect(tolkaTal("1 234,50 kr")).toBe(1234.5);
    expect(tolkaTal("")).toBeNull();
    expect(tolkaTal("okänt")).toBeNull();
  });

  it("läser datum som serienummer och som text med mellanslag", () => {
    expect(tolkaDatum(46276)).toBe("2026-09-11");
    expect(tolkaDatum(" 2026-06-17")).toBe("2026-06-17");
    expect(tolkaDatum("17/6 2026")).toBe("2026-06-17");
    expect(tolkaDatum(" ")).toBe("");
  });

  it("känner igen filtyper", () => {
    expect(filtyp("UR-logg Alvesta.xlsx")).toBe("xlsx");
    expect(filtyp("Byggmöte_9.PDF")).toBe("protokoll");
    expect(filtyp("x.docx")).toBe("protokoll");
    expect(filtyp("Projektportfolj_backup_2026-09-24.json")).toBe("json");
    expect(filtyp("bild.png")).toBeNull();
  });
});

describe("hittaProjekt", () => {
  it("hittar projekt på ort och AO-nr", () => {
    const s = last();
    expect(hittaProjekt(s, "Projekt: Växjö")).toBe("36037");
    expect(hittaProjekt(s, "UR-logg Alvesta.xlsx")).toBe("36038");
    expect(hittaProjekt(s, "Protokoll 36038")).toBe("36038");
  });

  it("räknar inte ord som delas av flera projekt", () => {
    const s = last();
    expect(hittaProjekt(s, "Växjö Batteripark")).toBe("36037");
    expect(hittaProjekt(s, "Batteripark")).toBeNull();
  });

  it("gissar inte när texten är tom eller okänd", () => {
    expect(hittaProjekt(last(), "")).toBeNull();
    expect(hittaProjekt(last(), "Kalmar")).toBeNull();
  });
});

/* ---------- UR-logg ---------- */

describe("forslagUrLogg", () => {
  it("lägger till nya, uppdaterar befintliga och hoppar över tomma mallrader", async () => {
    const s = last();
    const bok = await lasXlsx(
      urLogg("Växjö", [
        ["", "UR001", "Projektering - Extra pga bygglov", 46055, "Entreprenör", "Stängd", 46276, "Kostnad", 25000, "Fast pris"],
        ["", "UR099", "Ny post\nMed beskrivning", 46104, "Ingrid Capacity", "Öppen", "", "Tid", " 6 400", ""],
        ["", "UR100"],
        ["", "UR101"],
      ])
    );
    const f = forslagUrLogg(s, bok, { filnamn: "UR-logg_Växjö.xlsx" });

    expect(f.projektId).toBe("36037");
    expect(f.nya).toHaveLength(1);
    expect(f.nya[0]).toMatchObject({
      nr: "UR099",
      benamning: "Ny post",
      beskrivning: "Med beskrivning",
      handelseDatum: "2026-03-23",
      belopp: 6400,
      status: "oppen",
      klass: "oklar",
      projektId: "36037",
    });
    const ur001 = f.uppdateringar.find((u) => u.etikett.startsWith("UR001"));
    expect(ur001.efter).toMatchObject({ benamning: "Projektering - Extra pga bygglov", belopp: 25000, status: "stangd" });
    expect(kanTillampas(f)).toBe(true);
  });

  it("skriver aldrig över ett finare läge med Öppen, men stänger och återöppnar", async () => {
    const s = last();
    s.ur = s.ur.map((u) =>
      u.projektId === "36037" && u.nr === "UR002" ? { ...u, status: "godkand" } : u.projektId === "36037" && u.nr === "UR003" ? { ...u, status: "stangd" } : u
    );
    const bok = await lasXlsx(
      urLogg("Växjö", [
        ["", "UR002", "KM / bortforsling vegetationsmassor", "", "", "Öppen"],
        ["", "UR003", "Höjning terrass", "", "", "Öppen"],
      ])
    );
    const f = forslagUrLogg(s, bok, {});
    expect(f.uppdateringar.find((u) => u.etikett.startsWith("UR002"))).toBeUndefined();
    expect(f.uppdateringar.find((u) => u.etikett.startsWith("UR003")).efter.status).toBe("oppen");
  });

  it("tomma celler raderar inget och saknade poster rapporteras men lämnas", async () => {
    const s = last();
    const bok = await lasXlsx(urLogg("Växjö", [["", "UR001", "Projektering", " ", "", "", " ", " ", "", ""]]));
    const f = forslagUrLogg(s, bok, {});
    expect(f.uppdateringar).toEqual([]);
    expect(f.oforandrade).toBe(1);
    expect(f.info.join(" ")).toMatch(/finns i appen men inte i filen/);
  });

  it("varnar när ett nummer liknar ett befintligt men behåller det som det står", async () => {
    const s = last();
    const bok = await lasXlsx(urLogg("Alvesta", [["", "UR7", "Nivasensor_Oljetrag", 46126, "", "Stängd", 46276, "", " 6985", ""]]));
    const f = forslagUrLogg(s, bok, {});
    expect(f.nya[0].nr).toBe("UR7");
    expect(f.varningar.join(" ")).toMatch(/UR007 redan finns/);
  });

  it("kräver att projektet väljs när det inte går att avgöra", async () => {
    const bok = await lasXlsx(urLogg("Okänd ort", [["", "UR001", "X"]]));
    const f = forslagUrLogg(last(), bok, { filnamn: "logg.xlsx" });
    expect(f.projektId).toBeNull();
    expect(kanTillampas(f)).toBe(false);
    expect(forslagUrLogg(last(), bok, { projektId: "36037" }).projektId).toBe("36037");
  });

  it("säger ifrån när filen inte är en UR-logg", async () => {
    const f = forslagUrLogg(last(), await lasXlsx(byggXlsx([["Helt", "Annat"]])), {});
    expect(f.fel).toBe(true);
  });
});

/* ---------- CSV ---------- */

describe("CSV-rundtur", () => {
  it("läser citerade fält med semikolon, radbrytning och BOM", () => {
    expect(lasCsv('﻿a;b\n"x;y";"rad1\nrad2"\n"sa ""hej""";2')).toEqual([
      ["a", "b"],
      ["x;y", "rad1\nrad2"],
      ['sa "hej"', "2"],
    ]);
  });

  it("hittar tabellen ur exportens filnamn", () => {
    expect(listaForCsv("Portfolj_ÄTA_och_hinder_2026-09-24.csv")).toBe("ur");
    expect(listaForCsv("Portfolj_Öppna_punkter_2026-09-24.csv")).toBe("punkter");
    expect(listaForCsv("Portfolj_Handlingsplan_åtgärder_2026-09-24.csv")).toBe("hpAtgarder");
    expect(listaForCsv("okänd.csv")).toBeNull();
  });

  it("export → ändring i Excel → import ger bara ändringen, med rätt typer", () => {
    const s = last();
    const csv = byggCsv(s.risker).replace(/\r?\n/g, "\n");
    const [huvud, forsta, ...resten] = csv.split("\n");
    const kol = lasCsv(huvud)[0];
    const celler = lasCsv(forsta)[0];
    celler[kol.indexOf("sannolikhet")] = "5";
    const andrad = [huvud, celler.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(";"), ...resten].join("\n");

    const f = forslagCsv(s, andrad, { lista: "risker" });
    expect(f.uppdateringar).toHaveLength(1);
    expect(f.uppdateringar[0].efter).toEqual({ sannolikhet: 5 });
    expect(f.oforandrade).toBe(s.risker.length - 1);
  });

  it("vägrar skriva ändringsloggen och betalplanen", () => {
    expect(forslagCsv(last(), "id\n1", { lista: "andringslogg" }).fel).toBe(true);
    expect(forslagCsv(last(), "id\n1", { lista: "betalplan" }).fel).toBe(true);
  });

  it("rör inte nästlade fält", () => {
    const s = last();
    s.byggmoten = [{ id: "bm1", projektId: "36037", nr: "BM-01", punkter: [{ id: "p" }] }];
    const f = forslagCsv(s, "id;nr;punkter\nbm1;BM-01;[{'id':'x'}]", { lista: "byggmoten" });
    expect(f.uppdateringar).toEqual([]);
    expect(f.info.join(" ")).toMatch(/Nästlade fält/);
  });
});

/* ---------- Säkerhetskopia ---------- */

describe("säkerhetskopia", () => {
  const backup = (inne) => JSON.stringify({ _format: "one-nordic-projektportfolj", _version: 1, state: inne });

  it("ersätter arbetsdatan men behåller kontraktsvärde, betalplan och ändringslogg", () => {
    const s = last();
    s.andringslogg = [{ ts: "2026-09-24T08:00:00Z", text: "före", anvandare: "A", projektId: null }];
    const inne = structuredClone(s);
    inne.risker = inne.risker.slice(0, 1);
    inne.projekt = inne.projekt.map((p) => ({ ...p, kontraktsvarde: 1 }));
    inne.betalplan = [];

    const f = forslagBackup(s, backup(inne), { filnamn: "b.json" });
    expect(f.tabeller.find((t) => t.lista === "risker")).toEqual({ lista: "risker", nu: s.risker.length, efter: 1 });

    const ut = reducer(s, { type: "IMPORTERA", forslag: f });
    expect(ut.risker).toHaveLength(1);
    expect(ut.betalplan).toEqual(s.betalplan);
    expect(ut.projekt.find((p) => p.id === "36037").kontraktsvarde).toBe(s.projekt.find((p) => p.id === "36037").kontraktsvarde);
    expect(ut.andringslogg.map((p) => p.text)).toEqual(["Återställd från säkerhetskopia b.json", "före"]);
  });

  it("kör migreringarna på en gammal kopia", () => {
    const s = last();
    const gammal = structuredClone(SEED);
    delete gammal.handlingsplaner;
    delete gammal.slutdok;
    const ut = reducer(s, { type: "IMPORTERA", forslag: forslagBackup(s, backup(gammal), {}) });
    expect(ut.handlingsplaner).toHaveLength(ut.projekt.length);
    expect(ut.slutdok.length).toBeGreaterThan(0);
  });

  it("avvisar filer som inte är en portfölj", () => {
    expect(forslagBackup(last(), "{inte json", {}).fel).toBe(true);
    expect(forslagBackup(last(), JSON.stringify({ hej: 1 }), {}).fel).toBe(true);
  });
});

/* ---------- Protokoll ---------- */

describe("protokoll", () => {
  it("läser mötesnummer ur olika filnamn", () => {
    expect(moteNrUrFilnamn("Complete_with_Docusign_Byggmöte_9_-_Växjö_20.pdf")).toBe("BM-09");
    expect(moteNrUrFilnamn("Byggmöte 10 - Alvesta.pdf")).toBe("BM-10");
    expect(moteNrUrFilnamn("BM07 protokoll.docx")).toBe("BM-07");
    expect(moteNrUrFilnamn("Protokoll.pdf")).toBe("");
  });

  it("skapar mötet i Byggmöten första gången och kopplar filen andra gången", () => {
    const s = last();
    const f = forslagProtokoll(s, { filnamn: "Byggmöte_9_-_Växjö_20.pdf", datum: "2026-09-14" });
    expect(f.projektId).toBe("36037");
    expect(f.nya[0]).toMatchObject({ nr: "BM-09", datum: "2026-09-14", protokollFil: "Byggmöte_9_-_Växjö_20.pdf" });

    const efter = reducer(s, { type: "IMPORTERA", forslag: f });
    const igen = forslagProtokoll(efter, { filnamn: "Byggmöte_9_-_Växjö_rev2.pdf" });
    expect(igen.nya).toEqual([]);
    expect(igen.uppdateringar[0].efter).toEqual({ protokollFil: "Byggmöte_9_-_Växjö_rev2.pdf" });
  });
});

describe("MASTER-regeln", () => {
  const rad = (id, projektId, inlast) => ({ id, projektId, inlast, status: "master" });

  it("det nya protokollet blir MASTER och äldre för samma projekt arkiveras", () => {
    let alla = medNyMaster([], rad("a", "36037", "2026-09-01"));
    alla = medNyMaster(alla, rad("b", "36038", "2026-09-02"));
    alla = medNyMaster(alla, rad("c", "36037", "2026-09-03"));
    const status = Object.fromEntries(alla.map((r) => [r.id, r.status]));
    expect(status).toEqual({ a: "arkiverad", b: "master", c: "master" });
  });

  it("protokoll utan projekt påverkar inga andra", () => {
    const alla = medNyMaster([rad("a", "36037", "2026-09-01")], rad("b", null, "2026-09-02"));
    expect(alla.every((r) => r.status === "master")).toBe(true);
  });

  it("grupperar per projekt med MASTER överst", () => {
    let alla = medNyMaster([], rad("a", "36037", "2026-09-01"));
    alla = medNyMaster(alla, rad("c", "36037", "2026-09-03"));
    expect(perProjekt(alla).get("36037").map((r) => r.id)).toEqual(["c", "a"]);
  });
});

describe("IMPORTERA i reducern", () => {
  it("tillämpar förslaget och loggar filnamn och omfattning", async () => {
    const s = last();
    const bok = await lasXlsx(urLogg("Växjö", [["", "UR099", "Ny post", 46104, "", "Öppen"]]));
    const f = forslagUrLogg(s, bok, { filnamn: "UR-logg_Växjö.xlsx" });
    const ut = reducer(s, { type: "IMPORTERA", forslag: f });

    expect(ut.ur.find((u) => u.nr === "UR099" && u.projektId === "36037")).toBeTruthy();
    expect(ut.andringslogg[0]).toMatchObject({ projektId: "36037" });
    expect(ut.andringslogg[0].text).toMatch(/^Import UR-logg_Växjö\.xlsx: 1 nya/);
  });

  it("gör ingenting med ett förslag som inte går att tillämpa", () => {
    const s = last();
    expect(reducer(s, { type: "IMPORTERA", forslag: { fel: true, nya: [], uppdateringar: [] } })).toBe(s);
    expect(tillampaForslag(s, { typ: "urlogg", projektId: null, nya: [{}], uppdateringar: [] })).toBe(s);
  });
});
