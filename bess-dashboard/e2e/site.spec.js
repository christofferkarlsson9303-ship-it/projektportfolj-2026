import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Siten i 3D. Testerna kräver inte WebGL: placering och val går via planvyn
   och listan, som visar samma objekt som scenen. Gångmatematiken (A är
   vänster relativt blicken, kollision, Q/E) är testad i src/lib/site.test.js. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });

const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

/** Klickar i planvyn på en punkt i meter (x öster, z söder). */
async function klickaPlan(page, x, z) {
  const plan = page.getByRole("img", { name: /^Planvy över siten/ });
  await plan.scrollIntoViewIfNeeded();
  const b = await plan.boundingBox();
  await page.mouse.click(b.x + ((x + 42) / 84) * b.width, b.y + ((z + 28) / 56) * b.height);
}

async function fyll(falt, varde) {
  await falt.fill(varde);
  await falt.press("Enter");
}

test("en skid placeras, får mått och rotation, och står kvar efter omladdning", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  await expect(kort(page)).toContainText("Tomt 80 × 52 m");
  await expect(page.getByText("Tomten är tom.")).toBeVisible();

  await kort(page).getByRole("button", { name: "+ Skid", exact: true }).click();
  await expect(kort(page).getByRole("button", { name: "+ Skid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await klickaPlan(page, -10, -10);
  await klickaPlan(page, 0, -10);
  await page.keyboard.press("Escape");
  await expect(kort(page).getByRole("button", { name: "+ Skid", exact: true })).toHaveAttribute("aria-pressed", "false");

  await expect(lista(page).getByRole("button")).toHaveCount(2);
  await expect(lista(page)).toContainText("Skid 1");
  await expect(lista(page)).toContainText("Skid 2");
  await expect(lista(page).getByRole("button", { name: /Skid 1/ })).toContainText("6,1 × 2,5 × 2,9 m");

  await lista(page).getByRole("button", { name: /Skid 1/ }).click();
  const markerat = page.getByRole("region", { name: "Skid 1" });
  await fyll(markerat.getByLabel("Bredd (m)"), "7,5");
  await fyll(markerat.getByLabel("Rotation (grader)"), "90");
  await fyll(markerat.getByLabel("Namn"), "Skid A");
  await expect(lista(page).getByRole("button", { name: /Skid A/ })).toContainText("7,5 × 2,5 × 2,9 m");

  // Ett mått på 0 sparas inte.
  await fyll(page.getByRole("region", { name: "Skid A" }).getByLabel("Höjd (m)"), "0");
  await expect(page.getByText("Höjd måste vara större än 0.")).toBeVisible();

  // Sparat i portföljen (autosparet har en kort fördröjning).
  await expect
    .poll(async () => (await portfolj(page)).siteObjekt?.find((o) => o.namn === "Skid A"))
    .toMatchObject({ projektId: "36037", typ: "skid", bredd: 7.5, djup: 2.5, hojd: 2.9, rotation: 90 });
  const a = (await portfolj(page)).siteObjekt.find((o) => o.namn === "Skid A");
  expect(Math.abs(a.x + 10)).toBeLessThan(1.5);
  expect(Math.abs(a.z + 10)).toBeLessThan(1.5);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await gaTill(page, VY);
  await expect(lista(page)).toContainText("Skid A");
  await expect(lista(page)).toContainText("Skid 2");
  utanKonsolfel(fel);
});

test("en nål måste peka på en öppen punkt — utan punkt placeras ingenting", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ Nål", exact: true }).click();
  await expect(kort(page)).toContainText("Välj punkten nålen ska peka på.");
  await expect(kort(page).getByRole("button", { name: "Placera mitt på tomten" })).toHaveCount(0);

  await klickaPlan(page, 5, 5);
  await expect(page.getByText("Välj vilken punkt nålen ska peka på.")).toBeVisible();
  await expect(page.getByText("Tomten är tom.")).toBeVisible();

  await kort(page).getByLabel("Punkt för nålen").selectOption("p2");
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await expect(lista(page)).toContainText("Nål: Vågkvitto för deponimassor");

  await expect
    .poll(async () => (await portfolj(page)).siteObjekt?.find((o) => o.typ === "nal"))
    .toMatchObject({ projektId: "36037", punktId: "p2", x: 0, z: 0 });
  expect((await portfolj(page)).siteObjekt.find((o) => o.typ === "nal").namn).toBeUndefined();

  // Panelen för nålen visar punkten och kan byta till en annan punkt, inte till ingen.
  const panel = page.getByRole("region", { name: /^Nål: Vågkvitto/ });
  await expect(panel).toContainText("Alex Young");
  await expect(panel.getByLabel("Punkt")).not.toContainText("Välj punkt");
});

test("Idag visar toppvyn under bandet först när det finns volymer, och klick öppnar siten", async ({ page }) => {
  await oppna(page);
  await expect(page.getByRole("region", { name: "Siten", exact: true })).toHaveCount(0);

  await gaTill(page, VY);
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await kort(page).getByRole("button", { name: "+ Nål", exact: true }).click();
  await kort(page).getByLabel("Punkt för nålen").selectOption("p5");
  await klickaPlan(page, 12, 12);

  await gaTill(page, "Idag");
  const site = page.getByRole("region", { name: "Siten", exact: true });
  await expect(site).toBeVisible();
  await expect(site).toContainText("1 volym, 1 nål på öppna punkter");
  await expect(site).toContainText("UR006 kabelskåp");
  // Samma volymer som siten: en rektangel och en nål i toppvyn.
  await expect(site.locator("[data-roll=toppvy] [data-objekt]")).toHaveCount(2);

  // Under bandet och ovanför listan.
  const ordning = await page.locator("main").evaluate((m) => {
    const band = m.querySelector('[aria-label="Sammanfattning"]');
    const site = m.querySelector("#idag-site");
    const lista = m.querySelector("#idag-veckan");
    const fore = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { bandForeSite: fore(band, site), siteForeLista: fore(site, lista) };
  });
  expect(ordning).toEqual({ bandForeSite: true, siteForeLista: true });

  await site.getByRole("button", { name: /^Öppna siten för 36037/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(VY);
});

test("situationsplanen ligger i sessionStorage och följer inte med portföljen", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ Trafo", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();

  // En bild som är dubbelt så bred som hög.
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 100;
    c.getContext("2d").fillRect(0, 0, 200, 100);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Välj bild för situationsplan").setInputFiles({ name: "situationsplan.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });

  const plan = page.getByRole("region", { name: "Situationsplan" });
  await expect(plan.getByLabel("Bredd i meter")).toHaveValue("80");
  await expect(plan).toContainText("40 m");
  await fyll(plan.getByLabel("Bredd i meter"), "120");
  await fyll(plan.getByLabel("Norr i grader"), "15");
  await expect(plan).toContainText("60 m");
  await expect(kort(page)).toContainText("Situationsplan som mark.");

  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem("batchc-situationsplan:36037")));
  expect(session.bild).toMatch(/^data:image\//);
  expect(session).toMatchObject({ bredd: 120, norr: 15, proportion: 0.5 });

  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).length).toBe(1);
  const lokalt = await page.evaluate(() => localStorage.getItem("batchc-portfolj-v1") || "");
  expect(lokalt).not.toContain("data:image");
  expect(lokalt).not.toContain("situationsplan");

  await plan.getByRole("button", { name: "Ta bort planen" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("batchc-situationsplan:36037"))).toBeNull();
  await expect(kort(page)).toContainText("Utan situationsplan: grus och körytor.");
});

