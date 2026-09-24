import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Översikt");
});

const nyckeltal = (page) => page.getByRole("region", { name: "Nyckeltal" });
const projektsektion = (page) => page.getByRole("region", { name: "Projekt" });

test("fyra nyckeltalskort med fördelning per rad", async ({ page }) => {
  const kort = nyckeltal(page).locator(".metric");
  await expect(kort).toHaveCount(4);
  await expect(kort.filter({ hasText: "Öppna risker" })).toContainText("Röda i riskmatrisen");
  // Fördelningen är egna rader — ett värde som "70 d" ska aldrig delas.
  await expect(kort.first().locator(".metric-delar li").first()).toContainText(/\d+ d$/);
});

test("ett projektkort per projekt, med namnet som länk till tidplanen", async ({ page }) => {
  const kort = projektsektion(page).locator(".projkort");
  expect(await kort.count()).toBeGreaterThan(1);

  await kort.first().getByRole("button", { name: /öppna tidplanen/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tidplan");
});

test("projektuppgifterna fälls ut och in", async ({ page }) => {
  const knapp = projektsektion(page).getByRole("button", { name: /projektuppgifter/ });
  await expect(knapp).toHaveAttribute("aria-expanded", "false");
  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Projektuppgifter" })).toBeVisible();
});

test("saknade uppgifter skrivs ut i klartext", async ({ page }) => {
  const utanEffekt = projektsektion(page).locator(".projkort", { hasText: "Effekt ej angiven" });
  test.skip((await utanEffekt.count()) === 0, "alla projekt har effekt angiven");
  await expect(utanEffekt.first()).not.toContainText("— MW");
});

/* Kärnan i omdesignen: ingen text i korten får klippas eller sticka ut —
   varken på desktop eller i mobilprojektet. */
test("ingen text i nyckeltal eller projektkort klipps", async ({ page }) => {
  const fel = await page.evaluate(() => {
    const ut = [];
    document.querySelectorAll(".metric, .projkort").forEach((kort) => {
      const ram = kort.getBoundingClientRect();
      kort.querySelectorAll("*").forEach((el) => {
        if (el.closest(".sr-only")) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const klipptInuti = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline";
        const utanfor = r.right > ram.right + 1 || r.left < ram.left - 1;
        if (klipptInuti || utanfor) ut.push(`${el.className || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`);
      });
    });
    return ut;
  });
  expect(fel).toEqual([]);
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  await projektsektion(page).getByRole("button", { name: /projektuppgifter/ }).click();
  utanKonsolfel(fel);
});
