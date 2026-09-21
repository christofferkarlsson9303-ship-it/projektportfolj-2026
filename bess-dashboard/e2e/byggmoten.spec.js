import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

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

  await form.getByRole("button", { name: "+ Skapa ÄTA/hinder" }).click();

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
  await form.getByRole("button", { name: "+ Skapa ÄTA/hinder" }).click();
  await form.getByRole("button", { name: /^UR\d+/ }).click();

  const arende = page.getByRole("region", { name: /^Ärende / });
  await expect(arende.getByLabel(/Klassificering/)).toHaveValue("hinder");
});

test("nytt möte ärver öppna punkter från föregående", async ({ page }) => {
  await oppna(page, "Byggmöten");

  const forsta = await nyttMote(page);
  await forsta.getByRole("button", { name: /\+ Punkt under §3/ }).click();
  await forsta.getByLabel("Punkt under §3").fill("Kvarstående: inmätning terrass");
  await page.keyboard.press("Tab");

  const andra = await nyttMote(page);
  await expect(andra.getByRole("heading", { level: 3 })).toHaveText("BM-02");
  await expect(andra.getByText("Innestående punkt")).toBeVisible();
  await expect(andra.getByLabel("Punkt under §3")).toHaveValue("Kvarstående: inmätning terrass");
});

test("registret räknar oregistrerade punkter", async ({ page }) => {
  await oppna(page, "Byggmöten");
  const form = await nyttMote(page);

  await form.getByRole("button", { name: /\+ Punkt under §4/ }).click();
  await form.getByLabel("Punkt under §4").fill("Oregistrerad ÄTA-diskussion");
  await page.keyboard.press("Tab");

  const rad = page.getByRole("region", { name: REGISTER }).locator("tbody tr").first();
  await expect(rad.locator(".pill.p-bad")).toHaveText(/1/);
  await expect(rad).toHaveClass(/rad-sen/);
});
