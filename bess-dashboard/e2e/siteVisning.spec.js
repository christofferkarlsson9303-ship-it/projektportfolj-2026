import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Reglagen runt 3D-siten: filterlager, kameravinklar, standardlayout, hårdvaruprofil och
   Hög kvalitet. Kabelvägarnas och vinklarnas geometri är testad i src/lib/siteLager.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test("filter, standardlayout och kameravinklar", async ({ page }) => {
  const { fel } = await oppna(page, VY);

  const filter = kort(page).getByRole("group", { name: "Lager i 3D-vyn" });
  for (const namn of ["Märkning", "DC", "HSP 12 kV", "LSP", "Fiber/tele", "Jord"]) await expect(filter.getByRole("button", { name: namn })).toBeVisible();
  await expect(filter.getByRole("button", { name: "Märkning" })).toHaveAttribute("aria-pressed", "true");
  await filter.getByRole("button", { name: "DC" }).click();
  await expect(filter.getByRole("button", { name: "DC" })).toHaveAttribute("aria-pressed", "true");
  await expect(kort(page).getByText(/Kabelvägarna är schematiska/)).toBeVisible();

  const kameror = page.getByRole("navigation", { name: "Kameravinklar" });
  await expect(kameror.getByRole("button")).toHaveCount(6);
  // Tom tomt: inget att flyga till för SKID 3, batterigatan eller ställverket.
  await expect(kameror.getByRole("button", { name: "SKID 3" })).toBeDisabled();
  await expect(kameror.getByRole("button", { name: "Drönarvy" })).toBeEnabled();

  await kort(page).getByRole("button", { name: "Lägg in standardlayout" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("CATL EnerX + Power Electronics MV-skid");
  await dialog.getByRole("button", { name: "Lägg in", exact: true }).click();

  await expect(lista(page)).toContainText("SKID 3");
  await expect(lista(page)).toContainText("BESS 6");
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).filter((o) => o.projektId === "36037").length).toBe(15);

  for (const namn of ["SKID 3", "Batterigata", "Ställverk", "Plan & kran", "Grind", "Drönarvy"]) {
    await expect(kameror.getByRole("button", { name: namn })).toBeEnabled();
  }
  await kameror.getByRole("button", { name: "Batterigata" }).click();
  await kameror.getByRole("button", { name: "SKID 3" }).click();

  // Valen per webbläsare står kvar efter omladdning.
  await page.reload();
  await expect(kort(page).getByRole("group", { name: "Lager i 3D-vyn" }).getByRole("button", { name: "DC" })).toHaveAttribute("aria-pressed", "true");
  utanKonsolfel(fel);
});

test("hårdvaruprofilen styr komponentdata och märker overifierade värden", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  const profil = page.getByRole("region", { name: /^Hårdvaruprofil — / });
  await expect(profil).toContainText("CATL EnerX");
  await expect(profil).toContainText("13 t");

  await kort(page).getByLabel("Hårdvaruprofil").selectOption("sungrow");
  await expect(profil).toContainText("Sungrow ST6900UX-4H");
  await expect(profil).toContainText("6 904 kWh");
  await expect(profil.getByText("Att verifiera").first()).toBeVisible();
  await expect.poll(async () => ((await portfolj(page)).projekt || []).find((p) => p.id === "36037")?.hardvaruprofil).toBe("sungrow");

  await kort(page).getByRole("button", { name: "Hög kvalitet" }).click();
  await expect(kort(page).getByRole("button", { name: "Hög kvalitet" })).toHaveAttribute("aria-pressed", "true");
  utanKonsolfel(fel);
});
