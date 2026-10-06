import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Ett riktigt PDF-protokoll i beställarens mall, byggt ur testtexten i
   src/lib/__fixtures__. Chromium skriver PDF:en, appen läser den med pdfjs. */
const TEXT = readFileSync(new URL("../src/lib/__fixtures__/byggmote-ingrid.txt", import.meta.url), "utf8");

async function protokollPdf(browser) {
  const sida = await (await browser.newContext()).newPage();
  const html = TEXT.split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
    .join("");
  await sida.setContent(`<body style="font: 11pt Arial">${html}</body>`);
  const buffer = await sida.pdf({ format: "A4" });
  await sida.close();
  return buffer;
}

test("protokollets åtgärder blir öppna punkter, och mötet får punkter", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const { fel } = await oppna(page, "Data och backup");
  const buffer = await protokollPdf(browser);
  await page.getByLabel("Välj filer att läsa in").setInputFiles({ name: "Byggmöte_10_Växjö.pdf", mimeType: "application/pdf", buffer });

  const kort = page.getByRole("article", { name: "Import av Byggmöte_10_Växjö.pdf" });
  await expect(kort).toContainText(/Tolkat ur protokollet: \d+ punkter/);
  await expect(kort).toContainText("rader med inloggningsuppgifter hoppades över");

  const lista = kort.getByRole("region", { name: "Åtgärder → öppna punkter" });
  await expect(lista).toBeVisible();
  // Vår åtgärd är förvald, beställarens underentreprenör är det inte.
  await expect(lista.getByRole("checkbox", { name: /Christoffer upprättar underlag/ })).toBeChecked();
  await expect(lista.getByRole("checkbox", { name: /De återkommer med tid/ })).not.toBeChecked();
  await lista.getByRole("checkbox", { name: /De återkommer med tid/ }).check();

  await kort.getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText("Byggmöte_10_Växjö.pdf är MASTER för projektet")).toBeVisible();

  await gaTill(page, "Öppna punkter");
  const punkter = page.getByRole("region", { name: "Öppna punkter", exact: true });
  await expect(punkter).toContainText("Christoffer upprättar underlag i teams");
  await expect(punkter).toContainText("De återkommer med tid för åtgärd");

  await gaTill(page, "Byggmöten");
  await expect(page.locator("main")).toContainText("BM-10");
  await expect(page.locator("main")).toContainText("Ny UR upprättas för datakabel");

  // Inloggningsuppgifterna finns inte i portföljen.
  const lagrat = await page.evaluate(() => localStorage.getItem("batchc-portfolj-v1") || "");
  expect(lagrat).not.toMatch(/hemligt|Testkonto/);
  utanKonsolfel(fel);
});

test("en PDF som inte går att läsa arkiveras ändå, med en varning", async ({ page }) => {
  await oppna(page, "Data och backup");
  await page.getByLabel("Välj filer att läsa in").setInputFiles({ name: "Byggmöte_12_Växjö.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  const kort = page.getByRole("article", { name: "Import av Byggmöte_12_Växjö.pdf" });
  await expect(kort).toContainText("kunde inte läsas");
  await kort.getByRole("button", { name: "Tillämpa" }).click();
  await expect(page.getByText("Byggmöte_12_Växjö.pdf är MASTER för projektet")).toBeVisible();
});
