import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

const RONDER = "Skyddsronder";

test.beforeEach(async ({ page }) => {
  await oppna(page, "HSEQ / BAS-U");
});

test("vyn visar de fyra grindarna", async ({ page }) => {
  for (const grind of [
    "Dagar sedan skyddsrond",
    "Arbetsmiljöplan",
    "Öppna rondavvikelser",
    "Incidenter utan rapport",
  ]) {
    await expect(page.getByRole("article", { name: grind, exact: true })).toBeVisible();
  }
});

test("en ny skyddsrond öppnas direkt i panelen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();

  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });
  await expect(panel).toBeVisible();

  // Listan ska ligga kvar bakom panelen.
  await expect(page.getByRole("region", { name: RONDER, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: RONDER, exact: true }).locator("tbody tr")).toHaveCount(1);
});

test("checklistan bockas av och räknas i listan", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  const lista = panel.getByRole("list", { name: "Checklista — elkraft och BESS" });
  const rutor = lista.getByRole("checkbox");
  await expect(rutor).toHaveCount(5);
  await expect(page.getByRole("region", { name: RONDER, exact: true }).locator("tbody tr td").nth(2)).toHaveText("0/5");

  await rutor.first().check();
  await expect(lista.locator("s").first()).toBeVisible();
  await expect(page.getByRole("region", { name: RONDER, exact: true }).locator("tbody tr td").nth(2)).toHaveText("1/5");
});

test("en avvikelse läggs till och räknas som öppen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  await panel.getByRole("button", { name: "+ Avvikelse" }).click();
  const rad = panel.getByRole("region", { name: /^Avvikelser i skyddsronden/ }).locator("tbody tr");
  await expect(rad).toHaveCount(1);

  await rad.getByLabel("Beskrivning av avvikelsen").fill("Trasigt räcke vid transformator");
  await rad.getByLabel("Allvarlighet").selectOption("akut");

  await panel.getByRole("button", { name: "Stäng" }).click();
  // KPI:n för öppna avvikelser ska ha fångat den.
  await expect(page.getByText("1 akuta")).toBeVisible();
});

test("en åtgärdad avvikelse räknas inte längre som öppen", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });
  await panel.getByRole("button", { name: "+ Avvikelse" }).click();

  const rad = panel.getByRole("region", { name: /^Avvikelser i skyddsronden/ }).locator("tbody tr");
  await rad.getByLabel("Status för avvikelsen").selectOption("atgardad");

  await panel.getByRole("button", { name: "Stäng" }).click();
  await expect(page.getByText("0 akuta")).toBeVisible();
});

test("panelen stängs med Escape", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  const panel = page.getByRole("region", { name: /^Skyddsrond \d{4}-/ });

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("arbetsmiljöplanen räknas upp vid revidering", async ({ page }) => {
  const amp = page.getByRole("region", { name: "Arbetsmiljöplan och ID06" });
  await expect(amp.getByText("Ingen AMP registrerad", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Markera AMP som reviderad" }).click();
  await expect(amp.locator("dd").first()).toContainText("rev 1");
  await expect(amp.locator("dd").first()).toContainText(/reviderad \d{4}-\d{2}-\d{2}/);

  await page.getByRole("button", { name: "Markera AMP som reviderad" }).click();
  await expect(amp.locator("dd").first()).toContainText("rev 2");
});

test("ett ID06-stickprov med anmärkning varnar om vite", async ({ page }) => {
  await page.getByRole("button", { name: "+ Logga stickprov" }).click();

  const rad = page.getByRole("region", { name: "ID06-stickprov" }).locator("tbody tr").first();
  await rad.getByLabel(/^Utfall för stickprov/).selectOption("nej");

  await expect(page.getByText(/ID06-stickprov med anmärkning/)).toBeVisible();
  await expect(page.getByText(/vite/)).toBeVisible();
});

test("en incident utan rapport larmar på 24-timmarskravet", async ({ page }) => {
  await page.getByRole("button", { name: "+ Registrera incident" }).click();

  // Datumet sätts till idag, så fristen löper men är inte bruten.
  const grind = page.getByRole("region", { name: "Incidenter och tillbud" }).locator("li [data-ton]").first();
  await expect(grind).toBeVisible();
  await expect(grind).toContainText(/inom \d+ h/);

  await page.getByLabel("Rapport skickad till beställare och Arbetsmiljöverket").check();
  await expect(grind).toContainText("Rapporterad");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "HSEQ / BAS-U");
  await page.getByRole("button", { name: "+ Ny skyddsrond" }).click();
  utanKonsolfel(fel);
});

/* ---------- APD-plan och arbetsplatstavla (G5) ---------- */

const apd = (page) => page.getByRole("region", { name: "APD-plan och arbetsplatstavla", exact: true });

test("APD-planen bockas i panelen och räknas i kortet", async ({ page }) => {
  await expect(apd(page)).toContainText("Ej godkänd av beställaren");
  await expect(apd(page)).toContainText("0/27");

  await apd(page).getByRole("button", { name: "Öppna APD-checklistan" }).click();
  const panel = page.getByRole("region", { name: "APD-plan — kontrollpunkter" });
  await expect(panel.getByRole("checkbox")).toHaveCount(27);
  await panel.getByRole("list", { name: "Generellt och flöde" }).getByRole("checkbox").first().check();
  await expect(apd(page)).toContainText("1/27");
});

test("tavlan bockas, och punkterna i Växjö är klara via den passerade grinden G5", async ({ page }) => {
  const tavla = apd(page).getByRole("list", { name: "Arbetsplatstavlan" });
  await expect(tavla.getByRole("checkbox")).toHaveCount(8);
  for (const box of await tavla.getByRole("checkbox").all()) await box.check();
  await expect(tavla).not.toContainText("Saknas");
  await expect(tavla).toContainText("Uppsatt");

  // Växjö har passerat G5, så 5.19 och 5.20 är klara utan egen bock — ingen knapp att trycka på.
  const koppling = apd(page).getByRole("list", { name: "Kopplade punkter i EPC-checklistan" });
  await expect(koppling.getByRole("listitem")).toHaveCount(2);
  await expect(koppling.getByRole("listitem").first()).toContainText("Klar via G5");
  await expect(koppling.getByRole("button", { name: "Markera klar" })).toHaveCount(0);
  // Att ett anslag blir inaktuellt av en nyare rond, AMP eller APD-revision testas i lib/apd.test.js.
});

test("beställarens godkännande sparas och länken leder till punkten i checklistan", async ({ page }) => {
  const datum = apd(page).getByLabel("Datum för beställarens godkännande");
  await datum.fill("2026-02-10");
  await datum.blur();
  await expect(apd(page)).toContainText("Godkänd 2026-02-10");

  await apd(page).getByRole("button", { name: "5.19" }).click();
  await expect(page.locator('[id="kp-5.19"]')).toBeVisible();
  await expect(page.locator('[id="kp-5.19"]')).toContainText("APD-plan i HSEQ");

  // Och tillbaka: punktens länk öppnar HSEQ med APD-kortet.
  await page.locator('[id="kp-5.19"]').getByRole("button", { name: /^APD-plan i HSEQ/ }).click();
  await expect(apd(page)).toBeInViewport();
});
