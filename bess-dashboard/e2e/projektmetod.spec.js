import { test, expect } from "@playwright/test";
import { oppna, gaTill, utanKonsolfel } from "./hjalpare.js";
import { VYER } from "../src/data/vyer.js";

test("enkel meny, synlig sökknapp och ordlista hjälper utan att dölja funktioner", async ({ page }, info) => {
  const { fel } = await oppna(page, "Min projektmetod");
  await expect(page.getByRole("heading", { name: "Hela projektet i sex steg", exact: true })).toBeVisible();
  await page.getByLabel("Sök i ordlistan").fill("relationsritning");
  await expect(page.getByRole("region", { name: "Ordlista – svåra ord på vanlig svenska", exact: true })).toContainText("hur det faktiskt blev byggt");
  await page.getByRole("button", { name: "Sök", exact: true }).click();
  const sok = page.getByRole("combobox", { name: "Sök och hoppa" });
  await expect(sok).toBeFocused(); await sok.fill("HSEQ"); await sok.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("HSEQ / BAS-U");
  await page.locator("main details").first().locator("summary").click();
  await expect(page.locator("main")).toContainText("Gör skyddsrond");
  await gaTill(page, "Min projektmetod");
  const ham = page.getByRole("button", { name: /Öppna menyn|Stäng menyn/ });
  if (await ham.isVisible() && await ham.getAttribute("aria-expanded") === "false") await ham.click();
  const nav = page.getByRole("navigation", { name: "Huvudmeny" });
  await expect(nav.getByRole("button", { name: "Tidrapport", exact: true })).toHaveCount(0);
  await nav.getByRole("button", { name: "Visa alla funktioner", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Tidrapport", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Visa enkel meny", exact: true }).click();
  if (await ham.isVisible()) await page.getByRole("button", { name: "Stäng sidomenyn", exact: true }).click();
  await page.screenshot({ path: info.outputPath("projektmetod.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Visa stegets byggfaser", exact: true }).last().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bygga batteripark");
  await expect(page.locator("#fas-14")).toHaveAttribute("open", "");
  await expect(page.locator("#fas-14").locator("summary").first()).toBeInViewport();
  utanKonsolfel(fel);
});

test("nytt projekt har tomma mallar och finns kvar efter omladdning", async ({ page }) => {
  const { fel } = await oppna(page, "Min projektmetod");
  await page.getByRole("button", { name: "Nytt projekt", exact: true }).click();
  const d = page.getByRole("dialog", { name: "Skapa nytt projekt" });
  await d.getByLabel("Projektnamn", { exact: true }).fill("Kalmar nytt testprojekt");
  await d.getByLabel("Projektnummer (om du har det)").fill("90001");
  await d.getByLabel("Beställare", { exact: true }).fill("Ny beställare");
  await d.getByRole("button", { name: "Skapa projekt", exact: true }).click();
  await expect(page.getByRole("region", { name: "En arbetsmetod för varje projekt", exact: true })).toContainText("90001 · Kalmar nytt testprojekt");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}").projekt?.some((p) => p.nr === "90001"))).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");
  await expect(page.getByRole("region", { name: "En arbetsmetod för varje projekt", exact: true })).toContainText("Kalmar nytt testprojekt");
  await gaTill(page, "Milstolpar M1–M7");
  await expect(page.locator("main")).toContainText("Standardmall från Batch C, inte ditt kontrakts betalplan");
  await gaTill(page, "ÄTA och hinder");
  await expect(page.locator("main")).toContainText("Fristerna är en mall.");
  await gaTill(page, "Slutdokumentation");
  await expect(page.locator(".slutdok-rad").first()).toContainText("Ej påbörjad");
  await page.getByRole("button", { name: "Projektets egenkontrollrapport", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Fältmaterial/ })).toContainText("0 av 115 kompletta kontroller");
  utanKonsolfel(fel);
});

test("byggfasens egenkontroller delar resultat och sparar sista texten vid Escape", async ({ page }) => {
  await oppna(page, "Bygga batteripark");
  const fas = page.locator("#fas-0");
  await fas.locator("summary").first().click();
  const lage = fas.getByRole("region", { name: "Egenkontroller i fas 0" });
  await expect(lage).toContainText("0 av 4 kompletta");
  await lage.getByRole("button", { name: "Registrera egenkontroller – fas 0", exact: true }).click();
  const d = page.getByRole("dialog", { name: /Fältmaterial/ });
  await expect(d.getByRole("status")).toContainText("4 kontrollpunkter");
  await d.locator("details").first().locator("summary").click();
  await d.getByRole("combobox", { name: "Resultat – P0.01", exact: true }).selectOption("ok");
  await d.getByLabel("Kontrolldatum – P0.01", { exact: true }).fill("2026-10-01");
  await d.getByLabel("Kontrollant (namn) – P0.01", { exact: true }).fill("Kontrollant A");
  const ref = d.getByLabel("Bevis / protokoll och revision – P0.01", { exact: true });
  await ref.fill("Kravspecifikation rev D"); await ref.press("Escape");
  await expect(d).not.toBeVisible(); await expect(lage).toContainText("1 av 4 kompletta");
  await page.getByRole("button", { name: "Fältmaterial", exact: true }).click();
  await expect(d.getByRole("status")).toContainText("115 kontrollpunkter");
  await expect(d).toContainText("1 av 115 kompletta kontroller");
  await d.locator("details").first().locator("summary").click();
  await expect(d.getByLabel("Bevis / protokoll och revision – P0.01", { exact: true })).toHaveValue("Kravspecifikation rev D");
});

test("alla sidor går att öppna och har enkel vägledning", async ({ page }) => {
  test.setTimeout(120_000);
  const { fel } = await oppna(page);
  for (const [id, namn] of VYER.filter(([id]) => id !== "_sek")) {
    await page.goto(`/#/${id}/36037`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(namn);
    if (id !== "metod") await expect(page.locator("main details").first().locator("summary")).toContainText("Gör så här:");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: id }).toBe(true);
  }
  utanKonsolfel(fel);
});
