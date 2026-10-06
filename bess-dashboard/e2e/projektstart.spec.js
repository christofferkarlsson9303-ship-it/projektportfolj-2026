import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

/* Fliken Projektstart: fjorton steg, och först på sista steget skapas projektet. */

async function gaTillSteg(page, nummer, titel) {
  const val = page.getByLabel("Välj steg");
  if (await val.isVisible()) await val.selectOption({ label: `${nummer}. ${titel}` });
  else await page.getByRole("navigation", { name: "Stegen i projektstarten" }).getByRole("button", { name: titel }).click();
}

test("projektet skapas först efter alla steg och får sina risker och milstolpar", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");

  await page.getByLabel("Projektnamn").fill("Kalmar testpark");
  await page.getByLabel("Projektnummer").fill("90077");
  await page.getByLabel("Beställare").fill("Testkund AB");

  // Steg 7 är riskregistret.
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Nästa" }).click();
  await expect(page.getByRole("heading", { name: "7. Riskregister" })).toBeVisible();
  await page.getByLabel("Risker, rad 1: Ägare").fill("Testperson");
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Nästa" }).click();

  await expect(page.getByRole("heading", { name: "14. Granska och skapa" })).toBeVisible();
  await expect(page.getByText("3 riskrader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeEnabled();
  await page.getByRole("button", { name: "Skapa projekt" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");
  expect(fel).toEqual([]);
});

test("Skapa projekt är låst medan steg återstår", async ({ page }) => {
  await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("Låst test");
  await gaTillSteg(page, 14, "Granska och skapa");
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeDisabled();
  await expect(page.getByText(/steg är inte genomgångna/)).toBeVisible();
});
