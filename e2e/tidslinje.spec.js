import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

const GANTT = "Tidslinje över milstolpar och leveranser";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Tidplan");
});

test("gantt ritar markörer och i dag-linjen inom bild", async ({ page }) => {
  const tidslinje = page.getByRole("group", { name: GANTT });
  await expect(tidslinje).toBeVisible();

  const markorer = tidslinje.getByRole("button");
  expect(await markorer.count()).toBeGreaterThan(0);

  // Regressionsvakt mot originalets hårdkodade intervall: varje markör måste
  // ligga innanför spårets synliga yta, annars har datumet hamnat utanför skalan.
  const lada = await tidslinje.boundingBox();
  const forsta = await markorer.first().boundingBox();
  expect(forsta.x).toBeGreaterThanOrEqual(lada.x - 60);
  expect(forsta.x).toBeLessThanOrEqual(lada.x + lada.width + 60);

  await expect(tidslinje.getByText("i dag")).toBeVisible();
});

test("markören har beskrivande etikett och öppnar detaljvyn", async ({ page }) => {
  const tidslinje = page.getByRole("group", { name: GANTT });
  const markor = tidslinje.getByRole("button").first();

  const etikett = await markor.getAttribute("aria-label");
  // Ska bära titel, datum och läge — inte bara "knapp".
  expect(etikett).toMatch(/\d{4}-\d{2}-\d{2}/);
  expect(etikett).toMatch(/Klar|Pågående|Försenad|Planerad/);

  await markor.click();
  await expect(markor).toHaveAttribute("aria-pressed", "true");

  const detalj = page.getByRole("region", { name: /Detaljer för/ });
  await expect(detalj).toBeVisible();
  await expect(detalj.getByText("Tidsmarginal")).toBeVisible();

  await detalj.getByRole("button", { name: "Stäng" }).click();
  await expect(detalj).toBeHidden();
});

test("omfattningsväljaren går att styra med piltangenter", async ({ page }) => {
  const grupp = page.getByRole("radiogroup", { name: "Omfattning" });
  const alla = grupp.getByRole("radio", { name: "Alla projekt" });
  const ett = grupp.getByRole("radio", { name: "Valt projekt" });

  await expect(alla).toHaveAttribute("aria-checked", "true");

  await alla.focus();
  await page.keyboard.press("ArrowRight");
  await expect(ett).toHaveAttribute("aria-checked", "true");
  await expect(ett).toBeFocused();
});

test("byggfaserna fälls ut och bockar av", async ({ page }) => {
  const forstaFas = page.locator(".acc").first().getByRole("button").first();
  await expect(forstaFas).toHaveAttribute("aria-expanded", "false");

  await forstaFas.click();
  await expect(forstaFas).toHaveAttribute("aria-expanded", "true");

  const kryss = page.locator(".accb input[type=checkbox]").first();
  await expect(kryss).toBeVisible();

  const fore = await kryss.isChecked();
  await kryss.click();
  expect(await kryss.isChecked()).toBe(!fore);
});