test("Återställ tömmer projektets site och toppvyn på Idag försvinner", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ E-House", exact: true }).click();
  await klickaPlan(page, -30, 0);
  await kort(page).getByRole("button", { name: "+ Låda", exact: true }).click();
  await klickaPlan(page, 20, 10);
  await expect(lista(page).getByRole("button")).toHaveCount(2);

  await kort(page).getByRole("button", { name: "Återställ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Tomten blir tom igen.");
  await dialog.getByRole("button", { name: "Återställ", exact: true }).click();
  await expect(page.getByText("Tomten är tom.")).toBeVisible();
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).filter((o) => o.projektId === "36037").length).toBe(0);

  await gaTill(page, "Idag");
  await expect(page.getByRole("region", { name: "Siten", exact: true })).toHaveCount(0);
});

test("Gå in och Orbit är knappar, och på pekskärm finns en joystick på minst 44 px", async ({ page, isMobile }) => {
  await oppna(page, VY);
  await page.getByRole("radio", { name: "Gå in" }).click();
  await expect(page.getByRole("radio", { name: "Gå in" })).toHaveAttribute("aria-checked", "true");
  // Placering är avstängd medan man går.
  await expect(kort(page).getByRole("button", { name: "+ Skid", exact: true })).toBeDisabled();

  const utanWebgl = await page.getByText("3D-vyn kan inte visas.").isVisible();
  if (!utanWebgl) {
    await expect(page.getByRole("application", { name: "Siten, gåläge" })).toBeVisible();
    const joystick = page.locator("[data-roll=joystick]");
    if (isMobile) {
      const b = await joystick.boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
      const vy = await page.getByRole("application").boundingBox();
      // Nere till vänster.
      expect(b.x - vy.x).toBeLessThan(vy.width / 3);
      expect(b.y - vy.y).toBeGreaterThan(vy.height / 2);
    } else {
      await expect(joystick).toHaveCount(0);
    }
  }

  await page.getByRole("radio", { name: "Orbit" }).click();
  await expect(kort(page).getByRole("button", { name: "+ Skid", exact: true })).toBeEnabled();
});
