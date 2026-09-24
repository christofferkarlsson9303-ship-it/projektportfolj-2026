import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

const KAPITEL = ".kap";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Projektledarens handbok");
});

/* Första kapitlet som faktiskt har punkter att bocka av — referenskapitlen
   har inga, och det är avbockningen testen handlar om. */
function medPunkter(page) {
  return page.locator(`${KAPITEL}:has(.kapprog)`).first();
}

test("handboken listar kapitlen", async ({ page }) => {
  expect(await page.locator(KAPITEL).count()).toBeGreaterThan(1);
  await expect(page.getByText("Kapitel totalt")).toBeVisible();
});

test("ett kapitel fälls ut och igen", async ({ page }) => {
  const rubrik = page.locator(".kaph").first();

  await expect(rubrik).toHaveAttribute("aria-expanded", "false");
  await rubrik.click();
  await expect(rubrik).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".kapb").first()).toBeVisible();

  await rubrik.click();
  await expect(rubrik).toHaveAttribute("aria-expanded", "false");
});

test("bara ett kapitel i taget är utfällt", async ({ page }) => {
  await page.locator(".kaph").nth(0).click();
  await expect(page.locator(".kapb")).toHaveCount(1);

  await page.locator(".kaph").nth(1).click();
  await expect(page.locator(".kapb")).toHaveCount(1);
  await expect(page.locator(".kaph").nth(0)).toHaveAttribute("aria-expanded", "false");
});

test("kapitlet går att fälla ut med tangentbordet", async ({ page }) => {
  // Standalone-versionen hade onclick på en div — den gick inte att nå så här.
  const rubrik = page.locator(".kaph").first();
  await rubrik.focus();
  await page.keyboard.press("Enter");
  await expect(rubrik).toHaveAttribute("aria-expanded", "true");
});

test("en avbockad punkt räknas och stryks över", async ({ page }) => {
  const kap = medPunkter(page);
  const fore = await kap.locator(".kapprog small").textContent();

  await kap.locator(".kaph").click();
  const ruta = kap.locator('.chk input[type="checkbox"]').first();
  await ruta.check();

  await expect(ruta).toBeChecked();
  await expect(kap.locator(".chk s").first()).toBeVisible();
  await expect(kap.locator(".kapprog small")).not.toHaveText(fore);
});

test("avbockningen går att ångra", async ({ page }) => {
  const kap = medPunkter(page);
  await kap.locator(".kaph").click();

  const ruta = kap.locator('.chk input[type="checkbox"]').first();
  await ruta.check();
  await expect(ruta).toBeChecked();

  await ruta.uncheck();
  await expect(ruta).not.toBeChecked();
  await expect(kap.locator(".chk s")).toHaveCount(0);
});

test("avbockningen följer projektet", async ({ page }) => {
  const kap = medPunkter(page);
  await kap.locator(".kaph").click();
  await kap.locator('.chk input[type="checkbox"]').first().check();

  const valjare = page.getByRole("combobox", { name: /projekt/i }).first();
  const varden = await valjare.locator("option").evaluateAll((o) => o.map((x) => x.value));
  test.skip(varden.length < 2, "bara ett projekt i portföljen");

  await valjare.selectOption(varden[1]);
  const annat = medPunkter(page);
  await annat.locator(".kaph").click();
  await expect(annat.locator('.chk input[type="checkbox"]').first()).not.toBeChecked();
});

test("ett kapitel med genväg leder till rätt vy", async ({ page }) => {
  const kapMedLank = page.locator(`${KAPITEL}:has-text("Störning")`).first();
  test.skip((await kapMedLank.count()) === 0, "inget kapitel med genväg");

  await kapMedLank.locator(".kaph").click();
  const genvag = kapMedLank.locator(".kapb .btn").first();
  test.skip((await genvag.count()) === 0, "kapitlet saknar genväg");

  await genvag.click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Projektledarens handbok");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Projektledarens handbok");
  await page.locator(".kaph").first().click();
  utanKonsolfel(fel);
});
