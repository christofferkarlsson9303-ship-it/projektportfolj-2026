import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Kommandopaletten gör saker, inte bara navigerar (lib/kommandon.js).
   Skapa ur söktexten ligger sist, så att Enter fortfarande öppnar en träff;
   "+" först gör texten till en punkt direkt. */

const palett = (page) => page.getByRole("dialog", { name: "Sök och hoppa" });
const sok = (page) => palett(page).getByRole("combobox", { name: "Sök och hoppa" });
const alternativ = (page, typ, text) => palett(page).getByRole("option").filter({ hasText: typ }).filter({ hasText: text });

test("+ först skapar en punkt med Enter; den syns i Idag", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  await page.keyboard.press("Control+k");
  await sok(page).fill("+ Ring Jinert om lyftplan");
  await expect(palett(page).getByRole("option").first()).toContainText("Ny punkt");
  await page.keyboard.press("Enter");

  await expect(palett(page)).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Punkt tillagd" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Öppna: .*Ring Jinert om lyftplan/ })).toBeVisible();
  utanKonsolfel(fel);
});

test("Enter på en vanlig sökning öppnar träffen, inte en ny punkt", async ({ page }) => {
  await oppna(page, "Idag");
  await page.keyboard.press("Control+k");
  await sok(page).fill("Risker");
  // Skapa-förslagen finns, men sist.
  await expect(alternativ(page, "Ny punkt", "Risker")).toBeVisible();
  await expect(palett(page).getByRole("option").last()).toContainText("Ny ÄTA");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Risker");

  await gaTill(page, "Öppna punkter");
  await expect(page.getByRole("button", { name: /^Redigera Punkt.*Risker$/ })).toHaveCount(0);
});

test("Ny ÄTA ur söktexten registreras och öppnas", async ({ page }) => {
  await oppna(page, "Idag");
  await page.keyboard.press("Control+k");
  await sok(page).fill("Skadad kabel vid schakt nordväst");
  await alternativ(page, "Ny ÄTA", "Skadad kabel vid schakt nordväst").click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA");
  await expect(page.getByRole("status").filter({ hasText: /registrerad i .* fristen räknas från idag/ })).toBeVisible();
  await expect(page.getByText("Skadad kabel vid schakt nordväst").first()).toBeVisible();
});

test("tom palett visar åtgärderna först; Registrera händelse öppnar panelen", async ({ page }) => {
  await oppna(page, "Idag");
  await page.keyboard.press("Control+k");
  await expect(palett(page).getByRole("option").first()).toContainText("Registrera händelse");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Registrera händelse" })).toBeVisible();
});
