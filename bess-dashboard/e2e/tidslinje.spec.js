import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

const GANTT = "Gantt över byggfaser, milstolpar och leveranser";

/** Staplar och romber bär datum i sin etikett — spårens fäll-knappar gör det inte. */
const staplar = (gantt) => gantt.getByRole("button", { name: /\d{4}-\d{2}-\d{2}/ });

test.beforeEach(async ({ page }) => {
  await oppna(page, "Tidplan");
});

test("gantt ritar staplar och visar i dag-linjen i bild", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  await expect(gantt).toBeVisible();
  expect(await staplar(gantt).count()).toBeGreaterThan(0);

  // Diagrammet rullas så att dagens datum syns direkt — inte planens början.
  const tagg = gantt.getByText(/^I dag · /);
  await expect(tagg).toBeVisible();
  const lada = await gantt.boundingBox();
  const idag = await tagg.boundingBox();
  expect(idag.x).toBeGreaterThanOrEqual(lada.x);
  expect(idag.x + idag.width).toBeLessThanOrEqual(lada.x + lada.width);

  // Byggfaserna ur Bygga batteripark ritas som staplar med start och slut.
  await expect(gantt.getByRole("button", { name: /^\d+ · .+ till \d{4}-\d{2}-\d{2}/ }).first()).toBeAttached();
});

test("stapeln har beskrivande etikett och öppnar detaljvyn", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  const stapel = staplar(gantt).first();

  const etikett = await stapel.getAttribute("aria-label");
  // Ska bära titel, datum och läge — inte bara "knapp".
  expect(etikett).toMatch(/\d{4}-\d{2}-\d{2}/);
  expect(etikett).toMatch(/Klar|Pågående|Försenad|Planerad/);

  await stapel.click();
  await expect(stapel).toHaveAttribute("aria-pressed", "true");

  const detalj = page.getByRole("region", { name: /Detaljer för/ });
  await expect(detalj).toBeVisible();
  await expect(detalj.getByText("Tidsmarginal")).toBeVisible();

  await detalj.getByRole("button", { name: "Stäng" }).click();
  await expect(detalj).toBeHidden();
});

test("zoomen byter tidsskala och veckonummer", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  const zoom = page.getByRole("radiogroup", { name: "Zoom" });
  await expect(zoom.getByRole("radio", { name: "Månad" })).toHaveAttribute("aria-checked", "true");

  const fas = gantt.getByRole("button", { name: / till / }).first();
  const fore = (await fas.boundingBox()).width;

  await zoom.getByRole("radio", { name: "Vecka" }).click();
  await expect(zoom.getByRole("radio", { name: "Vecka" })).toHaveAttribute("aria-checked", "true");
  await expect(gantt.getByText(/^v\. \d{1,2}$/).first()).toBeAttached();
  // Vecka ritar drygt tre gånger så många pixlar per dag som Månad.
  expect((await fas.boundingBox()).width).toBeGreaterThan(fore * 2.5);

  await zoom.getByRole("radio", { name: "Kvartal" }).click();
  await expect(gantt.getByText(/^Q\d \d{4}$/).first()).toBeAttached();
  expect((await fas.boundingBox()).width).toBeLessThan(fore);
});

test("ett projektspår går att fälla ihop och ut", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  const spar = gantt.locator("button[aria-expanded]").first();
  const alla = await staplar(gantt).count();

  await expect(spar).toHaveAttribute("aria-expanded", "true");
  await spar.click();
  await expect(spar).toHaveAttribute("aria-expanded", "false");
  expect(await staplar(gantt).count()).toBeLessThan(alla);

  await spar.click();
  await expect(spar).toHaveAttribute("aria-expanded", "true");
  await expect(staplar(gantt)).toHaveCount(alla);
});

test("verktygstipset visar datum, läge och ansvarig vid hovring och fokus", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  const stapel = staplar(gantt).first();

  await stapel.focus();
  const tips = page.getByRole("tooltip");
  await expect(tips).toBeVisible();
  await expect(tips).toContainText(/Period|Datum/);
  await expect(tips).toContainText("Ansvarig");
  await expect(tips).toContainText(/Klar|Pågående|Försenad|Planerad/);
  await expect(stapel).toHaveAttribute("aria-describedby", await tips.getAttribute("id"));

  await stapel.blur();
  await expect(tips).toBeHidden();

  await stapel.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
});

test("en milstolpe med startdatum blir en stapel", async ({ page }) => {
  const gantt = page.getByRole("group", { name: GANTT });
  // En romb: ett datum, inget "till".
  const romb = gantt.getByRole("button", { name: /^[^,]+, \d{4}-\d{2}-\d{2}, / }).first();
  const etikett = await romb.getAttribute("aria-label");
  const [, titel, datum] = etikett.match(/^([^,]+), (\d{4}-\d{2}-\d{2}),/);

  await romb.click();
  const detalj = page.getByRole("region", { name: `Detaljer för ${titel}` });
  await expect(detalj).toBeVisible();

  const d = new Date(`${datum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 30);
  const start = d.toISOString().slice(0, 10);

  const falt = detalj.getByLabel(`Start för ${titel}`);
  await falt.fill(start);
  await falt.press("Enter");

  await expect(
    gantt.getByRole("button", { name: `${titel}, ${start} till ${datum},` }).first()
  ).toBeAttached();
  await expect(detalj.getByText("Slut", { exact: true })).toBeVisible();
});

test("omfattningsväljaren går att styra med piltangenter", async ({ page }) => {
  const grupp = page.getByRole("radiogroup", { name: "Omfattning" });
  const alla = grupp.getByRole("radio", { name: "Alla projekt" });
  const ett = grupp.getByRole("radio", { name: "Valt projekt" });

  await expect(alla).toHaveAttribute("aria-checked", "true");

  await alla.focus();
  await page.keyboard.press("ArrowRight");
  await expect(ett).toHaveAttribute("aria-checked", "true");
  await expect(ett).toBeFocused();
});

test("byggfaserna fälls ut och bockar av", async ({ page }) => {
  const faser = page.getByRole("region", { name: /^Milstolpar → klart-kriterier/ });
  const forstaFas = faser.locator("button[aria-expanded]").first();
  await expect(forstaFas).toHaveAttribute("aria-expanded", "false");

  await forstaFas.click();
  await expect(forstaFas).toHaveAttribute("aria-expanded", "true");

  const kryss = faser.getByRole("checkbox").first();
  await expect(kryss).toBeVisible();

  const fore = await kryss.isChecked();
  await kryss.click();
  expect(await kryss.isChecked()).toBe(!fore);
});
