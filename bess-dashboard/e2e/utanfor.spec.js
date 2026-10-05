import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test("utanför appen loggas med ett klick och räknas ihop", async ({ page }) => {
  const { fel } = await oppna(page);
  await page.getByRole("button", { name: "Utanför appen", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Gick utanför appen" });
  await expect(d).toContainText("Inget loggat än");

  await d.getByLabel("Vad behövde du? (valfritt)").fill("ÄTA-summa");
  await d.getByRole("group", { name: "Vart gick du" }).getByRole("button", { name: "Excel" }).click();
  await d.getByRole("group", { name: "Vart gick du" }).getByRole("button", { name: "Excel" }).click();
  await d.getByRole("group", { name: "Vart gick du" }).getByRole("button", { name: "Teams" }).click();

  await expect(d).toContainText("Senaste 14 dagarna: 3 gånger");
  await expect(d.getByRole("list", { name: "Per ställe" })).toContainText("Excel");
  await expect(d).toContainText("ÄTA-summa (1)");

  // Raderna ligger i portföljen och finns kvar efter omladdning.
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Utanför appen", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Gick utanför appen" })).toContainText("3 gånger");

  // Toppfältet får inte ge sidled-scroll på mobil.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  utanKonsolfel(fel);
});

test("nås från Ctrl+K", async ({ page }) => {
  await oppna(page);
  await page.keyboard.press("Control+k");
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });
  await palett.getByRole("combobox").fill("utanför");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Gick utanför appen" })).toBeVisible();
});
