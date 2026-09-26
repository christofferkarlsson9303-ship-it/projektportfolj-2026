import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const KAPITEL = "Bygga batteripark";

test.beforeEach(async ({ page }) => {
  await oppna(page, KAPITEL);
});

const lage = (page) => page.getByRole("region", { name: "Lägesbild — var projekten står" });
const projektrad = (page, namn) => lage(page).getByRole("group", { name: "Välj projekt" }).getByRole("button", { name: namn });
const rad = (page, id) => page.locator(`[id="kp-${id}"]`);
/** Fäller ut en fas om den inte redan är utfälld — pågående faser är öppna från början. */
async function oppnaFas(page, nr) {
  const fas = page.locator(`#fas-${nr}`);
  if ((await fas.getAttribute("open")) === null) await fas.locator("summary").click();
  await expect(fas).toHaveAttribute("open", "");
}

const status = (page) => page.getByRole("region", { name: /^Status — / });
const erfarenhetslista = (page) => page.getByRole("region", { name: "Erfarenhetsåterföring — topp 10" });

test("guiden har 16 faser, de löpande punkterna och alla 286 kontrollpunkter att bocka av", async ({ page }) => {
  await expect(page.locator("details.epc-fas")).toHaveCount(17);
  await expect(page.locator(".epc-rad")).toHaveCount(286);
  await expect(page.locator(".epc-rad.hp")).toHaveCount(47);
  await expect(page.locator(".epc-rad input[type=checkbox]")).toHaveCount(286);
  // Checklistan skapar inga ärenden.
  await expect(page.getByRole("button", { name: /Skapa UR\/ÄTA/ })).toHaveCount(0);
});

test("summeringen visar exakt status per fas och följer avbockningen", async ({ page }) => {
  // Fas 0–9 är passerade i Växjö: 164 punkter klara via grindarna.
  await expect(status(page)).toContainText("164 av 286 punkter");
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("0/15");

  await oppnaFas(page, 10);
  await rad(page, "10.7").getByRole("checkbox").check();
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("1/15");
  await expect(status(page)).toContainText("165 av 286 punkter");
  await expect(rad(page, "10.7")).toContainText(/Klar \d{4}-\d{2}-\d{2}/);

  // Ej aktuell räknas bort ur det som återstår.
  await rad(page, "10.3").getByRole("button", { name: /^Ej aktuell/ }).click();
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("1/14");
  await expect(rad(page, "10.3")).toHaveClass(/ejaktuell/);

  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Aktivitet" })).toContainText("EPC 10.7 hållpunkt godkänd");
});

test("punkter i en passerad fas är klara via grinden", async ({ page }) => {
  await oppnaFas(page, 7);
  await expect(rad(page, "7.3").getByRole("checkbox")).toBeChecked();
  await expect(rad(page, "7.3").getByRole("checkbox")).toBeDisabled();
  await expect(rad(page, "7.3")).toContainText("Klar via G7");
});

test("en avvikelse på en punkt hamnar i erfarenhetslistan och visas på punkten i nästa projekt", async ({ page }) => {
  await expect(erfarenhetslista(page)).toContainText("Inga avvikelser eller lärdomar ännu");

  await oppnaFas(page, 10);
  await rad(page, "10.3").getByRole("button", { name: "Kommentarer på 10.3" }).click();
  const panel = rad(page, "10.3").locator(".epc-radpanel");
  await panel.getByRole("button", { name: "Avvikelse" }).click();
  await panel.getByLabel("Vad hände").fill("Stationshuset kom med skadad dörr");
  await panel.getByLabel("Gör så här nästa gång").fill("Fota vid lossning och reklamera samma dag");
  await panel.getByRole("combobox").selectOption("3");
  await panel.getByRole("button", { name: "Spara avvikelse" }).click();

  await expect(panel.locator(".epc-komm")).toContainText("Stationshuset kom med skadad dörr");
  await expect(rad(page, "10.3").getByRole("button", { name: "Kommentarer på 10.3" })).toContainText("1");
  const lista = erfarenhetslista(page);
  await expect(lista.locator(".epc-erfrad")).toHaveCount(1);
  await expect(lista).toContainText("Fota vid lossning och reklamera samma dag");
  await expect(lista).toContainText("Påverkan Hög");

  // I Alvesta visas Växjös erfarenhet på samma punkt.
  await projektrad(page, /^36038 Alvesta/).click();
  await expect(lista).toContainText("Inga avvikelser eller lärdomar ännu");
  await lista.getByRole("button", { name: "Alla projekt" }).click();
  await expect(lista.locator(".epc-erfrad")).toHaveCount(1);
  await rad(page, "10.3").getByRole("button", { name: /erfarenheter från tidigare projekt på 10.3/ }).click();
  await expect(rad(page, "10.3").locator(".epc-tidigare")).toContainText("Fota vid lossning");
});

