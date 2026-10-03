import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { oppna, utanKonsolfel } from "./hjalpare.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION } from "../src/data/projektkontroll.js";
import { SEED } from "../src/data/seed.js";
import { kontrollId } from "../src/lib/projektkontroll.js";

async function panel(page) {
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  return page.getByRole("dialog", { name: /Fältmaterial/ });
}
async function registrera(d) {
  await d.locator("details").first().locator("summary").click();
  await d.getByRole("combobox", { name: "Resultat – P0.01", exact: true }).selectOption("ok");
  await d.getByLabel("Kontrolldatum – P0.01", { exact: true }).fill("2026-10-01");
  await d.getByLabel("Kontrollant (namn) – P0.01", { exact: true }).fill("Provare 123");
  await d.getByLabel("Bevis / protokoll och revision – P0.01", { exact: true }).fill("Kravspecifikation rev C");
  await d.getByLabel("Mätvärde / avvikelse / åtgärd / motivering – P0.01", { exact: true }).fill("Bekräftat 8 MW / 16 MWh.");
  await d.getByLabel("Mätvärde / avvikelse / åtgärd / motivering – P0.01", { exact: true }).blur();
}

test("projektchecklista sparar spårbara resultat utan att blanda enheter eller projekt", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bess-faltmaterial-v1-36037", JSON.stringify({ version: 2, mallpaket: "lagplan", mallIds: ["lag-a"] })));
  const { fel } = await oppna(page);
  const d = await panel(page);
  await expect(d.getByRole("combobox", { name: "Mallpaket", exact: true })).toHaveValue("projekt");
  await expect(d.getByRole("status")).toContainText("115 kontrollpunkter");
  await registrera(d);
  await expect(d).toContainText("1 av 115 kompletta kontroller");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}").faltkontroller?.[0]?.referens)).toBe("Kravspecifikation rev C");
  await page.reload(); const igen = await panel(page);
  await expect(igen).toContainText("1 av 115 kompletta kontroller");
  await igen.getByLabel("Enhet / serienummer", { exact: true }).fill("Container 2");
  await expect(igen).toContainText("0 av 115 kompletta kontroller");
  await igen.getByLabel("Enhet / serienummer", { exact: true }).fill("");
  await expect(igen).toContainText("1 av 115 kompletta kontroller");
  await igen.getByRole("combobox", { name: "Projekt", exact: true }).selectOption("36038");
  await expect(igen).toContainText("0 av 115 kompletta kontroller");
  utanKonsolfel(fel);
});

test("rapport exporterar verkligt resultat och markerar delurval; blankett förblir blank", async ({ page }, info) => {
  test.setTimeout(90_000);
  await oppna(page); const d = await panel(page);
  await registrera(d);
  await d.getByRole("button", { name: "Rensa moment", exact: true }).click();
  await d.getByRole("checkbox", { name: /^Moment 1:/ }).check();
  await d.getByLabel("Kontrollplan / dokumentnummer och revision", { exact: true }).fill("KP-001 rev C");
  const promise = page.waitForEvent("download"); await d.getByRole("button", { name: "Ladda ned PDF", exact: true }).click();
  const file = await promise; const path = info.outputPath("delrapport.pdf"); await file.saveAs(path);
  expect((await readFile(path)).subarray(0,5).toString()).toBe("%PDF-");
  await page.evaluate(() => { window.print = () => {}; });
  await d.getByRole("button", { name: "Skriv ut", exact: true }).click();
  const report = page.locator("#utskrift");
  await expect(report).toContainText("Delurval – arbetsunderlag");
  await expect(report).toContainText("Provare 123");
  await expect(report).toContainText("Kravspecifikation rev C");
  await expect(report).toContainText("Ej kontrollerad");
  await expect(report.locator(".field-check")).toHaveCount(4);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await d.getByRole("checkbox", { name: "Ta med registrerade resultat i egenkontrollrapporten" }).uncheck();
  await d.getByRole("button", { name: "Skriv ut", exact: true }).click();
  await expect(report).toContainText("Blank projektchecklista");
  await expect(report).toContainText("□ Ej OK");
  await expect(report).not.toContainText("Provare 123");
});

test("komplett egenkontroll har fasindex och slutdokumentationens genväg", async ({ page }, info) => {
  test.setTimeout(180_000);
  const data = structuredClone(SEED);
  data.faltkontroller = PROJEKTMALLAR.flatMap((m) => m.punkter.map((p) => ({
    id: kontrollId("36037", "Hela anläggningen", p.id), projektId: "36037", omfattning: "Hela anläggningen", punktId: p.id,
    resultat: "ok", datum: "2026-10-01", kontrollant: "Verifierad kontrollant", referens: `Protokoll-${p.id} rev B`, mallrevision: PROJEKTKONTROLL_REVISION,
  })));
  await page.addInitScript((s) => localStorage.setItem("batchc-portfolj-v1", JSON.stringify(s)), data);
  const { fel } = await oppna(page, "Slutdokumentation");
  await page.getByRole("button", { name: "Projektets egenkontrollrapport", exact: true }).click();
  const d = page.getByRole("dialog", { name: /Fältmaterial/ });
  await d.getByLabel("Kontrollplan / dokumentnummer och revision", { exact: true }).fill("KP-001 rev B");
  await expect(d).toContainText("115 av 115 kompletta kontroller");
  await expect(d).toContainText("Redo för granskning");
  const promise = page.waitForEvent("download"); await d.getByRole("button", { name: "Ladda ned PDF", exact: true }).click();
  const file = await promise; const path = info.outputPath("komplett-rapport.pdf"); await file.saveAs(path);
  expect((await readFile(path)).length).toBeGreaterThan(30_000);
  await page.evaluate(() => { window.print = () => {}; });
  await d.getByRole("button", { name: "Skriv ut", exact: true }).click();
  const report = page.locator("#utskrift");
  await expect(report).toContainText("Egenkontroll – redo för granskning");
  await expect(report.locator(".field-check")).toHaveCount(115);
  await expect(report.locator(".field-index tbody tr")).toHaveCount(16);
  await expect(report).toContainText("P15.04");
  if (info.project.name === "desktop") await page.pdf({ path: info.outputPath("komplett-print.pdf"), printBackground: true, preferCSSPageSize: true });
  utanKonsolfel(fel);
});
