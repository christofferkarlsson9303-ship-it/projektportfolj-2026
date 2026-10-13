import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel } from "./hjalpare.js";

/* Parkbyggaren: komponentmeny, snapp och kollision, rotation med R och
   sidopanelen med BESS-data. Går via planvyn och listan så att testerna inte
   kräver WebGL — samma regler (lib/site.js) gäller i 3D-vyn och är enhetstestade
   i src/lib/siteRutnat.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));
/** Autosparet har en kort fördröjning — vänta tills antalet objekt stämmer. */
const objektNar = async (page, antal) => {
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).length).toBe(antal);
  return (await portfolj(page)).siteObjekt;
};

async function fyll(falt, varde) {
  await falt.fill(varde);
  await falt.press("Enter");
}

async function klickaPlan(page, x, z) {
  const plan = page.getByRole("img", { name: /^Planvy över siten/ });
  await plan.scrollIntoViewIfNeeded();
  const b = await plan.boundingBox();
  await page.mouse.click(b.x + ((x + 42) / 84) * b.width, b.y + ((z + 28) / 56) * b.height);
}

test("komponentmenyn har grupperna Containers, Inverters / MV-skids, Transformatorer och Hägnad", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  const meny = page.getByRole("navigation", { name: "Komponenter" });
  for (const g of ["Containers", "Inverters / MV-skids", "Transformatorer", "Hägnad"]) {
    await expect(meny.getByRole("group", { name: g })).toBeVisible();
  }
  await expect(meny.getByRole("button", { name: "+ Container", exact: true })).toBeVisible();
  await expect(meny.getByRole("button", { name: "+ Skid", exact: true })).toBeVisible();
  await expect(meny.getByRole("button", { name: "+ Trafo", exact: true })).toBeVisible();
  await expect(meny.getByRole("button", { name: "+ Hägnad", exact: true })).toBeVisible();
  utanKonsolfel(fel);
});

test("objekt snappar till rutnätet och två moduler kan inte ligga i varandra", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await klickaPlan(page, -10.3, -10.1);
  await expect(lista(page).getByRole("button")).toHaveCount(1);

  // Hörnen ligger på hela meter: centrum = heltal ± halva måttet (6,1 × 2,5).
  const c = (await objektNar(page, 1)).find((o) => o.typ === "container");
  const kantX = c.x - 3.05;
  const kantZ = c.z - 1.25;
  expect(Math.abs(kantX - Math.round(kantX))).toBeLessThan(0.01);
  expect(Math.abs(kantZ - Math.round(kantZ))).toBeLessThan(0.01);

  // Samma plats igen avvisas med förklaring, och inget läggs till.
  // (Ett klick på själva objektet markerar det, så klicka en bit utanför kanten.)
  await klickaPlan(page, c.x + 4, c.z);
  await expect(page.getByText("Platsen är upptagen av Container 1.")).toBeVisible();
  await expect(lista(page).getByRole("button")).toHaveCount(1);

  // Intill går bra, och kanten möts exakt (6,1 m mellan centrum).
  await klickaPlan(page, c.x + 6.4, c.z);
  await expect(lista(page).getByRole("button")).toHaveCount(2);
  const alla = (await objektNar(page, 2)).filter((o) => o.typ === "container");
  expect(Math.abs(alla[1].x - alla[0].x - 6.1)).toBeLessThan(0.01);
});

test("R roterar markerat objekt 90 grader och nekas om det inte får plats", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await klickaPlan(page, -10, -10);
  await page.keyboard.press("Escape");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();

  await page.keyboard.press("r");
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || [])[0]?.rotation).toBe(90);
  await page.keyboard.press("r");
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || [])[0]?.rotation).toBe(180);

  // Ligger en annan container intill kan en vridning in i den inte ske.
  const c = (await objektNar(page, 1))[0];
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await klickaPlan(page, c.x, c.z + 3.2);
  await page.keyboard.press("Escape");
  await expect(lista(page).getByRole("button")).toHaveCount(2);
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await page.keyboard.press("r");
  await expect(page.getByText(/Platsen är upptagen av Container 2\./)).toBeVisible();
  expect((await objektNar(page, 2)).find((o) => o.namn === "Container 1").rotation).toBe(180);
});

test("sidopanelen tar emot BESS-data, visar SoC och parkens summa följer med", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  const park = page.getByRole("group", { name: "Parkens BESS-data" });
  await expect(park).toContainText("—");

  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");

  const panel = page.getByRole("region", { name: "Container 1" });
  await fyll(panel.getByLabel("Energi (MWh)"), "4,2");
  await fyll(panel.getByLabel("Effekt (MW)"), "2");
  await fyll(panel.getByLabel("Laddstatus SoC (%)"), "65");
  await panel.locator("#site-status").selectOption("driftsatt");
  await fyll(panel.getByLabel("Specifikation"), "LFP, vätskekyld");

  await expect(panel.getByRole("progressbar", { name: /Laddstatus Container 1/ })).toHaveAttribute("aria-valuenow", "65");
  await expect(panel).toContainText("Driftsatt");
  await expect(park).toContainText("4,2 MWh");
  await expect(park).toContainText("65 %");
  await expect(park).toContainText("1 av 1");

  // SoC över 100 sparas inte.
  await fyll(panel.getByLabel("Laddstatus SoC (%)"), "150");
  await expect(page.getByText(/kan högst vara 100/)).toBeVisible();

  await expect
    .poll(async () => ((await portfolj(page)).siteObjekt || [])[0])
    .toMatchObject({ mwh: 4.2, mw: 2, soc: 65, status: "driftsatt", spec: "LFP, vätskekyld" });

  // Hägnad har ingen BESS-data.
  await kort(page).getByRole("button", { name: "+ Hägnad", exact: true }).click();
  await klickaPlan(page, 20, 15);
  await page.keyboard.press("Escape");
  await lista(page).getByRole("button", { name: /Hägnad 1/ }).click();
  await expect(page.getByRole("region", { name: "Hägnad 1" }).getByText("BESS-data")).toHaveCount(0);
  utanKonsolfel(fel);
});
