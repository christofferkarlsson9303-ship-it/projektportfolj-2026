import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const KAPITEL = "BESS EPC Checklista";

test.beforeEach(async ({ page }) => {
  await oppna(page, KAPITEL);
});

const huvud = (page) => page.getByRole("region", { name: /Växjö Batteripark/ });
const rad = (page, id) => page.locator(`[id="kp-${id}"]`);

test("kapitlet har 16 faser, de löpande punkterna och alla 199 kontrollpunkter", async ({ page }) => {
  await expect(page.locator("details.epc-fas")).toHaveCount(17);
  await expect(page.locator(".epc-rad")).toHaveCount(199);
  await expect(page.locator(".epc-rad.hp")).toHaveCount(33);
  await expect(huvud(page)).toContainText("0/33");
});

test("filtret Hållpunkter visar bara de 33 hållpunkterna", async ({ page }) => {
  await page.getByRole("group", { name: "Visa markering" }).getByRole("button", { name: "Hållpunkter" }).click();
  const synliga = page.locator(".epc-rad");
  await expect(synliga).toHaveCount(33);
  await expect(page.locator(".epc-rad:not(.hp)")).toHaveCount(0);
});

test("sökningen hittar lärdomen om CT-fönster", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Sök i checklistan" }).fill("CT-fönster");
  await expect(page.locator(".epc-rad")).toHaveCount(1);
  await expect(rad(page, "3.8")).toBeVisible();
  await expect(rad(page, "3.8").locator(".epc-markering.l")).toBeVisible();
});

test("en godkänd hållpunkt räknas och syns i ändringsloggen", async ({ page }) => {
  // Fas 11 är inte utfälld från början — fäll ut den först.
  await page.locator("#fas-11 > summary").click();
  await rad(page, "11.4").getByRole("checkbox").check();
  await expect(huvud(page)).toContainText("1/33");
  await expect(rad(page, "11.4")).toHaveClass(/klar/);

  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Aktivitet" })).toContainText("EPC 11.4 hållpunkt godkänd");
});

test("Skapa UR/ÄTA skapar ett kopplat ärende från kontrollpunkten", async ({ page }) => {
  await page.locator("#fas-6 > summary").click();
  await rad(page, "6.5").getByRole("button", { name: /Skapa UR\/ÄTA/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Beskriv avvikelsen")).toHaveValue(/^Avvikelse 6\.5: Okänd förorening/);
  await dialog.getByRole("button", { name: "Skapa UR/ÄTA" }).click();

  const lank = rad(page, "6.5").getByRole("button", { name: /^UR\d{3}/ });
  await expect(lank).toBeVisible();
  await lank.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA och hinder");
  await expect(page.getByRole("region", { name: /^Ärende UR\d{3}$/ })).toContainText("Avvikelse 6.5");
});

test("en grind markeras passerad och fasen byter läge", async ({ page }) => {
  const fas = page.locator("#fas-10");
  await expect(fas).toHaveAttribute("open", "");
  await fas.getByRole("button", { name: "Markera G10 passerad idag" }).click();
  await expect(fas.locator("summary")).toContainText("Grind passerad");
  await expect(huvud(page)).toContainText("11/16");
});

test("antaget startdatum är markerat tills någon anger det", async ({ page }) => {
  const plan = huvud(page);
  await expect(plan.getByText("ANTAGANDE")).toBeVisible();
  const falt = plan.getByLabel("Startdatum för Växjö Batteripark");
  await falt.fill("2026-02-09");
  await falt.press("Enter");
  await expect(plan.getByText("ANTAGANDE")).toHaveCount(0);
});

test("Gantt-schemats fasrad öppnar fasen i checklistan", async ({ page }) => {
  await gaTill(page, "Översikt");
  await page.getByRole("button", { name: /^Fas 12 Anslutning BESS/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(KAPITEL);
  await expect(page.locator("#fas-12")).toHaveAttribute("open", "");
});

test("kommandopaletten hittar en kontrollpunkt och öppnar den", async ({ page }) => {
  await gaTill(page, "Översikt");
  await page.keyboard.press("Control+k");
  const sok = page.getByRole("combobox", { name: "Sök och hoppa" });
  await sok.fill("§ 28-anmälan");
  await sok.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(KAPITEL);
  await expect(page.locator("#fas-2")).toHaveAttribute("open", "");
  await expect(rad(page, "2.8")).toBeInViewport();
});

test("kapitlet renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, KAPITEL);
  await page.getByRole("button", { name: "Fäll ut alla" }).click();
  await expect(page.locator("details.epc-fas[open]")).toHaveCount(16);
  utanKonsolfel(fel);
});
