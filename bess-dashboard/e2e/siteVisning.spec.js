import { expect, test } from "@playwright/test";
import { sitePanel, oppna, utanKonsolfel } from "./hjalpare.js";

/* Reglagen runt 3D-siten: filterlager, kameravinklar, standardlayout, hårdvaruprofil och
   Hög kvalitet. Kabelvägarnas och vinklarnas geometri är testad i src/lib/siteLager.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test("filter, standardlayout och kameravinklar", async ({ page }) => {
  const { fel } = await oppna(page, VY);

  const filter = kort(page).getByRole("group", { name: "Lager i 3D-vyn" });
  await sitePanel(page, "Visning");
  for (const namn of ["Märkning", "DC", "HSP 12 kV", "LSP", "Fiber/tele", "Jord"]) await expect(filter.getByRole("button", { name: namn })).toBeVisible();
  await sitePanel(page, "Visning");
  await expect(filter.getByRole("button", { name: "Märkning" })).toHaveAttribute("aria-pressed", "true");
  await sitePanel(page, "Visning");
  await filter.getByRole("button", { name: "DC" }).click();
  await sitePanel(page, "Visning");
  await expect(filter.getByRole("button", { name: "DC" })).toHaveAttribute("aria-pressed", "true");
  await sitePanel(page, "Visning");
  await expect(kort(page).getByText(/Kabelvägar är schematiska/)).toBeVisible();

  const kameror = page.getByRole("navigation", { name: "Kameravinklar" });
  await sitePanel(page, "Visning");
  await expect(kameror.getByRole("button")).toHaveCount(6);
  // Tom tomt: inget att flyga till för SKID 3, batterigatan eller ställverket.
  await sitePanel(page, "Visning");
  await expect(kameror.getByRole("button", { name: "SKID 3" })).toBeDisabled();
  await sitePanel(page, "Visning");
  await expect(kameror.getByRole("button", { name: "Drönarvy" })).toBeEnabled();

  await sitePanel(page, "Bygg");
  await kort(page).getByRole("button", { name: "Lägg in standardlayout" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("CATL EnerX + Power Electronics MV-skid");
  await dialog.getByRole("button", { name: "Lägg in", exact: true }).click();

  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("SKID 3");
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("BESS 6");
  await sitePanel(page, "Visning");
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).filter((o) => o.projektId === "36037").length).toBe(15);

  for (const namn of ["SKID 3", "Batterigata", "Ställverk", "Plan & kran", "Grind", "Drönarvy"]) {
    await sitePanel(page, "Visning");
    await expect(kameror.getByRole("button", { name: namn })).toBeEnabled();
  }
  await sitePanel(page, "Visning");
  await kameror.getByRole("button", { name: "Batterigata" }).click();
  await sitePanel(page, "Visning");
  await kameror.getByRole("button", { name: "SKID 3" }).click();

  // Valen per webbläsare står kvar efter omladdning.
  await page.reload();
  await sitePanel(page, "Visning");
  await expect(kort(page).getByRole("group", { name: "Lager i 3D-vyn" }).getByRole("button", { name: "DC" })).toHaveAttribute("aria-pressed", "true");
  utanKonsolfel(fel);
});

test("hårdvaruprofilen styr komponentdata och märker overifierade värden", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await sitePanel(page, "Underlag");
  await page.getByText("Komponentdata och källor", { exact: true }).click();
  const profil = page.getByRole("region", { name: "Modeller och underlag" });
  await sitePanel(page, "Underlag");
  await expect(profil).toContainText("CATL EnerX");
  await sitePanel(page, "Underlag");
  await expect(profil).toContainText("13 t");

  await sitePanel(page, "Bygg");
  await kort(page).getByLabel("Utrustning för nya enheter").selectOption("sungrow");
  await sitePanel(page, "Underlag");
  await expect(profil).toContainText("Sungrow ST6900UX-4H");
  await sitePanel(page, "Underlag");
  await expect(profil).toContainText("6 904 kWh");
  await sitePanel(page, "Underlag");
  await expect(profil.getByText("Att verifiera").filter({ visible: true }).first()).toBeVisible();
  await expect.poll(async () => ((await portfolj(page)).projekt || []).find((p) => p.id === "36037")?.hardvaruprofil).toBe("sungrow");

  await sitePanel(page, "Visning");
  await expect(kort(page).getByRole("button", { name: "Hög kvalitet" })).toHaveAttribute("aria-pressed", "true");
  await kort(page).getByRole("button", { name: "Hög kvalitet" }).click();
  await sitePanel(page, "Visning");
  await expect(kort(page).getByRole("button", { name: "Hög kvalitet" })).toHaveAttribute("aria-pressed", "false");
  utanKonsolfel(fel);
});

