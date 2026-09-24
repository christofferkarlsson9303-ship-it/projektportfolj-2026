import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Slutdokumentation");
});

const index = (page) => page.locator(".kpi", { hasText: "Överlämningsindex" });
const handlingar = (page) => page.locator(".slutdok-rad");
/* Första raden som går att ändra — slutbesiktningsprotokollet är låst. */
const forsta = (page) => page.locator(".slutdok-rad", { has: page.locator(".slutdok-bock:enabled") }).first();

/* Raderna sås i efterInlasning, inte av vyn — de ska alltså finnas redan
   första gången någon öppnar fliken, utan att något klickas. */
test("handlingarna finns utan att vyn behövt skriva något", async ({ page }) => {
  expect(await handlingar(page).count()).toBeGreaterThan(0);
  await expect(page.locator(".kpi .label", { hasText: /^Överlämningsindex$/ })).toBeVisible();
});

test("M6-grinden är spärrad från början", async ({ page }) => {
  const grind = page.locator(".kpi", { hasText: "M6-grind" });
  await expect(grind).toContainText("Spärrad");
  await expect(page.getByText(/kräver 100 % godkända obligatoriska handlingar/)).toBeVisible();
});

test("slutbesiktningsprotokollet är låst tills grinden öppnat", async ({ page }) => {
  const rad = handlingar(page).filter({ hasText: /slutbesiktningsprotokoll/i }).first();
  test.skip((await rad.count()) === 0, "mallen saknar slutbesiktningsprotokoll");

  // Låst betyder varken bock eller statusknappar — den går inte att sätta för hand.
  await expect(rad.locator(".slutdok-bock")).toBeDisabled();
  await expect(rad.getByRole("group", { name: /^Status för / })).toHaveCount(0);
  await expect(rad).toContainText("Väntar");
});

