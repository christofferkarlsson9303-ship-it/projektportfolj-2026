import { expect, test } from "@playwright/test";
import { sitePanel, gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Siten som modellbaserad ÄTA-hantering: delad vy med avdelare, ÄTA
   kopplade till objekt (objectGuid, viewpoint, boundingBox), filtrering mellan
   3D och ÄTA, modellversioner med jämförelse, sektionslåda och mätning.
   Logiken (kameraflygning, diff, klippplan, mått) är enhetstestad utan WebGL i
   src/lib/modellKoppling.test.js, modellDiff.test.js och modellReducer.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const arenden = (page) => page.getByRole("complementary", { name: "ÄTA på siten" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

async function laggContainer(page) {
  await sitePanel(page, "Bygg");
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await sitePanel(page, "Bygg");
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
}

/** Klickar i planvyn på en punkt i meter (x öster, z söder). */
async function klickaPlan(page, x, z) {
  await sitePanel(page, "Objekt");
  const plan = page.getByRole("img", { name: /^Planvy över siten/ });
  await plan.scrollIntoViewIfNeeded();
  const b = await plan.boundingBox();
  await page.mouse.click(b.x + ((x + 42) / 84) * b.width, b.y + ((z + 28) / 56) * b.height);
}

async function nyttArende(page, text) {
  await sitePanel(page, "ÄTA");
  await arenden(page).getByRole("button", { name: "+ ÄTA på objektet" }).click();
  await page.getByLabel("Kort beskrivning av händelsen").fill(text);
  await page.getByRole("button", { name: "Registrera", exact: true }).click();
}

test("ÄTA öppnas i verktygspanelen och scenen behåller sin bredd", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await expect(arenden(page)).toBeHidden();
  const scen = page.getByRole("application");
  const bredd = (await scen.boundingBox()).width;
  await sitePanel(page, "ÄTA");
  await expect(arenden(page).getByRole("heading", { name: "ÄTA" })).toBeVisible();
  expect((await scen.boundingBox()).width).toBeCloseTo(bredd, 0);
  utanKonsolfel(fel);
});

test("en ny ÄTA på ett objekt sparar objectGuid, viewpoint, boundingBox och modellversion", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await sitePanel(page, "ÄTA");
  await expect(arenden(page).getByText("Ingen ÄTA är kopplad till Container 1 än.")).toBeVisible();

  await nyttArende(page, "Extra kabelränna vid container");
  await sitePanel(page, "ÄTA");
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);
  await sitePanel(page, "ÄTA");
  await expect(arenden(page)).toContainText("Extra kabelränna vid container");
  await sitePanel(page, "ÄTA");
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
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Skadad dörr på container");
  await sitePanel(page, "ÄTA");
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);

  await gaTill(page, "ÄTA");
  const chip = page.getByRole("status").filter({ hasText: "Visar ÄTA på objektet" });
  await expect(chip).toContainText("Container 1");
  await expect(chip).toContainText("1 av");
  await expect(page.getByText("Skadad dörr på container").first()).toBeVisible();

  // Visa alla tar bort filtret.
  await chip.getByRole("button", { name: "Visa alla" }).click();
  await expect(chip).toHaveCount(0);

  // Filtret kommer tillbaka när objektet markeras igen, och leder tillbaka till 3D.
  await gaTill(page, VY);
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await gaTill(page, "ÄTA");
  await page.getByRole("status").filter({ hasText: "Visar ÄTA på objektet" }).getByRole("button", { name: "Visa i 3D" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(VY);
  await sitePanel(page, "Objekt");
  await expect(page.getByRole("region", { name: "Container 1" })).toBeVisible();
});

test("ÄTA-panelen i ÄTA visar kopplingen och kan koppla och släppa objektet", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Behöver extra skärmning");

  await gaTill(page, "ÄTA");
  await page.getByRole("status").getByRole("button", { name: "Visa alla" }).click();
  await page.getByText("Behöver extra skärmning").first().click();
  const drawer = page.getByRole("region", { name: /^ÄTA / });
  const koppling = drawer.getByRole("region", { name: "Koppling till 3D-modellen" });
  await expect(koppling).toContainText("Objekt: Container 1");
  await expect(koppling).toContainText("Objekt-ID (GUID)");
  await expect(koppling.getByRole("button", { name: "Visa i 3D" })).toBeVisible();

  await koppling.getByRole("button", { name: "Ta bort koppling" }).click();
  await expect(koppling).toContainText("inte kopplad till något objekt");
  await expect
    .poll(async () => ((await portfolj(page)).ur || []).find((u) => u.benamning === "Behöver extra skärmning")?.objectGuid)
    .toBeUndefined();
});

