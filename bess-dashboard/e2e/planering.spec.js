import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Planering och tid: Resurser, Tidrapport, Budget och utfall och
   Fakturaunderlag — flyttade från standalone-filen till React. */

const statTal = (page, namn) => page.getByRole("article", { name: namn }).locator("p").nth(1);

test("vyerna renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Resurser");
  await expect(page.getByRole("region", { name: "Beläggningsmatris" })).toBeVisible();
  await gaTill(page, "Tidrapport");
  await expect(page.getByRole("list", { name: "Veckans dagar" })).toBeVisible();
  await gaTill(page, "Budget och utfall");
  await expect(page.getByRole("region", { name: "Budget per aktivitet", exact: true })).toBeVisible();
  await gaTill(page, "Fakturaunderlag");
  await expect(page.getByRole("region", { name: "Fakturaunderlag", exact: true })).toBeVisible();
  utanKonsolfel(fel);
});

test("planerad tid över kapacitet flaggas i beläggningen", async ({ page }) => {
  await oppna(page, "Resurser");
  await expect(statTal(page, "Överbelastningar")).toHaveText("0");

  const falt = page.getByLabel(/^Timmar för Christoffer Karlsson i 36037 v\. \d+ \d{4}$/);
  await falt.fill("50");
  await falt.press("Enter");

  await expect(statTal(page, "Överbelastningar")).toHaveText("1");
  await expect(page.getByText(/^Över kapacitet:/)).toBeVisible();
  // Nivån står i text, inte bara i färgen.
  const matris = page.getByRole("region", { name: "Beläggningsmatris" });
  await expect(matris.getByText("över kapacitet").first()).toBeAttached();

  // Fler veckor ger fler kolumner.
  const kolumner = matris.locator("thead th");
  const fore = await kolumner.count();
  await page.getByRole("radiogroup", { name: "Antal veckor" }).getByRole("radio", { name: "8 v" }).click();
  await expect(kolumner).toHaveCount(fore + 2);
});

test("en medarbetare med rapporterad tid kan inte tas bort", async ({ page }) => {
  await oppna(page, "Tidrapport");
  await page.getByRole("button", { name: "+ Ny tidrad" }).click();
  await gaTill(page, "Resurser");
  await page.getByRole("button", { name: "Ta bort Christoffer Karlsson" }).click();
  await expect(page.getByText("Personen har rapporterad tid — avaktivera i stället.")).toBeVisible();
});

test("tidrapporten summerar veckan och räknar värdet", async ({ page }) => {
  await oppna(page, "Tidrapport");
  await expect(statTal(page, "Rapporterat")).toHaveText("0 h");

  await page.getByRole("button", { name: "+ Ny tidrad" }).click();
  const tabell = page.getByRole("region", { name: /^Tidrader / });
  await expect(tabell.locator("tbody tr")).toHaveCount(1);
  await expect(statTal(page, "Rapporterat")).toHaveText("8 h");

  const timmar = tabell.getByLabel(/^Timmar för tidrad /);
  await timmar.fill("6");
  await timmar.press("Enter");
  await expect(statTal(page, "Rapporterat")).toHaveText("6 h");
  // Christoffer Karlsson har á-pris 1 245 kr.
  await expect(statTal(page, "Värde")).toHaveText(/7\s470 kr/);

  // Snabbknappen på en dag lägger en rad på just det datumet.
  await page.getByRole("list", { name: "Veckans dagar" }).getByRole("button").nth(2).click();
  await expect(tabell.locator("tbody tr")).toHaveCount(2);
  await expect(statTal(page, "Rapporterat")).toHaveText("14 h");
});

test("budgeten jämför budget mot utfall per aktivitet", async ({ page }) => {
  await oppna(page, "Budget och utfall");
  await expect(statTal(page, "Budget")).toHaveText("—");

  const tabell = page.getByRole("region", { name: "Budget per aktivitet", exact: true });
  const falt = tabell.getByLabel("Budgeterade timmar för Projektering och handlingar");
  await falt.fill("40");
  await falt.press("Enter");
  await expect(statTal(page, "Budget")).not.toHaveText("—");
  await expect(statTal(page, "Kvar")).toHaveText(/kr$/);

  await page.getByRole("button", { name: "+ Lägg till kostnad" }).click();
  const kostnader = page.getByRole("region", { name: "Kostnader", exact: true });
  await expect(kostnader.locator("tbody tr")).toHaveCount(1);
});

test("debiterbar tid blir ett fakturaunderlag som låser raden och kan ångras", async ({ page }) => {
  await oppna(page, "Tidrapport");
  await page.getByRole("button", { name: "+ Ny tidrad" }).click();
  await page.getByRole("checkbox", { name: /är debiterbar$/ }).check();

  await gaTill(page, "Fakturaunderlag");
  await expect(statTal(page, "Ofakturerat")).toHaveText(/9\s960 kr/); // 8 h × 1 245 kr
  await page.getByRole("button", { name: "Skapa underlag" }).click();

  const underlag = page.getByRole("region", { name: "Fakturaunderlag", exact: true });
  await expect(underlag.getByText("FU001")).toBeVisible();
  await expect(statTal(page, "Ofakturerat")).toHaveText("0 kr");
  await expect(page.getByRole("button", { name: "Skapa underlag" })).toBeDisabled();

  // Raden är låst i tidrapporten.
  await gaTill(page, "Tidrapport");
  await expect(page.getByRole("region", { name: /^Tidrader / }).getByText("Fakturerad")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /är debiterbar$/ })).toHaveCount(0);

  // Ångra öppnar raden igen.
  await gaTill(page, "Fakturaunderlag");
  await underlag.getByRole("button", { name: "Ångra FU001" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ångra underlaget" }).click();
  await expect(underlag.getByText("FU001")).toHaveCount(0);
  await expect(statTal(page, "Ofakturerat")).toHaveText(/9\s960 kr/);
});
