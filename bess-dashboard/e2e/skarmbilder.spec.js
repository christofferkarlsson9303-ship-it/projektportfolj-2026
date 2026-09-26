import { test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

/* Fångar skärmbilder av varje vy i ljust och mörkt läge.

   Syftet är inte visuell regression (inga jämförelser mot referensbilder) utan
   att ge en faktisk bild att titta på under utveckling — kör med
   `npm run e2e:bilder` och öppna e2e/skarmbilder/.

   Kör bara i desktop-projektet; mobilvyn har egna spec-tester. */

const VYER = [
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
];

test.describe("skärmbilder", () => {
  // Varje vy renderas, målas klart och fotas i helskärm — det tar längre tid
  // än ett vanligt test.
  test.setTimeout(180_000);

  for (const lage of ["light", "dark"]) {
    test(`${lage} läge`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "bara desktop");
      await oppna(page);
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), lage);

      for (const vy of VYER) {
        await gaTill(page, vy);
        // Låt fonter och eventuella diagram hinna måla klart.
        await page.waitForTimeout(350);
        const filnamn = vy.replace(/[^\wåäöÅÄÖ]+/g, "_");
        await page.screenshot({
          path: `e2e/skarmbilder/${lage}-${filnamn}.png`,
          fullPage: true,
        });
      }
    });
  }
});
