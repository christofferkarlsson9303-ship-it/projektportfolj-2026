import { expect, test } from "@playwright/test";
import { oppna, sitePanel, utanKonsolfel } from "./hjalpare.js";

/* Byggläget i Siten i 3D: rad, kopiera, ta bort och ångra. Går via planvyn och
   tangenterna så att testet inte kräver WebGL; radlogiken är enhetstestad i
   src/lib/bygglage.test.js. */

const VY = "Siten i 3D";
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));
const antalNar = async (page, antal) => {
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).filter((o) => o.typ === "container").length).toBe(antal);
};

async function klickaPlan(page, x, z) {
  await sitePanel(page, "Objekt");
  const plan = page.getByRole("img", { name: /^Planvy över siten/ });
  await plan.scrollIntoViewIfNeeded();
  const b = await plan.boundingBox();
  await page.mouse.click(b.x + ((x + 42) / 84) * b.width, b.y + ((z + 28) / 56) * b.height);
}

test("en rad containrar läggs med ett klick, kopieras, tas bort och ångras", async ({ page }) => {
  const { fel } = await oppna(page, VY);
  const meny = page.getByRole("navigation", { name: "Komponenter" });
  await meny.getByRole("button", { name: "+ Container", exact: true }).click();
  await page.getByLabel("Antal i rad").fill("4");
  await klickaPlan(page, -20, -15);
  await antalNar(page, 4);
  await expect(page.getByText(/^4 × .* placerade i rad/)).toBeVisible();

  // Den sista i raden är markerad: Ctrl+D kopierar, Delete tar bort, Ctrl+Z ångrar.
  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+KeyD");
  await antalNar(page, 5);
  await page.keyboard.press("Delete");
  await antalNar(page, 4);
  await page.keyboard.press("Control+KeyZ");
  await antalNar(page, 5);
  await page.keyboard.press("Control+KeyZ");
  await antalNar(page, 4);
  utanKonsolfel(fel);
});
