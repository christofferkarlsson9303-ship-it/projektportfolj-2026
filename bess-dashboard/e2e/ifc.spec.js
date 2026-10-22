import { expect, test } from "@playwright/test";
import { sitePanel, oppna, utanKonsolfel } from "./hjalpare.js";
import { miniIfc } from "../src/test/miniIfc.js";

/* IFC-import: filen läses i webbläsaren med web-ifc (riktig wasm), metadata hamnar i portföljen,
   geometrin i IndexedDB, och ett ärende kan kopplas till ett objekt via GlobalId. Parsning,
   enheter och centrering är enhetstestade mot samma fixtur (src/lib/ifcLaddare.test.js). */

const VY = "Siten i 3D";
const GUID = "3YvctVUKr0kugbFTf53O9L";
const modeller = (page) => page.getByRole("region", { name: /^IFC-modeller/ });
const arenden = (page) => page.getByRole("complementary", { name: "Ärenden på siten" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

async function importera(page) {
  await sitePanel(page, "Underlag");
  await modeller(page).getByRole("button", { name: "Importera IFC" }).click();
  const dialog = page.getByRole("dialog", { name: "Importera IFC-modell" });
  await dialog.getByLabel("IFC-fil (.ifc)").setInputFiles({ name: "hall-a.ifc", mimeType: "application/octet-stream", buffer: Buffer.from(miniIfc()) });
  await expect(dialog.getByText("Schema")).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText("IFC4")).toBeVisible();
  await dialog.getByRole("button", { name: "Lägg till i projektet" }).click();
  await expect(dialog).toBeHidden();
}

test("importerar en IFC-fil, söker upp ett objekt och registrerar ett ärende på dess GlobalId", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await sitePanel(page, "Underlag");
  await importera(page);

  const lista = modeller(page).getByRole("list", { name: "IFC-modeller" });
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista).toContainText("2 objekt");
  await expect(lista).not.toContainText("Geometrin saknas");

  await sitePanel(page, "Underlag");
  await modeller(page).getByLabel(/Sök objekt/).fill("container");
  await sitePanel(page, "Underlag");
  await modeller(page).getByRole("list", { name: "Träffar bland IFC-objekt" }).getByRole("button").first().click();
  await sitePanel(page, "Objekt");
  await expect(page.getByText(GUID, { exact: true })).toBeVisible();
  await expect(page.getByText("expressID", { exact: true })).toBeVisible();

  await sitePanel(page, "Ärenden");
  await arenden(page).getByRole("button", { name: "+ Ärende på objektet" }).click();
  await page.getByLabel("Kort beskrivning av händelsen").fill("Kabelränna saknas vid containern");
  await page.getByRole("button", { name: "Registrera", exact: true }).click();
  await sitePanel(page, "Ärenden");
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);

  await expect.poll(async () => ((await portfolj(page)).ur || []).find((u) => u.benamning === "Kabelränna saknas vid containern")?.objectGuid).toBe(GUID);
  const s = await portfolj(page);
  expect(s.ifcModeller).toHaveLength(1);
  expect(s.ifcModeller[0].objekt.map((o) => o.guid)).toContain(GUID);
  // Geometrin ligger inte i portföljen.
  expect(JSON.stringify(s.ifcModeller)).not.toContain("delar");
  utanKonsolfel(fel);
});

test("modellen och dess geometri finns kvar efter omladdning, och går att dölja och ta bort", async ({ page }) => {
  await oppna(page, VY);
  await sitePanel(page, "Underlag");
  await importera(page);
  await expect.poll(async () => ((await portfolj(page)).ifcModeller || []).length).toBe(1);

  await page.reload();
  await oppna(page, VY);
  await sitePanel(page, "Underlag");
  const lista = modeller(page).getByRole("list", { name: "IFC-modeller" });
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista).not.toContainText("Geometrin saknas");

  await lista.getByRole("button", { name: /Dölj hall-a i 3D-vyn/ }).click();
  await expect(lista.getByRole("button", { name: /Visa hall-a i 3D-vyn/ })).toBeVisible();

  await lista.getByRole("button", { name: /Ta bort modellen hall-a/ }).click();
  await page.getByRole("button", { name: "Ta bort", exact: true }).click();
  await sitePanel(page, "Underlag");
  await expect(modeller(page)).toContainText("Ingen IFC-modell i projektet än.");
});

test("en fil som inte är IFC ger ett begripligt fel och sparar inget", async ({ page }) => {
  await oppna(page, VY);
  await sitePanel(page, "Underlag");
  await sitePanel(page, "Underlag");
  await modeller(page).getByRole("button", { name: "Importera IFC" }).click();
  const dialog = page.getByRole("dialog", { name: "Importera IFC-modell" });
  await dialog.getByLabel("IFC-fil (.ifc)").setInputFiles({ name: "skräp.ifc", mimeType: "application/octet-stream", buffer: Buffer.from("det här är inte en IFC-fil") });
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByRole("button", { name: "Lägg till i projektet" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Avbryt" }).click();
  expect((await portfolj(page)).ifcModeller || []).toHaveLength(0);
});

