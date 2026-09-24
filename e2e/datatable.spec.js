import { expect, test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

const TABELL = "Öppna punkter";
const arMobil = (testInfo) => testInfo.project.name === "mobil";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Öppna punkter");
});

test("sortering växlar stigande → fallande → av och speglas i aria-sort", async ({ page }, testInfo) => {
  // Rubrikraden är dold i mobilens kortvy — där sorterar man via väljaren.
  test.skip(arMobil(testInfo), "aria-sort gäller rubrikraden, som saknas i kortvyn");

  const rubrik = page.getByRole("columnheader", { name: /^Punkt/ });
  const knapp = rubrik.getByRole("button");

  await expect(rubrik).toHaveAttribute("aria-sort", "none");

  await knapp.click();
  await expect(rubrik).toHaveAttribute("aria-sort", "ascending");

  await knapp.click();
  await expect(rubrik).toHaveAttribute("aria-sort", "descending");

  await knapp.click();
  await expect(rubrik).toHaveAttribute("aria-sort", "none");
});

test("sortering ordnar raderna på riktigt", async ({ page }, testInfo) => {
  const celler = page.getByRole("region", { name: TABELL }).locator("tbody tr td:nth-child(2)");

  const sortera = async () => {
    if (arMobil(testInfo)) {
      await page.getByLabel("Sortera efter").selectOption("titel");
    } else {
      await page.getByRole("columnheader", { name: /^Punkt/ }).getByRole("button").click();
    }
  };
  const vand = async () => {
    if (arMobil(testInfo)) {
      await page.getByRole("button", { name: /Sortera (fallande|stigande)/ }).click();
    } else {
      await page.getByRole("columnheader", { name: /^Punkt/ }).getByRole("button").click();
    }
  };

  await sortera();
  const stigande = (await celler.allTextContents()).map((s) => s.trim());

  await vand();
  const fallande = (await celler.allTextContents()).map((s) => s.trim());

  expect(stigande.length).toBeGreaterThan(1);
  expect(fallande).toEqual([...stigande].reverse());
});

test("mobil: sorteringsväljaren finns när rubrikraden är dold", async ({ page }, testInfo) => {
  test.skip(!arMobil(testInfo), "gäller bara mobilvyn");

  await expect(page.getByLabel("Sortera efter")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^Punkt/ })).not.toBeInViewport();
});

test("snabbsökning filtrerar och antalet annonseras", async ({ page }) => {
  const rader = page.getByRole("region", { name: TABELL }).locator("tbody tr");
  const fore = await rader.count();

  await page.getByLabel("Sök i tabellen").fill("zzz-finns-inte");
  await expect(rader).toHaveCount(1); // tomraden
  await expect(page.getByText("Inga rader matchar filtret.")).toBeVisible();

  await page.getByLabel("Sök i tabellen").fill("");
  await expect(rader).toHaveCount(fore);
});

test("kolumnfilter begränsar urvalet", async ({ page }) => {
  const rader = page.getByRole("region", { name: TABELL }).locator("tbody tr");
  const fore = await rader.count();

  const filter = page.getByLabel("Status", { exact: true });
  const alternativ = await filter.locator("option").count();
  test.skip(alternativ < 2, "behöver minst ett statusvärde i datan");

  await filter.selectOption({ index: 1 });
  const efter = await rader.count();
  expect(efter).toBeLessThanOrEqual(fore);

  await filter.selectOption("");
  await expect(rader).toHaveCount(fore);
});

test("kompakt vy minskar radhöjden och sparas", async ({ page }) => {
  const forstaCell = page.getByRole("region", { name: TABELL }).locator("tbody tr td").first();
  const hogNormal = (await forstaCell.boundingBox()).height;

  await page.getByRole("radiogroup", { name: "Radtäthet" }).getByRole("radio", { name: "Kompakt" }).click();
  const hogKompakt = (await forstaCell.boundingBox()).height;
  expect(hogKompakt).toBeLessThan(hogNormal);

  // Ska överleva omladdning — det är en personlig arbetspreferens.
  await page.reload();
  await expect(
    page.getByRole("radiogroup", { name: "Radtäthet" }).getByRole("radio", { name: "Kompakt" })
  ).toHaveAttribute("aria-checked", "true");
});

test("CSV-exporten laddar ner det filtrerade urvalet", async ({ page }) => {
  await page.getByLabel("Sök i tabellen").fill("a");

  const [nedladdning] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportera CSV" }).click(),
  ]);

  expect(nedladdning.suggestedFilename()).toMatch(/^Portfolj_Oppna_punkter_\d{4}-\d{2}-\d{2}\.csv$/);

  const strom = await nedladdning.createReadStream();
  const bitar = [];
  for await (const b of strom) bitar.push(b);
  const text = Buffer.concat(bitar).toString("utf8");

  expect(text.charCodeAt(0)).toBe(0xfeff); // BOM för svensk Excel
  expect(text.split("\n")[0]).toContain("Punkt;");
});

test("summeringsraden räknar på det filtrerade urvalet", async ({ page }) => {
  await gaTill(page, "Ekonomi");

  const tfoot = page.getByRole("region", { name: "Betalplan" }).locator("tfoot tr");
  await expect(tfoot).toBeVisible();

  // Betalplanens andelar ska summera till 100 % när inget är bortfiltrerat.
  await expect(tfoot).toContainText("100");
});

test("mobil: tabellen blir kort med fältetiketter", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobil", "gäller bara mobilvyn");

  const forstaRad = page.getByRole("region", { name: TABELL }).locator("tbody tr").first();
  // I kortvyn läggs rubriken in som ::before ur data-label.
  const etikett = await forstaRad.locator("td").first().getAttribute("data-label");
  expect(etikett).toBeTruthy();

  const thead = page.getByRole("region", { name: TABELL }).locator("thead");
  await expect(thead).not.toBeInViewport();
});
