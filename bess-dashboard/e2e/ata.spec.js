import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

const REGISTER = "UR- och ÄTA-register";
const ARENDE = /^Ärende /;

test.beforeEach(async ({ page }) => {
  await oppna(page, "ÄTA och hinder");
});

/* Standardvyn är tavlan. Testerna som handlar om registret byter till
   tabellen först — vyvalet är en radiogroup, så det görs som ett radioval. */
async function visaTabell(page) {
  await page.getByRole("radio", { name: "Tabell" }).click();
  await expect(page.getByRole("region", { name: REGISTER, exact: true })).toBeVisible();
}

/* ---------- Tavlan ---------- */

test("tavlan visar ÄTA-flödets fyra kolumner", async ({ page }) => {
  const tavla = page.getByRole("list", { name: "ÄTA-flödet" });
  await expect(tavla).toBeVisible();
  await expect(tavla.getByRole("listitem")).toHaveCount(4);
  for (const namn of ["Identifierad", "ÄTA-granskning", "Godkänd", "Fakturerad"]) await expect(tavla.getByRole("heading", { name: namn })).toBeVisible();
});

test("ett kort på tavlan öppnar ärendepanelen", async ({ page }) => {
  const kort = page.locator(".atakort").first();
  test.skip((await kort.count()) === 0, "inga poster i grunddatan");

  await kort.getByRole("button").first().click();

  const panel = page.getByRole("region", { name: ARENDE });
  await expect(panel).toBeVisible();

  // Tavlan ska ligga kvar bakom panelen — det är hela poängen med en slide-over.
  await expect(page.getByRole("list", { name: "ÄTA-flödet" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("vyvalet överlever omladdning", async ({ page }) => {
  await visaTabell(page);
  await page.reload();
  await expect(page.getByRole("region", { name: REGISTER, exact: true })).toBeVisible();
});

/* ---------- Registret ---------- */

test("registret listar posterna med klass, status och grindar", async ({ page }) => {
  await visaTabell(page);
  const tabell = page.getByRole("region", { name: REGISTER, exact: true });
  expect(await tabell.locator("tbody tr").count()).toBeGreaterThan(0);

  // Beloppskolumnen summeras i foten.
  await expect(tabell.locator("tfoot")).toBeVisible();
});

test("klick på numret öppnar hela ärendet", async ({ page }) => {
  await visaTabell(page);
  const forsta = page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first();
  const nrKnapp = forsta.getByRole("button").first();

  await expect(nrKnapp).toHaveAttribute("aria-expanded", "false");
  await nrKnapp.click();
  await expect(nrKnapp).toHaveAttribute("aria-expanded", "true");

  const form = page.getByRole("region", { name: ARENDE });
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Behandlas som (följer orsaken)")).toBeVisible();
  await expect(form.getByLabel("Prissättningsgrund")).toBeVisible();

  await form.getByRole("button", { name: "Stäng" }).click();
  await expect(form).toBeHidden();
});

test("orsaksvalet styr vägledningen om ÄTA eller hinder", async ({ page }) => {
  await visaTabell(page);
  await page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first().getByRole("button").first().click();

  const form = page.getByRole("region", { name: ARENDE });
  const orsak = form.getByLabel(/^Orsak/);

  const varden = await orsak.locator("option").evaluateAll((o) =>
    o.map((x) => x.value).filter(Boolean)
  );
  test.skip(!varden.length, "inga orsaker i konstanterna");

  await orsak.selectOption(varden[0]);
  await expect(form.locator(".guide")).toBeVisible();
});

test("ändrad status skrivs till ändringsloggen", async ({ page }) => {
  // Namnet används som signatur i loggen.
  await page.getByLabel("Ditt namn").fill("E2E-test");
  await visaTabell(page);

  const forsta = page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first();
  await forsta.getByRole("button").first().click();

  const form = page.getByRole("region", { name: ARENDE });
  const status = form.getByLabel(/^Status för/);
  const nuvarande = await status.inputValue();
  const nytt = nuvarande === "oppen" ? "prissattning" : "oppen";

  await status.selectOption(nytt);
  await expect(page.getByRole("status").filter({ hasText: /uppdaterad|loggad/ }).first()).toBeVisible();
});

test("grindarna visas för poster som bryter mot 24-timmarsfristen", async ({ page }) => {
  await visaTabell(page);
  const grindar = page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody .grind");
  const antal = await grindar.count();
  test.skip(antal === 0, "ingen post larmar i grunddatan");

  // Varje grind ska bära en textförklaring för skärmläsare, inte bara en ikon.
  await expect(grindar.first()).toHaveAttribute("title", /.+/);
});

test("ÄTA-registret går att exportera", async ({ page }) => {
  await visaTabell(page);
  const [nedladdning] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportera CSV" }).first().click(),
  ]);
  expect(nedladdning.suggestedFilename()).toMatch(/^Portfolj_ATA_register_\d{4}-\d{2}-\d{2}\.csv$/);
});

test("tidslinjen placerar en post med datum som händelse i Gantt-schemat", async ({ page }) => {
  await visaTabell(page);
  await page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first().getByRole("button").first().click();
  const form = page.getByRole("region", { name: ARENDE });
  const datum = form.getByLabel("Händelsedatum");
  await datum.fill("2026-09-01");
  await datum.press("Enter");
  await form.getByRole("button", { name: "Stäng" }).click();

  await page.getByRole("radio", { name: "Tidslinje" }).click();
  const gantt = page.getByRole("group", { name: "ÄTA-ärenden på tidsaxel" });
  const post = gantt.getByRole("button", { name: /, 2026-09-01, / });
  await expect(post).toHaveCount(1);

  // Klick på posten öppnar ärendet, som i tavlan och registret.
  await post.click();
  await expect(page.getByRole("region", { name: ARENDE })).toBeVisible();
});

test("ÄTA-kortet visar art och en checklista med fyra steg, och art sätts i panelen", async ({ page }) => {
  const kort = page.locator(".atakort").first();
  test.skip((await kort.count()) === 0, "inga poster i grunddatan");
  await expect(kort.getByRole("img", { name: /^Granskning: \d av 4 steg klara/ })).toBeVisible();

  await kort.getByRole("button").first().click();
  const form = page.getByRole("region", { name: ARENDE });
  await form.getByLabel("Art", { exact: true }).selectOption("tillagg");
  await expect(form.getByLabel("Art", { exact: true })).toHaveValue("tillagg");
  await expect(page.locator(".atakort").first().getByText("Tillägg")).toBeVisible();
});

test("orsaken hinder föreslår klassen hinder på en oklassificerad post, och skriver aldrig över en vald klass", async ({ page }) => {
  await visaTabell(page);
  await page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").first().getByRole("button").first().click();
  const form = page.getByRole("region", { name: ARENDE });
  await form.getByLabel(/^Behandlas som/).selectOption("oklar");
  await form.getByLabel(/^Orsak/).selectOption("ue_material");
  await expect(form.getByLabel(/^Behandlas som/)).toHaveValue("hinder");

  // En klass någon redan satt ligger kvar.
  await form.getByLabel(/^Behandlas som/).selectOption("ata");
  await form.getByLabel(/^Orsak/).selectOption("omvarld");
  await expect(form.getByLabel(/^Behandlas som/)).toHaveValue("ata");
});