test("lägesbilden har en rad per projekt och visar läget för valt projekt", async ({ page }) => {
  const rader = lage(page).getByRole("group", { name: "Välj projekt" }).getByRole("button");
  await expect(rader).toHaveCount(4);
  await expect(projektrad(page, /^36037 Växjö/)).toHaveAttribute("aria-pressed", "true");
  await expect(projektrad(page, /^36037 Växjö/)).toContainText(/av 16 grindar passerade/);
  await expect(projektrad(page, /^Göteborg/)).toContainText("Datum saknas");
  await expect(lage(page)).toContainText(/\d+ av 16 grindar passerade · \d+ av 47 hållpunkter klara/);
});

test("ett annat projekt väljs i lägesbilden och guiden följer med", async ({ page }) => {
  await projektrad(page, /^36038 Alvesta/).click();
  await expect(projektrad(page, /^36038 Alvesta/)).toHaveAttribute("aria-pressed", "true");
  await expect(lage(page).getByLabel("Startdatum för Alvesta Batteripark")).toBeVisible();
  // Faserna är stängda <details>, så rutan söks på attributet.
  await expect(page.locator('aside[aria-label="Fas 0 i 36038 Alvesta"]')).toBeAttached();
});

test("version 1.1: källgenomgången, nyckelvärdena och de tolv motsägelserna finns med", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Så byggs en batteripark" })).toContainText("Version 1.1");
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("3,21 V");
  await expect(page.locator(".epc-rad")).toHaveCount(1);
  await expect(rad(page, "15.17")).toBeVisible();
  await expect(page.locator("#fas-15")).toContainText("Från källgenomgången");
  await expect(page.getByRole("region", { name: "Nyckelvärden — snabbreferens" }).locator("dt")).toHaveCount(14);
  await expect(page.locator(".epc-verifiera dt")).toHaveCount(12);
});

test("filtret Hållpunkter visar bara de 47 hållpunkterna", async ({ page }) => {
  await page.getByRole("group", { name: "Visa markering" }).getByRole("button", { name: "Hållpunkter" }).click();
  await expect(page.locator(".epc-rad")).toHaveCount(47);
  await expect(page.locator(".epc-rad:not(.hp)")).toHaveCount(0);
});

test("sökningen hittar lärdomen om CT-fönster", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("CT-fönster");
  await expect(page.locator(".epc-rad")).toHaveCount(1);
  await expect(rad(page, "3.8")).toBeVisible();
  await expect(rad(page, "3.8").locator(".epc-markering.l")).toBeVisible();
});

test("en grind markeras passerad, fasen byter läge och det loggas", async ({ page }) => {
  const fas = page.locator("#fas-11");
  await fas.locator("summary").click();
  const iProjektet = fas.getByRole("complementary", { name: "Fas 11 i 36037 Växjö" });
  await iProjektet.getByRole("button", { name: "Markera G11 passerad idag" }).click();
  await expect(fas.locator("summary")).toContainText("Grind passerad");
  await expect(iProjektet).toContainText(/G11 passerad \d{4}-\d{2}-\d{2}/);
  // En senare grind gör alla tidigare passerade.
  await expect(projektrad(page, /^36037 Växjö/)).toContainText("12 av 16 grindar passerade");

  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Aktivitet" })).toContainText("G11 passerad");
});

test("antaget startdatum är markerat tills någon anger det", async ({ page }) => {
  const plan = lage(page);
  await expect(plan.getByText("ANTAGANDE")).toBeVisible();
  const falt = plan.getByLabel("Startdatum för Växjö Batteripark");
  await falt.fill("2026-02-09");
  await falt.press("Enter");
  await expect(plan.getByText("ANTAGANDE")).toHaveCount(0);
});

test("en ledtid markeras klar i förväg och går att ångra", async ({ page }) => {
  const tabell = page.getByRole("region", { name: "Ledtider för projektet" });
  const forsta = tabell.locator("tbody tr").filter({ has: page.getByRole("button", { name: /^Klar/ }) }).first();
  const arende = (await forsta.locator("td").first().locator("b").textContent()).trim();
  await forsta.getByRole("button", { name: /^Klar/ }).click();

  const raden = tabell.locator("tbody tr").filter({ hasText: arende });
  await expect(raden.getByRole("button", { name: /^Ångra/ })).toBeVisible();
  await raden.getByRole("button", { name: /^Ångra/ }).click();
  await expect(raden.getByRole("button", { name: /^Klar/ })).toBeVisible();
});

test("Gantt-schemats fasrad öppnar fasen i guiden", async ({ page }) => {
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
