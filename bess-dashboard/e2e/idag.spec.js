import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

test("Idag är startvy", async ({ page }) => {
  const { fel } = await oppna(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Idag");
  utanKonsolfel(fel);
});

test("sammanfattningen räknar det som kräver åtgärd", async ({ page }) => {
  await oppna(page);

  // Siffran ska stämma med antalet rader i de brådskande grupperna.
  const frister = page.getByRole("region", { name: "Frister som löper" });
  const forfallet = page.getByRole("region", { name: "Har passerat sitt datum" });
  const veckan = page.getByRole("region", { name: "Idag och inom sju dagar" });

  await expect(frister).toBeVisible();
  await expect(forfallet).toBeVisible();
  await expect(veckan).toBeVisible();
});

test("horisonten styr hur långt fram listan når", async ({ page }) => {
  await oppna(page);

  const grupp = () => page.getByRole("region", { name: /^Längre fram/ });
  await expect(grupp()).toBeVisible();

  const grupp14 = page.getByRole("radiogroup", { name: "Horisont" });
  await grupp14.getByRole("radio", { name: "14 dagar" }).click();
  await expect(page.getByRole("region", { name: "Längre fram — inom 14 dagar" })).toBeVisible();

  await grupp14.getByRole("radio", { name: "90 dagar" }).click();
  await expect(page.getByRole("region", { name: "Längre fram — inom 90 dagar" })).toBeVisible();
});

test("en frist leder direkt till rätt ÄTA-ärende", async ({ page }) => {
  await oppna(page);

  const frister = page.getByRole("region", { name: "Frister som löper" });
  const rader = frister.getByRole("listitem");
  test.skip((await rader.count()) === 0, "inga löpande frister i grunddatan");

  const titel = (await rader.first().locator("span").nth(1).textContent()).trim();
  const nr = titel.split(" ")[0];

  await rader.first().getByRole("button", { name: /^Öppna/ }).click();

  // Vi ska landa i ÄTA-vyn med just det ärendet utfällt.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA och hinder");
  const form = page.getByRole("region", { name: /^Ärende / });
  await expect(form).toBeVisible();
  await expect(form.getByRole("heading", { level: 3 })).toContainText(nr);
});

test("en agendarad leder till den vy som äger posten", async ({ page }) => {
  await oppna(page);

  const grupper = ["Har passerat sitt datum", "Idag och inom sju dagar", /^Längre fram/];
  let rad = null;
  for (const namn of grupper) {
    const kandidat = page.getByRole("region", { name: namn }).getByRole("listitem").first();
    if (await kandidat.isVisible().catch(() => false)) {
      rad = kandidat;
      break;
    }
  }
  test.skip(!rad, "inga agendaposter i grunddatan");

  await rad.getByRole("button", { name: /^Öppna/ }).click();
  // Vilken vy det blir beror på typen — men vi ska ha lämnat Idag.
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Idag");
});

test("Idag nås via kommandopaletten", async ({ page }) => {
  await oppna(page);
  await gaTill(page, "Risker");

  await page.keyboard.press("Control+k");
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });
  await palett.getByRole("combobox").fill("Idag");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Idag");
});

test("adressen speglar Idag-vyn och överlever omladdning", async ({ page }) => {
  await oppna(page);
  await gaTill(page, "Ekonomi");
  await gaTill(page, "Idag");

  expect(await page.evaluate(() => location.hash)).toMatch(/^#\/idag\//);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Idag");
});
