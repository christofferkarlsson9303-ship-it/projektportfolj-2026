import { expect, test } from "@playwright/test";
import { sitePanel, oppna, utanKonsolfel } from "./hjalpare.js";

/* Ritningar i 3D-vyn: uppladdning, skala ur ritningshuvudet, placering efter beteckningar,
   lagring (lokalt läge = IndexedDB) och att bilden aldrig hamnar i portfolj/state.
   Testplanen är påhittad men har samma beteckningar och lägen som Växjö-layouten. */

const PLAN = "e2e/fixtures/testplan-A3-1250.pdf";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const ritKort = (page) => page.getByRole("region", { name: /^Ritningar på siten/ });
const lista = (page) => page.getByRole("list", { name: "Ritningar" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test("ritning laddas upp, läggs i skala över enheterna och finns kvar efter omladdning", async ({ page }) => {
  test.setTimeout(90000);
  const { fel } = await oppna(page, "Siten i 3D");

  await sitePanel(page, "Bygg");
  await kort(page).getByRole("button", { name: "Lägg in layout enligt E-63-1-100" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("5 skid, 9 batterienheter");
  await dialog.getByRole("button", { name: "Lägg in", exact: true }).click();
  await sitePanel(page, "Objekt");
  await expect(page.getByRole("list", { name: "Objekt" })).toContainText("+B1a");

  await sitePanel(page, "Visning");
  await page.getByRole("region", { name: "Visning av parken" }).getByLabel("Välj ritning (PDF, DXF eller bild)").setInputFiles(PLAN);
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("testplan-A3-1250", { timeout: 20000 });
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("A3 · 1:250 · 105 × 74,3 m");
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("efter 14 beteckningar");
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("avvikelse 0");

  const rad = async () => ((await portfolj(page)).siteRitningar || [])[0];
  await expect.poll(async () => (await rad())?.skala).toBe(250);
  const r = await rad();
  expect(r.projektId).toBe("36037");
  expect(r.lagring).toBe("lokal");
  expect(JSON.stringify(r)).not.toMatch(/data:|base64/);

  // Placering och synlighet sparas.
  await ritKort(page).getByRole("button", { name: "Vridning (°): öka 1°" }).click();
  await expect.poll(async () => (await rad())?.rotation).toBe(1);
  await ritKort(page).getByRole("button", { name: "Lägg över enheterna" }).click();
  await expect.poll(async () => (await rad())?.rotation).toBe(0);
  await ritKort(page).getByRole("button", { name: /^Dölj testplan/ }).click();
  await expect.poll(async () => (await rad())?.synlig).toBe(false);

  // Filen ligger kvar i arkivet efter omladdning och läses in igen.
  await page.reload();
  await sitePanel(page, "Objekt");
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("testplan-A3-1250");
  await sitePanel(page, "Objekt");
  await expect(lista(page).getByText("Kunde inte läsas")).toHaveCount(0);
  await sitePanel(page, "Objekt");
  await expect(lista(page).getByText("Laddar")).toHaveCount(0, { timeout: 15000 });

  await ritKort(page).getByRole("button", { name: /^Ta bort testplan/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ta bort", exact: true }).click();
  await expect.poll(async () => ((await portfolj(page)).siteRitningar || []).length).toBe(0);
  utanKonsolfel(fel);
});

test("en fil som inte är ritning avvisas med ett begripligt fel", async ({ page }) => {
  await oppna(page, "Siten i 3D");
  await sitePanel(page, "Visning");
  await page.getByRole("region", { name: "Visning av parken" }).getByLabel("Välj ritning (PDF, DXF eller bild)").setInputFiles({ name: "anteckning.txt", mimeType: "text/plain", buffer: Buffer.from("hej") });
  await expect(page.getByText("Välj en PDF, DXF, PNG, JPG eller WebP.")).toBeVisible();
  expect(((await portfolj(page)).siteRitningar || []).length).toBe(0);
});


test("DXF läses i webbläsaren och läggs i skala ur enheten; DWG ger en tydlig väg", async ({ page }) => {
  test.setTimeout(60000);
  const { fel } = await oppna(page, "Siten i 3D");
  const valj = () => page.getByRole("region", { name: "Visning av parken" }).getByLabel("Välj ritning (PDF, DXF eller bild)");

  await sitePanel(page, "Visning");
  await valj().setInputFiles({ name: "plan.dwg", mimeType: "application/acad", buffer: Buffer.from("AC1032") });
  await expect(page.getByText(/DWG kan inte läsas i webbläsaren\. Spara ritningen som DXF/)).toBeVisible();

  await valj().setInputFiles("e2e/fixtures/testplan-mm.dxf");
  await sitePanel(page, "Objekt");
  await expect(lista(page)).toContainText("DXF · mm · 120 × 60 m", { timeout: 20000 });
  const rad = async () => ((await portfolj(page)).siteRitningar || [])[0];
  await expect.poll(async () => (await rad())?.kalla).toBe("dxf");
  const r = await rad();
  expect(r).toMatchObject({ kalla: "dxf", mime: "image/png", skala: 1, filnamn: "testplan-mm.dxf" });
  expect(JSON.stringify(r)).not.toMatch(/data:|base64/);
  await expect(lista(page).getByText("Laddar")).toHaveCount(0, { timeout: 15000 });
  await expect(lista(page).getByText("Kunde inte läsas")).toHaveCount(0);

  // Fel enhet i filen: byt till cm och måtten följer med.
  await ritKort(page).getByLabel("Enhet i DXF").selectOption("cm");
  await expect.poll(async () => (await rad())?.skala).toBe(10);
  await expect(lista(page)).toContainText("DXF · cm · 1200 × 600 m");
  utanKonsolfel(fel);
});
