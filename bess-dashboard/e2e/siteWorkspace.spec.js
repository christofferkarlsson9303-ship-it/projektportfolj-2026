import { expect, test } from "@playwright/test";
import { oppna, projektval } from "./hjalpare.js";

const panel = (page, namn) => page.getByRole("navigation", { name: "Verktyg i 3D-vyn" }).getByRole("button", { name: namn, exact: true }).click();
const sparat = page => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test("parken fyller arbetsytan och verktygen kan fällas in utan att canvas krymper", async ({ page, isMobile }) => {
  await oppna(page, "Siten i 3D");
  const scen = page.getByRole("application", { name: "Siten, orbit" });
  await expect(scen.locator("canvas")).toBeVisible();
  const start = await scen.boundingBox();
  const meny = await page.getByRole("complementary", { name: "Parkens verktyg" }).boundingBox();
  if (!isMobile) expect(meny.x - start.x).toBeLessThan(25);
  const arbetsyta = await page.locator("#site-scen").boundingBox();
  expect(Math.abs(start.width - arbetsyta.width)).toBeLessThan(2);
  expect(Math.abs(start.height - arbetsyta.height)).toBeLessThan(2);
  await expect(page.getByRole("button", { name: "Bygg", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary", { name: "Ärenden på siten" })).toBeHidden();
  await page.getByRole("button", { name: "Fäll in verktyg" }).click();
  await expect(page.getByRole("complementary", { name: "Parkens verktyg" })).toBeHidden();
  expect((await scen.boundingBox()).width).toBeCloseTo(start.width, 0);
  await page.getByRole("button", { name: "Visa verktyg" }).click();
  await page.getByRole("button", { name: "Visa parken i helskärm" }).click();
  const hel = await page.locator("#site-scen").boundingBox();
  expect(hel.x).toBe(0); expect(hel.y).toBe(0);
  expect(hel.width).toBe(page.viewportSize().width);
  await page.getByRole("button", { name: "Lägg in standardlayout", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lägg in", exact: true }).click();
  await expect.poll(async () => (await sparat(page)).siteObjekt?.length).toBe(15);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Visa parken i helskärm" })).toBeVisible();
  if (!isMobile) await page.screenshot({ path: "/tmp/site-populated.png" });
});

test("CATL och Sungrow byggs med egna mått och sparas per projekt även efter omladdning", async ({ page }) => {
  await oppna(page, "Siten i 3D");
  await page.getByRole("button", { name: "+ Container", exact: true }).click();
  await page.getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
  await panel(page, "Objekt");
  const namn = page.getByRole("region", { name: "Container 1", exact: true }).getByLabel("Namn", { exact: true });
  await namn.fill("CATL Växjö"); await namn.press("Enter");
  await expect.poll(async () => (await sparat(page)).siteObjekt?.[0]?.namn).toBe("CATL Växjö");
  await projektval(page).selectOption("36038");
  await expect(page.getByRole("button", { name: "Bygg", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Utrustning för nya enheter").selectOption("sungrow");
  await page.getByRole("button", { name: "+ Container", exact: true }).click();
  await page.getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await sparat(page)).siteObjekt?.length).toBe(2);
  const s = await sparat(page);
  expect(s.siteObjekt.find(o => o.projektId === "36037").namn).toBe("CATL Växjö");
  const sungrow = s.siteObjekt.find(o => o.projektId === "36038");
  expect(sungrow.bredd).toBeGreaterThan(0);
  expect(s.projekt.find(p => p.id === "36038").hardvaruprofil).toBe("sungrow");
  await page.reload();
  await projektval(page).selectOption("36037");
  await panel(page, "Objekt");
  await expect(page.getByRole("list", { name: "Objekt", exact: true })).toContainText("CATL Växjö");
  await expect(page.getByRole("list", { name: "Objekt", exact: true }).getByRole("button")).toHaveCount(1);
});

test("HTML-referensens palett och paneler följer temat utan att ändra projektdata", async ({ page }) => {
  await oppna(page, "Siten i 3D");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(page.locator("#head")).toHaveCSS("border-radius", "6px");
  await expect(page.locator("#head h2")).toHaveCSS("font-family", /IBM Plex Sans/);
  await expect(page.locator("#head")).toHaveCSS("backdrop-filter", "blur(6px)");
  await expect(page.locator("#head .seg button[aria-pressed=true]")).toHaveCSS("background-color", "rgb(14, 42, 56)");
  const data = await sparat(page);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(page.locator("#head")).toHaveCSS("color", "rgb(228, 238, 242)");
  await expect(page.locator("#head .seg button[aria-pressed=true]")).toHaveCSS("background-color", "rgb(228, 238, 242)");
  expect((await sparat(page)).siteObjekt).toEqual(data.siteObjekt);
  expect((await sparat(page)).projekt).toEqual(data.projekt);
});
