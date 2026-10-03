import { test, expect } from "@playwright/test";
import { oppna, gaTill, utanKonsolfel } from "./hjalpare.js";

/* Påhittad profil — riktiga avtalsvärden hör inte hemma i testerna. */
const profil = {
  schema: "kontraktsprofil-v1",
  projektId: "36037",
  kalla: { dokument: "Testavtal rev A", datum: "2026-01-15", granskadAv: "Testare" },
  kontraktssumma: 2000000,
  avtalsform: "Totalentreprenad, ABT 06",
  betalning: { villkorDagar: 30, forskott: false, index: "", ref: "§15" },
  milstolpar: [
    { kod: "M1", namn: "Start", andel: 10, krav: "Signerat avtal", ref: "Bilaga 4" },
    { kod: "M2", namn: "Projektering", andel: 25, krav: "", ref: "Bilaga 4" },
    { kod: "M3", namn: "Mark", andel: 25, krav: "", ref: "Bilaga 4" },
    { kod: "M4", namn: "Betong", andel: 20, krav: "", ref: "Bilaga 4" },
    { kod: "M5", namn: "Batteri", andel: 15, krav: "", ref: "Bilaga 4" },
    { kod: "M6", namn: "Slutbesiktning", andel: 3, krav: "", ref: "Bilaga 4" },
    { kod: "M7", namn: "Anmärkningar", andel: 2, krav: "", ref: "Bilaga 4" },
  ],
  frister: [
    { id: "hinder", rubrik: "Underrätta om hinder", varde: 7, enhet: "bankdagar", vad: "Skriftligt på beställarens mall.", foljd: "ingen ersättning eller tidsförlängning.", ref: "§9.9" },
    { id: "atgarda-fel", rubrik: "Åtgärda fel", varde: 3, enhet: "veckor", vad: "", foljd: "", ref: "§4.4" },
  ],
  viten: [{ id: "forsening", rubrik: "Försenad milstolpe", procentPerVecka: 1, takProcent: 4, nar: "Per påbörjad vecka.", ref: "§5.1" }],
  sakerheter: [{ rubrik: "Byggsäkerhet", procent: 10, giltig: "Till slutbesiktning", ref: "§6" }],
  garanti: { arbetenAr: 5, materialAr: 2, ref: "§7" },
  priser: [{ roll: "Montör", pris: 900, enhet: "tim" }],
  prisvillkor: [],
  kontrollera: ["Testpunkt att stämma av."],
};

test("kontraktsprofilen läses in, granskas och styr ÄTA-vägledningen", async ({ page }) => {
  const { fel } = await oppna(page, "Kontraktet");
  await page.getByRole("button", { name: "36037 Växjö Batteripark", exact: true }).click();
  const start = page.getByRole("region", { name: /^Kontraktet – 36037/ });
  await expect(start).toContainText("Standardmall");

  await page.getByLabel("Välj kontraktsprofil").setInputFiles({ name: "fel.json", mimeType: "application/json", buffer: Buffer.from("{inte json") });
  await expect(page.locator("main")).toContainText("Filen kan inte sparas.");
  await page.getByRole("button", { name: "Avbryt", exact: true }).click();

  await page.getByLabel("Välj kontraktsprofil").setInputFiles({ name: "vaxjo.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(profil)) });
  await expect(page.locator("main")).toContainText("Granska innan du sparar");
  await expect(page.locator("main")).toContainText("skiljer sig från portföljens");
  await page.getByRole("button", { name: "Spara kontraktsprofilen", exact: true }).click();

  await expect(start).toContainText("Kontrollerat mot kontrakt");
  await expect(start).toContainText("Testavtal rev A");
  const frister = page.getByRole("region", { name: "Hur lång tid du har på dig" });
  await expect(frister.locator("li").first()).toContainText("Underrätta om hinder");
  await expect(frister).toContainText("7 bankdagar");
  await expect(page.getByRole("region", { name: "Vad det kostar att missa" })).toContainText("20 000 kr per vecka");
  await expect(page.getByRole("region", { name: "Så får ni betalt" })).toContainText("200 000 kr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kontraktet");
  await expect(page.getByRole("region", { name: /^Kontraktet – 36037/ })).toContainText("Kontrollerat mot kontrakt");

  await gaTill(page, "ÄTA och hinder");
  await expect(page.locator("main")).toContainText("Kontraktet: underrätta om hinder inom 7 bankdagar");
  await gaTill(page, "Milstolpar M1–M7");
  await expect(page.locator("main")).toContainText("Kontraktets betalningsplan enligt kontraktsprofilen");
  utanKonsolfel(fel);
});
