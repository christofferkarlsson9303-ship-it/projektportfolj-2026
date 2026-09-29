import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const VY = "Projektstart";

test.beforeEach(async ({ page }) => {
  await oppna(page, VY);
});

const direktiv = (page) => page.getByRole("region", { name: "Projektdirektiv", exact: true });
const uppstart = (page) => page.getByRole("region", { name: "Uppstartsavstämning", exact: true });

const OBLIGATORISKA = [
  "Bakgrund",
  "Syfte",
  "Mål och förväntningar (SMART)",
  "Avgränsningar",
  "Identifierade risker",
  "Tidplan",
  "Vid konflikt mellan styrparametrarna",
];

async function fyll(falt, text) {
  await falt.fill(text);
  await falt.blur();
}

async function fyllDirektivet(page) {
  for (const rubrik of OBLIGATORISKA) await fyll(direktiv(page).getByLabel(rubrik, { exact: true }), `${rubrik} — test`);
  await fyll(direktiv(page).getByLabel("Kostnad i procent"), "30");
  await fyll(direktiv(page).getByLabel("Kvalitet i procent"), "10");
  await fyll(direktiv(page).getByLabel("Tid i procent"), "60");
}

test("vyn visar nyckeltalen och båda korten, och signeringen är låst tills direktivet är komplett", async ({ page }) => {
  for (const namn of ["Direktivets obligatoriska fält", "Projekttriangeln", "Signaturer", "Uppstartsavstämning"]) {
    await expect(page.getByRole("article", { name: namn, exact: true })).toBeVisible();
  }
  await expect(direktiv(page)).toContainText("Ej signerat");
  await expect(uppstart(page)).toContainText("Inget klartecken");
  await expect(direktiv(page).getByRole("button", { name: /^Signera idag/ }).first()).toBeDisabled();
  await expect(direktiv(page)).toContainText("Kvar innan signering");
});

test("ett komplett direktiv signeras av båda, och en ändring efteråt kräver ny signering", async ({ page }) => {
  await fyllDirektivet(page);
  await expect(direktiv(page)).toContainText("Summa 100 %");
  await expect(direktiv(page)).toContainText("tid är högst prioriterad");
  await expect(direktiv(page)).not.toContainText("Kvar innan signering");

  await direktiv(page).getByRole("button", { name: "Signera idag som intern beställare" }).click();
  await direktiv(page).getByRole("button", { name: "Signera idag som projektledare" }).click();
  await expect(direktiv(page).getByText("Signerat", { exact: true })).toBeVisible();

  // Växjö har passerat G1 — 1.22 är redan klar via grinden.
  const koppling = direktiv(page).getByRole("list", { name: "Kopplade punkter i EPC-checklistan" });
  await expect(koppling).toContainText("Klar via G1");

  await fyll(direktiv(page).getByLabel("Avgränsningar", { exact: true }), "Ändrad avgränsning");
  await expect(direktiv(page)).toContainText("Ändrat efter signering");
  await expect(direktiv(page).getByRole("button", { name: "Signera idag som projektledare" })).toBeEnabled();
});

test("en triangel som inte summerar till 100 säger till", async ({ page }) => {
  await fyll(direktiv(page).getByLabel("Kostnad i procent"), "50");
  await fyll(direktiv(page).getByLabel("Kvalitet i procent"), "20");
  await fyll(direktiv(page).getByLabel("Tid i procent"), "20");
  await expect(direktiv(page)).toContainText("Summa 90 %");
  await expect(direktiv(page)).toContainText("ska vara 100 %");
});

test("uppstartsavstämningen ger klartecken först när alla frågor är genomgångna och datum satt", async ({ page }) => {
  const knapp = uppstart(page).getByRole("button", { name: "Klartecken idag" });
  await expect(knapp).toBeDisabled();

  const rutor = uppstart(page).getByRole("checkbox");
  await expect(rutor).toHaveCount(18);
  for (const box of await rutor.all()) await box.check();
  await expect(uppstart(page)).toContainText("18/18");
  await expect(knapp).toBeDisabled();

  await fyll(uppstart(page).getByLabel("Datum för uppstartsavstämningen"), "2026-01-22");
  await expect(knapp).toBeEnabled();
  await knapp.click();
  await expect(uppstart(page)).toContainText(/Klartecken \d{4}-\d{2}-\d{2}/);
});

test("en anteckning på en fråga sparas", async ({ page }) => {
  const falt = uppstart(page).getByLabel(/^Anteckning: Mall för fakturaunderlag/);
  await fyll(falt, "Mall från Alvesta återanvänds");
  await gaTill(page, "Översikt");
  await gaTill(page, VY);
  await expect(uppstart(page).getByLabel(/^Anteckning: Mall för fakturaunderlag/)).toHaveValue("Mall från Alvesta återanvänds");
});

test("punkten i checklistan länkar till direktivet", async ({ page }) => {
  await gaTill(page, "Bygga batteripark");
  const rad = page.locator('[id="kp-1.22"]');
  // Fas 1 är passerad och därmed stängd — fäll ut den.
  const fas = page.locator("#fas-1");
  if ((await fas.getAttribute("open")) === null) await fas.locator("summary").click();
  await rad.getByRole("button", { name: /^Projektdirektivet/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(VY);
  await expect(direktiv(page)).toBeInViewport();
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await fyllDirektivet(page);
  utanKonsolfel(fel);
});
