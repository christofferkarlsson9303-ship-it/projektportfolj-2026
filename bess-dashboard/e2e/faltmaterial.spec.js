import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test("fältmaterial: samtliga moment, PDF och tomma utskriftsfält", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const { fel } = await oppna(page);
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Fältmaterial/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText("49 kontrollpunkter");
  await dialog.getByLabel("Montör / entreprenör").fill("Dan Strandell");
  await dialog.getByLabel("Enhet / serienummer").fill("CATL-01 / SN-001");
  await dialog.getByLabel("Ritning / revision", { exact: true }).fill("EL-001 rev B");
  await dialog.getByLabel("Manual / provplan och revision – moment 1", { exact: true }).fill("CATL Ener X rev B, sid 12");
  await page.screenshot({ path: testInfo.outputPath("panel.png"), fullPage: true });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Ladda ned PDF", exact: true }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath("egenkontroll.pdf"); await download.saveAs(path);
  const pdf = await readFile(path);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeGreaterThan(30_000);
  await page.evaluate(() => { window.print = () => {}; });
  await dialog.getByRole("button", { name: "Skriv ut", exact: true }).click();
  const doc = page.locator("#utskrift");
  await expect(doc.locator(".field-check")).toHaveCount(49);
  await expect(doc).toContainText("□ OK"); await expect(doc).toContainText("□ Ej OK");
  await expect(doc).toContainText("CATL-01 / SN-001"); await expect(doc).toContainText("CATL Ener X rev B, sid 12");
  await expect(doc).toContainText("Källskillnad"); await expect(doc).toContainText("M4.16");
  if (testInfo.project.name === "desktop") await page.pdf({ path: testInfo.outputPath("utskrift.pdf"), printBackground: true, preferCSSPageSize: true });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("#utskrift")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  utanKonsolfel(fel);
});

test("delurval, projektbyte, sparat urval och tangentbord", async ({ page }) => {
  await oppna(page);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Sök och hoppa" }).fill("Skapa fältmaterial");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Fältmaterial/ });
  await dialog.getByRole("button", { name: "Rensa moment" }).click();
  await expect(dialog.getByRole("button", { name: "Ladda ned PDF" })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /^Moment 4:/ }).check();
  await expect(dialog.getByRole("status")).toContainText("16 kontrollpunkter");
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: /^Moment 4:/ })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /^Moment 1:/ })).not.toBeChecked();
  await dialog.getByRole("combobox", { name: "Projekt", exact: true }).selectOption("36038");
  await expect(dialog).toHaveAccessibleName(/Alvesta/);
  await expect(dialog.getByRole("status")).toContainText("49 kontrollpunkter");
});

test("markerade projektuppgifter skrivs ut med utförare och ritningsreferens", async ({ page }) => {
  await oppna(page, "Öppna punkter");
  const region = page.getByRole("region", { name: "Öppna punkter", exact: true });
  const rad = region.locator("tbody tr").first();
  await rad.getByRole("button", { name: /^Redigera Utförare/ }).click();
  await rad.getByRole("textbox", { name: /^Utförare för/ }).fill("Dan");
  await page.keyboard.press("Enter");
  await rad.getByRole("button", { name: /^Redigera Ritning/ }).click();
  await rad.getByRole("textbox", { name: /^Ritning\/revision för/ }).fill("EL-123 rev C");
  await page.keyboard.press("Enter");
  await rad.getByRole("checkbox", { name: /^Markera/ }).check();
  await page.getByRole("button", { name: "Fältmaterial av markerade (1)" }).click();
  const dialog = page.getByRole("dialog", { name: /Fältmaterial/ });
  await expect(dialog.getByRole("status")).toContainText("1 projektuppgifter");
  await page.evaluate(() => { window.print = () => {}; });
  await dialog.getByRole("button", { name: "Skriv ut", exact: true }).click();
  await expect(page.locator("#utskrift")).toContainText("EL-123 rev C");
  await expect(page.locator("#utskrift")).toContainText("Utförare: Dan");
});

test("Excel exporterar filtrerad tabell och svensk beloppsredigering kan avbrytas", async ({ page }) => {
  await oppna(page, "ÄTA och hinder");
  await page.getByRole("radio", { name: /Tabell/ }).click();
  const region = page.getByRole("region", { name: "UR- och ÄTA-register", exact: true });
  const rad = region.locator("tbody tr").first();
  await rad.getByRole("button", { name: /^Redigera Belopp/ }).click();
  const input = rad.getByRole("textbox", { name: /^Belopp för/ });
  await input.fill("1 234,50"); await page.keyboard.press("Enter");
  await expect(rad).toContainText("1 235");
  await rad.getByRole("button", { name: /^Redigera Belopp/ }).click();
  await input.fill("99999"); await page.keyboard.press("Escape");
  await expect(rad).not.toContainText("99 999");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportera Excel", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.xlsx$/);
});

test("mörkt UI ger fortfarande vitt utskriftsmaterial och komplett fältpaket", async ({ page }, testInfo) => {
  await oppna(page);
  await page.getByRole("button", { name: "Byt färgläge" }).click();
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Fältmaterial/ });
  await dialog.getByRole("combobox", { name: "Dokumenttyp", exact: true }).selectOption("paket");
  await dialog.getByRole("button", { name: "Rensa moment" }).click();
  await dialog.getByRole("checkbox", { name: /^Moment 1:/ }).check();
  await page.screenshot({ path: testInfo.outputPath("panel-dark.png") });
  await page.evaluate(() => { window.print = () => {}; });
  await dialog.getByRole("button", { name: "Skriv ut", exact: true }).click();
  await expect(page.locator("#utskrift .field-check")).toHaveCount(14);
  expect(await page.locator("#utskrift .field-document").first().evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 255, 255)");
  await expect(page.locator("#utskrift")).toContainText("Delurval");
});

test("enskilt ÄTA-ärende har direkt PDF-nedladdning för alla dokumenttyper", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { fel } = await oppna(page, "ÄTA och hinder");
  await page.getByRole("radio", { name: /Tabell/ }).click();
  const region = page.getByRole("region", { name: "UR- och ÄTA-register", exact: true });
  await region.locator("tbody tr").first().getByRole("button", { name: /öppna ärendet/ }).click();
  for (const typ of ["underrattelse", "pris", "underlag"]) {
    await page.getByRole("combobox", { name: "PDF-dokument", exact: true }).selectOption(typ);
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Ladda ned ÄTA-PDF" }).click();
    const download = await promise; const path = testInfo.outputPath(`ata-${typ}.pdf`); await download.saveAs(path);
    expect((await readFile(path)).subarray(0, 5).toString()).toBe("%PDF-");
  }
  utanKonsolfel(fel);
});
