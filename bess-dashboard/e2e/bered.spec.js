import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* ONE Bered: generatorn bygger skrivbordet ur projektets MW/MWh, kabellistan numreras per
   serie och kalkylen flaggar UE-poster utan pris i stället för att gissa. */

test("generatorn ger skrivbord, kabellista och kalkyl", async ({ page }) => {
  const { fel } = await oppna(page, "ONE Bered");

  await page.getByRole("button", { name: /Generera beredning/ }).click();
  await expect(page.getByRole("region", { name: "Konstruktioner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+MV01" })).toBeVisible();

  await page.getByRole("tab", { name: "Kabellista" }).click();
  const kablar = page.getByRole("region", { name: "Kabellista" });
  await expect(kablar.getByText("DC201", { exact: true })).toBeVisible();
  await expect(kablar.getByText("W1", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Kalkyl" }).click();
  await expect(page.getByText(/UE utan pris/).first()).toBeVisible();

  utanKonsolfel(fel);
});
