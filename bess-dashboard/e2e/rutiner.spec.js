import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

const kapitel = (page) => page.getByRole("list", { name: "Kapitel i handboken" }).locator('[data-roll="kapitel"]');
const rubrik = (kap) => kap.locator("button[aria-expanded]");

test.beforeEach(async ({ page }) => {
  await oppna(page, "Projektledarens handbok");
});

/* Första kapitlet som faktiskt har punkter att bocka av — referenskapitlen
   har inga, och det är avbockningen testen handlar om. */
function medPunkter(page) {
  return page
    .getByRole("list", { name: "Kapitel i handboken" })
    .locator('[data-roll="kapitel"]:not([data-punkter="0"])')
    .first();
}

test("handboken listar kapitlen", async ({ page }) => {
  expect(await kapitel(page).count()).toBeGreaterThan(1);
  await expect(page.getByRole("article", { name: "Kapitel totalt" })).toBeVisible();
});

test("ett kapitel fälls ut och igen", async ({ page }) => {
  const r = rubrik(kapitel(page).first());

  await expect(r).toHaveAttribute("aria-expanded", "false");
  await r.click();
  await expect(r).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`#${await r.getAttribute("aria-controls")}`);
  await expect(panel).toBeVisible();

  await r.click();
  await expect(r).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveCount(0);
});

test("bara ett kapitel i taget är utfällt", async ({ page }) => {
  const lista = page.getByRole("list", { name: "Kapitel i handboken" });
  await rubrik(kapitel(page).nth(0)).click();
  await expect(lista.locator('button[aria-expanded="true"]')).toHaveCount(1);

  await rubrik(kapitel(page).nth(1)).click();
  await expect(lista.locator('button[aria-expanded="true"]')).toHaveCount(1);
  await expect(rubrik(kapitel(page).nth(0))).toHaveAttribute("aria-expanded", "false");
});

test("kapitlet går att fälla ut med tangentbordet", async ({ page }) => {
  // Standalone-versionen hade onclick på en div — den gick inte att nå så här.
  const r = rubrik(kapitel(page).first());
  await r.focus();
  await page.keyboard.press("Enter");
  await expect(r).toHaveAttribute("aria-expanded", "true");
});

test("en avbockad punkt räknas och dämpas", async ({ page }) => {
  const kap = medPunkter(page);
  const r = rubrik(kap);
  const fore = await r.textContent();

  await r.click();
  const ruta = kap.getByRole("checkbox").first();
  await ruta.check();

  await expect(ruta).toBeChecked();
  await expect(kap.locator("s").first()).toBeVisible();
  await expect(r).not.toHaveText(fore);
});

test("avbockningen går att ångra", async ({ page }) => {
  const kap = medPunkter(page);
  await rubrik(kap).click();

  const ruta = kap.getByRole("checkbox").first();
  await ruta.check();
  await expect(ruta).toBeChecked();

  await ruta.uncheck();
  await expect(ruta).not.toBeChecked();
  await expect(kap.locator("s")).toHaveCount(0);
});

test("avbockningen följer projektet", async ({ page }) => {
  const kap = medPunkter(page);
  await rubrik(kap).click();
  await kap.getByRole("checkbox").first().check();

  const projekt = page.getByRole("group", { name: "Välj projekt" }).getByRole("button");
  test.skip((await projekt.count()) < 2, "bara ett projekt i portföljen");
  await projekt.nth(1).click();
  await expect(projekt.nth(1)).toHaveAttribute("aria-pressed", "true");

  const annat = medPunkter(page);
  if ((await rubrik(annat).getAttribute("aria-expanded")) === "false") await rubrik(annat).click();
  await expect(annat.getByRole("checkbox").first()).not.toBeChecked();
});

test("ett kapitel med genväg leder till rätt vy", async ({ page }) => {
  const kapMedLank = kapitel(page).filter({ hasText: "Störning" }).first();
  test.skip((await kapMedLank.count()) === 0, "inget kapitel med genväg");

  await rubrik(kapMedLank).click();
  const genvag = kapMedLank.getByRole("button", { name: /→$/ }).first();
  test.skip((await genvag.count()) === 0, "kapitlet saknar genväg");

  await genvag.click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Projektledarens handbok");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Projektledarens handbok");
  await rubrik(kapitel(page).first()).click();
  utanKonsolfel(fel);
});
