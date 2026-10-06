import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";
import { SEED } from "../src/data/seed.js";

/** Startar med grunddatan, ändrad av fn, i den lokala lagringen. */
async function medPortfolj(page, fn) {
  const data = structuredClone(SEED);
  fn(data);
  await page.addInitScript((s) => localStorage.setItem("batchc-portfolj-v1", JSON.stringify(s)), data);
}

function idagIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const band = (page) => page.getByRole("region", { name: "Sammanfattning" });

test("bandet visar samma dom och slutbesiktning som Tidplan", async ({ page }) => {
  const { fel } = await oppna(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Blir vi klara i tid/ });
  const tidplanMarke = (await kort.locator("header [data-ton]").first().textContent()).trim();
  const slut = (await kort.getByRole("article", { name: "Beräknad slutbesiktning" }).textContent()).match(/\d{1,2} [a-zåäö]{3}/)[0];

  await gaTill(page, "Idag");
  const b = band(page);
  await expect(b).toContainText("Blir vi klara i tid");
  if (/sent/.test(tidplanMarke)) await expect(b).toContainText(tidplanMarke.replace(" mot kontraktet", ""));
  else await expect(b.locator("[data-ton]").first()).toHaveText("I tid");
  await expect(b).toContainText(slut);
  await expect(b).toContainText(/kräver din åtgärd/);
  utanKonsolfel(fel);
});

test("projekt utan start eller slut: tankstreck och Uppgifter saknas", async ({ page }) => {
  await oppna(page, "Tidplan");
  await page.getByRole("group", { name: "Välj projekt" }).getByRole("button", { name: /Göteborg Skogome/ }).click();
  await gaTill(page, "Idag");
  const b = band(page);
  await expect(b).toContainText("Göteborg Skogome");
  await expect(b).toContainText("Uppgifter saknas");
  await expect(b).toContainText("Ange start och slut på projektet");
  await expect(b).not.toContainText("I tid");
});

test("sent projekt: bad-märke, bandet förblir one-djup, faslänken öppnar fasen", async ({ page }) => {
  await medPortfolj(page, (s) => {
    s.projekt.find((x) => x.id === "36037").fardigstallande = "2026-03-01";
  });
  await oppna(page);
  const b = band(page);
  await expect(b).toContainText(/\d+ dagar sent/);
  await expect(b.locator("[data-ton]").first()).toHaveAttribute("data-ton", "bad");
  await expect(b).toHaveClass(/bg-one-djup/);
  await expect(b).toContainText("flyttar slutbesiktningen");

  const lank = b.getByRole("button", { name: /^\d+ / }).first();
  const nr = (await lank.textContent()).trim().split(" ")[0];
  await lank.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bygga batteripark");
  await expect(page.locator(`#fas-${nr}`)).toHaveAttribute("open", "");
});

test("arbetslista för en utförare skrivs ut från Idag utan panel", async ({ page }) => {
  const idag = idagIso();
  await medPortfolj(page, (s) => {
    s.punkter.push({ id: "p-idag-test", projektId: "36037", titel: "Testpunkt för Idag", agare: "PL", utforare: "Dan Idag", forfaller: idag, status: "oppen" });
  });
  await oppna(page);
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole("button", { name: "Skriv ut arbetslista – Dan Idag", exact: true }).click();
  await expect(page.locator("#utskrift")).toContainText("Testpunkt för Idag");
  await expect(page.locator("#utskrift")).toContainText("Utförare: Dan Idag");
  await expect(page.getByRole("dialog", { name: /Fältmaterial/ })).toHaveCount(0);
});
