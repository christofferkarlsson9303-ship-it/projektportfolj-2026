import { test, expect } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test("beställarrapporten visar faser, M1–M7 och anläggning, och skriver ut dem", async ({ page }) => {
  const { fel } = await oppna(page, "Beställarrapport");

  const faser = page.getByRole("region", { name: "Faser i rapporten" });
  await expect(faser).toContainText("Fas 1");
  await expect(faser).toContainText("Betalningsmilstolpar");
  await expect(faser).toContainText(/M3 · 25 %/);
  await expect(page.getByRole("region", { name: "Anläggning och prognos" })).toContainText("Växjö Energi");

  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Skriv ut som PDF" }).click();
  const doc = page.locator("#utskrift");
  await expect(doc).toContainText("Projektets faser");
  await expect(doc).toContainText("Betalningsmilstolpar M1–M7");
  await expect(doc).toContainText("Fas 4 · Mark och betong");
  await expect(doc).toContainText("Anläggning");
  await expect(doc).toContainText("Beräknad slutbesiktning");
  await expect(doc.locator("svg.rap-kurva")).toHaveCount(1);
  // Låsta faser listas inte som rader, bara som en rad om vad som återstår.
  await expect(doc).toContainText(/Återstår: fas \d/);
  utanKonsolfel(fel);
});
