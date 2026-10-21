import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

test("Idag är startvy", async ({ page }) => {
  const { fel } = await oppna(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Idag");
  utanKonsolfel(fel);
});

test("Idag är tre block: bandet, Att göra och Längre fram infällt", async ({ page }) => {
  await oppna(page);

  await expect(page.getByRole("region", { name: "Sammanfattning" })).toBeVisible();
  const attGora = page.getByRole("region", { name: "Att göra", exact: true });
  await expect(attGora).toBeVisible();

  // Rubrikerna inne i kortet visas bara när de har rader. Är alla tomma står
  // en rad om att inget är brådskande.
  const delar = ["Brådskande", "Idag", "Denna vecka"];
  let synliga = 0;
  for (const d of delar) synliga += await attGora.getByRole("region", { name: new RegExp(`^${d}`) }).count();
  if (!synliga) await expect(attGora).toContainText("Inget brådskande");

  // Förklaringsrutan och site-kortet ligger inte längre på sidan.
  await expect(page.locator("main")).not.toContainText("Vad som räknas här.");
  await expect(page.getByRole("region", { name: "Siten", exact: true })).toHaveCount(0);

  // Längre fram är infällt tills man öppnar det.
  const kommande = page.locator("#idag-kommande");
  await expect(kommande).not.toHaveAttribute("open", "");
});

test("horisonten styr hur långt fram listan når", async ({ page }) => {
  await oppna(page);
  await page.locator("#idag-kommande summary").click();

  const grupp = () => page.getByRole("region", { name: /^Längre fram/ });
  await expect(grupp()).toBeVisible();

  const horisont = page.getByRole("radiogroup", { name: "Horisont" });
  await horisont.getByRole("radio", { name: "14 dagar" }).click();
  await expect(page.getByRole("region", { name: "Längre fram — inom 14 dagar" })).toBeVisible();

  await horisont.getByRole("radio", { name: "90 dagar" }).click();
  await expect(page.getByRole("region", { name: "Längre fram — inom 90 dagar" })).toBeVisible();
});

test("en frist leder direkt till rätt ÄTA-ärende", async ({ page }) => {
  await oppna(page);

  const bradskande = page.getByRole("region", { name: /^Brådskande/ });
  const rader = bradskande.getByRole("listitem").filter({ hasText: "ÄTA-frist" });
  test.skip((await rader.count()) === 0, "inga löpande frister i grunddatan");

  const titel = (await rader.first().locator("[data-titel]").textContent()).trim();
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

  const attGora = page.getByRole("region", { name: "Att göra", exact: true });
  let rad = null;
  for (const namn of [/^Idag/, /^Denna vecka/, /^Brådskande/]) {
    const kandidat = attGora.getByRole("region", { name: namn }).getByRole("listitem").first();
    if (await kandidat.isVisible().catch(() => false)) {
      rad = kandidat;
      break;
    }
  }
  test.skip(!rad, "inga agendaposter i grunddatan");

  await rad.getByRole("button", { name: /^Öppna/ }).click();
  // Vilken vy det blir beror på typen. Punkter hanteras i en panel på Idag, allt annat
  // leder till sin egen vy.
  const panel = page.getByRole("region", { name: /^Punkt: / });
  if (await panel.isVisible().catch(() => false)) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Idag");
  } else {
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Idag");
  }
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
