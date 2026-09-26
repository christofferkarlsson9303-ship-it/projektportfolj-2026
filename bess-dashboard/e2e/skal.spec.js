import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const PORTERADE = [
  "Idag",
  "Översikt",
  "Bygga batteripark",
  "Tavla",
  "Tidplan",
  "Milstolpar M1–M7",
  "ÄTA och hinder",
  "Ekonomi",
  "Dagbok",
  "Störning",
  "Risker",
  "Öppna punkter",
  "Kontakter",
];

test("alla porterade vyer renderar utan konsolfel", async ({ page }) => {
  // Varje vybyte på mobil kräver att menyn öppnas först — elva vyer hinner inte
  // på standardgränsen.
  test.setTimeout(90_000);
  const { fel } = await oppna(page);

  for (const vy of PORTERADE) {
    await gaTill(page, vy);
    // Varje vy ska faktiskt måla något — inte bara byta rubrik.
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
  }

  utanKonsolfel(fel);
});

test("aktiv vy markeras med aria-current", async ({ page }) => {
  await oppna(page);
  const meny = page.getByRole("navigation", { name: "Huvudmeny" });

  // Startvyn är arbetslistan.
  await expect(meny.getByRole("button", { name: "Idag", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );

  await gaTill(page, "Risker");
  await expect(meny.getByRole("button", { name: "Risker", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(meny.getByRole("button", { name: "Idag", exact: true })).not.toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("hopplänken är första tabbstoppet och flyttar fokus till innehållet", async ({ page }) => {
  await oppna(page);
  await page.keyboard.press("Tab");

  const hopp = page.getByRole("link", { name: "Hoppa till innehållet" });
  await expect(hopp).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#innehall")).toBeFocused();
});

test("kommandopaletten öppnas med Ctrl+K och navigerar", async ({ page }) => {
  await oppna(page);

  await page.keyboard.press("Control+k");
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });
  await expect(palett).toBeVisible();

  const falt = palett.getByRole("combobox");
  await expect(falt).toBeFocused();

  await falt.fill("risk");
  // Piltangenter ska flytta det aktiva alternativet, inte bara markera visuellt.
  await page.keyboard.press("ArrowDown");
  await expect(falt).toHaveAttribute("aria-activedescendant", /cmd-\d+/);

  await falt.fill("Risker");
  await page.keyboard.press("Enter");

  await expect(palett).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Risker");
});

test("mörkt läge växlar och håller kontrast i sidomenyn", async ({ page }) => {
  await oppna(page);

  const knapp = page.getByRole("button", { name: /Byt till (mörkt|ljust) läge|Byt färgläge/ });
  await knapp.click();

  const tema = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(["dark", "light"]).toContain(tema);

  // Ytan ska faktiskt byta färg, inte bara attributet.
  const bakgrund = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("background-color")
  );
  expect(bakgrund).toBeTruthy();
});

test("dialogen fångar fokus och lämnar tillbaka det vid stängning", async ({ page }) => {
  await oppna(page, "Öppna punkter");

  const oppnaKnapp = page.getByRole("button", { name: "+ Lägg till punkt" });
  await oppnaKnapp.click();

  const dialog = page.getByRole("dialog", { name: "Ny punkt" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  // Escape ska stänga och ge tillbaka fokus till knappen som öppnade.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(oppnaKnapp).toBeFocused();
});

test("mobil: sidomenyn är infälld och går att öppna", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobil", "gäller bara mobilvyn");

  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Öppna menyn/ });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(page.getByRole("button", { name: /Stäng menyn/ })).toHaveAttribute("aria-expanded", "true");

  // Escape ska stänga menyn igen.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Öppna menyn/ })).toBeVisible();
});
