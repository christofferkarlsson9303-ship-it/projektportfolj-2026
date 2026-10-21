import { test, expect } from "@playwright/test";
import { oppna } from "./hjalpare.js";

/* Förenklad vardag: egen enkel meny och snabbåtgärder i Idag. */

async function meny(page) {
  const ham = page.getByRole("button", { name: /Öppna menyn|Stäng menyn/ });
  if ((await ham.isVisible()) && (await ham.getAttribute("aria-expanded")) === "false") await ham.click();
  return page.getByRole("navigation", { name: "Huvudmeny" });
}

test("du väljer själv vilka flikar som syns i den enkla menyn, och valet finns kvar", async ({ page }) => {
  await oppna(page);
  let nav = await meny(page);
  await expect(nav.getByRole("button", { name: "Siten i 3D", exact: true })).toHaveCount(0);
  await nav.getByRole("button", { name: "Visa alla funktioner", exact: true }).click();
  await nav.getByRole("button", { name: "Siten i 3D i enkel meny", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Siten i 3D i enkel meny", exact: true })).toHaveAttribute("aria-pressed", "true");
  await nav.getByRole("button", { name: "HSEQ / BAS-U i enkel meny", exact: true }).click();
  await nav.getByRole("button", { name: "Visa enkel meny", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Siten i 3D", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "HSEQ / BAS-U", exact: true })).toHaveCount(0);

  await page.reload();
  nav = await meny(page);
  await expect(nav.getByRole("button", { name: "Siten i 3D", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "HSEQ / BAS-U", exact: true })).toHaveCount(0);
});

test("en leverans markeras klar direkt i Idag och försvinner ur listan", async ({ page }) => {
  await oppna(page, "Idag");
  const rad = page.getByRole("button", { name: /^Markera klar: BESS-batteri — CATL/ }).first();
  await expect(rad).toBeVisible();
  const fore = await page.getByRole("button", { name: /^Markera klar:/ }).count();
  await rad.click();
  await expect(page.getByRole("button", { name: /^Markera klar:/ })).toHaveCount(fore - 1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}").leveranser?.filter((l) => l.status === "klar").length)).toBeGreaterThan(0);
});
