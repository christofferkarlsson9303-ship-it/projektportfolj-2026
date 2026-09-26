import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

test.beforeEach(async ({ page }) => {
  await oppna(page, "Översikt");
});

const nyckeltal = (page) => page.getByRole("region", { name: "Nyckeltal" });
const projektsektion = (page) => page.getByRole("region", { name: "Projekt", exact: true });
const uppmarksamhet = (page) => page.getByRole("region", { name: "Kräver uppmärksamhet" });
const snabbval = (page) => page.getByRole("group", { name: "Snabbåtgärder" });

test("fyra nyckeltalskort: ÄTA, hållpunkter, skyddsronder och budget", async ({ page }) => {
  const kort = nyckeltal(page).locator(".ov-kpi");
  await expect(kort).toHaveCount(4);
  await expect(kort.nth(0)).toContainText("ÄTA-status");
  await expect(kort.nth(1)).toContainText("Hållpunkter (HP)");
  await expect(kort.nth(1)).toContainText(/\d+ av \d+ godkända/);
  await expect(kort.nth(2)).toContainText("Skyddsronder");
  await expect(kort.nth(3)).toContainText(/\d+\s*% fakturerat/);
});

test("Gantt-schemat visar 16 faser, grindar och M1–M7 för valt projekt", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(16);
  await expect(gantt.locator(".ov-gantt-grind")).toHaveCount(16);
  await expect(gantt.getByRole("list", { name: "Betalmilstolpar" }).getByRole("listitem")).toHaveCount(7);

  // Passerade faser kan döljas — resten ska vara kvar.
  await gantt.getByRole("button", { name: "Dölj passerade faser" }).click();
  const kvar = await gantt.locator("button.ov-gantt-fas").count();
  expect(kvar).toBeGreaterThan(0);
  expect(kvar).toBeLessThan(16);
});

test("ett projekt utan datum får fälten direkt i Gantt-schemat", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  await gantt.getByRole("group", { name: "Projekt i Gantt-schemat" }).getByRole("button", { name: "Göteborg" }).click();
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(0);
  await expect(gantt.getByLabel("Startdatum för Göteborg Skogome")).toBeVisible();
});

test("ledtidstrackern bockar av ett ärende med Klar", async ({ page }) => {
  const ruta = page.getByRole("region", { name: "Ligg steget före – ledtider" });
  const rader = ruta.locator(".ov-ledlista > li");
  test.skip((await rader.count()) === 0, "inga aktuella ledtider mot dagens datum");

  const forsta = rader.first();
  const text = await forsta.locator(".ov-led-text > b").innerText();
  const projekt = await forsta.locator(".tag").innerText();
  await forsta.getByRole("button", { name: /^Klar/ }).click();
  await expect(ruta.locator(".ov-ledlista > li", { hasText: text }).filter({ hasText: projekt })).toHaveCount(0);
});

