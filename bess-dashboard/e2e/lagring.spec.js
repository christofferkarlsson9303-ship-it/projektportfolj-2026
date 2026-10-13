import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

/* Lokalt läge: webbläsarens lagring är enda lagringen. Ett misslyckat skrivförsök får inte se ut som
   "sparad". Här fejkas full lagring genom att skrivningar till portföljnyckeln kastar QuotaExceededError. */

test("full lagring visas som fel i statusraden, inte som sparad", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    window.__lagringFull = false;
    Storage.prototype.setItem = function (k, v) {
      if (window.__lagringFull && k === "batchc-portfolj-v1") {
        const e = new Error("full");
        e.name = "QuotaExceededError";
        throw e;
      }
      return orig.call(this, k, v);
    };
  });
  const { fel } = await oppna(page, "Översikt");
  const status = page.locator(".conn");

  // Normalt: ändringen sparas och statusraden säger det.
  await page.getByRole("button", { name: "Redigera projektuppgifter" }).click();
  const falt = page.getByLabel("Beställare för Växjö Batteripark");
  await falt.fill("Första");
  await falt.blur();
  await expect(status).toContainText("Lokalt läge · sparad");

  // Lagringen blir full: nästa ändring ger ett tydligt fel och en varning, och aldrig "sparad".
  await page.evaluate(() => { window.__lagringFull = true; });
  await falt.fill("Andra");
  await falt.blur();
  await expect(status).toContainText("Kunde inte spara: webbläsarens lagring är full");
  await expect(status).not.toContainText("sparad");
  await expect(page.getByText(/Kunde inte spara: webbläsarens lagring är full/).first()).toBeVisible();

  // När lagringen fungerar igen försvinner felet.
  await page.evaluate(() => { window.__lagringFull = false; });
  await falt.fill("Tredje");
  await falt.blur();
  await expect(status).toContainText("Lokalt läge · sparad");
  expect(fel).toEqual([]);
});
