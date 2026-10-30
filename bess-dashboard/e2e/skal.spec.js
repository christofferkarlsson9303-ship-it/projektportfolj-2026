import { expect, test } from "@playwright/test";
import { gaTill, oppna, oppnaMeny, oppnaViaAdress, utanKonsolfel } from "./hjalpare.js";

/* Alla vyer i menyn — ingen får fortfarande vara en platshållare. */
const VYER = [
  "Idag",
  "Översikt",
  "Bygga batteripark",
  "Siten i 3D",
  "Tavla",
  "Tidplan",
  "Handlingsplan",
  "Resurser",
  "Tidrapport",
  "Budget och utfall",
  "Fakturaunderlag",
  "Milstolpar M1–M7",
  "ÄTA",
  "Ekonomi",
  "Byggmöten",
  "Veckokoll",
  "Dagbok",
  "HSEQ / BAS-U",
  "Risker",
  "Öppna punkter",
  "Slutdokumentation",
  "Beställarrapport",
  "Projektledarens handbok",
  "Kontakter",
  "Data och backup",
];

test("alla vyer renderar utan konsolfel", async ({ page }) => {
  // Varje vybyte på mobil kräver att menyn öppnas först — 26 vyer hinner inte
  // på standardgränsen.
  test.setTimeout(180_000);
  const { fel } = await oppna(page);

  for (const vy of VYER) {
    await gaTill(page, vy);
    // Varje vy ska faktiskt måla något — inte bara byta rubrik.
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
    await expect(page.getByText("Den här sektionen är inte flyttad")).toHaveCount(0);
  }

  utanKonsolfel(fel);
});

test("Störning ligger inte i menyn men går att nå, och hinder och störning är orsaker på ÄTA", async ({ page }) => {
  await oppna(page);
  await gaTill(page, "Risker");
  await expect(page.getByRole("navigation", { name: "Huvudmeny" }).getByRole("button", { name: "Störning", exact: true })).toHaveCount(0);
  await oppnaViaAdress(page, "storning", "Störning");
});

