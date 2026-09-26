import { crc32, deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";
import { SEED } from "../src/data/seed.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Data och backup");
});

/* ---------- Testfiler, byggda här så att inga riktiga projektfiler behövs ---------- */

function zip(filer) {
  const lokala = [];
  const katalog = [];
  let pos = 0;
  for (const [namn, text] of Object.entries(filer)) {
    const n = Buffer.from(namn);
    const ra = Buffer.from(text);
    const d = deflateRawSync(ra);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc32(ra), 14);
    lh.writeUInt32LE(d.length, 18);
    lh.writeUInt32LE(ra.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc32(ra), 16);
    ch.writeUInt32LE(d.length, 20);
    ch.writeUInt32LE(ra.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(pos, 42);
    lokala.push(lh, n, d);
    katalog.push(ch, n);
    pos += 30 + n.length + d.length;
  }
  const kat = Buffer.concat(katalog);
  const slut = Buffer.alloc(22);
  slut.writeUInt32LE(0x06054b50, 0);
  slut.writeUInt16LE(katalog.length / 2, 8);
  slut.writeUInt16LE(katalog.length / 2, 10);
  slut.writeUInt32LE(kat.length, 12);
  slut.writeUInt32LE(pos, 16);
  return Buffer.concat([...lokala, kat, slut]);
}

