import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test("tidplanen visar prognos per fas och kritisk linje, och baslinjen kan sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Blir vi klara i tid/ });
  await expect(kort).toBeVisible();

  const faser = kort.getByRole("table", { name: "Fas för fas" });
  const visaKlara = kort.getByRole("button", { name: /^Visa klara faser/ });
  if (await visaKlara.count()) await visaKlara.click();
  await expect(faser.getByRole("row")).toHaveCount(17); // rubrik + 16 faser
  await expect(kort.getByRole("table", { name: "Betalningar mot beräknat slut" }).getByRole("row")).toHaveCount(8);
  await expect(kort.getByText(/Spara dagens plan som ursprunglig plan/)).toBeVisible();

  await kort.getByRole("button", { name: "Spara som ursprunglig plan" }).click();
  await expect(kort.getByRole("button", { name: "Ersätt ursprunglig plan" })).toBeVisible();
  await expect(kort.getByText(/Spara dagens plan som ursprunglig plan/)).toBeHidden();
  await expect(kort.getByText("0 dagar", { exact: true }).first()).toBeVisible();
  utanKonsolfel(fel);
});

test("en fas i tabellen öppnar fasen i guiden", async ({ page }) => {
  await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Blir vi klara i tid/ });
  await kort.getByRole("button", { name: /^14 / }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Tidplan");
});
