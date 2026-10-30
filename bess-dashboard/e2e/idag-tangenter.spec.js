import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Idag som arbetsyta med tangentbordet: snabbraden (n), avbockning med ångra
   (x eller bocken), j/k mellan raderna och utskrift (p). Grunddatan: 36037 är
   valt; p2 "Vågkvitto …" har passerat sin frist och ligger under Brådskande. */

const del = (page, namn) => page.getByRole("region", { name: new RegExp(`^${namn}`) });

test("n öppnar snabbraden; en punkt utan datum hamnar under Idag och ett datum blir frist", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  await page.keyboard.press("n");
  const falt = page.getByRole("textbox", { name: "Ny punkt" });
  await expect(falt).toBeFocused();

  await falt.fill("Kontrollera jordning trafo");
  await page.keyboard.press("Enter");
  await expect(del(page, "Idag").getByRole("button", { name: /^Öppna: .*Kontrollera jordning trafo/ })).toBeVisible();
  // Fältet är tomt och har kvar fokus, så nästa punkt kan skrivas direkt.
  await expect(falt).toHaveValue("");
  await expect(falt).toBeFocused();

  await falt.fill("Ring kranbolaget +3");
  await expect(page.getByText(/^frist \d+ \w+$/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(del(page, "Denna vecka").getByRole("button", { name: /^Öppna: .*Ring kranbolaget/ })).toBeVisible();
  // "+3" är datumet, inte en del av rubriken.
  await expect(page.getByRole("button", { name: /Ring kranbolaget \+3/ })).toHaveCount(0);

  // j i fältet är en bokstav, inte en flytt.
  await falt.fill("j");
  await expect(falt).toHaveValue("j");
  await page.keyboard.press("Escape");
  await expect(falt).toHaveValue("");
  await expect(falt).not.toBeFocused();
  utanKonsolfel(fel);
});

test("x markerar klar och raden står kvar med Ångra; x igen ångrar", async ({ page }) => {
  await oppna(page, "Idag");
  const rad = del(page, "Brådskande").getByRole("button", { name: /^Öppna: .*Vågkvitto/ });
  await rad.focus();
  await page.keyboard.press("x");

  const angra = page.getByRole("button", { name: /^Ångra klar: .*Vågkvitto/ });
  await expect(angra).toBeVisible();
  // Raden står kvar på sin plats och har kvar fokus.
  await expect(rad).toBeFocused();
  await expect(rad).toContainText("Klar");

  await page.keyboard.press("x");
  await expect(angra).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Markera klar: .*Vågkvitto/ })).toBeVisible();
});

test("bocken markerar klar; efter några sekunder är punkten borta, även efter omladdning", async ({ page }) => {
  await page.clock.install();
  await oppna(page, "Idag");
  await page.getByRole("button", { name: /^Markera klar: .*Vågkvitto/ }).click();
  await expect(page.getByRole("button", { name: /^Ångra klar: .*Vågkvitto/ })).toBeVisible();

  await page.clock.fastForward(7000);
  await expect(page.getByRole("button", { name: /^Öppna: .*Vågkvitto/ })).toHaveCount(0);

  // Ändringen sparas lokalt efter autospar; vänta in den innan omladdning.
  await page.clock.fastForward(2000);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Öppna: .*Vågkvitto/ })).toHaveCount(0);
});

test("j och k flyttar mellan raderna; Enter öppnar punkten i panelen", async ({ page }) => {
  await oppna(page, "Idag");
  const rader = page.locator("[data-rad]");
  await page.keyboard.press("j");
  await expect(rader.first()).toBeFocused();
  await page.keyboard.press("j");
  await expect(rader.nth(1)).toBeFocused();
  await page.keyboard.press("k");
  await expect(rader.first()).toBeFocused();
  // k på första raden stannar där.
  await page.keyboard.press("k");
  await expect(rader.first()).toBeFocused();

  const vag = del(page, "Brådskande").getByRole("button", { name: /^Öppna: .*Vågkvitto/ });
  await vag.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: /^Punkt: Vågkvitto/ })).toBeVisible();

  // I panelen gör j ingenting med listan.
  await page.getByRole("region", { name: /^Punkt: Vågkvitto/ }).focus();
  await page.keyboard.press("j");
  await expect(rader.first()).not.toBeFocused();
});

test("p skriver ut arbetslistan för valt projekt", async ({ page }) => {
  await oppna(page, "Idag");
  await page.evaluate(() => { window.print = () => {}; });
  await page.keyboard.press("p");
  await expect(page.locator("#utskrift")).toContainText("Vågkvitto");
});

test("tangenterna gör ingenting när kommandopaletten är öppen", async ({ page }) => {
  await oppna(page, "Idag");
  await page.keyboard.press("Control+k");
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });
  await expect(palett).toBeVisible();
  await page.keyboard.press("n");
  // Bokstaven hamnar i sökfältet, inte i snabbraden.
  await expect(palett.getByRole("combobox")).toHaveValue("n");
  await expect(page.getByRole("textbox", { name: "Ny punkt" })).not.toBeFocused();
});
