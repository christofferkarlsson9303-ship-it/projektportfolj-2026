import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const KORT = ".veckokort";
const FRAGOR = { name: /frågor besvarade/ };
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

test.beforeEach(async ({ page }) => {
  await oppna(page, "Veckokoll");
});

test("checklistan visar nio frågekort", async ({ page }) => {
  await expect(page.locator(KORT)).toHaveCount(9);
  await expect(page.getByRole("progressbar", FRAGOR)).toHaveAttribute("aria-valuenow", "0");
});

// Projektflikarna scrollar i sidled inne i sig själva. Vidgade de sidan zoomade mobilen ut och klick hamnade fel.
test("sidan är inte bredare än skärmen, även med flera projektflikar", async ({ page }) => {
  const vidd = await page.evaluate(() => ({ layout: window.innerWidth, skarm: document.documentElement.clientWidth, innehall: document.documentElement.scrollWidth }));
  expect(vidd.layout).toBe(vidd.skarm);
  expect(vidd.innehall).toBeLessThanOrEqual(vidd.skarm);
});

test("svaren är en toggle-grupp med ikon, och ett svar räknas direkt utan sparaknapp", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  const grupp = forsta.getByRole("group", { name: "Svar på fråga 1" });
  await expect(grupp.getByRole("button")).toHaveCount(2);
  await expect(grupp.locator("svg")).toHaveCount(2);
  await grupp.getByRole("button", { name: /OK/ }).click();

  // 1 av 9 besvarade = 11 %.
  await expect(page.getByRole("progressbar", FRAGOR)).toHaveAttribute("aria-valuenow", "11");
  await expect(grupp.getByRole("button", { name: /OK/ })).toHaveAttribute("aria-pressed", "true");
});

test("samma svar igen nollställer det", async ({ page }) => {
  const knapp = page.locator(KORT).first().getByRole("button", { name: /OK/ });
  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-pressed", "true");

  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("progressbar", FRAGOR)).toHaveAttribute("aria-valuenow", "0");
});

test("en avvikelse färgar kortets kant och fäller ut ett snabbfält där kommentaren sparas", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  await expect(forsta).toHaveClass(/avvikelse/);
  // Vänsterkanten är 4 px och röd (designsystemets --rod).
  await expect(forsta).toHaveCSS("border-left-width", "4px");
  const snabb = forsta.getByRole("group", { name: "Åtgärder för fråga 1" });
  await expect(snabb).toBeVisible();

  await snabb.getByLabel("Kommentar till avvikelsen").fill("Kontraktet genomgånget med platschefen");
  // Dölj åtgärderna: fältet tappar fokus och kommentaren sparas.
  await forsta.getByRole("button", { name: "Dölj åtgärder" }).click();
  await expect(snabb).toHaveCount(0);

  // Kortet visar att det är kommenterat, och texten finns kvar när man fäller ut igen.
  await expect(forsta.getByText("Kommenterad")).toBeVisible();
  await forsta.getByRole("button", { name: "Visa åtgärder" }).click();
  await expect(forsta.getByLabel("Kommentar till avvikelsen")).toHaveValue("Kontraktet genomgånget med platschefen");
});

/* Regressionsskydd: fältet tappade fokus efter varje tecken. fill() sätter
   hela värdet i ett svep och kan därför inte fånga det — här skrivs tecken
   för tecken, som en människa gör. */
test("kommentarsfältet behåller fokus medan man skriver", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  const falt = forsta.getByLabel("Kommentar till avvikelsen");
  await falt.click();
  await page.keyboard.type("Platschef kontaktad", { delay: 15 });

  await expect(falt).toBeFocused();
  await expect(falt).toHaveValue("Platschef kontaktad");
});

test("Ctrl+Enter sparar kommentaren utan att lämna fältet", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  const falt = forsta.getByLabel("Kommentar till avvikelsen");
  await falt.click();
  await page.keyboard.type("Sparas utan blur");
  await page.keyboard.press("Control+Enter");

  await expect(falt).toBeFocused();
  await expect(forsta.getByText("Kommenterad")).toBeVisible();
  await expect.poll(async () => ((await portfolj(page)).veckokoll || [])[0]?.k1).toBe("Sparas utan blur");
});

