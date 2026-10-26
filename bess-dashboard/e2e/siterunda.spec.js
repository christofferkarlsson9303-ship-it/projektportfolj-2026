import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

/* Siterunda i mobilen: foto och punkt i ett steg, och punkten hamnar i Idag.
   Plats och nål i 3D testas i lib/siterunda.test.js. */

// 8 × 8 px röd PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGO8o6HBgA0wYRUdtBIA78QBPFxuqR4AAAAASUVORK5CYII=",
  "base64"
);

test("ett foto från siterundan sparas på punkten, som syns i Idag med fotot", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  await page.getByRole("banner").getByRole("button", { name: "Registrera händelse" }).click();
  const panel = page.getByRole("region", { name: "Registrera händelse" });
  await panel.getByLabel("Vad har hänt eller behöver göras?").fill("Skadad dörr på batteriraden");
  await panel.getByLabel("Ta eller välj foto").setInputFiles({ name: "dorr.png", mimeType: "image/png", buffer: PNG });
  await expect(panel.getByRole("list", { name: "Valda foton" }).getByRole("img")).toHaveCount(1);
  await panel.getByRole("button", { name: "Spara händelse" }).click();
  await expect(panel).toContainText("Sparad");
  await panel.getByRole("button", { name: "Klar" }).click();

  // Inget datum angivet: med foto blir uppföljningen idag, så punkten står i Idag.
  await gaTill(page, "Idag");
  await page.getByRole("button", { name: /Skadad dörr på batteriraden.*1 foto/ }).click();
  const pp = page.getByRole("region", { name: /^Punkt: Skadad dörr/ });
  await expect(pp.getByRole("img", { name: "Foto 1 på punkten" })).toBeVisible();
  utanKonsolfel(fel);
});
