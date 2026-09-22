import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Slutdokumentation");
});

/* Raderna sås i efterInlasning, inte av vyn — de ska alltså finnas redan
   första gången någon öppnar fliken, utan att något klickas. */
test("handlingarna finns utan att vyn behövt skriva något", async ({ page }) => {
  const rader = page.locator("tbody tr");
  expect(await rader.count()).toBeGreaterThan(0);
  await expect(page.locator(".kpi .label", { hasText: /^Överlämningsindex$/ })).toBeVisible();
});

test("M6-grinden är spärrad från början", async ({ page }) => {
  const grind = page.locator(".kpi", { hasText: "M6-grind" });
  await expect(grind).toContainText("Spärrad");
  await expect(page.getByText(/kräver 100 % godkända obligatoriska handlingar/)).toBeVisible();
});

test("slutbesiktningsprotokollet är låst tills grinden öppnat", async ({ page }) => {
  const rad = page.locator("tbody tr", { hasText: /slutbesiktningsprotokoll/i }).first();
  test.skip((await rad.count()) === 0, "mallen saknar slutbesiktningsprotokoll");

  // Låst betyder ingen statusväljare — den går inte att sätta för hand.
  await expect(rad.locator("select")).toHaveCount(0);
  await expect(rad).toContainText("Väntar");
});

test("en godkänd handling höjer indexet", async ({ page }) => {
  const forsta = page.locator("tbody tr", { has: page.locator("select") }).first();
  const index = page.locator(".kpi", { hasText: "Överlämningsindex" });

  await expect(index).toContainText("0 %");
  await forsta.locator("select").selectOption("godkand");
  await expect(index).not.toContainText("0 %");
});

test("kategorins räknare följer med", async ({ page }) => {
  const kort = page.locator(".card", { has: page.locator("tbody tr select") }).first();
  const raknare = kort.locator(".mbelopp");
  const fore = await raknare.textContent();

  await kort.locator("tbody tr select").first().selectOption("godkand");
  await expect(raknare).not.toHaveText(fore);
});

test("ansvarig och referens sparas per handling", async ({ page }) => {
  const rad = page.locator("tbody tr", { has: page.locator("select") }).first();

  await rad.getByLabel(/^Ansvarig för /).fill("Harju Elekter");
  await rad.getByLabel(/^Referens för /).fill("DIA-2026-118");
  await rad.getByLabel(/^Referens för /).blur();

  await page.reload();
  const efter = page.locator("tbody tr", { has: page.locator("select") }).first();
  await expect(efter.getByLabel(/^Ansvarig för /)).toHaveValue("Harju Elekter");
});

test("status är låst per projekt, inte globalt", async ({ page }) => {
  const forsta = page.locator("tbody tr", { has: page.locator("select") }).first();
  await forsta.locator("select").selectOption("godkand");
  await expect(page.locator(".kpi", { hasText: "Överlämningsindex" })).not.toContainText("0 %");

  const valjare = page.getByRole("combobox", { name: /projekt/i }).first();
  const varden = await valjare.locator("option").evaluateAll((o) => o.map((x) => x.value));
  test.skip(varden.length < 2, "bara ett projekt i portföljen");

  await valjare.selectOption(varden[1]);
  await expect(page.locator(".kpi", { hasText: "Överlämningsindex" })).toContainText("0 %");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Slutdokumentation");
  await page.locator("tbody tr select").first().selectOption("bestalld");
  utanKonsolfel(fel);
});
