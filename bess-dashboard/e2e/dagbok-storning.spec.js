import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* ---------- Dagbok ---------- */

test("dagboken summerar kostnaden när det finns rader", async ({ page }) => {
  await oppna(page, "Dagbok");

  const tabell = page.getByRole("region", { name: "Alla dagboksrader" });
  await expect(tabell).toBeVisible();
  // Grunddatan har inga dagboksrader, så vi skapar en och fyller i kostnaden.
  await expect(tabell.getByText("Inga rader.")).toBeVisible();

  await page.getByRole("button", { name: "+ Ny dagboksrad" }).click();
  const form = page.getByRole("region", { name: /^Dagboksrad/ });
  await form.getByLabel("Kostnad (kr)").fill("12000");
  await page.keyboard.press("Tab");

  await expect(tabell.locator("tfoot")).toBeVisible();
  await expect(tabell.locator("tfoot")).toContainText("12 000");
});

test("ny dagboksrad öppnas direkt och kräver de sex fälten", async ({ page }) => {
  await oppna(page, "Dagbok");

  await page.getByRole("button", { name: "+ Ny dagboksrad" }).click();

  const form = page.getByRole("region", { name: /^Dagboksrad/ });
  await expect(form).toBeVisible();

  // En tom rad saknar underlag och ska säga det.
  await expect(form.getByText("Ofullständig rad.")).toBeVisible();

  // De sex fälten som avgör om raden är komplett.
  for (const etikett of [
    "Startdatum för ÄTA",
    "Omfattning",
    "Väder och temperatur",
    "Kostnad (kr)",
    "Förväntad tidsåtgång",
    "Faktisk tidsåtgång",
  ]) {
    await expect(form.getByLabel(etikett)).toBeVisible();
  }
});

test("ifylld dagboksrad slutar flaggas som ofullständig", async ({ page }) => {
  await oppna(page, "Dagbok");
  await page.getByRole("button", { name: "+ Ny dagboksrad" }).click();

  const form = page.getByRole("region", { name: /^Dagboksrad/ });
  await form.getByLabel("Omfattning").fill("Grävning 12 m");
  await form.getByLabel("Väder och temperatur").fill("5°C, uppehåll");
  await form.getByLabel("Kostnad (kr)").fill("12000");
  await form.getByLabel("Förväntad tidsåtgång").fill("8 tim");
  await form.getByLabel("Faktisk tidsåtgång").fill("11,5 tim");
  // Fälten skriver tillbaka vid blur — Tab commitar det sista.
  // Startdatum sätts automatiskt till idag när raden skapas.
  await page.keyboard.press("Tab");

  await expect(form.getByText("Ofullständig rad.")).toBeHidden();
});

/* ---------- Störning ---------- */

test("ny underrättelse får löpnummer och förifylld blankett", async ({ page }) => {
  await oppna(page, "Störning");

  await page.getByRole("button", { name: "+ Ny underrättelse" }).click();

  const form = page.getByRole("region", { name: /^Underrättelse ST/ });
  await expect(form).toBeVisible();

  // Rutorna A–H ur ONE Nordics mall.
  for (const ruta of ["Ruta A", "Ruta B", "Ruta C", "Ruta D", "Ruta E", "Ruta F"]) {
    await expect(form.getByLabel(new RegExp("^" + ruta))).toBeVisible();
  }

  // Förseningsrutan ska vara ikryssad från start — den ska alltid med.
  await expect(form.getByLabel(/Vi bedömer att arbetet kommer att försena/)).toBeChecked();
});

test("svarsfrist som passerat markeras i registret", async ({ page }) => {
  await oppna(page, "Störning");
  await page.getByRole("button", { name: "+ Ny underrättelse" }).click();

  const form = page.getByRole("region", { name: /^Underrättelse ST/ });
  await form.getByLabel("Besked önskas senast").fill("2020-01-01");
  await form.getByRole("button", { name: "Stäng" }).click();

  const rad = page.getByRole("region", { name: "Underrättelser om störning" }).locator("tr.rad-sen");
  await expect(rad.first()).toBeVisible();
});

/* ---------- Kopplingen från ÄTA ---------- */

test("ÄTA skapar dagboksrad med ÄTA-numret som referens", async ({ page }) => {
  const { fel } = await oppna(page, "ÄTA och hinder");

  const forsta = page.getByRole("region", { name: "UR- och ÄTA-register" }).locator("tbody tr").first();
  await forsta.getByRole("button").first().click();

  const ataForm = page.getByRole("region", { name: /^Ärende / });
  const rubrik = await ataForm.getByRole("heading", { level: 3 }).textContent();
  const nr = rubrik.split(" —")[0].trim();

  await ataForm.getByRole("button", { name: "+ Dagboksrad" }).click();

  // Vi ska ha hamnat i Dagbok med raden öppen och ÄTA-numret ifyllt.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dagbok");
  const dagbokForm = page.getByRole("region", { name: /^Dagboksrad/ });
  await expect(dagbokForm).toBeVisible();
  await expect(dagbokForm.getByLabel("ÄTA-/UR-nummer")).toHaveValue(nr);

  utanKonsolfel(fel);
});

test("ÄTA skapar underrättelse med ärendet inskrivet i ruta A", async ({ page }) => {
  await oppna(page, "ÄTA och hinder");

  const forsta = page.getByRole("region", { name: "UR- och ÄTA-register" }).locator("tbody tr").first();
  await forsta.getByRole("button").first().click();

  const ataForm = page.getByRole("region", { name: /^Ärende / });
  const rubrik = await ataForm.getByRole("heading", { level: 3 }).textContent();
  const nr = rubrik.split(" —")[0].trim();

  await ataForm.getByRole("button", { name: "+ Underrättelse om störning" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Störning");
  const form = page.getByRole("region", { name: /^Underrättelse ST/ });
  await expect(form).toBeVisible();
  await expect(form.getByLabel(/^Ruta A/)).toContainText(nr);
  await expect(form.getByLabel("ÄTA-nummer")).toHaveValue(nr);
});

test("båda vyerna renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page);
  await gaTill(page, "Dagbok");
  await gaTill(page, "Störning");
  utanKonsolfel(fel);
});