test("en bock godkänner handlingen och höjer indexet", async ({ page }) => {
  const rad = forsta(page);
  const bock = rad.locator(".slutdok-bock");

  await expect(index(page)).toContainText("0 %");
  await bock.click();
  await expect(bock).toHaveAttribute("aria-pressed", "true");
  await expect(rad.getByRole("button", { name: "Godkänd", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(index(page)).not.toContainText("0 %");
});

test("att bocka ur skickar tillbaka handlingen till granskning", async ({ page }) => {
  const rad = forsta(page);
  const bock = rad.locator(".slutdok-bock");

  await bock.click();
  await expect(bock).toHaveAttribute("aria-pressed", "true");
  await bock.click();
  await expect(bock).toHaveAttribute("aria-pressed", "false");
  await expect(rad.getByRole("button", { name: "Granskas" })).toHaveAttribute("aria-pressed", "true");
  await expect(index(page)).toContainText("0 %");
});

test("statusknapparna sätter mellanlägen utan att räknas som godkänt", async ({ page }) => {
  const rad = forsta(page);
  await rad.getByRole("button", { name: "Beställd" }).click();

  await expect(rad.getByRole("button", { name: "Beställd" })).toHaveAttribute("aria-pressed", "true");
  await expect(rad.locator(".slutdok-bock")).toHaveAttribute("aria-pressed", "false");
  await expect(index(page)).toContainText("0 %");
});

test("kategorins räknare följer med", async ({ page }) => {
  const kort = page.locator(".slutdok-kategori").first();
  const raknare = kort.locator(".mbelopp");
  const fore = await raknare.textContent();

  await kort.locator(".slutdok-bock:enabled").first().click();
  await expect(raknare).not.toHaveText(fore);
});

test("statusbytet hamnar i ändringsloggen via toasten", async ({ page }) => {
  await forsta(page).locator(".slutdok-bock").click();
  await expect(page.getByText("Status uppdaterad och loggad")).toBeVisible();
});

test("filtret Kvar att göra döljer godkända handlingar", async ({ page }) => {
  const rad = forsta(page);
  const krav = (await rad.locator(".slutdok-krav").textContent()).trim();
  await rad.locator(".slutdok-bock").click();

  await page.getByRole("group", { name: "Visa handlingar" }).getByRole("button", { name: "Kvar att göra" }).click();
  await expect(handlingar(page).filter({ hasText: krav })).toHaveCount(0);

  await page.getByRole("group", { name: "Visa handlingar" }).getByRole("button", { name: "Alla" }).click();
  await expect(handlingar(page).filter({ hasText: krav })).toHaveCount(1);
});

test("filtret Kategori 1–4 visar bara M6-kritiska kategorier", async ({ page }) => {
  await page.getByRole("group", { name: "Visa handlingar" }).getByRole("button", { name: "Kategori 1–4" }).click();
  await expect(page.locator(".slutdok-kategori")).toHaveCount(4);
  await expect(handlingar(page).filter({ hasText: /slutbesiktningsprotokoll/i })).toHaveCount(0);
});

test("detaljerna öppnas i en sidopanel och sparar ansvarig, referens och kommentar", async ({ page }) => {
  const rad = forsta(page);
  await rad.getByRole("button", { name: /^Detaljer för / }).click();

  const panel = page.getByRole("region", { name: /^Detaljer för / });
  await expect(panel).toBeVisible();

  await panel.getByLabel(/^Ansvarig för /).fill("Harju Elekter");
  await panel.getByLabel(/^Referens för /).fill("DIA-2026-118");
  await panel.getByLabel(/^Kommentar för /).fill("Väntar på rev B");
  await panel.getByLabel(/^Kommentar för /).blur();

  // Raden sammanfattar det som fyllts i, utan att panelen behöver vara öppen.
  await expect(rad.locator(".slutdok-meta")).toContainText("Harju Elekter");
  await expect(rad.locator(".slutdok-meta")).toContainText("Kommenterad");

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await page.reload();
  await forsta(page).getByRole("button", { name: /^Detaljer för / }).click();
  const igen = page.getByRole("region", { name: /^Detaljer för / });
  await expect(igen.getByLabel(/^Ansvarig för /)).toHaveValue("Harju Elekter");
  await expect(igen.getByLabel(/^Kommentar för /)).toHaveValue("Väntar på rev B");
});

test("status i sidopanelen och på raden är samma sak", async ({ page }) => {
  const rad = forsta(page);
  await rad.getByRole("button", { name: /^Detaljer för / }).click();
  const panel = page.getByRole("region", { name: /^Detaljer för / });

  await panel.getByRole("button", { name: "Godkänd", exact: true }).click();
  await expect(rad.locator(".slutdok-bock")).toHaveAttribute("aria-pressed", "true");
});

test("status är låst per projekt, inte globalt", async ({ page }) => {
  await forsta(page).locator(".slutdok-bock").click();
  await expect(index(page)).not.toContainText("0 %");

  // Projektväljaren är en knappgrupp, inte en <select>.
  const valjare = page.getByRole("group", { name: "Välj projekt" });
  const ovald = valjare.locator('button[aria-pressed="false"]').first();
  expect(await ovald.count(), "portföljen ska ha fler än ett projekt").toBe(1);
  // Låses mot namnet — attributfiltret skulle annars peka om efter klicket.
  const annat = valjare.getByRole("button", { name: (await ovald.textContent()).trim(), exact: true });

  await annat.click();
  await expect(annat).toHaveAttribute("aria-pressed", "true");
  await expect(index(page)).toContainText("0 %");
  await expect(page.locator(".kpi", { hasText: "M6-grind" })).toContainText("Spärrad");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Slutdokumentation");
  await forsta(page).getByRole("button", { name: "Beställd" }).click();
  await forsta(page).getByRole("button", { name: /^Detaljer för / }).click();
  await page.keyboard.press("Escape");
  utanKonsolfel(fel);
});
