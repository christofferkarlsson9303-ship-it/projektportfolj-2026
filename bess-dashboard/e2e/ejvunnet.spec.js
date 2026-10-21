import { expect, test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

/* Förlorade anbud: status ANBUD_EJ_VUNNET. Anbudet flyttas till arkivet med en orsak, fas 2–8 döljs
   och projektet räknas inte med i aktiva vyer. Listan i Översikt är skrivskyddad. */

async function gaTillSteg(page, nummer, titel) {
  const val = page.getByLabel("Välj steg");
  if (await val.isVisible()) await val.selectOption({ label: `${nummer}. ${titel}` });
  else await page.getByRole("navigation", { name: "Stegen i projektstarten" }).getByRole("button", { name: titel }).click();
}

test("Markera som ej vunnet flyttar anbudet till arkivet med orsak och räknas inte i aktiva vyer", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  await expect(page.getByRole("main").getByText(/Göteborg Skogome/).first()).toBeVisible();
  // Alla aktiva projekt kan markeras, också projekt i produktion.
  await expect(page.getByRole("button", { name: /^Markera som ej vunnet för Växjö Batteripark/ })).toBeVisible();
  await expect(page.getByText("Förlorade anbud", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /^Markera som ej vunnet för Göteborg Skogome/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Orsak till ej vunnet anbud").selectOption("pris");
  await dialog.getByLabel("Kommentar (valfritt)").fill("Konkurrenten låg 8 % lägre");
  await dialog.getByRole("button", { name: "Markera som ej vunnet" }).click();

  // Kortet är borta och anbudet ligger i den skrivskyddade listan med sin orsak.
  await expect(page.getByRole("button", { name: /^Markera som ej vunnet för Göteborg Skogome/ })).toHaveCount(0);
  const lista = page.getByRole("region", { name: "Förlorade anbud" });
  await expect(lista.getByRole("row", { name: /Göteborg Skogome/ })).toContainText("Pris");
  await expect(lista.getByRole("row", { name: /Göteborg Skogome/ })).toContainText("Konkurrenten låg 8 % lägre");
  await expect(lista.getByRole("textbox")).toHaveCount(0);

  // Det syns inte heller bland projekten i guiden, och det finns kvar efter omladdning.
  await gaTill(page, "Projektstart");
  await expect(page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /Göteborg Skogome/ })).toHaveCount(0);
  await page.reload();
  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Förlorade anbud" }).getByRole("row", { name: /Göteborg Skogome/ })).toBeVisible();
  expect(fel).toEqual([]);
});

test("avropsbeslutet Tacka nej kräver en orsak, döljer fas 2–8 och arkiverar anbudet", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel(/^Projektnamn/).fill("Förlorat testanbud");
  await gaTillSteg(page, 2, "Avropsacceptans");
  await expect(page.getByLabel(/^Orsak till ej vunnet anbud/)).toHaveCount(0);
  await page.locator("#ps-beslut").selectOption("Tacka nej");
  await expect(page.getByLabel(/^Orsak till ej vunnet anbud/)).toBeVisible();

  // Fas 2–8 är dolda: bara fas 1 finns kvar i faserna och i navigeringen.
  await expect(page.getByRole("list", { name: "Faser i projektet" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText(/ONE-P · .*Fas 1 av 8 · Steg 2 av 7/)).toBeVisible();
  await expect(page.getByText(/obligatorisk punkt kvar för att flytta anbudet till arkivet/)).toBeVisible();

  // Utan orsak går anbudet inte att skapa.
  await gaTillSteg(page, 7, "Granska och skapa");
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeDisabled();
  await gaTillSteg(page, 2, "Avropsacceptans");
  await page.getByLabel(/^Orsak till ej vunnet anbud/).selectOption("kvalitet");
  await page.getByLabel(/^Kommentar till orsaken/).fill("Sämre referenser");
  await expect(page.getByText("Förlorat anbud: flyttas till arkivet")).toBeVisible();

  await gaTillSteg(page, 7, "Granska och skapa");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Översikt");
  const rad = page.getByRole("region", { name: "Förlorade anbud" }).getByRole("row", { name: /Förlorat testanbud/ });
  await expect(rad).toContainText("Kvalitet");
  await expect(rad).toContainText("Sämre referenser");
  expect(fel).toEqual([]);
});

test("det valda projektet byts när det flyttas till arkivet", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  // Välj Göteborg som aktivt projekt via tidplanen och arkivera det därifrån.
  await page.getByRole("button", { name: /Göteborg Skogome — öppna tidplanen/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tidplan");
  await gaTill(page, "Översikt");
  await page.getByRole("button", { name: /^Markera som ej vunnet för Göteborg Skogome/ }).click();
  await page.getByRole("dialog").getByLabel("Orsak till ej vunnet anbud").selectOption("tid");
  await page.getByRole("dialog").getByRole("button", { name: "Markera som ej vunnet" }).click();
  await gaTill(page, "Tidplan");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tidplan");
  await expect(page.getByText(/Göteborg Skogome/)).toHaveCount(0);
  expect(fel).toEqual([]);
});

test("ett förlorat anbud kan återaktiveras och kommer då tillbaka i fas 1", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  await page.getByRole("button", { name: /^Markera som ej vunnet för Göteborg Skogome/ }).click();
  await page.getByRole("dialog").getByLabel("Orsak till ej vunnet anbud").selectOption("annat");
  await page.getByRole("dialog").getByRole("button", { name: "Markera som ej vunnet" }).click();
  const lista = page.getByRole("region", { name: "Förlorade anbud" });
  await lista.getByRole("button", { name: /^Återaktivera/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Återaktivera" }).click();

  await expect(page.getByRole("region", { name: "Förlorade anbud" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Markera som ej vunnet för Göteborg Skogome/ })).toBeVisible();
  await expect(page.getByText("Fas 1 av 8 · Anbud").first()).toBeVisible();
  expect(fel).toEqual([]);
});
