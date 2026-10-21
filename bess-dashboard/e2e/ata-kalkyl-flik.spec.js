import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Fliken ÄTA-kalkyl: samma kalkyl som kortet under ÄTA och hinder, i egen
   flik. Beloppet hamnar på ärendet i portföljen, inte i en egen nyckel. */

async function fyll(falt, varde) {
  await falt.fill(varde);
  await falt.press("Tab");
}

test("fliken räknar på valt ärende och sparar beloppet på det", async ({ page }) => {
  const { fel } = await oppna(page, "ÄTA-kalkyl");

  await page.getByLabel("ÄTA-ärende").selectOption({ label: "UR001 Projektering" });
  await expect(page.getByRole("region", { name: "ÄTA-kalkyl — UR001 Projektering" })).toBeVisible();

  const snabbval = page.getByRole("group", { name: "Lägg till rad" });
  await snabbval.getByRole("button", { name: "Montör", exact: true }).click();
  await fyll(page.getByLabel("Antal tim, rad 1, Montör"), "2");
  await snabbval
    .getByRole("button", { name: /^Material/ })
    .first()
    .click();
  await fyll(page.getByLabel(/^Antal kr, rad 2, Material/), "10000");

  const summa = page.getByRole("region", { name: "Sammanställning" });
  await expect(summa).toContainText(/Arbete\s*1\s890 kr/);
  await expect(summa).toContainText(/Material och UE \(inkl\. påslag\)\s*11\s000 kr/);
  await expect(summa.getByLabel("Summering")).toContainText(/Netto\s*12\s890 kr/);
  await expect(summa.getByLabel("Summering")).toContainText(/Att betala\s*16\s113 kr/);
  await expect(summa).toContainText("2 poster · 2 timmar");

  await summa.getByRole("button", { name: "Spara belopp på ärendet" }).click();
  await expect(summa.getByText("Belopp sparat")).toBeVisible();
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}");
    return (s.ur || []).some((u) => u.nr === "UR001" && u.belopp === 12890 && u.kalkyl?.rader?.length === 2);
  });
  utanKonsolfel(fel);
});

test("ett nytt ärende från fliken väljs direkt", async ({ page }) => {
  await oppna(page, "ÄTA-kalkyl");
  await page.getByRole("button", { name: "+ Ny ÄTA" }).click();
  await page.getByLabel("Kort beskrivning av händelsen").fill("Extra kabelschakt");
  await page.getByRole("button", { name: "Registrera", exact: true }).click();
  await expect(page.getByRole("region", { name: /^ÄTA-kalkyl — UR\d+ Extra kabelschakt$/ })).toBeVisible();
  await expect(page.getByText("Inga poster ännu. Klicka på ett snabbval ovan.")).toBeVisible();
});
