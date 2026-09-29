import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

test("Ekonomi visar prognosen och en sparad veckoprognos hamnar i trenden", async ({ page }) => {
  const { fel } = await oppna(page, "Ekonomi");
  const kort = page.getByRole("region", { name: "Prognos" });
  await expect(kort).toBeVisible();
  await expect(kort.getByText("Prognos slutkostnad", { exact: true })).toBeVisible();
  await expect(kort.getByText(/Ingen prognos sparad än/)).toBeVisible();

  await kort.getByRole("button", { name: "Spara veckans prognos" }).click();
  await expect(kort.getByRole("table", { name: "Sparade veckoprognoser" }).getByRole("row")).toHaveCount(2);
  await expect(kort.getByRole("button", { name: "Uppdatera veckans prognos" })).toBeVisible();
  utanKonsolfel(fel);
});

test("prognos kvar per aktivitet styr slutkostnaden i Ekonomi", async ({ page }) => {
  await oppna(page, "Budget och utfall");
  const falt = page.getByLabel(/Din bedömning av kvarvarande kostnad för/).first();
  test.skip((await falt.count()) === 0, "inga aktiviteter i grunddatan");
  await falt.fill("250000");
  await falt.press("Enter");
  await expect(page.getByText("din bedömning").first()).toBeVisible();

  await gaTill(page, "Ekonomi");
  const kort = page.getByRole("region", { name: "Prognos" });
  await expect(kort.getByText(/250\s000/).first()).toBeVisible();
});
