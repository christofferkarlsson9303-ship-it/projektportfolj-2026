import { expect, test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

/* Fliken Projektstart: fjorton steg, och först på sista steget skapas projektet. */

const STEGNAMN = ["Projektkort", "Avropsacceptans", "Projektdirektiv", "Intressenter", "Organisation och möten", "Kontrakt och kassaflöde", "Riskregister", "Tidplan och kritisk linje", "Godkänd lösning", "Tillstånd och nätägare", "HSEQ och etablering", "cBoP, eBoP och montage", "Provning, besiktning och garanti"];

async function oppnaProjektstart(page) {
  await gaTill(page, "Projektstart");
}

async function gaTillSteg(page, nummer, titel) {
  const val = page.getByLabel("Välj steg");
  if (await val.isVisible()) await val.selectOption({ label: `${nummer}. ${titel}` });
  else await page.getByRole("navigation", { name: "Stegen i projektstarten" }).getByRole("button", { name: titel }).click();
}

test("projektet skapas först efter alla steg och får sina risker och milstolpar", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");

  await page.getByLabel("Projektnamn").fill("Kalmar testpark");
  await page.getByLabel("Projektnummer").fill("90077");
  await page.getByLabel("Beställare").fill("Testkund AB");

  // Steg 7 är riskregistret.
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Nästa" }).click();
  await expect(page.getByRole("heading", { name: "7. Riskregister" })).toBeVisible();
  await page.getByLabel("Risker, rad 1: Ägare").fill("Testperson");
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Nästa" }).click();

  await expect(page.getByRole("heading", { name: "14. Granska och skapa" })).toBeVisible();
  await expect(page.getByText("3 riskrader")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeEnabled();
  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_90077_.*\.pdf$/);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");
  expect(fel).toEqual([]);
});

test("Skapa projekt är låst medan steg återstår", async ({ page }) => {
  await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("Låst test");
  await gaTillSteg(page, 14, "Granska och skapa");
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeDisabled();
  await expect(page.getByText(/steg är inte genomgångna/)).toBeVisible();
});

test("sammanfattningen kan laddas ned som PDF", async ({ page }) => {
  await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("PDF-test");
  await gaTillSteg(page, 14, "Granska och skapa");
  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  const d = await nedladdning;
  expect(d.suggestedFilename()).toMatch(/^projektstart_.*\.pdf$/);
});

test("den sparade projektstarten kan öppnas, ändras och laddas ned igen", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel("Projektnamn").fill("Sparad start");
  await page.getByLabel("Projektnummer").fill("90088");
  await gaTillSteg(page, 14, "Granska och skapa");
  for (let i = 1; i < 14; i++) {
    await gaTillSteg(page, i, STEGNAMN[i - 1]);
  }
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");

  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90088 Sparad start\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Sparad start");
  await page.getByLabel("Projektnamn").fill("Sparad start 2");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara ändringar" }).click();

  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_90088_.*\.pdf$/);
  await page.reload();
  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90088 Sparad start 2\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Sparad start 2");
  expect(fel).toEqual([]);
});

test("ett befintligt projekt utan sparad start kan öppnas i guiden, fyllas på och sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByText("Projektet har ingen sparad projektstart")).toBeVisible();
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Växjö Batteripark");
  await page.getByLabel("Beställare").fill("Ingrid Capacity");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();

  await page.reload();
  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel("Beställare")).toHaveValue("Ingrid Capacity");
  expect(fel).toEqual([]);
});

test("ett befintligt projekt öppnas direkt med sin knapp och man kan gå tillbaka till ny projektstart", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  const befintliga = page.getByRole("group", { name: "Befintliga projekt" });
  await befintliga.getByRole("button", { name: /36037 Växjö Batteripark/ }).click();
  await expect(page.getByText("Du ändrar projektstarten för 36037 Växjö Batteripark")).toBeVisible();
  await expect(page.getByLabel("Projektnamn")).toHaveValue("Växjö Batteripark");
  await expect(befintliga.getByRole("button", { name: /36037 Växjö Batteripark/ })).toHaveAttribute("aria-pressed", "true");
  if (process.env.SKARMBILD) await page.screenshot({ path: process.env.SKARMBILD });
  await befintliga.getByRole("button", { name: "Ny projektstart" }).click();
  await expect(page.getByText("Ändra ett befintligt projekt")).toBeVisible();
  expect(fel).toEqual([]);
});

test("lägesrapport till ledningen: skede, nuläge och ny risk sparas och följer med till projektet", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36038 Alvesta Batteripark\s*(· ej ifylld)?$/ }).click();
  await page.getByLabel("Skede").selectOption("Slutbesiktning");
  await page.getByLabel("Nuläge till ledningen").fill("Kallelse till slutbesiktning skickad.");
  await page.getByLabel("Beslut som behövs från ledningen").fill("Godkänn extra resurs v. 48.");
  await gaTillSteg(page, 7, "Riskregister");
  await page.getByRole("button", { name: "Lägg till rad" }).click();
  const rader = page.getByLabel(/^Risker, rad \d+: Risk$/);
  await rader.last().fill("Ny risk från lägesrapporten");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();
  await expect(page.getByText(/1 risk lades till i projektet/)).toBeVisible();
  await expect(page.getByText(/Senast sparad \d{4}-\d{2}-\d{2}/)).toBeVisible();

  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/\.pdf$/);

  // Sparar man igen läggs risken inte till en gång till.
  await gaTillSteg(page, 1, "Projektkort");
  await page.getByLabel("Nuläge till ledningen").fill("Slutbesiktning bokad.");
  await gaTillSteg(page, 14, "Granska och skapa");
  await page.getByRole("button", { name: "Spara ändringar" }).click();
  await expect(page.getByText("Projektstarten är sparad och projektkortet uppdaterat.", { exact: true })).toBeVisible();
  expect(fel).toEqual([]);
});

test("interaktiv guide: riskvärde, bocka alla, filter och stegstatus uppdateras direkt", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");

  // Riskvärdet räknas ut medan man skriver (3 × 3 = 9, medel).
  await gaTillSteg(page, 7, "Riskregister");
  await expect(page.getByText("9 riskvärde, medel").first()).toBeVisible();
  await page.getByLabel("Risker, rad 1: Sannolikhet 1–5").selectOption("5");
  await page.getByLabel("Risker, rad 1: Konsekvens 1–5").selectOption("4");
  await expect(page.getByText("20 riskvärde, hög").first()).toBeVisible();

  // Bocka alla i första gruppen och filtrera bort de klara.
  await gaTillSteg(page, 2, "Avropsacceptans");
  const oppnaText = page.getByText(/^\d+ öppna/);
  await expect(oppnaText).toBeVisible();
  const bocka = page.getByRole("button", { name: /^Bocka av alla i / }).first();
  await bocka.click();
  await expect(page.getByRole("button", { name: /^Rensa / }).first()).toBeVisible();
  await page.getByLabel("Visa bara öppna").check();
  await page.getByLabel("Visa bara öppna").uncheck();

  // Stegstatus och framdrift per fas finns i navigeringen.
  await expect(page.getByRole("group", { name: "Framdrift per fas" })).toBeVisible();
  expect(fel).toEqual([]);
});
