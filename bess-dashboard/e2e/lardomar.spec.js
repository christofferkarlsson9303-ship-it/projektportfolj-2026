import { expect, test } from "@playwright/test";
import { gaTill, oppna, projektval, utanKonsolfel } from "./hjalpare.js";

/* Erfarenhetsåterföring hela vägen: en lärdom på en punkt i Alvesta syns vid
   samma nästa åtgärd i Växjö. Grunddatan: båda projekten har samma nästa
   punkt i checklistan (samma moment och ledtid). */

test("en lärdom i ett projekt syns vid samma nästa åtgärd i ett annat", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  const band = page.getByRole("region", { name: "Sammanfattning" });
  const nasta = band.getByRole("button", { name: /^Nästa åtgärd: / });

  // Växjö först: ingen lärdom än.
  await expect(nasta).toBeVisible();
  const punkt = (await nasta.getAttribute("aria-label")).replace(/^Nästa åtgärd: /, "");
  await expect(band).not.toContainText(/\d+ lärdom/);

  // Alvesta: öppna samma punkt och spara en lärdom med råd.
  await projektval(page).selectOption("36038");
  await expect(nasta).toHaveAttribute("aria-label", `Nästa åtgärd: ${punkt}`);
  const id = (await nasta.getAttribute("data-post")).replace(/^kp-/, "");
  await nasta.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bygga batteripark");
  const rad = page.locator(`[id="kp-${id}"]`);
  await rad.getByRole("button", { name: `Fler val för ${id}` }).click();
  await rad.getByRole("group", { name: `Val för ${id}` }).getByRole("button", { name: /^Kommentera/ }).click();
  const panel = rad.locator(".epc-radpanel");
  await panel.getByRole("button", { name: "Lärdom" }).click();
  await panel.getByLabel("Vad hände").fill("Planen kom sent till beställaren");
  await panel.getByLabel("Gör så här nästa gång").fill("Skicka planen två veckor före moment 11");
  await panel.getByRole("button", { name: "Spara lärdom" }).click();
  await expect(panel.locator(".epc-komm")).toContainText("Planen kom sent till beställaren");

  // Tillbaka till Växjö: bandet visar lärdomen vid nästa åtgärd.
  await gaTill(page, "Idag");
  await projektval(page).selectOption("36037");
  await expect(band).toContainText("1 lärdom");
  utanKonsolfel(fel);
});
