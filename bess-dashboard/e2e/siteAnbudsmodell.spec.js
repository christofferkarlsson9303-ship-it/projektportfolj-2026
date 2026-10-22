import { expect, test } from "@playwright/test";
import { sitePanel, oppna, utanKonsolfel } from "./hjalpare.js";
import { SEED } from "../src/data/seed.js";

/* Anbudsmodellen på siten: Vaggeryd-projektet visar den levererade 3D-filen i en sandlåda,
   andra projekt gör det inte. Själva modellen hämtar three.js från cdnjs; här stoppas den
   hämtningen, så testet kontrollerar inkopplingen, inte modellens ritning. */

const VY = "Siten i 3D";

async function medPortfolj(page, fn) {
  const data = structuredClone(SEED);
  fn(data);
  await page.addInitScript((s) => localStorage.setItem("batchc-portfolj-v1", JSON.stringify(s)), data);
}

test("Vaggeryd visar anbudsmodellen i en sandlåda", async ({ page }) => {
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await medPortfolj(page, (d) => {
    d.projekt[0].namn = "Vaggeryd 100 MW";
  });
  await oppna(page, VY);

  await sitePanel(page, "Underlag");
  await page.getByText("Anbudsmodell som referens", { exact: true }).click();
  const kort = page.getByRole("region", { name: /^Anbudsmodell — Vaggeryd 100 MW/ });
  await expect(kort).toBeVisible();
  await expect(kort).toContainText("Båramo 1:17");
  const ram = kort.locator('iframe[data-roll="anbudsmodell"]');
  await expect(ram).toHaveAttribute("sandbox", "allow-scripts");
  // Filen är orörd: rubriken och konfigurationsknapparna finns i ramen.
  const inne = page.frameLocator('iframe[data-roll="anbudsmodell"]');
  await expect(inne.getByRole("heading", { name: "Vaggeryd 100 MW, batterilager" })).toBeVisible();
  await expect(inne.getByRole("button", { name: "4h · 400 MWh" })).toBeVisible();
  // Appens egen site finns kvar under.
  await expect(page.getByRole("region", { name: /^Siten — / })).toBeVisible();
});

test("andra projekt har ingen anbudsmodell, och norrpilen syns i 3D-vyn", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await expect(page.getByRole("region", { name: /^Siten — / })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Anbudsmodell — / })).toHaveCount(0);
  await expect(page.locator('[data-roll="norrpil"]')).toBeVisible();
  utanKonsolfel(fel);
});

