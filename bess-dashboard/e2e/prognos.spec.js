import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

test("Ekonomi visar prognosen och en sparad veckoprognos hamnar i trenden", async ({ page }) => {
  const { fel } = await oppna(page, "Ekonomi");
  const kort = page.getByRole("region", { name: "Hur projektet går ekonomiskt" });
  await expect(kort).toBeVisible();
  await expect(kort.getByText("Beräknad kostnad totalt", { exact: true })).toBeVisible();
  await expect(kort.getByText(/Inget sparat än/)).toBeVisible();

  await kort.getByRole("button", { name: "Spara veckans läge" }).click();
  await expect(kort.getByRole("table", { name: "Sparat läge vecka för vecka" }).getByRole("row")).toHaveCount(2);
  await expect(kort.getByRole("button", { name: "Uppdatera veckans läge" })).toBeVisible();
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
  const kort = page.getByRole("region", { name: "Hur projektet går ekonomiskt" });
  await kort.getByText("Så räknas det", { exact: true }).click();
  await expect(kort.getByText(/250\s000/).first()).toBeVisible();
});
