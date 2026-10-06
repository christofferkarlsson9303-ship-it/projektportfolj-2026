import { expect, test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

/* Fliken Projektstart: fjorton steg, och först på sista steget skapas projektet. */

const STEGNAMN = ["Projektkort", "Avropsacceptans", "Projektdirektiv", "Intressenter", "Organisation och möten", "Kontrakt och kassaflöde", "Riskregister", "Tidplan och kritisk linje", "Godkänd lösning", "Tillstånd och nätägare", "HSEQ och etablering", "cBoP, eBoP och montage", "Provning, besiktning och garanti"];

async function oppnaProjektstart(page) {
  await gaTill(page, "Projektstart");
}

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
  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_90077_.*\.pdf$/);

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

test("sammanfattningen kan laddas ned som PDF", async ({ page }) => {
  await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("PDF-test");
  await gaTillSteg(page, 14, "Granska och skapa");
  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  const d = await nedladdning;
  expect(d.suggestedFilename()).toMatch(/^projektstart_.*\.pdf$/);
});

test("den sparade projektstarten kan öppnas, ändras och laddas ned igen", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("Sparad start");
  await page.getByLabel("Projektnummer").fill("90088");
  await gaTillSteg(page, 14, "Granska och skapa");
  for (let i = 1; i < 14; i++) {
    await gaTillSteg(page, i, STEGNAMN[i - 1]);
  }
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");

  await oppnaProjektstart(page);
  await page.getByLabel("Arbeta med").selectOption({ label: "90088 Sparad start" });
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Sparad start");
  await page.getByLabel("Projektnamn").fill("Sparad start 2");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara ändringar" }).click();

  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_90088_.*\.pdf$/);
  await page.reload();
  await oppnaProjektstart(page);
  await page.getByLabel("Arbeta med").selectOption({ label: "90088 Sparad start 2" });
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Sparad start 2");
  expect(fel).toEqual([]);
});

test("ett befintligt projekt utan sparad start kan öppnas i guiden, fyllas på och sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel("Arbeta med").selectOption({ label: "36037 Växjö Batteripark (ej sparad start)" });
  await expect(page.getByText("Projektet har ingen sparad projektstart")).toBeVisible();
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Växjö Batteripark");
  await page.getByLabel("Beställare").fill("Ingrid Capacity");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();

  await page.reload();
  await oppnaProjektstart(page);
  await page.getByLabel("Arbeta med").selectOption({ label: "36037 Växjö Batteripark" });
  await expect(page.getByLabel("Beställare")).toHaveValue("Ingrid Capacity");
  expect(fel).toEqual([]);
});
