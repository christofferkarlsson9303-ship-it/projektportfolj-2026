import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

function idagIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const knapp = (page) => page.getByRole("banner").getByRole("button", { name: "Registrera händelse" });
const panel = (page) => page.getByRole("region", { name: "Registrera händelse" });

test("en händelse registreras en gång och kan kompletteras med länkade poster", async ({ page }) => {
  const { fel } = await oppna(page, "Byggmöten");
  await knapp(page).click();

  /* Tom text avvisas med ett tydligt meddelande. */
  await panel(page).getByRole("button", { name: "Spara händelse" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("Beskriv vad");

  await expect(panel(page)).toContainText("Gäller projekt");
  await panel(page).getByLabel("Vad har hänt eller behöver göras?").fill("Kabelskåp levererat med fel typ");
  await panel(page).getByLabel("Ansvarig").fill("Anna");
  await panel(page).getByLabel("Nästa datum").fill(idagIso());
  await panel(page).getByLabel(/^Underlag/).fill("Följesedel 4711");
  await panel(page).getByRole("button", { name: "Spara händelse" }).click();

  /* Tillägg: ett hinder och en ÄTA är två separata, länkade poster. */
  await panel(page).getByRole("button", { name: "+ Hinder" }).click();
  await expect(panel(page).getByRole("button", { name: "Hinder kopplad" })).toBeDisabled();
  await panel(page).getByRole("button", { name: "+ ÄTA" }).click();
  await expect(panel(page).getByRole("button", { name: "ÄTA kopplad" })).toBeDisabled();
  await panel(page).getByRole("button", { name: "Klar" }).click();
  await expect(panel(page)).toHaveCount(0);

  /* Händelsen finns i Idag med sina länkar, utan att något skrivits om. */
  await gaTill(page, "Idag");
  await page.getByRole("button", { name: /Kabelskåp levererat med fel typ.*Ansvarig: Anna/ }).click();
  const pp = page.getByRole("region", { name: /^Punkt: Kabelskåp/ });
  await expect(pp).toContainText("Följesedel 4711");
  await expect(pp.getByRole("button", { name: /^Hinder/ })).toBeVisible();
  await expect(pp.getByRole("button", { name: /^ÄTA/ })).toBeVisible();
  utanKonsolfel(fel);
});
