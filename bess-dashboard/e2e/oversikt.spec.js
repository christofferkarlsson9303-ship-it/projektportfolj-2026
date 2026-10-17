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
  await expect(kort.nth(1)).toContainText(/\d+ av \d+ klara/);
  await expect(kort.nth(2)).toContainText("Skyddsronder");
  await expect(kort.nth(3)).toContainText(/\d+\s*% fakturerat/);
});

test("nästa uppgift bockas av, nästa vaskas fram och det går att ångra", async ({ page }) => {
  const ruta = page.getByRole("region", { name: "Nästa uppgift" });
  const id = ruta.locator(".ov-nasta-kort .ov-nasta-id");
  const forsta = (await id.textContent()).trim();

  await ruta.getByRole("button", { name: /^Klar/ }).click();
  await expect(id).not.toHaveText(forsta);
  await expect(ruta.locator(".ov-nasta-senast")).toContainText(`${forsta} klar — nästa:`);

  await ruta.getByRole("button", { name: "Ångra" }).click();
  await expect(id).toHaveText(forsta);
});

test("nästa uppgift tar en kommentar direkt på punkten", async ({ page }) => {
  const ruta = page.getByRole("region", { name: "Nästa uppgift" });
  await ruta.getByRole("button", { name: /^Kommentera/ }).click();
  await ruta.getByLabel("Kommentar", { exact: true }).fill("Ringt leverantören, svar på fredag");
  await ruta.getByRole("button", { name: "Spara notering" }).click();
  await expect(ruta.getByRole("button", { name: /^Kommentera \(1\)/ })).toBeVisible();
});

test("Gantt-schemat visar 16 moment, grindar och M1–M7 för valt projekt", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(16);
  await expect(gantt.locator(".ov-gantt-grind")).toHaveCount(16);
  await expect(gantt.getByRole("list", { name: "Betalmilstolpar" }).getByRole("listitem")).toHaveCount(7);

  // Passerade faser kan döljas — resten ska vara kvar.
  await gantt.getByRole("button", { name: "Dölj passerade moment" }).click();
  const kvar = await gantt.locator("button.ov-gantt-fas").count();
  expect(kvar).toBeGreaterThan(0);
  expect(kvar).toBeLessThan(16);
});

test("Gantt: klickmenyn flyttar ett moment en vecka och sätter grinden, utan att dra", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  const moment = gantt.getByRole("button", { name: /^Moment 15 / });
  await moment.click();
  await expect(moment).toHaveAttribute("aria-expanded", "true");
  const meny = gantt.getByRole("group", { name: /^Moment 15 .*veckor och status/ });
  const veckor = meny.locator("p").first();
  const fore = (await veckor.textContent()).trim();
  expect(fore).toMatch(/^v\. \d{2} \d{4} – v\. \d{2} \d{4}/);

  await meny.getByRole("button", { name: "Flytta momentet: en vecka senare" }).click();
  await expect(veckor).not.toHaveText(fore);
  const rad = async () =>
    page.evaluate(() => (JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}").epcFaser || []).find((r) => r.fas === 15 && r.projektId === "36037"));
  await expect.poll(async () => new Date((await rad())?.start + "T12:00:00").getDay()).toBe(1); // måndag
  await expect.poll(async () => new Date((await rad())?.slut + "T12:00:00").getDay()).toBe(5); // fredag
  await meny.getByRole("button", { name: "Flytta momentet: en vecka tidigare" }).click();
  await expect(veckor).toHaveText(fore.replace("standardplan", "egna datum"));

  await meny.getByRole("radio", { name: /^Klar — G15 passerad/ }).check();
  await expect(moment).toHaveAttribute("aria-label", /: Grind passerad,/);
  await meny.getByRole("radio", { name: "Följer datumen" }).check();
  await expect(moment).not.toHaveAttribute("aria-label", /: Grind passerad,/);

  await meny.getByRole("button", { name: "Stäng" }).click();
  await expect(meny).toHaveCount(0);
  await expect(moment).toBeFocused();
});

test("Gantt: faserna fälls ihop till en stapel och nivåväljaren växlar fas/moment", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  const niva = gantt.getByRole("radiogroup", { name: "Nivå i Gantt-schemat" });
  await niva.getByRole("radio", { name: "Faser" }).click();
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(0);
  const rubriker = gantt.locator("button.ov-gantt-fasrubrik");
  const antal = await rubriker.count();
  expect(antal).toBeGreaterThan(3);
  await expect(gantt.locator(".ov-gantt-samlad .ov-gantt-stapel")).toHaveCount(antal);

  await rubriker.first().click();
  await expect(rubriker.first()).toHaveAttribute("aria-expanded", "true");
  expect(await gantt.locator("button.ov-gantt-fas").count()).toBeGreaterThan(0);

  await niva.getByRole("radio", { name: "Moment" }).click();
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(16);
  await rubriker.nth(1).click();
  await expect(rubriker.nth(1)).toHaveAttribute("aria-expanded", "false");
  expect(await gantt.locator("button.ov-gantt-fas").count()).toBeLessThan(16);
});

test("ett projekt utan datum får fälten direkt i Gantt-schemat", async ({ page }) => {
  const gantt = page.getByRole("region", { name: "Fasplan, grindar och betalningar" });
  await gantt.getByRole("group", { name: "Projekt i Gantt-schemat" }).getByRole("button", { name: "Göteborg" }).click();
  await expect(gantt.locator("button.ov-gantt-fas")).toHaveCount(0);
  await expect(gantt.getByLabel("Startdatum för Göteborg Skogome")).toBeVisible();
});

test("ledtidstrackern bockar av ett ärende med Klar", async ({ page }) => {
  const ruta = page.getByRole("region", { name: "Ligg steget före – ledtider" });
  const lista = ruta.getByRole("list", { name: "Ledtider att starta" });
  test.skip((await lista.count()) === 0, "inga aktuella ledtider mot dagens datum");
  const rader = lista.getByRole("listitem");

  const forsta = rader.first();
  const text = await forsta.locator('[data-roll="titel"]').innerText();
  const projekt = await forsta.locator(".tag").innerText();
  await forsta.getByRole("button", { name: /^Klar/ }).click();
  await expect(rader.filter({ hasText: text }).filter({ hasText: projekt })).toHaveCount(0);
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
    document.querySelectorAll(".ov-hero, .ds-card, .projkort").forEach((kort) => {
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