test("snabbåtgärden registrerar en ÄTA och öppnar den i ÄTA-vyn", async ({ page }) => {
  await snabbval(page).getByRole("button", { name: "Registrera ÄTA" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kort beskrivning av händelsen").fill("Berg i schakt vid trafo");
  await dialog.getByRole("button", { name: "Registrera" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ÄTA och hinder");
  await expect(page.getByRole("region", { name: /^Ärende UR\d{3}$/ })).toContainText("Berg i schakt vid trafo");
});

/* Utpekningen ska gälla en gång. Förut öppnades samma post igen varje gång
   man navigerade tillbaka till vyn. */
test("en utpekad post öppnas inte igen vid nästa besök i vyn", async ({ page }) => {
  await snabbval(page).getByRole("button", { name: "Ny dagboksrad" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dagbok");
  await expect(page.getByRole("region", { name: /^Dagboksrad/ })).toBeVisible();

  await gaTill(page, "Översikt");
  await gaTill(page, "Dagbok");
  await expect(page.getByRole("region", { name: /^Dagboksrad/ })).toHaveCount(0);
});

test("ny skyddsrond öppnar protokollet i HSEQ", async ({ page }) => {
  await snabbval(page).getByRole("button", { name: "Ny skyddsrond" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("HSEQ / BAS-U");
  await expect(page.getByRole("region", { name: /^Skyddsrond \d{4}-\d{2}-\d{2}$/ })).toBeVisible();
});

test("flaggorna filtreras på akuta, även från hälsningens genväg", async ({ page }) => {
  const ruta = uppmarksamhet(page);
  await expect(ruta.getByRole("button", { name: /^Alla/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /akuta att hantera/ }).click();
  await expect(ruta.getByRole("button", { name: /^Akuta/ })).toHaveAttribute("aria-pressed", "true");
  const rader = ruta.locator(".ov-frad");
  expect(await rader.count()).toBeGreaterThan(0);
  for (const rad of await rader.all()) await expect(rad).toHaveClass(/\bhog\b/);
});

test("en statusändring syns direkt i aktivitetsflödet", async ({ page }) => {
  const aktivitet = page.getByRole("region", { name: "Aktivitet" });
  await expect(aktivitet).toContainText("Inga händelser ännu");

  await projektsektion(page).getByLabel("Status för Växjö Batteripark").selectOption("Slutbesiktning");
  await expect(aktivitet.locator(".ov-flode li").first()).toContainText("status ändrad Produktion → Slutbesiktning");
  await expect(aktivitet.locator(".ov-flode li").first()).toContainText("Just nu");
});

test("ett projektkort per projekt, med namnet som länk till tidplanen", async ({ page }) => {
  const kort = projektsektion(page).locator(".projkort");
  expect(await kort.count()).toBeGreaterThan(1);

  await kort.first().getByRole("button", { name: /öppna tidplanen/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tidplan");
});

test("projektuppgifterna fälls ut och in", async ({ page }) => {
  const knapp = projektsektion(page).getByRole("button", { name: /projektuppgifter/ });
  await expect(knapp).toHaveAttribute("aria-expanded", "false");
  await knapp.click();
  await expect(knapp).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Projektuppgifter" })).toBeVisible();
});

test("flaggan om saknad kärndata fäller ut projektuppgifterna", async ({ page }) => {
  const ruta = uppmarksamhet(page);
  await ruta.getByRole("button", { name: /^Bevaka/ }).click();
  await ruta.getByRole("button", { name: /Kärndata saknas/ }).first().click();
  await expect(page.getByRole("region", { name: "Projektuppgifter" })).toBeVisible();
});

test("saknade uppgifter skrivs ut i klartext", async ({ page }) => {
  const utanEffekt = projektsektion(page).locator(".projkort", { hasText: "Effekt ej angiven" });
  test.skip((await utanEffekt.count()) === 0, "alla projekt har effekt angiven");
  await expect(utanEffekt.first()).not.toContainText("— MW");
});

/* Ingen text i rutorna får klippas eller sticka ut — varken på desktop eller
   i mobilprojektet. Dekor (Kraftkurvan, vattenmärket) är aria-hidden och
   får gå ut i kanten, den klipps av rutan med flit. */
test("ingen text i rutor, nyckeltal eller projektkort klipps", async ({ page }) => {
  // Låt inglidningen bli klar så att mätningen inte fångar en rörelse.
  await page.waitForTimeout(900);
  const fel = await page.evaluate(() => {
    const ut = [];
    // Gantt-schemat ligger i en rullyta med flit — det som rullar är inte klippt.
    const rullar = (el) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
    document.querySelectorAll(".ov-hero, .ov-kpi, .ov-ruta, .projkort").forEach((kort) => {
      const ram = kort.getBoundingClientRect();
      kort.querySelectorAll("*").forEach((el) => {
        if (el.closest(".sr-only") || el.closest('[aria-hidden="true"]')) return;
        for (let p = el; p && p !== kort; p = p.parentElement) if (rullar(p)) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const klipptInuti = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline";
        const utanfor = r.right > ram.right + 1 || r.left < ram.left - 1;
        if (klipptInuti || utanfor) ut.push(`${el.className || el.tagName}: "${el.textContent.trim().slice(0, 40)}"`);
      });
    });
    return ut;
  });
  expect(fel).toEqual([]);
});

test("sidan rullar inte i sidled", async ({ page }) => {
  const [bredd, fonster] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(bredd).toBeLessThanOrEqual(fonster);
});

test("vyn renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  await projektsektion(page).getByRole("button", { name: /projektuppgifter/ }).click();
  await page.getByRole("button", { name: "Visa hela ändringsloggen" }).click();
  await expect(page.getByRole("region", { name: "Hela ändringsloggen" })).toBeVisible();
  utanKonsolfel(fel);
});
