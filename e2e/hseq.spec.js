import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

const RONDER = "Skyddsronder";

test.beforeEach(async ({ page }) => {
  await oppna(page, "HSEQ / BAS-U");
});

test("vyn visar de fyra grindarna", async ({ page }) => {
  for (const grind of [
    "Dagar sedan skyddsrond",
    "Arbetsmiljöplan",
    "Öppna rondavvikelser",
    "Incidenter utan rapport",
  ]) {
    await expect(page.locator(".kpi .label", { hasText: new RegExp(`^${grind}$`) })).toBeVisible();
  }
});

test("en ny skyddsrond öppnas direkt i panelen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();

  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });
  await expect(panel).toBeVisible();

  // Listan ska ligga kvar bakom panelen.
  await expect(page.getByRole("region", { name: RONDER })).toBeVisible();
  await expect(page.getByRole("region", { name: RONDER }).locator("tbody tr")).toHaveCount(1);
});

test("checklistan bockas av och räknas i listan", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  const rutor = panel.locator('.chk input[type="checkbox"]');
  await expect(rutor).toHaveCount(5);
  await expect(page.getByRole("region", { name: RONDER }).locator("tbody tr td").nth(2)).toHaveText("0/5");

  await rutor.first().check();
  await expect(panel.locator(".chk s").first()).toBeVisible();
  await expect(page.getByRole("region", { name: RONDER }).locator("tbody tr td").nth(2)).toHaveText("1/5");
});

test("en avvikelse läggs till och räknas som öppen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  await panel.getByRole("button", { name: "+ Avvikelse" }).click();
  const rad = panel.getByRole("region", { name: /^Avvikelser i skyddsronden/ }).locator("tbody tr");
  await expect(rad).toHaveCount(1);

  await rad.getByLabel("Beskrivning av avvikelsen").fill("Trasigt räcke vid transformator");
  await rad.getByLabel("Allvarlighet").selectOption("akut");

  await panel.getByRole("button", { name: "Stäng" }).click();
  // KPI:n för öppna avvikelser ska ha fångat den.
  await expect(page.getByText("1 akuta")).toBeVisible();
});

test("en åtgärdad avvikelse räknas inte längre som öppen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });
  await panel.getByRole("button", { name: "+ Avvikelse" }).click();

  const rad = panel.getByRole("region", { name: /^Avvikelser i skyddsronden/ }).locator("tbody tr");
  await rad.getByLabel("Status för avvikelsen").selectOption("atgardad");

  await panel.getByRole("button", { name: "Stäng" }).click();
  await expect(page.getByText("0 akuta")).toBeVisible();
});

test("panelen stängs med Escape", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("arbetsmiljöplanen räknas upp vid revidering", async ({ page }) => {
  await expect(page.getByText("Ingen AMP registrerad.")).toBeVisible();

  await page.getByRole("button", { name: "Markera AMP som reviderad" }).click();
  await expect(page.getByText("rev 1 — reviderad")).toBeVisible();

  await page.getByRole("button", { name: "Markera AMP som reviderad" }).click();
  await expect(page.getByText("rev 2 — reviderad")).toBeVisible();
});

test("ett ID06-stickprov med anmärkning varnar om vite", async ({ page }) => {
  await page.getByRole("button", { name: "+ Logga stickprov" }).click();

  const rad = page.getByRole("region", { name: "ID06-stickprov" }).locator("tbody tr").first();
  await rad.getByLabel(/^Utfall för stickprov/).selectOption("nej");

  await expect(page.getByText(/ID06-stickprov med anmärkning/)).toBeVisible();
  await expect(page.getByText(/vite/)).toBeVisible();
});

test("en incident utan rapport larmar på 24-timmarskravet", async ({ page }) => {
  await page.getByRole("button", { name: "+ Registrera incident" }).click();

  // Datumet sätts till idag, så fristen löper men är inte bruten.
  const grind = page.locator(".grind").first();
  await expect(grind).toBeVisible();
  await expect(grind).toContainText(/inom \d+ h/);

  await page.getByLabel("Rapport skickad till beställare och Arbetsmiljöverket").check();
  await expect(page.locator(".grind").first()).toContainText("Rapporterad");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "HSEQ / BAS-U");
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  utanKonsolfel(fel);
});
