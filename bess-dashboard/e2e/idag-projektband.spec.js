import { expect, test } from "@playwright/test";
import { oppna, projektval, utanKonsolfel } from "./hjalpare.js";

/* Bandet i Idag visar fasen, vad som blockerar och nästa åtgärd ur checklistan —
   samma rad som Översikt (lib/projektlage.js). Nästa leder till punkten. */

test("projektläge: fas, nästa grind och nästa åtgärd som leder till checklistan", async ({ page }) => {
  const { fel } = await oppna(page, "Idag");
  const band = page.getByRole("region", { name: "Sammanfattning" });
  await expect(band).toContainText(/Fas \d · \S+/);
  await expect(band).toContainText(/G\d+: \d+ punkter? kvar/);

  const lank = band.getByRole("button", { name: /^Nästa åtgärd: / });
  await expect(lank).toBeVisible();
  await lank.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bygga batteripark");
  utanKonsolfel(fel);
});

test("portföljläge: en rad per projekt med fas och läge", async ({ page }) => {
  await oppna(page, "Idag");
  await projektval(page).selectOption({ label: "Alla projekt" });
  const lista = page.getByRole("list", { name: "Projektens läge" });
  await expect(lista.getByRole("listitem")).toHaveCount(4);
  await expect(lista.getByRole("listitem").first()).toContainText(/36037 Växjö Batteripark.*Fas \d/);
  // Ett projekt utan plan gissar ingen åtgärd.
  const gotene = lista.getByRole("listitem").filter({ hasText: "Götene" });
  await expect(gotene).toContainText("Datum saknas");
  await expect(gotene).not.toContainText("Nästa:");

  await lista.getByRole("button", { name: /36038 Alvesta Batteripark/ }).click();
  await expect(projektval(page)).toHaveValue("36038");
});
