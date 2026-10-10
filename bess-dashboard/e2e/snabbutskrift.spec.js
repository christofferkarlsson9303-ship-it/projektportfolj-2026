import { test, expect } from "@playwright/test";
import { oppna, gaTill, utanKonsolfel } from "./hjalpare.js";

test("arbetslista för en utförare skrivs ut med ett klick från Öppna punkter", async ({ page }) => {
  const { fel } = await oppna(page, "Öppna punkter");
  const region = page.getByRole("region", { name: "Öppna punkter", exact: true });
  const rad = region.locator("tbody tr").first();
  const titel = (await rad.getByRole("button", { name: /^Redigera Punkt/ }).textContent()).trim();
  await rad.getByRole("button", { name: /^Redigera Utförare/ }).click();
  await rad.getByRole("textbox", { name: /^Utförare för/ }).fill("Dan Snabb");
  await page.keyboard.press("Enter");

  await page.getByLabel("Arbetslista för").selectOption("Dan Snabb");
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Skriv ut arbetslista", exact: true }).click();
  await expect(page.locator("#utskrift")).toContainText("Utförare: Dan Snabb");
  await expect(page.locator("#utskrift")).toContainText(titel.slice(0, 20));
  await expect(page.getByRole("dialog", { name: /Fältmaterial/ })).toHaveCount(0);
  utanKonsolfel(fel);
});

test("fasens blankett och Ctrl+K skriver ut utan fältmaterialpanelen", async ({ page }) => {
  await oppna(page, "Bygga batteripark");
  await page.evaluate(() => { window.print = () => {}; });
  const fas = page.locator("#fas-0");
  await fas.locator("summary").first().click();
  await fas.getByRole("button", { name: "Skriv ut fasens blankett", exact: true }).click();
  await expect(page.locator("#utskrift")).toContainText("Förstudie och krav");

  await gaTill(page, "Idag");
  await page.getByRole("button", { name: "Sök", exact: true }).click();
  const sok = page.getByRole("combobox", { name: "Sök och hoppa" });
  await sok.fill("Egenkontroll moment 1 –");
  await sok.press("Enter");
  await expect(page.locator("#utskrift")).toContainText("Kontrakt och ansvar");
  await expect(page.getByRole("dialog", { name: /Fältmaterial/ })).toHaveCount(0);
});
