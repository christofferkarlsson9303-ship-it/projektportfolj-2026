import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Beställ senast: moment och leverantörens ledtid på en leverans ger ett
   beställ-senast-datum i Tidplan och en rad i Idag. */
test("ledtid och moment på en leverans ger beställ senast i Tidplan och i Idag", async ({ page }) => {
  const { fel } = await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Leveransspårning/ });
  await expect(kort).toBeVisible();

  const moment = kort.getByLabel("Moment som behöver MV-station");
  await expect(moment.locator("option").first()).toHaveText(/^Gissat: 10 /);
  await moment.selectOption("10");
  const ledtid = kort.getByLabel("Leverantörens ledtid i veckor för MV-station");
  await ledtid.fill("40");
  await ledtid.blur();
  await expect(kort).toContainText("Beställ nu — försenad");

  await gaTill(page, "Idag");
  await expect(page.getByText("Beställ senast: MV-station").first()).toBeVisible();

  await gaTill(page, "Tidplan");
  const bestalld = page.getByRole("region", { name: /^Leveransspårning/ }).getByLabel("Datum då MV-station beställdes");
  await bestalld.fill("2026-01-15");
  await bestalld.blur();
  await expect(page.getByRole("region", { name: /^Leveransspårning/ })).not.toContainText("Beställ nu — försenad");
  utanKonsolfel(fel);
});