function urLogg(projekt, rader) {
  const alla = [["UR/ÄTA-logg"], [`Projekt: ${projekt}`], ["Nummer", "Rubrik", "Datum skapad", "Öppen/Stängd", "Kostnad"], ...rader];
  const s = [];
  const idx = (v) => (s.includes(v) ? s.indexOf(v) : s.push(v) - 1);
  const rows = alla
    .map(
      (r, i) =>
        `<row r="${i + 1}">${r
          .map((v, c) =>
            typeof v === "number"
              ? `<c r="${"ABCDE"[c]}${i + 1}"><v>${v}</v></c>`
              : `<c r="${"ABCDE"[c]}${i + 1}" t="s"><v>${idx(v)}</v></c>`
          )
          .join("")}</row>`
    )
    .join("");
  return zip({
    "xl/workbook.xml": `<workbook xmlns:r="r"><sheets><sheet name="Logg" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/sharedStrings.xml": `<sst>${s.map((v) => `<si><t>${v}</t></si>`).join("")}</sst>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${rows}</sheetData></worksheet>`,
  });
}

const valjFiler = (page, filer) => page.getByLabel("Välj filer att läsa in").setInputFiles(filer);
const kort = (page, filnamn) => page.getByRole("article", { name: `Import av ${filnamn}` });
const pdf = (namn) => ({ name: namn, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });

/* ---------- Testen ---------- */

test("vyn är flyttad till React och visar lagring, import och tabeller", async ({ page }) => {
  await expect(page.getByText("Den här sektionen är inte flyttad")).toHaveCount(0);
  await expect(page.locator(".kpi", { hasText: "Lagring" })).toContainText("Lokalt läge");
  await expect(page.getByText("Släpp filer här")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ladda ner säkerhetskopia (JSON)" })).toBeVisible();
  await expect(page.getByText(/Google Drive via Make — planerad/)).toBeVisible();
});

test("en UR-logg blir ett förslag som uppdaterar ÄTA och hinder först när det tillämpas", async ({ page }) => {
  await valjFiler(page, {
    name: "UR-logg_Växjö.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: urLogg("Växjö", [
      ["UR001", "Projektering - Extra pga bygglov", 46055, "Stängd", 25000],
      ["UR099", "Ny post från Excel", 46104, "Öppen", 6400],
      ["UR100"],
    ]),
  });

  const f = kort(page, "UR-logg_Växjö.xlsx");
  await expect(f).toContainText("1 nya");
  await expect(f).toContainText("1 ändrade");
  await expect(f.getByLabel("Projekt")).toHaveValue("36037");
  // Före → efter syns innan något skrivs.
  await expect(f).toContainText("Projektering - Extra pga bygglov");

  await gaTill(page, "ÄTA och hinder");
  await expect(page.getByText("Ny post från Excel")).toHaveCount(0);
  await gaTill(page, "Data och backup");

  // Förslaget överlever inte en vybyte — läs in igen och tillämpa.
  await valjFiler(page, {
    name: "UR-logg_Växjö.xlsx",
    mimeType: "application/octet-stream",
    buffer: urLogg("Växjö", [["UR099", "Ny post från Excel", 46104, "Öppen", 6400]]),
  });
  await kort(page, "UR-logg_Växjö.xlsx").getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText("Importen är tillämpad och loggad")).toBeVisible();
  await expect(kort(page, "UR-logg_Växjö.xlsx")).toHaveCount(0);

  await gaTill(page, "ÄTA och hinder");
  await expect(page.getByText("Ny post från Excel").first()).toBeVisible();
});

test("okänt projekt måste väljas innan förslaget kan tillämpas", async ({ page }) => {
  await valjFiler(page, { name: "logg.xlsx", mimeType: "application/octet-stream", buffer: urLogg("Kalmar", [["UR001", "X", 46104, "Öppen", 1]]) });
  const f = kort(page, "logg.xlsx");
  await expect(f.getByRole("button", { name: "Tillämpa" })).toBeDisabled();

  await f.getByLabel("Projekt").selectOption("36038");
  await expect(f.getByRole("button", { name: "Tillämpa" })).toBeEnabled();
});

test("nästa möte blir MASTER och det föregående arkiveras", async ({ page }) => {
  await valjFiler(page, pdf("Byggmöte_9_-_Växjö.pdf"));
  await kort(page, "Byggmöte_9_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText("Byggmöte_9_-_Växjö.pdf är MASTER för projektet")).toBeVisible();

  await valjFiler(page, pdf("Byggmöte_10_-_Växjö.pdf"));
  await kort(page, "Byggmöte_10_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();

  const grupp = page.getByRole("region", { name: /Protokoll för 36037/ });
  await expect(grupp.locator("li.master")).toHaveCount(1);
  await expect(grupp.locator("li.master")).toContainText("Byggmöte_10_-_Växjö.pdf");
  await expect(grupp.locator("li.arkiverad")).toContainText("Byggmöte_9_-_Växjö.pdf");

  // Arkivet ligger kvar efter omladdning.
  await page.reload();
  await expect(page.getByRole("region", { name: /Protokoll för 36037/ }).locator("li.master")).toContainText("Byggmöte_10");

  // Mötena finns i Byggmöten.
  await gaTill(page, "Byggmöten");
  await expect(page.getByText("BM-10").first()).toBeVisible();

  // Sidfotens underlag följer det senaste protokollet, inte det inskrivna BM7/BM8.
  await expect(page.locator("footer")).toContainText("36037: Byggmötesprotokoll BM-10");
  await expect(page.locator("footer")).toContainText("36038: Byggmötesprotokoll BM7/BM8");
});

test("ett äldre möte som laddas upp i efterhand tar inte över som MASTER", async ({ page }) => {
  await valjFiler(page, pdf("Byggmöte_10_-_Växjö.pdf"));
  await kort(page, "Byggmöte_10_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText("Byggmöte_10_-_Växjö.pdf är MASTER för projektet")).toBeVisible();

  await valjFiler(page, pdf("Byggmöte_9_-_Växjö.pdf"));
  await kort(page, "Byggmöte_9_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText(/Byggmöte_9_-_Växjö\.pdf arkiverades/)).toBeVisible();

  const grupp = page.getByRole("region", { name: /Protokoll för 36037/ });
  await expect(grupp.locator("li.master")).toContainText("Byggmöte_10_-_Växjö.pdf");
  await expect(grupp.locator("li.arkiverad")).toContainText("Byggmöte_9_-_Växjö.pdf");
});

test("protokoll för ett projekt påverkar inte ett annat projekts MASTER", async ({ page }) => {
  await valjFiler(page, pdf("Byggmöte_9_-_Växjö.pdf"));
  await kort(page, "Byggmöte_9_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();
  await valjFiler(page, pdf("Byggmöte_10_-_Alvesta.pdf"));
  await kort(page, "Byggmöte_10_-_Alvesta.pdf").getByRole("button", { name: "Tillämpa" }).click();

  await expect(page.getByRole("region", { name: /Protokoll för 36037/ }).locator("li.master")).toHaveCount(1);
  await expect(page.getByRole("region", { name: /Protokoll för 36038/ }).locator("li.master")).toHaveCount(1);
});

test("en säkerhetskopia återställs först efter bekräftelse", async ({ page }) => {
  const nu = structuredClone(SEED);
  const inne = { ...nu, risker: nu.risker.slice(0, 1) };
  await valjFiler(page, {
    name: "Projektportfolj_backup_test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ _format: "one-nordic-projektportfolj", _version: 1, state: inne })),
  });

  const f = kort(page, "Projektportfolj_backup_test.json");
  await expect(f.getByRole("row", { name: /Risker/ })).toContainText(`${nu.risker.length}`);
  await f.getByRole("button", { name: "Återställ portföljen" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Återställ från säkerhetskopia?");
  await dialog.getByRole("button", { name: "Återställ", exact: true }).click();

  await expect(page.getByText("Portföljen återställd från säkerhetskopian")).toBeVisible();
  // Via kolumnetiketten: på mobil blir raderna kort och data-label räknas in i radens namn.
  const risker = page.locator("tr", { has: page.locator("td[data-label=Tabell]", { hasText: /^Risker$/ }) });
  await expect(risker.locator("td[data-label=Rader]")).toHaveText("1");
});

test("filer som inte stöds får ett tydligt besked", async ({ page }) => {
  await valjFiler(page, { name: "bild.png", mimeType: "image/png", buffer: Buffer.from("x") });
  const f = kort(page, "bild.png");
  await expect(f).toContainText("Filtypen stöds inte");
  await f.getByRole("button", { name: "Stäng" }).click();
  await expect(f).toHaveCount(0);
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Data och backup");
  await valjFiler(page, pdf("Byggmöte_9_-_Växjö.pdf"));
  await kort(page, "Byggmöte_9_-_Växjö.pdf").getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByRole("region", { name: /Protokoll för 36037/ })).toBeVisible();
  utanKonsolfel(fel);
});
