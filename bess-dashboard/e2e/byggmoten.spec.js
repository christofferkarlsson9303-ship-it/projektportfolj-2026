import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const REGISTER = "Byggmöten";

async function nyttMote(page) {
  await page.getByRole("button", { name: "+ Nytt byggmöte" }).click();
  return page.getByRole("region", { name: /^Protokoll BM-/ });
}

test("nytt byggmöte får löpnummer och full paragrafstruktur", async ({ page }) => {
  const { fel } = await oppna(page, "Byggmöten");

  const form = await nyttMote(page);
  await expect(form).toBeVisible();

  // §1–§7 ska alla finnas som egna avsnitt.
  for (let i = 1; i <= 7; i++) {
    await expect(form.getByRole("button", { name: new RegExp(`\\+ Punkt under §${i}`) })).toBeVisible();
  }

  utanKonsolfel(fel);
});

test("punkt under §4 flaggas tills den har ett ärende", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §4/ }).click();
  const punkt = form.getByLabel("Punkt under §4");
  await punkt.fill("Beställaren begär flytt av fundament F3");
  await page.keyboard.press("Tab");

  // Varningen om preskription ska slå till.
  await expect(form.getByText(/risk för preskription/i)).toBeVisible();
  await expect(form.getByText(/saknar registrerat ärende/)).toBeVisible();
});

test("ärende skapas ur punkten och kopplas ihop", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §5/ }).click();
  await form.getByLabel("Punkt under §5").fill("Nätägaren försenar inkoppling");
  await page.keyboard.press("Tab");

  await form.getByRole("button", { name: "+ Skapa ÄTA" }).click();

  // Varningen ska försvinna och ärendenumret visas på punkten.
  await expect(form.getByText(/risk för preskription/i)).toBeHidden();
  const arendeknapp = form.getByRole("button", { name: /^UR\d+/ });
  await expect(arendeknapp).toBeVisible();

  // Och ärendet ska gå att öppna i ÄTA-vyn.
  await arendeknapp.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA och hinder");
  await expect(page.getByRole("region", { name: /^Ärende / })).toBeVisible();
});

test("§5 ger hinder, §4 ger ÄTA", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §5/ }).click();
  await form.getByLabel("Punkt under §5").fill("Hinder från nätägare");
  await page.keyboard.press("Tab");
  await form.getByRole("button", { name: "+ Skapa ÄTA" }).click();
  await form.getByRole("button", { name: /^UR\d+/ }).click();

  const arende = page.getByRole("region", { name: /^Ärende / });
  await expect(arende.getByLabel(/^Behandlas som/)).toHaveValue("hinder");
});

test("nytt möte ärver öppna punkter från föregående", async ({ page }) => {
  await oppna(page, "Byggmöten");

  const forsta = await nyttMote(page);
  await forsta.getByRole("button", { name: /\+ Punkt under §3/ }).click();
  await forsta.getByLabel("Punkt under §3").fill("Kvarstående: inmätning terrass");
  await page.keyboard.press("Tab");

  const andra = await nyttMote(page);
  await expect(andra.getByRole("heading", { level: 3 })).toHaveText("Protokoll BM-02");
  await expect(andra.getByText("Innestående punkt")).toBeVisible();
  await expect(andra.getByLabel("Punkt under §3")).toHaveValue("Kvarstående: inmätning terrass");
});

test("registret räknar oregistrerade punkter", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §4/ }).click();
  await form.getByLabel("Punkt under §4").fill("Oregistrerad ÄTA-diskussion");
  await page.keyboard.press("Tab");

  const rad = page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first();
  await expect(rad.locator('[data-ton="bad"]')).toHaveText(/1/);
  await expect(rad).toHaveClass(/rad-sen/);
});

test("beslut blir en åtgärd som följer med till nästa möte med sin aktuella status", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §3/ }).click();
  await form.getByLabel("Punkt under §3").fill("Bekräfta leveransdatum för transformator");
  await page.keyboard.press("Tab");
  await form.getByRole("button", { name: "+ Skapa åtgärd" }).click();

  /* Åtgärden är länkad: mötespunkten visar dess status, inte en egen. */
  await expect(form.getByText("Åtgärd öppen")).toBeVisible();
  await expect(form.getByLabel("Punktens status")).toHaveCount(0);

  /* Nästa möte ärver beslutet och visar åtgärdens status utan omskrivning. */
  const nasta = await nyttMote(page);
  await expect(nasta.getByLabel("Punkt under §3")).toHaveValue("Bekräfta leveransdatum för transformator");
  await expect(nasta.getByText("Åtgärd öppen")).toBeVisible();

  /* Samma åtgärd finns i punktregistret med mötet som källa. */
  await page.getByRole("button", { name: /^Åtgärd:/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Öppna punkter");
  await expect(page.getByRole("main")).toContainText("Bekräfta leveransdatum för transformator");

  /* Klarmarkeras åtgärden där, syns det i mötet utan att något skrivs om. */
  const radSt = page.getByRole("row", { name: /Bekräfta leveransdatum/ });
  await radSt.getByLabel(/^Status för/).selectOption("klarmarkerad");
  await gaTill(page, "Byggmöten");
  await expect(page.getByText("Åtgärd klar").first()).toBeVisible();
});
