import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Handlingsplan");
});

const panel = (page) => page.getByRole("region", { name: /^Detaljer för steg / });
const kort = (page) => page.locator(".hp-atgard");

/* Lägger till en åtgärd och fyller i titel och resurser i panelen. */
async function nyAtgard(page, titel, resurser = "") {
  await page.getByRole("button", { name: /Lägg till (första )?åtgärd/ }).first().click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByLabel("Åtgärd", { exact: true }).fill(titel);
  if (resurser) await panel(page).getByLabel("Resurser", { exact: true }).fill(resurser);
  await panel(page).getByLabel("Åtgärd", { exact: true }).blur();
}

test("kedjan visar mål, drivkraft, strategi, åtgärder och slutresultat", async ({ page }) => {
  for (const rubrik of ["Mål", "Drivkraft", "Strategi", "Åtgärder", "Förväntat slutresultat"]) {
    await expect(page.getByRole("heading", { level: 2, name: rubrik, exact: true })).toBeVisible();
  }
  // Tomt från början — exemplen är platshållare, inte data.
  await expect(page.getByRole("textbox", { name: "Mål", exact: true })).toHaveValue("");
  await expect(kort(page)).toHaveCount(0);
});

test("målet sparas och finns kvar efter omladdning", async ({ page }) => {
  const mal = page.getByRole("textbox", { name: "Mål", exact: true });
  await mal.fill("Driftsatt anläggning före 2026-12-02");
  await mal.blur();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Mål", exact: true })).toHaveValue("Driftsatt anläggning före 2026-12-02");
});

test("en ny åtgärd öppnas i sidopanelen och blir ett kort", async ({ page }) => {
  await nyAtgard(page, "Slutföra cold commissioning", "BAS-U, elinstallatör");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);

  const forsta = kort(page).first();
  await expect(forsta).toContainText("Steg 1");
  await expect(forsta).toContainText("Slutföra cold commissioning");
  await expect(forsta).toContainText("BAS-U, elinstallatör");

  await page.reload();
  await expect(kort(page).first()).toContainText("Slutföra cold commissioning");
});

test("status på kortet driver framdriften", async ({ page }) => {
  await nyAtgard(page, "Genomföra skyddsrond");
  await page.keyboard.press("Escape");

  const forsta = kort(page).first();
  await forsta.getByRole("button", { name: "Klar", exact: true }).click();
  await expect(forsta.getByRole("button", { name: "Klar", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hp-huvud")).toContainText("1 av 1 åtgärder klara");
  await expect(page.getByText("Status uppdaterad och loggad")).toBeVisible();
});

test("kommentaren behåller fokus och sparas även när panelen stängs med Escape", async ({ page }) => {
  await nyAtgard(page, "Med kommentar");
  const kommentar = panel(page).getByLabel("Kommentar", { exact: true });
  await kommentar.click();
  await page.keyboard.type("Väntar på CATL", { delay: 15 });
  await expect(kommentar).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);

  await kort(page).first().getByRole("button", { name: /Med kommentar/ }).click();
  await expect(panel(page).getByLabel("Kommentar", { exact: true })).toHaveValue("Väntar på CATL");
});

test("en åtgärd kan tas bort efter bekräftelse", async ({ page }) => {
  await nyAtgard(page, "Tillfällig åtgärd");
  await panel(page).getByRole("button", { name: "Ta bort åtgärden" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ta bort", exact: true }).click();

  await expect(panel(page)).toHaveCount(0);
  await expect(kort(page)).toHaveCount(0);
});

test("planen hör till projektet, inte till portföljen", async ({ page }) => {
  await nyAtgard(page, "Bara i första projektet");
  await page.keyboard.press("Escape");
  await expect(kort(page)).toHaveCount(1);

  const valjare = page.getByRole("group", { name: "Välj projekt" });
  const ovald = valjare.locator('button[aria-pressed="false"]').first();
  const namn = (await ovald.textContent()).trim();
  await valjare.getByRole("button", { name: namn, exact: true }).click();

  await expect(kort(page)).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Mål", exact: true })).toHaveValue("");
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Handlingsplan");
  await nyAtgard(page, "Kontroll");
  await page.keyboard.press("Escape");
  utanKonsolfel(fel);
});
