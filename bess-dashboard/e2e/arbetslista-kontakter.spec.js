import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Arbetslistan från Idag: "Hela laget" ger papper för alla, med plats och vem
   man ringer. Grunddatan: 36037 Växjö; BAS-U Daniel Larsson gäller båda
   projekten, elsäkerhetsledaren Josef Fällman bara Alvesta. */

test("Hela laget skriver ut arbetslistan med plats och vem man ringer", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Skriv ut arbetslista – hela laget" }).click();

  const papper = page.locator("#utskrift");
  await expect(papper).toContainText("Arbetslista – BESS");
  await expect(papper).toContainText("Plats: Växjö");
  await expect(papper).toContainText("Ring vid frågor");
  // Utskriftsytan är dold på skärmen, så texten kontrolleras, inte synligheten.
  await expect(papper.locator(".field-kontakter")).toContainText(/Arbetsledare \/ BAS-U\s*Daniel Larsson/);
  // Numret skrivs för hand — appen bär inga telefonnummer.
  await expect(papper).toContainText("Tel: ____");
  await expect(papper).not.toContainText("Josef Fällman");
  utanKonsolfel(fel);
});
