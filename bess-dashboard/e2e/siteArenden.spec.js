import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Siten som modellbaserad ärendehantering: delad vy med avdelare, ärenden
   kopplade till objekt (objectGuid, viewpoint, boundingBox), filtrering mellan
   3D och ÄTA, modellversioner med jämförelse, sektionslåda och mätning.
   Logiken (kameraflygning, diff, klippplan, mått) är enhetstestad utan WebGL i
   src/lib/modellKoppling.test.js, modellDiff.test.js och modellReducer.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const arenden = (page) => page.getByRole("complementary", { name: "Ärenden på siten" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

async function laggContainer(page) {
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
}

/** Klickar i planvyn på en punkt i meter (x öster, z söder). */
async function klickaPlan(page, x, z) {
  const plan = page.getByRole("img", { name: /^Planvy över siten/ });
  await plan.scrollIntoViewIfNeeded();
  const b = await plan.boundingBox();
  await page.mouse.click(b.x + ((x + 42) / 84) * b.width, b.y + ((z + 28) / 56) * b.height);
}

async function nyttArende(page, text) {
  await arenden(page).getByRole("button", { name: "+ Ärende på objektet" }).click();
  await page.getByLabel("Kort beskrivning av händelsen").fill(text);
  await page.getByRole("button", { name: "Registrera", exact: true }).click();
}

test("ärendepanelen ligger till höger om 3D-vyn, och avdelaren flyttas med piltangenter", async ({ page }, info) => {
  const { fel } = await oppna(page, VY);
  await expect(arenden(page)).toBeVisible();
  await expect(arenden(page).getByRole("heading", { name: "Ärenden" })).toBeVisible();
  if (info.project.name !== "mobil") {
    const sep = page.getByRole("separator", { name: /Ändra bredd/ });
    await expect(sep).toBeVisible();
    const start = Number(await sep.getAttribute("aria-valuenow"));
    expect(start).toBeGreaterThan(50);
    await sep.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(sep).toHaveAttribute("aria-valuenow", String(start - 4));
    await page.keyboard.press("Home");
    await expect(sep).toHaveAttribute("aria-valuenow", "30");
    await page.keyboard.press("End");
    await expect(sep).toHaveAttribute("aria-valuenow", "80");
    // Läget sparas och gäller efter omladdning.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await gaTill(page, VY);
    await expect(page.getByRole("separator", { name: /Ändra bredd/ })).toHaveAttribute("aria-valuenow", "80");
    // Enter återställer.
    await page.getByRole("separator", { name: /Ändra bredd/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("separator", { name: /Ändra bredd/ })).toHaveAttribute("aria-valuenow", "62");
  } else {
    await expect(page.getByRole("separator", { name: /Ändra bredd/ })).toBeHidden();
  }
  utanKonsolfel(fel);
});

test("ett nytt ärende på ett objekt sparar objectGuid, viewpoint, boundingBox och modellversion", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await expect(arenden(page).getByText("Inga ärenden är kopplade till Container 1 än.")).toBeVisible();

  await nyttArende(page, "Extra kabelränna vid container");
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);
  await expect(arenden(page)).toContainText("Extra kabelränna vid container");
  await expect(arenden(page)).toContainText("Objekt: Container 1");

  await expect
    .poll(async () => {
      const s = await portfolj(page);
      return (s.ur || []).find((u) => u.benamning === "Extra kabelränna vid container");
    })
    .toBeTruthy();
  const s = await portfolj(page);
  const o = s.siteObjekt.find((x) => x.typ === "container");
  const u = s.ur.find((x) => x.benamning === "Extra kabelränna vid container");
  expect(u.objectGuid).toBe(o.id);
  expect(u.boundingBox.min).toHaveLength(3);
  expect(u.boundingBox.max[1]).toBeCloseTo(2.9, 1);
  expect(u.viewpoint.cameraPosition).toHaveLength(3);
  expect(u.viewpoint.target).toHaveLength(3);
  expect(u.viewpoint.fov).toBeGreaterThan(10);
  expect(u.modelVersionId).toBe("");
});

test("markerat objekt filtrerar ÄTA-listan, och Visa i 3D tar tillbaka till objektet", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Skadad dörr på container");
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);

  await gaTill(page, "ÄTA och hinder");
  const chip = page.getByRole("status").filter({ hasText: "Visar ärenden på objektet" });
  await expect(chip).toContainText("Container 1");
  await expect(chip).toContainText("1 av");
  await expect(page.getByText("Skadad dörr på container").first()).toBeVisible();

  // Visa alla tar bort filtret.
  await chip.getByRole("button", { name: "Visa alla" }).click();
  await expect(chip).toHaveCount(0);

  // Filtret kommer tillbaka när objektet markeras igen, och leder tillbaka till 3D.
  await gaTill(page, VY);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await gaTill(page, "ÄTA och hinder");
  await page.getByRole("status").filter({ hasText: "Visar ärenden på objektet" }).getByRole("button", { name: "Visa i 3D" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(VY);
  await expect(page.getByRole("region", { name: "Container 1" })).toBeVisible();
});

test("ärendepanelen i ÄTA visar kopplingen och kan koppla och släppa objektet", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Behöver extra skärmning");

  await gaTill(page, "ÄTA och hinder");
  await page.getByRole("status").getByRole("button", { name: "Visa alla" }).click();
  await page.getByText("Behöver extra skärmning").first().click();
  const drawer = page.getByRole("region", { name: /^Ärende / });
  const koppling = drawer.getByRole("region", { name: "Koppling till 3D-modellen" });
  await expect(koppling).toContainText("Objekt: Container 1");
  await expect(koppling).toContainText("Objekt-ID (GUID)");
  await expect(koppling.getByRole("button", { name: "Visa i 3D" })).toBeVisible();

  await koppling.getByRole("button", { name: "Ta bort koppling" }).click();
  await expect(koppling).toContainText("inte kopplat till något objekt");
  await expect
    .poll(async () => ((await portfolj(page)).ur || []).find((u) => u.benamning === "Behöver extra skärmning")?.objectGuid)
    .toBeUndefined();
});

