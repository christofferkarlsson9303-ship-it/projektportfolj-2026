import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

test("tidplanen visar prognos per fas och kritisk linje, och baslinjen kan sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Kritisk linje och prognos/ });
  await expect(kort).toBeVisible();

  const faser = kort.getByRole("table", { name: "Prognos per fas" });
  await expect(faser.getByRole("row")).toHaveCount(17); // rubrik + 16 faser
  await expect(kort.getByRole("table", { name: "Betalmilstolpar mot prognosen" }).getByRole("row")).toHaveCount(8);
  await expect(kort.getByText(/Spara en baslinje/)).toBeVisible();

  await kort.getByRole("button", { name: "Spara baslinje" }).click();
  await expect(kort.getByRole("button", { name: "Ersätt baslinje" })).toBeVisible();
  await expect(kort.getByText(/Spara en baslinje/)).toBeHidden();
  await expect(kort.getByText("0 d", { exact: true }).first()).toBeVisible();
  utanKonsolfel(fel);
});

test("en fas i tabellen öppnar fasen i guiden", async ({ page }) => {
  await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Kritisk linje och prognos/ });
  await kort.getByRole("button", { name: /^14 / }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Tidplan");
});
