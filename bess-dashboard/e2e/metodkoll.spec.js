import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Projektmetodens BESS-kritiska kontroller (§ 11.2): interface-listan i
   Veckokoll, godkänd lösning i moment 4, trafikljus och veckorutinen. */

test("interface-listan skapas i Veckokoll, stäms av och följer med till Projektstart", async ({ page }) => {
  const { fel } = await oppna(page, "Veckokoll");
  const kort = page.getByRole("region", { name: "Interface-lista" });
  await kort.getByRole("button", { name: "Skapa interface-lista" }).click();
  const lista = kort.getByRole("list", { name: "Gränssnitt" });
  await expect(lista.getByRole("listitem")).toHaveCount(5);
  await expect(kort).toContainText("5 att stämma av");

  await kort.getByLabel("Veckostatus för Mark/betong ↔ el").selectOption("Klart");
  await kort.getByRole("button", { name: "Avstämd idag: Mark/betong ↔ el" }).click();
  await expect(kort).toContainText("4 att stämma av");
  await kort.getByLabel("Veckostatus för Brand ↔ drift").selectOption("Oklart");
  await expect(lista.getByRole("listitem").filter({ hasText: "Brand ↔ drift" })).toContainText("Oklart");
  utanKonsolfel(fel);
});

test("moment 4 visar att godkänd lösning saknas före inköp", async ({ page }) => {
  await oppna(page, "Bygga batteripark");
  const fas = page.locator("#fas-4");
  if ((await fas.getAttribute("open")) === null) await fas.locator("summary").click();
  const grind = fas.getByRole("group", { name: "Godkänd lösning — grind före inköp" });
  await expect(grind).toContainText("Inte godkänd — inga större inköp");
  await grind.getByRole("button", { name: "Öppna Godkänd lösning i Projektstart" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projektstart");
  // Projektets egen start öppnas, inte en ny projektstart.
  await expect(page.getByText(/ONE-P · 36037 /)).toBeVisible();
});

test("projektkorten i Översikt har trafikljus för tid, budget, arbete och milstolpar", async ({ page }) => {
  await oppna(page, "Översikt");
  const ljus = page.getByRole("group", { name: /^Trafikljus för / }).first();
  await expect(ljus).toBeVisible();
  for (const namn of ["Tid", "Budget", "Planerat arbete", "Milstolpar"]) await expect(ljus).toContainText(namn);
});

test("Idag visar dagens veckorutin med länkar, och inget på helgen", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-27T08:00:00"));
  await oppna(page, "Idag");
  const rutin = page.getByRole("region", { name: "Veckorutin — Tisdag" });
  await expect(rutin).toContainText("Produktion och gränssnitt");
  await rutin.getByRole("button", { name: "Interface-listan i Veckokoll" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Veckokoll");

  await page.clock.setFixedTime(new Date("2026-10-25T08:00:00"));
  await page.reload();
  await gaTill(page, "Idag");
  await expect(page.getByRole("region", { name: /^Veckorutin/ })).toHaveCount(0);
});
