import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* "Vad kostar det" på Idag: samma prognos som Ekonomi, och utan budget en
   väg till Budget i stället för ett påhittat resultat. */
test("Idag visar ekonomin och leder till budgeten när den saknas", async ({ page }) => {
  const { fel } = await oppna(page);
  const rad = page.getByRole("region", { name: "Vad kostar det" });
  await expect(rad).toContainText("Ni får betalt");
  await expect(rad).toContainText("Fakturerat");
  await expect(rad).toContainText("ÄTA att fakturera");
  await expect(rad).toContainText("budget per aktivitet saknas");
  await rad.getByRole("button", { name: "Sätt budget" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Budget och utfall");
  await gaTill(page, "Idag");
  await expect(page.getByRole("region", { name: "Vad kostar det" })).toBeVisible();
  utanKonsolfel(fel);
});
