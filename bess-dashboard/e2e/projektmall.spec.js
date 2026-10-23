import { expect, test } from "@playwright/test";
import { oppna, utanKonsolfel, valjProjekt } from "./hjalpare.js";

test("ett projekt ärver risker och long lead från ett tidigare projekt, utan dubbletter", async ({ page }) => {
  const { fel } = await oppna(page, "Bygga batteripark");
  await valjProjekt(page, "Göteborg");
  const arv = page.locator("details").filter({ hasText: "Starta från ett tidigare projekt" });
  await arv.locator("summary").click();
  await arv.getByLabel("Ärv från").selectOption({ label: "36037 Växjö Batteripark" });
  const risker = arv.locator("label").filter({ hasText: /^Risker/ });
  await expect(risker).not.toContainText("(0)");
  await arv.getByRole("button", { name: /^Ärv till / }).click();
  await expect(page.getByText(/^Ärvt från 36037:/)).toBeVisible();
  // Allt valt är ärvt — inget kvar att ärva en gång till.
  await expect(risker).toContainText("(0)");
  await expect(arv.getByRole("button", { name: /^Ärv till / })).toBeDisabled();
  utanKonsolfel(fel);
});
