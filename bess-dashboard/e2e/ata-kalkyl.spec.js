import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* ÄTA-kalkylen: rader på en befintlig ÄTA, belopp tillbaka på posten,
   avi via #utskrift och CSV. */

const REGISTER = "UR- och ÄTA-register";

async function oppnaKalkyl(page, nr = "UR001") {
  await page.getByRole("radio", { name: "Tabell" }).click();
  await page.getByRole("region", { name: REGISTER, exact: true }).getByRole("button", { name: `Öppna i kalkyl ${nr}` }).click();
  const kort = page.getByRole("region", { name: new RegExp(`^ÄTA-kalkyl — ${nr}`) });
  await expect(kort).toBeVisible();
  return kort;
}

const rader = (kort, nr = "UR001") => kort.getByRole("region", { name: `Kalkylrader för ${nr}` }).locator("tbody tr");

async function fyll(falt, varde) {
  await falt.fill(varde);
  await falt.press("Tab");
}

test("en montör 2 × 945 och material 10 000 ger 12 890 netto, och beloppet står kvar efter omladdning", async ({ page }) => {
  const { fel } = await oppna(page, "ÄTA");
  const kort = await oppnaKalkyl(page);

  // Numret och benämningen kommer från ÄTA:n.
  await expect(kort.getByRole("heading", { level: 3 })).toHaveText("ÄTA-kalkyl — UR001 Projektering");

  await kort.getByRole("button", { name: "+ Montör", exact: true }).click();
  await fyll(kort.getByLabel("Antal tim, rad 1, Montör"), "2");
  await expect(rader(kort).first()).toContainText(/1\s890 kr/);

  await kort.getByRole("button", { name: "+ Material", exact: true }).click();
  await fyll(kort.getByLabel("Antal kr, rad 2, Material"), "10000");
  await expect(rader(kort).nth(1)).toContainText(/11\s000 kr/);

  const summa = kort.getByRole("definition");
  await expect(kort.getByLabel("Summering")).toContainText(/Netto\s*12\s890 kr/);
  await expect(kort.getByLabel("Summering")).toContainText(/Moms 25 %\s*3\s223 kr/);
  await expect(kort.getByLabel("Summering")).toContainText(/Att betala\s*16\s113 kr/);
  expect(await summa.count()).toBe(3);

  await kort.getByRole("button", { name: "Spara belopp på ÄTA:n" }).click();
  await expect(kort.getByText("Belopp sparat")).toBeVisible();

  // Sparat i portföljen, inte i en egen nyckel.
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}");
    return (s.ur || []).some((u) => u.nr === "UR001" && u.belopp === 12890 && u.kalkyl?.rader?.length === 2);
  });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await gaTill(page, "ÄTA");
  await page.getByRole("radio", { name: "Tabell" }).click();
  const rad = page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr", { hasText: "UR001" });
  await expect(rad).toContainText(/12\s890 kr/);
  utanKonsolfel(fel);
});

test("övertid 50 % är faktor 1,5 och Enter i beskrivningen ger en ny rad med samma resurs", async ({ page }) => {
  await oppna(page, "ÄTA");
  const kort = await oppnaKalkyl(page);

  await kort.getByRole("button", { name: "+ Ledande montör", exact: true }).click();
  await fyll(kort.getByLabel("Antal tim, rad 1, Ledande montör"), "2");
  await kort.getByLabel("Övertid i procent, rad 1, Ledande montör").selectOption("50");
  await expect(rader(kort).first()).toContainText(/3\s030 kr/);

  const beskrivning = kort.getByLabel("Beskrivning, rad 1, Ledande montör");
  await beskrivning.fill("Kabeldragning kväll");
  await beskrivning.press("Enter");
  await expect(rader(kort)).toHaveCount(2);
  await expect(kort.getByLabel("Resurs, rad 2, Ledande montör")).toHaveValue("Ledande montör");
  await expect(kort.getByLabel("Beskrivning, rad 2, Ledande montör")).toBeFocused();
  await expect(kort.getByLabel("Beskrivning, rad 1, Ledande montör")).toHaveValue("Kabeldragning kväll");
});

test("avin skrivs ut via #utskrift med två signaturer, och CSV har BOM och semikolon", async ({ page }) => {
  await oppna(page, "ÄTA");
  const kort = await oppnaKalkyl(page);
  await kort.getByRole("button", { name: "+ Montör", exact: true }).click();
  await fyll(kort.getByLabel("Antal tim, rad 1, Montör"), "2");

  await page.evaluate(() => {
    window.print = () => {};
  });
  await kort.getByRole("button", { name: "Skriv ut avi" }).click();
  const utskrift = page.locator("#utskrift");
  await expect(utskrift).toContainText("Avisering av ÄTA-arbete");
  await expect(utskrift).toContainText("UR001");
  await expect(utskrift).toContainText(/Att betala\s*2\s363 kr/);
  await expect(utskrift).toContainText("För ONE Nordic AB");
  await expect(utskrift).toContainText("Godkänns — för beställaren");
  await expect(utskrift.locator("img")).toHaveCount(1);

  const [fil] = await Promise.all([page.waitForEvent("download"), kort.getByRole("button", { name: "Exportera CSV" }).click()]);
  expect(fil.suggestedFilename()).toMatch(/^ATA_kalkyl_UR001_\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await (await fil.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8"));
  expect(text.startsWith("﻿")).toBe(true);
  expect(text.split("\n")[0].replace("﻿", "")).toBe("Datum;Beskrivning;Resurs;Antal;ÖT %;Påslag %;Summa");
  expect(text.split("\n")[1]).toMatch(/;Montör;2;0;0;1890$/);
});

test("ÄTA-panelen öppnar kalkylen för samma ÄTA", async ({ page }) => {
  await oppna(page, "ÄTA");
  await page.getByRole("radio", { name: "Tabell" }).click();
  await page.getByRole("region", { name: REGISTER, exact: true }).locator("tbody tr").nth(1).getByRole("button").first().click();
  const panel = page.getByRole("region", { name: /^ÄTA / });
  const nr = (await panel.getAttribute("aria-label")).replace("ÄTA ", "");
  await panel.getByRole("button", { name: "Öppna i kalkyl" }).click();
  await expect(page.getByRole("region", { name: new RegExp(`^ÄTA-kalkyl — ${nr}`) })).toBeVisible();
  await expect(panel).toBeHidden();
});