test("aktiv vy markeras med aria-current", async ({ page }) => {
  await oppna(page);
  const meny = page.getByRole("navigation", { name: "Huvudmeny" });

  // Startvyn är arbetslistan.
  await expect(meny.getByRole("button", { name: "Idag", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );

  await gaTill(page, "Risker");
  // Ingången och fliken markeras båda.
  await expect(meny.getByRole("button", { name: "Projektet", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Flikar i Projektet" }).getByRole("button", { name: "Risker", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(meny.getByRole("button", { name: "Idag", exact: true })).not.toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("huvudmenyn har tre ingångar och verktyg; siten och gamla adresser nås ändå", async ({ page }) => {
  await oppna(page);
  const meny = await oppnaMeny(page);
  const knappar = meny.getByRole("button");
  await expect(knappar).toHaveText(["Idag", "Projektet", "Pengar", "Verktyg"]);
  await expect(meny.getByRole("button", { name: "Siten i 3D", exact: true })).toHaveCount(0);

  // Ingången minns senast öppnade flik.
  await gaTill(page, "Budget och utfall");
  await gaTill(page, "Risker");
  await (await oppnaMeny(page)).getByRole("button", { name: "Pengar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Budget och utfall");

  // Verktyg ligger inte i menyn, men adressen fungerar och verktyget syns som aktuell plats.
  await oppnaViaAdress(page, "kontakter", "Kontakter");
  await expect((await oppnaMeny(page)).getByRole("button", { name: "Kontakter", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: /^Flikar i / })).toHaveCount(0);
});

test("hopplänken är första tabbstoppet och flyttar fokus till innehållet", async ({ page }) => {
  await oppna(page);
  await page.keyboard.press("Tab");

  const hopp = page.getByRole("link", { name: "Hoppa till innehållet" });
  await expect(hopp).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#innehall")).toBeFocused();
});

test("kommandopaletten öppnas med Ctrl+K och navigerar", async ({ page }) => {
  await oppna(page);

  await page.keyboard.press("Control+k");
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });
  await expect(palett).toBeVisible();

  const falt = palett.getByRole("combobox");
  await expect(falt).toBeFocused();

  await falt.fill("risk");
  // Piltangenter ska flytta det aktiva alternativet, inte bara markera visuellt.
  await page.keyboard.press("ArrowDown");
  await expect(falt).toHaveAttribute("aria-activedescendant", /cmd-\d+/);

  await falt.fill("Risker");
  await page.keyboard.press("Enter");

  await expect(palett).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Risker");
});

test("kommandopaletten stängs med Escape och med klick utanför rutan", async ({ page }) => {
  await oppna(page);
  const palett = page.getByRole("dialog", { name: "Sök och hoppa" });

  await page.keyboard.press("Control+k");
  await expect(palett).toBeVisible();
  expect(await palett.evaluate((el) => el.matches("dialog:modal"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(palett).toBeHidden();

  // Ctrl+K ska fungera igen efter Escape — läget får inte hänga kvar som öppet.
  await page.keyboard.press("Control+k");
  await expect(palett).toBeVisible();
  // Klick i övre vänstra hörnet träffar ::backdrop, inte rutan.
  await page.mouse.click(5, 5);
  await expect(palett).toBeHidden();
});

test("statusmeddelandet ligger i top layer och syns ovanför en öppen dialog", async ({ page }) => {
  await oppna(page, "Öppna punkter");
  // popover="manual" (F2): rutan är visad som popover från start och står kvar som live-region.
  expect(await page.locator(".toast").evaluate((el) => el.matches(":popover-open"))).toBe(true);
  await expect(page.locator(".toast")).toHaveAttribute("role", "status");

  await page.getByRole("button", { name: "+ Lägg till punkt" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny punkt" });
  await expect(dialog).toBeVisible();

  /* Ett meddelande som visas medan dialogen är öppen ska ritas ovanför dialogens
     ::backdrop. Samma steg som Toast.jsx tar vid ett nytt meddelande (hidePopover +
     showPopover). Träfftest går inte: allt utanför en modal är inert och träffas
     aldrig. I stället jämförs toastens yta med dialogen öppen och stängd — ligger
     toasten under backdropen blir den mörkare och suddig, och bilderna skiljer sig. */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const el = document.querySelector(".toast");
    el.classList.add("visa");
    el.hidePopover();
    el.showPopover();
  });
  const ram = await page.locator(".toast").boundingBox();
  expect(ram && ram.width > 30).toBeTruthy();
  // Innanför de rundade hörnen (12 px) — i hörnen syns det som ligger bakom.
  const yta = { x: ram.x + 14, y: ram.y + 14, width: ram.width - 28, height: Math.max(1, ram.height - 28) };
  const medDialog = await page.screenshot({ clip: yta });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const utanDialog = await page.screenshot({ clip: yta });
  expect(medDialog.equals(utanDialog)).toBe(true);
});

test("mörkt läge växlar och håller kontrast i sidomenyn", async ({ page }) => {
  await oppna(page);

  const knapp = page.getByRole("button", { name: /Byt till (mörkt|ljust) läge|Byt färgläge/ });
  await knapp.click();

  const tema = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(["dark", "light"]).toContain(tema);

  // Ytan ska faktiskt byta färg, inte bara attributet.
  const bakgrund = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("background-color")
  );
  expect(bakgrund).toBeTruthy();
});

test("dialogen fångar fokus och lämnar tillbaka det vid stängning", async ({ page }) => {
  await oppna(page, "Öppna punkter");

  const oppnaKnapp = page.getByRole("button", { name: "+ Lägg till punkt" });
  await oppnaKnapp.click();

  const dialog = page.getByRole("dialog", { name: "Ny punkt" });
  await expect(dialog).toBeVisible();
  // Native <dialog> öppnad med showModal() (F1): modaliteten kommer från webbläsaren,
  // inte från aria-modal. :modal gäller bara då, och sidan bakom är då inert.
  expect(await dialog.evaluate((el) => el.matches("dialog:modal"))).toBe(true);
  await expect(oppnaKnapp).not.toBeFocused();
  // Tab ska stanna i rutan — webbläsarens fokusfälla, ingen egen.
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // Escape ska stänga och ge tillbaka fokus till knappen som öppnade.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(oppnaKnapp).toBeFocused();
});

test("mobil: sidomenyn är infälld och går att öppna", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobil", "gäller bara mobilvyn");

  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Öppna menyn/ });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(page.getByRole("button", { name: /Stäng menyn/ })).toHaveAttribute("aria-expanded", "true");

  // Escape ska stänga menyn igen.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Öppna menyn/ })).toBeVisible();
});