test("åtgärderna går att dölja och visa, och aria-expanded följer med", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  const vaxla = forsta.getByRole("button", { name: "Dölj åtgärder" });
  await expect(vaxla).toHaveAttribute("aria-expanded", "true");
  await vaxla.click();
  await expect(forsta.getByRole("button", { name: "Visa åtgärder" })).toHaveAttribute("aria-expanded", "false");
  await expect(forsta.getByRole("group", { name: "Åtgärder för fråga 1" })).toHaveCount(0);
});

test("ett OK-svar erbjuder ingen åtgärd och ger en turkos kant", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /OK/ }).click();

  await expect(forsta).toHaveClass(/\bok\b/);
  await expect(forsta.getByRole("button", { name: /åtgärder/ })).toHaveCount(0);
  await expect(forsta.getByRole("group", { name: /Åtgärder för fråga/ })).toHaveCount(0);
});

test("Osäker är en varning med egen färg och snabbfält", async ({ page }) => {
  const andra = page.locator(KORT).nth(1);
  await andra.getByRole("button", { name: /Varning/ }).click();
  await expect(andra).toHaveClass(/varning/);
  await expect(andra.getByRole("group", { name: "Åtgärder för fråga 2" }).getByLabel("Kommentar till varningen")).toBeVisible();
});

test("veckoväxlaren byter vecka och tillbaka", async ({ page }) => {
  const rubrik = page.getByRole("heading", { level: 3, name: /^Veckochecklistan/ });
  const denna = await rubrik.textContent();

  await page.getByRole("button", { name: "‹ Föregående" }).click();
  await expect(rubrik).not.toHaveText(denna);

  await page.getByRole("button", { name: "Till denna vecka" }).click();
  await expect(rubrik).toHaveText(denna);
});

test("veckan går att markera som genomgången", async ({ page }) => {
  const knapp = page.getByRole("button", { name: "Markera veckan som genomgången" });
  await knapp.click();

  await expect(page.getByRole("button", { name: "Öppna veckan igen" })).toBeVisible();

  // Genomgången vecka hamnar i historiken.
  const historik = page.getByRole("region", { name: "Veckokollens historik" });
  await expect(historik.locator("tbody tr")).toHaveCount(1);
});

test("en avvikelse kan bli en öppen punkt", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  await forsta.getByRole("group", { name: "Åtgärder för fråga 1" }).getByRole("button", { name: "Skapa öppen punkt" }).click();

  await expect(page.getByRole("status").filter({ hasText: /Öppna punkter/ })).toBeVisible();
});

