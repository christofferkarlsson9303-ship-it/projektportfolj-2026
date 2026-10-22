import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Intern statusrapport per månad: förslag per område, eget ljus och kommentar,
   eskalerade frågor, låsning med frysta nyckeltal och utskrift. */

const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test("PL sätter ljus och kommentar, lägger till en fråga, låser och skriver ut", async ({ page }) => {
  const { fel } = await oppna(page, "Intern statusrapport");
  const status = page.getByRole("region", { name: "Statussammanställning" });
  for (const o of ["Tid", "Ekonomi", "Resurser", "ÄTA", "Risker", "Eskalerade frågor", "Kvalitet", "Fakturering"]) await expect(status).toContainText(o);
  await expect(status).toContainText("Förslag:");

  // Eget ljus och kommentar sparas som utkast för månaden.
  const tid = status.getByRole("group", { name: "Ljus: Tid" });
  await tid.getByRole("button", { name: "Röd" }).click();
  await expect(tid.getByRole("button", { name: "Röd" })).toHaveAttribute("aria-pressed", "true");
  await status.getByLabel("Kommentar: Tid").fill("Fundamenten försenade två veckor.");
  await status.getByLabel("Kommentar: Tid").press("Enter");
  await expect.poll(async () => (await portfolj(page)).statusrapporter?.[0]?.omraden?.tid).toEqual({ ljus: "rod", kommentar: "Fundamenten försenade två veckor." });

  // Eskalerad fråga.
  const fragor = page.getByRole("region", { name: "Eskalerade frågor och beslut" });
  await fragor.getByRole("button", { name: "Ny fråga" }).click();
  await fragor.getByLabel("Fråga 1: fråga och konsekvens").fill("Forcering av betong kostar 180 kkr");
  await fragor.getByLabel("Fråga 1: fråga och konsekvens").press("Enter");
  await expect.poll(async () => (await portfolj(page)).statusrapporter?.[0]?.eskalerade?.[0]?.beskrivning).toBe("Forcering av betong kostar 180 kkr");

  // Utskrift.
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Skriv ut som PDF" }).click();
  const doc = page.locator("#utskrift");
  await expect(doc).toContainText("Intern statusrapport");
  await expect(doc).toContainText("Statussammanställning");
  await expect(doc).toContainText("Fundamenten försenade två veckor.");
  await expect(doc).toContainText("Forcering av betong kostar 180 kkr");
  await expect(doc).toContainText("ska inte skickas till beställaren");
  await page.keyboard.press("Escape");

  // Lås: nyckeltalen fryses och rapporten går inte att ändra.
  await page.getByRole("button", { name: "Lås rapporten" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lås", exact: true }).click();
  await expect.poll(async () => (await portfolj(page)).statusrapporter?.[0]?.status).toBe("last");
  expect((await portfolj(page)).statusrapporter[0].nyckeltal).toBeTruthy();
  await expect(tid.getByRole("button", { name: "Grön" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Lås rapporten" })).toHaveCount(0);
  utanKonsolfel(fel);
});
