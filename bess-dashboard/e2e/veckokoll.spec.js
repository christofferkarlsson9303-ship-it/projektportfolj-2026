import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

const KORT = ".veckokort";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Veckokoll");
});

test("checklistan visar nio frågekort", async ({ page }) => {
  await expect(page.locator(KORT)).toHaveCount(9);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
});

test("ett svar räknas direkt utan sparaknapp", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: "OK" }).click();

  // 1 av 9 besvarade = 11 %.
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "11");
  await expect(forsta.getByRole("button", { name: "OK" })).toHaveAttribute("aria-pressed", "true");
});

test("samma svar igen nollställer det", async ({ page }) => {
  const knapp = page.locator(KORT).first().getByRole("button", { name: "OK" });
  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-pressed", "true");

  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
});

test("en avvikelse öppnar panelen och kommentaren sparas", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: "Avvikelse" }).click();

  await expect(forsta).toHaveClass(/avvikelse/);
  await forsta.getByRole("button", { name: "Kommentera och åtgärda" }).click();

  const panel = page.getByRole("region", { name: "Fråga 1 i veckokollen" });
  await expect(panel).toBeVisible();

  // Checklistan ska ligga kvar bakom panelen.
  await expect(page.locator(KORT).first()).toBeVisible();

  await panel.getByLabel("Kommentar till avvikelsen").fill("Kontraktet genomgånget med platschefen");
  await panel.getByRole("button", { name: "Stäng" }).click();
  await expect(panel).toBeHidden();

  // Kortet visar att den är kommenterad, och texten finns kvar när man går in igen.
  await expect(forsta.getByText("Kommenterad")).toBeVisible();
  await forsta.getByRole("button", { name: "Öppna kommentaren" }).click();
  await expect(
    page.getByRole("region", { name: "Fråga 1 i veckokollen" }).getByLabel("Kommentar till avvikelsen")
  ).toHaveValue("Kontraktet genomgånget med platschefen");
});

test("panelen stängs med Escape", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: "Avvikelse" }).click();
  await forsta.getByRole("button", { name: "Kommentera och åtgärda" }).click();

  const panel = page.getByRole("region", { name: "Fråga 1 i veckokollen" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("ett OK-svar erbjuder ingen åtgärd", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: "OK" }).click();

  await expect(forsta).toHaveClass(/\bok\b/);
  await expect(forsta.getByRole("button", { name: /Kommentera/ })).toHaveCount(0);
});

test("veckoväxlaren byter vecka och tillbaka", async ({ page }) => {
  const rubrik = page.getByRole("heading", { level: 3 }).first();
  const denna = await rubrik.textContent();

  await page.getByRole("button", { name: "‹ Föregående" }).click();
  await expect(rubrik).not.toHaveText(denna);

  await page.getByRole("button", { name: "Till denna vecka" }).click();
  await expect(rubrik).toHaveText(denna);
});

test("veckan går att markera som genomgången", async ({ page }) => {
  const knapp = page.getByRole("button", { name: "Markera veckan som genomgången" });
  await knapp.click();

  await expect(page.getByRole("button", { name: "Öppna veckan igen" })).toBeVisible();

  // Genomgången vecka hamnar i historiken.
  const historik = page.getByRole("region", { name: "Veckokollens historik" });
  await expect(historik.locator("tbody tr")).toHaveCount(1);
});

test("en avvikelse kan bli en öppen punkt", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: "Avvikelse" }).click();
  await forsta.getByRole("button", { name: "Kommentera och åtgärda" }).click();

  await page
    .getByRole("region", { name: "Fråga 1 i veckokollen" })
    .getByRole("button", { name: "Skapa öppen punkt" })
    .click();

  await expect(page.getByRole("status").filter({ hasText: /Öppna punkter/ })).toBeVisible();
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Veckokoll");
  await page.locator(KORT).first().getByRole("button", { name: "Varning" }).count();
  utanKonsolfel(fel);
});