test("ett ärende i panelen flyger inte kameran i gåläget men markerar objektet", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Kontrollera jordning");
  await page.getByRole("radio", { name: "Gå in" }).click();
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await arenden(page).getByRole("button", { name: "Visa i 3D", exact: true }).first().click();
  // "Visa i 3D" lämnar gåläget och flyger i orbit.
  await expect(page.getByRole("radio", { name: "Orbit" })).toHaveAttribute("aria-checked", "true");
});

test("modellversion och jämförelse: tillagt syns i sammanfattningen och versionen kan tas bort", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await page.getByRole("button", { name: "Spara modellversion" }).click();
  await page.getByLabel("Namn på versionen").fill("Före ändring");
  await page.getByRole("button", { name: "Spara", exact: true }).click();
  await expect.poll(async () => ((await portfolj(page)).modellVersioner || []).length).toBe(1);
  const v = (await portfolj(page)).modellVersioner[0];
  expect(v.objekt).toHaveLength(1);

  await page.getByLabel("Jämför med modellversion").selectOption({ index: 1 });
  const diff = page.getByRole("group", { name: "Jämförelse mot modellversion" });
  await expect(diff).toContainText("0 tillagda · 0 borttagna · 0 modifierade");

  // Lägg till en trafo och flytta containern → 1 tillagd, 1 modifierad.
  await kort(page).getByRole("button", { name: "+ Trafo", exact: true }).click();
  await klickaPlan(page, 20, 10);
  await page.keyboard.press("Escape");
  await expect(diff).toContainText("1 tillagda · 0 borttagna · 0 modifierade");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  const panel = page.getByRole("region", { name: "Container 1" });
  await panel.getByLabel("Öster om mitten (m)").fill("20");
  await panel.getByLabel("Öster om mitten (m)").press("Enter");
  await expect(diff).toContainText("1 tillagda · 0 borttagna · 1 modifierade");

  // Ta bort containern → borttagen.
  await panel.getByRole("button", { name: /^Ta bort Container 1/ }).click();
  await expect(diff).toContainText("1 tillagda · 1 borttagna · 0 modifierade");
  for (const t of ["Tillagd", "Borttagen", "Modifierad"]) await expect(diff).toContainText(t);

  await diff.getByRole("button", { name: "Ta bort versionen" }).click();
  await page.getByRole("button", { name: "Ta bort", exact: true }).click();
  await expect.poll(async () => ((await portfolj(page)).modellVersioner || []).length).toBe(0);
  await expect(page.getByRole("group", { name: "Jämförelse mot modellversion" })).toHaveCount(0);
});

test("sektionslådan har reglage som styr värdena och går att återställa", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  const sek = page.getByRole("button", { name: "Sektion", exact: true });
  await expect(sek).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("group", { name: "Sektionslåda" })).toHaveCount(0);
  await sek.click();
  await expect(sek).toHaveAttribute("aria-pressed", "true");
  const panel = page.getByRole("group", { name: "Sektionslåda" });
  await expect(panel).toBeVisible();

  const xTill = panel.getByLabel(/^X till/);
  await xTill.fill("10");
  await expect(panel.getByText("10 m").first()).toBeVisible();
  // En slider kan inte dras förbi sin motsats.
  await panel.getByLabel(/^X från/).fill("30");
  await expect(panel.getByLabel(/^X från/)).toHaveValue("10");

  await panel.getByRole("button", { name: "Återställ lådan" }).click();
  await expect(panel.getByLabel(/^X till/)).toHaveValue("40");

  await sek.click();
  await expect(sek).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveCount(0);
  utanKonsolfel(fel);
});

test("kryssmätning: två klick i 3D-vyn ger ett avstånd, och Rensa tar bort det", async ({ page }) => {
  await oppna(page, VY);
  const mat = page.getByRole("button", { name: "Mät", exact: true });
  await mat.click();
  await expect(mat).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Klicka på första punkten, sedan på nästa.")).toBeVisible();

  const canvas = page.locator("[data-lage] canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  await page.mouse.click(b.x + b.width * 0.4, b.y + b.height * 0.7);
  await page.mouse.click(b.x + b.width * 0.65, b.y + b.height * 0.7);
  await expect(page.getByText(/Avstånd/)).toBeVisible();
  await expect(page.getByText(/horisontellt/)).toBeVisible();

  await page.getByRole("button", { name: "Rensa mätning" }).click();
  await expect(page.getByText(/Avstånd/)).toHaveCount(0);
  await mat.click();
  await expect(mat).toHaveAttribute("aria-pressed", "false");
});
