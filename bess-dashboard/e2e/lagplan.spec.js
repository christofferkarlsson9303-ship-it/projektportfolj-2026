import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { oppna, gaTill, utanKonsolfel } from "./hjalpare.js";

test("lagplan: två namn per lag, DC-stoppunkt, PDF och rent lagurval", async ({ page }, info) => {
  test.setTimeout(90_000);
  const { fel } = await oppna(page);
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  const d = page.getByRole("dialog", { name: /Fältmaterial/ });
  await d.getByRole("combobox", { name: "Mallpaket", exact: true }).selectOption("lagplan");
  await expect(d.getByRole("combobox", { name: "Mallpaket", exact: true })).toHaveValue("lagplan");
  await expect(d.getByRole("status")).toContainText("41 kontrollpunkter");
  await d.getByLabel("Montör 1 – Lag B", { exact: true }).fill("Dan");
  await d.getByLabel("Montör 2 – Lag B", { exact: true }).fill("Adam");
  await d.getByRole("button", { name: "Endast Lag B", exact: true }).click();
  await d.getByRole("combobox", { name: "Dokumenttyp", exact: true }).selectOption("paket");
  await expect(d.getByRole("status")).toContainText("9 kontrollpunkter");
  const download = page.waitForEvent("download");
  await d.getByRole("button", { name: "Ladda ned PDF", exact: true }).click();
  const file = await download; const path = info.outputPath("lag-b.pdf"); await file.saveAs(path);
  expect((await readFile(path)).subarray(0,5).toString()).toBe("%PDF-");
  await page.evaluate(() => { window.print = () => {}; });
  await d.getByRole("button", { name: "Skriv ut", exact: true }).click();
  const print = page.locator("#utskrift");
  await expect(print.locator(".field-check:has(.field-reference)")).toHaveCount(18);
  await expect(print).toContainText("Dan + Adam");
  await expect(print).toContainText("DC-säkringar före DC-anslutning");
  await expect(print).toContainText("A.09");
  await expect(print).not.toContainText("C.04");
  await expect(print).toContainText("□ Ej OK");
  if (info.project.name === "desktop") await page.pdf({ path: info.outputPath("lag-b-print.pdf"), printBackground: true, preferCSSPageSize: true });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  await expect(d.getByLabel("Montör 2 – Lag B", { exact: true })).toHaveValue("Adam");
  await expect(d.getByRole("status")).toContainText("9 kontrollpunkter");
  utanKonsolfel(fel);
});

test("äldre fältval tillåter val av lagplan och tekniska mallar", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bess-faltmaterial-v1-36037", JSON.stringify({ mallIds: ["precheck"] })));
  await oppna(page);
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  const d = page.getByRole("dialog", { name: /Fältmaterial/ });
  await d.getByRole("combobox", { name: "Mallpaket", exact: true }).selectOption("lagplan");
  await expect(d.getByRole("status")).toContainText("41 kontrollpunkter");
  await d.getByRole("button", { name: "Arbetsledarens lista", exact: true }).click();
  await expect(d.getByRole("status")).toContainText("15 kontrollpunkter");
  await d.getByRole("combobox", { name: "Mallpaket", exact: true }).selectOption("teknisk");
  await expect(d.getByRole("status")).toContainText("49 kontrollpunkter");
});


test("engångslista av markerade uppgifter bevarar projektets lagval", async ({ page }) => {
  await oppna(page);
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  const d = page.getByRole("dialog", { name: /Fältmaterial/ });
  await d.getByRole("combobox", { name: "Mallpaket", exact: true }).selectOption("lagplan");
  await d.getByLabel("Montör 1 – Lag A", { exact: true }).fill("Dan");
  await d.getByRole("button", { name: "Endast Lag A", exact: true }).click();
  await d.getByRole("button", { name: "Stäng", exact: true }).click();
  await gaTill(page, "Öppna punkter");
  await page.getByRole("region", { name: "Öppna punkter", exact: true }).locator("tbody tr").first().getByRole("checkbox", { name: /^Markera/ }).check();
  await page.getByRole("button", { name: "Fältmaterial av markerade (1)" }).click();
  await expect(d.getByRole("status")).toContainText("1 projektuppgifter");
  await d.getByRole("button", { name: "Stäng", exact: true }).click();
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  await expect(d.getByRole("combobox", { name: "Mallpaket", exact: true })).toHaveValue("lagplan");
  await expect(d.getByLabel("Montör 1 – Lag A", { exact: true })).toHaveValue("Dan");
  await expect(d.getByRole("status")).toContainText("9 kontrollpunkter");
});