test("en avvikelse kan bli en ÄTA-post och öppnar den", async ({ page }) => {
  const forsta = page.locator(KORT).first();
  await forsta.getByRole("button", { name: /Avvikelse/ }).click();

  await forsta.getByRole("group", { name: "Åtgärder för fråga 1" }).getByRole("button", { name: "Skapa ÄTA" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA");
  await expect
    .poll(async () => ((await portfolj(page)).ur || []).find((u) => /^Veckokoll .* fråga 1: Vet jag vad som ingår i kontraktet/.test(u.benamning || ""))?.projektId)
    .toBe("36037");
});

test("projektflikarna är en tablist med en flik per projekt, pilar flyttar och valet följer med", async ({ page }) => {
  const flikar = page.getByRole("tablist", { name: "Välj projekt" });
  const alla = flikar.getByRole("tab");
  const antal = await alla.count();
  expect(antal).toBeGreaterThanOrEqual(2);
  await expect(alla.first()).toHaveAttribute("aria-selected", "true");

  await alla.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(alla.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(alla.first()).toHaveAttribute("aria-selected", "false");
  // Översikten byter projekt med fliken.
  const nr = (await alla.nth(1).locator("span.truncate").first().textContent()).trim();
  await expect(page.getByRole("heading", { level: 3 }).first()).toContainText(nr);

  await page.keyboard.press("Home");
  await expect(alla.first()).toHaveAttribute("aria-selected", "true");
});

test("flikens prick och ring följer veckans svar: avvikelse ger röd prick och räknar frågorna", async ({ page }) => {
  const flik = page.getByRole("tablist", { name: "Välj projekt" }).getByRole("tab").first();
  await expect(flik).toContainText("Ej genomgången");
  await expect(flik).toContainText("0 av 9 besvarade");

  await page.locator(KORT).first().getByRole("button", { name: /Avvikelse/ }).click();
  await expect(flik).toContainText("Avvikelse");
  await expect(flik).toContainText("1 av 9 besvarade");
  await page.locator(KORT).nth(2).getByRole("button", { name: /OK/ }).click();
  await expect(flik).toContainText("2 av 9 besvarade");
});

test("BESS-översikten visar nyckeltalen: besvarat, öppna avvikelser och ÄTA-påverkan", async ({ page }) => {
  const oversikt = page.getByRole("region", { name: /Växjö/ }).first();
  const tal = oversikt.getByRole("group", { name: "Nyckeltal för veckan" });
  await expect(tal).toContainText("0/9 frågor");
  await expect(tal).toContainText("Inga avvikelser");
  await expect(tal.getByRole("button", { name: "Öppna ÄTA" })).toBeVisible();

  await page.locator(KORT).first().getByRole("button", { name: /Avvikelse/ }).click();
  await expect(tal).toContainText("1/9 frågor");
  await expect(tal).toContainText("1 avvikelse");
  await page.locator(KORT).nth(1).getByRole("button", { name: /Varning/ }).click();
  await expect(tal).toContainText("1 varning att kontrollera");

  await tal.getByRole("button", { name: "Öppna ÄTA" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA");
});

test("de fyra stegen i bygget är klickbara och visar vilka moment de bygger på", async ({ page }) => {
  const steg = page.getByRole("list", { name: "Stadier i bygget" });
  await expect(steg.getByRole("listitem")).toHaveCount(4);
  for (const n of ["Mark och fundament", "BESS-containrar", "Trafo och nät", "Idrifttagning"]) await expect(steg).toContainText(n);

  const knapp = steg.getByRole("button", { name: /BESS-containrar/ });
  await expect(knapp).toHaveAttribute("aria-expanded", "false");
  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#bess-stadie-detalj")).toContainText("kontrollpunkter bockade i moment");
  await page.locator("#bess-stadie-detalj").getByRole("button", { name: "Stäng" }).click();
  await expect(knapp).toHaveAttribute("aria-expanded", "false");
});

test("parkens komponenter kommer från siten: tomt läge leder dit, och en placerad container syns med status", async ({ page }) => {
  await expect(page.getByText("Inga komponenter är placerade på siten än.")).toBeVisible();
  await page.getByRole("button", { name: "Öppna Siten i 3D" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Siten i 3D");

  const kort = page.getByRole("region", { name: /^Siten — / });
  await kort.getByRole("button", { name: "+ Container", exact: true }).click();
  await kort.getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("list", { name: "Objekt" }).getByRole("button", { name: /Container 1/ }).click();
  const panel = page.getByRole("region", { name: "Container 1" });
  await panel.getByLabel("Laddstatus SoC (%)").fill("62");
  await panel.getByLabel("Laddstatus SoC (%)").press("Enter");
  await panel.locator("#site-status").selectOption("monterad");

  await gaTill(page, "Veckokoll");
  const lista = page.getByRole("list", { name: "Komponenter i parken" });
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista).toContainText("Container 1");
  await expect(lista).toContainText("SoC 62 %");

  const knapp = lista.getByRole("button", { name: /Container 1/ });
  await knapp.click();
  const detalj = page.locator("#bess-komp-detalj");
  await expect(detalj).toContainText("Monterad");
  await expect(detalj).toContainText("Ingen öppen ÄTA");
  await detalj.getByRole("button", { name: "Visa i 3D" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Siten i 3D");
  await expect(page.getByRole("region", { name: "Container 1" })).toBeVisible();
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Veckokoll");
  await page.locator(KORT).first().getByRole("button", { name: /Varning/ }).count();
  utanKonsolfel(fel);
});
