import { expect, test } from "@playwright/test";
import { gaTill, oppna, projektval, utanKonsolfel } from "./hjalpare.js";

/* Idag som arbetsyta: gemensamt projektval i toppraden och punkter som
   hanteras i en panel utan sidbyte. Grunddatan: p2 hör till 36037 och har
   passerat sin frist; p3 hör till 36038. */

const rad = (page, text) => page.getByRole("button", { name: new RegExp(text) });

test("projektläge visar bara valt projekt, portföljläge visar alla", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  await expect(projektval(page)).toHaveValue("36037");
  await expect(rad(page, "Vågkvitto")).toBeVisible();
  await expect(rad(page, "Underlag förorenade massor")).toHaveCount(0);

  await projektval(page).selectOption({ label: "Alla projekt" });
  await expect(page.getByRole("region", { name: "Sammanfattning" })).toContainText("Alla projekt");
  await expect(rad(page, "Vågkvitto")).toBeVisible();
  await expect(rad(page, "Underlag förorenade massor")).toBeVisible();

  /* Portföljläget erbjuds inte i vyer som arbetar i ett projekt. */
  await gaTill(page, "Öppna punkter");
  await expect(projektval(page).locator("option", { hasText: "Alla projekt" })).toHaveCount(0);
  utanKonsolfel(fel);
});

test("en punkt hanteras i panelen: uppföljning rör inte fristen, kommentar sparas", async ({ page }) => {
  await oppna(page, "Idag");
  await rad(page, "Vågkvitto").click();

  const panel = page.getByRole("region", { name: /^Punkt: Vågkvitto/ });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("15 sep");

  const uppf = panel.getByLabel(/^Uppföljningsdatum/);
  await uppf.fill("2099-01-01");
  await uppf.blur();
  /* Fristen har passerat, så punkten ligger kvar som förfallen. */
  await expect(panel).toContainText("15 sep");
  await expect(page.getByRole("region", { name: "Brådskande" }).getByRole("button", { name: /Vågkvitto/ })).toBeVisible();

  await panel.getByRole("textbox", { name: "Ny kommentar" }).fill("Ringt leverantören");
  await panel.getByRole("button", { name: "Lägg till kommentar" }).click();
  await expect(panel).toContainText("Ringt leverantören");

  await panel.getByRole("button", { name: "Stäng" }).click();
  await expect(panel).toHaveCount(0);
  await expect(projektval(page)).toHaveValue("36037");
  await expect(rad(page, "Vågkvitto")).toBeVisible();
});