test("en ÄTA i panelen flyger inte kameran i gåläget men markerar objektet", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await nyttArende(page, "Kontrollera jordning");
  await sitePanel(page, "Visning");
  await page.getByRole("radio", { name: "Gå in" }).click();
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await sitePanel(page, "ÄTA");
  await arenden(page).getByRole("button", { name: "Visa i 3D", exact: true }).first().click();
  // "Visa i 3D" lämnar gåläget och flyger i orbit.
  await sitePanel(page, "Visning");
  await expect(page.getByRole("radio", { name: "Orbit" })).toHaveAttribute("aria-checked", "true");
});

test("modellversion och jämförelse: tillagt syns i sammanfattningen och versionen kan tas bort", async ({ page }) => {
  await oppna(page, VY);
  await laggContainer(page);
  await sitePanel(page, "Visning");
  await page.getByRole("button", { name: "Spara modellversion" }).click();
  await page.getByLabel("Namn på versionen").fill("Före ändring");
  await page.getByRole("button", { name: "Spara", exact: true }).click();
  await expect.poll(async () => ((await portfolj(page)).modellVersioner || []).length).toBe(1);
  const v = (await portfolj(page)).modellVersioner[0];
  expect(v.objekt).toHaveLength(1);

  await sitePanel(page, "Visning");
  await page.getByLabel("Jämför med modellversion").selectOption({ index: 1 });
  const diff = page.getByRole("group", { name: "Jämförelse mot modellversion" });
  await sitePanel(page, "Visning");
  await expect(diff).toContainText("0 tillagda · 0 borttagna · 0 modifierade");

  // Lägg till en trafo och flytta containern → 1 tillagd, 1 modifierad.
  await sitePanel(page, "Bygg");
  await kort(page).getByRole("button", { name: "+ Trafo", exact: true }).click();
  await klickaPlan(page, 20, 10);
  await page.keyboard.press("Escape");
  await sitePanel(page, "Visning");
  await expect(diff).toContainText("1 tillagda · 0 borttagna · 0 modifierade");
  await sitePanel(page, "Objekt");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  const panel = page.getByRole("region", { name: "Container 1" });
  await sitePanel(page, "Objekt");
  await panel.getByLabel("Öster om mitten (m)").fill("20");
  await sitePanel(page, "Objekt");
  await panel.getByLabel("Öster om mitten (m)").press("Enter");
  await sitePanel(page, "Visning");
  await expect(diff).toContainText("1 tillagda · 0 borttagna · 1 modifierade");

  // Ta bort containern → borttagen.
  await sitePanel(page, "Objekt");
  await panel.getByRole("button", { name: /^Ta bort Container 1/ }).click();
  await sitePanel(page, "Visning");
  await expect(diff).toContainText("1 tillagda · 1 borttagna · 0 modifierade");
  await sitePanel(page, "Visning");
  for (const t of ["Tillagd", "Borttagen", "Modifierad"]) await expect(diff).toContainText(t);

  await sitePanel(page, "Visning");
  await diff.getByRole("button", { name: "Ta bort versionen" }).click();
  await page.getByRole("button", { name: "Ta bort", exact: true }).click();
  await expect.poll(async () => ((await portfolj(page)).modellVersioner || []).length).toBe(0);
  await expect(page.getByRole("group", { name: "Jämförelse mot modellversion" })).toHaveCount(0);
});

test("sektionslådan har reglage som styr värdena och går att återställa", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await sitePanel(page, "Visning");
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
  await sitePanel(page, "Visning");
  const mat = page.getByRole("button", { name: "Mät", exact: true });
  await mat.click();
  await expect(mat).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Klicka på första punkten, sedan på nästa.")).toBeVisible();

  await page.getByRole("button", { name: "Fäll in verktyg" }).click();
  const canvas = page.locator("[data-lage] canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  await page.mouse.click(b.x + b.width * 0.4, b.y + b.height * 0.7);
  await page.mouse.click(b.x + b.width * 0.65, b.y + b.height * 0.7);
  await page.getByRole("button", { name: "Visa verktyg" }).click();
  await expect(page.getByText(/Avstånd/)).toBeVisible();
  await expect(page.getByText(/horisontellt/)).toBeVisible();

  await page.getByRole("button", { name: "Rensa mätning" }).click();
  await expect(page.getByText(/Avstånd/)).toHaveCount(0);
  await mat.click();
  await expect(mat).toHaveAttribute("aria-pressed", "false");
});

