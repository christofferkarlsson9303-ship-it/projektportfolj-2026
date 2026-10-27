import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel } from "./hjalpare.js";

const KAPITEL = "Bygga batteripark";

test.beforeEach(async ({ page }) => {
  await oppna(page, KAPITEL);
});

const lage = (page) => page.getByRole("region", { name: "Lägesbild — var projekten står" });
const projektrad = (page, namn) => lage(page).getByRole("group", { name: "Välj projekt" }).getByRole("button", { name: namn });
const rad = (page, id) => page.locator(`[id="kp-${id}"]`);
/** Väljer i punktens ⋯-meny ("Kommentera" eller "Ej aktuell"). */
async function radval(page, id, val) {
  await rad(page, id).getByRole("button", { name: `Fler val för ${id}` }).click();
  await rad(page, id).getByRole("group", { name: `Val för ${id}` }).getByRole("button", { name: new RegExp(`^${val}`) }).click();
}
/** Fäller ut en fas om den inte redan är utfälld — pågående faser är öppna från början. */
async function oppnaFas(page, nr) {
  const fas = page.locator(`#fas-${nr}`);
  if ((await fas.getAttribute("open")) === null) await fas.locator("summary").click();
  await expect(fas).toHaveAttribute("open", "");
}

/** Statuskortet är infällt på mobil — fäll ut det innan det läses. */
const status = (page) => page.getByRole("region", { name: /^Status — / });
async function oppnaStatus(page) {
  const del = page.locator("#epc-summering");
  if ((await del.getAttribute("open")) === null) await del.locator(":scope > summary").click();
}
/** Referensdelarna är infällda — fäll ut innan innehållet läses. */
async function oppnaRef(page, id) {
  const del = page.locator(`#${id}`);
  if ((await del.getAttribute("open")) === null) await del.locator(":scope > summary").click();
  await expect(del).toHaveAttribute("open", "");
}
const erfarenhetslista = async (page) => {
  await oppnaRef(page, "epc-erfarenheter");
  return page.getByRole("region", { name: "Erfarenhetsåterföring — topp 10" });
};

test("guiden har 16 moment, de löpande punkterna och alla 309 kontrollpunkter att bocka av", async ({ page }) => {
  await expect(page.locator("details.epc-fas")).toHaveCount(17);
  // Infällda moment ritar inte sina rader — fäll ut alla innan de räknas.
  await page.getByRole("button", { name: "Fäll ut alla" }).click();
  await expect(page.locator(".epc-rad")).toHaveCount(309);
  await expect(page.locator(".epc-rad.hp")).toHaveCount(55);
  await expect(page.locator(".epc-rad input[type=checkbox]")).toHaveCount(309);
  // Checklistan skapar inga ÄTA.
  await expect(page.getByRole("button", { name: /Skapa UR\/ÄTA/ })).toHaveCount(0);
});

test("summeringen visar exakt status per fas och följer avbockningen", async ({ page }) => {
  // Moment 0–9 är passerade i Växjö, men en grind bockar inte av punkter: inget är registrerat.
  await oppnaStatus(page);
  await expect(status(page)).toContainText("0/309");
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("0/19");

  await oppnaFas(page, 10);
  await rad(page, "10.7").getByRole("checkbox").check();
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("1/19");
  await expect(status(page)).toContainText("1/309");
  await expect(rad(page, "10.7")).toContainText(/Klar \d{4}-\d{2}-\d{2}/);

  // Ej aktuell räknas bort ur det som återstår.
  await radval(page, "10.3", "Ej aktuell");
  await expect(status(page).getByRole("row", { name: /^10 · Stationshus/ })).toContainText("1/18");
  await expect(rad(page, "10.3")).toHaveClass(/ejaktuell/);

  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Aktivitet" })).toContainText("EPC 10.7 hållpunkt godkänd");
});

test("en passerad grind bockar inte av punkter — de registreras en och en eller i ett svep", async ({ page }) => {
  await oppnaFas(page, 7);
  await expect(rad(page, "7.3").getByRole("checkbox")).not.toBeChecked();
  await expect(rad(page, "7.3").getByRole("checkbox")).toBeEnabled();
  await expect(rad(page, "7.3")).toContainText("Ej registrerad · G7 passerad");

  const fas = page.locator("#fas-7");
  const registrera = fas.getByRole("button", { name: /^Registrera \d+ som klara$/ });
  await registrera.click();
  await expect(rad(page, "7.3").getByRole("checkbox")).toBeChecked();
  await expect(rad(page, "7.3")).toContainText(/Klar \d{4}-\d{2}-\d{2}/);
  await expect(registrera).toHaveCount(0);
});

test("grindrutan räknar det som saknas per typ och hoppar till första raden", async ({ page }) => {
  await oppnaFas(page, 10);
  const saknas = page.locator("#fas-10").getByRole("group", { name: "Det här saknas för G10" });
  await expect(saknas).toContainText("klartecken (grinddatum)");
  // Radtexterna upprepas inte i panelen (UX-05).
  await expect(saknas).not.toContainText("Skärmåterföring");
  const hp = saknas.getByRole("button", { name: /^7 hållpunkter$/ });
  await expect(hp).toBeVisible();

  await rad(page, "10.7").getByRole("checkbox").check();
  await expect(saknas.getByRole("button", { name: /^6 hållpunkter$/ })).toBeVisible();

  await saknas.getByRole("button", { name: /^6 hållpunkter$/ }).click();
  await expect(rad(page, "10.8")).toHaveClass(/epc-markerad/);
  await expect(rad(page, "10.8").getByRole("checkbox")).toBeFocused();
});

test("momentets rubrik visar datum, tidsläge och styrande leverans", async ({ page }) => {
  const summary = page.locator("#fas-10 > summary");
  // Standardplanen ger datum; ett passerat moment visar grinden i stället.
  await expect(summary.locator(".epc-tidslage")).toContainText(/\d{1,2}[–\s]/);
  await expect(summary.locator(".epc-tidslage")).toContainText(/standardplan|egna datum|passerad|start om|pågår|d sen/);

  // En leverans som uttryckligen kopplas till moment 10 syns i rubriken (UX-02).
  await expect(summary).not.toContainText("Styrs av:");
  await gaTill(page, "Tidplan");
  const kort = page.getByRole("region", { name: /^Leveransspårning/ });
  await kort.getByLabel("Moment som behöver MV-station").selectOption("10");
  await gaTill(page, KAPITEL);
  await expect(page.locator("#fas-10 > summary")).toContainText("Styrs av:");
  await expect(page.locator("#fas-10 > summary .epc-styrsav")).toContainText("MV-station");
});

test("en avvikelse på en punkt hamnar i erfarenhetslistan och visas på punkten i nästa projekt", async ({ page }) => {
  await expect(await erfarenhetslista(page)).toContainText("Inga avvikelser eller lärdomar ännu");

  await oppnaFas(page, 10);
  await radval(page, "10.3", "Kommentera");
  const panel = rad(page, "10.3").locator(".epc-radpanel");
  await panel.getByRole("button", { name: "Avvikelse" }).click();
  await panel.getByLabel("Vad hände").fill("Stationshuset kom med skadad dörr");
  await panel.getByLabel("Gör så här nästa gång").fill("Fota vid lossning och reklamera samma dag");
  await panel.getByRole("combobox").selectOption("3");
  await panel.getByRole("button", { name: "Spara avvikelse" }).click();

  await expect(panel.locator(".epc-komm")).toContainText("Stationshuset kom med skadad dörr");
  await expect(rad(page, "10.3").getByRole("button", { name: "Kommentarer på 10.3" })).toContainText("1");
  const lista = await erfarenhetslista(page);
  await expect(lista.locator(".epc-erfrad")).toHaveCount(1);
  await expect(lista).toContainText("Fota vid lossning och reklamera samma dag");
  await expect(lista).toContainText("Påverkan Hög");

  // I Alvesta visas Växjös erfarenhet på samma punkt.
  await projektrad(page, /^36038 Alvesta/).click();
  await expect(lista).toContainText("Inga avvikelser eller lärdomar ännu");
  await lista.getByRole("button", { name: "Alla projekt" }).click();
  await expect(lista.locator(".epc-erfrad")).toHaveCount(1);
  await rad(page, "10.3").getByRole("button", { name: /1 erfarenhet från tidigare projekt på 10.3/ }).click();
  await expect(rad(page, "10.3").locator(".epc-tidigare")).toContainText("Fota vid lossning");
});

test("en punktrad har bara kryssrutan och ⋯-menyn som synliga åtgärder (UX-03)", async ({ page }) => {
  await oppnaFas(page, 10);
  const r = rad(page, "10.3");
  await expect(r.getByRole("button", { name: /^Ej aktuell/ })).toHaveCount(0);
  await expect(r.getByRole("button", { name: "Kommentarer på 10.3" })).toHaveCount(0);

  // Escape stänger menyn och lämnar fokus på knappen.
  await r.getByRole("button", { name: "Fler val för 10.3" }).click();
  await expect(r.getByRole("group", { name: "Val för 10.3" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(r.getByRole("group", { name: "Val för 10.3" })).toHaveCount(0);
  await expect(r.getByRole("button", { name: "Fler val för 10.3" })).toBeFocused();

  // Ej aktuell via menyn, och tillbaka med den synliga knappen.
  await radval(page, "10.3", "Ej aktuell");
  await expect(r).toHaveClass(/ejaktuell/);
  await r.getByRole("button", { name: /^Aktuell igen/ }).click();
  await expect(r).not.toHaveClass(/ejaktuell/);
});

test("märkena står i klartext och förklaras i legenden (UX-04)", async ({ page }) => {
  await oppnaFas(page, 10);
  await expect(rad(page, "10.7").locator(".epc-markering.hp")).toHaveText("Hållpunkt");
  await expect(rad(page, "10.7").locator(".epc-markering.l")).toHaveText("Lärdom");
  const legend = page.getByRole("list", { name: "Markeringar" });
  await expect(legend).toContainText("röd kant på raden");
  await expect(legend).toContainText("Kontraktskrav");
  await expect(legend).toContainText("Erfarenheter från andra projekt");
});

test("ett moment med passerad grind är en kompakt rad med grinddatum (UX-11)", async ({ page }) => {
  // Moment 0–9 är passerade i Växjö.
  const fas = page.locator("#fas-7");
  await expect(fas).not.toHaveAttribute("open", "");
  await expect(fas.locator("summary .epc-tidslage")).toContainText("G7 passerad");
  await expect(fas.locator("summary .epc-fasdatum")).toBeHidden();
});

test("filtret Kvar är förvalt; en bockad punkt stryks men ligger kvar tills Kvar väljs igen (UX-06)", async ({ page }) => {
  const filter = page.getByRole("group", { name: "Visa status" });
  await expect(filter.getByRole("button", { name: "Kvar" })).toHaveAttribute("aria-pressed", "true");
  await oppnaFas(page, 10);
  await rad(page, "10.6").getByRole("checkbox").check();
  await expect(rad(page, "10.6")).toHaveClass(/klar/);
  await filter.getByRole("button", { name: "Kvar" }).click();
  await expect(rad(page, "10.6")).toHaveCount(0);
  await filter.getByRole("button", { name: "Alla" }).click();
  await expect(rad(page, "10.6")).toBeVisible();
});

test("långa punkter har en kort rubrik och hela texten under Detaljer (UX-07)", async ({ page }) => {
  await oppnaFas(page, 10);
  const r = rad(page, "10.9");
  await expect(r.locator(".epc-radtext")).toContainText("Signerat SAT-protokoll för reläskydd");
  await expect(r).not.toContainText("Öppna fel hanteras");
  await r.getByRole("button", { name: "Detaljer för 10.9" }).click();
  await expect(r).toContainText("Öppna fel hanteras före ONE:s spänningssättning");
  // Sökningen hittar punkten på hela texten.
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("ljusbågsvakt");
  await expect(rad(page, "10.9")).toBeVisible();
});

test("moment 10–13 grupperas efter när arbetet görs (UX-08)", async ({ page }) => {
  await page.getByRole("button", { name: "Fäll ut alla" }).click();
  const m11 = page.locator("#fas-11");
  await expect(m11.locator(".epc-sektion h4")).toHaveText(["Planering (veckor före)", "Före leverans", "Lyftdag", "Efter placering"]);
  await expect(m11).not.toContainText("Från källgenomgången");
  await expect(m11.locator(".epc-sektion").nth(2).locator('[id="kp-11.15"]')).toBeVisible();
});

test("När-texten räknas till ett senast-datum och passerade datum markeras (UX-09)", async ({ page }) => {
  await oppnaFas(page, 11);
  const senast = rad(page, "11.2").locator(".epc-senast");
  await expect(senast).toContainText(/^senast \d{1,2} [a-zåäö]{3}/);
  await expect(senast).toHaveAttribute("title", /28 dagar före start av moment 11/);
  // 11.1 ("Löpande") får inget datum.
  await expect(rad(page, "11.1").locator(".epc-senast")).toHaveCount(0);
});

test("egenkontrollerna står i klartext med vad som krävs för grinden (UX-10)", async ({ page }) => {
  await oppnaFas(page, 10);
  const lage = page.locator("#fas-10").getByTestId("egenkontroll-lage");
  await expect(lage).toContainText(/\d+ av \d+ egenkontroller inte gjorda – krävs för G10/);
  await expect(page.locator("#fas-10")).not.toContainText("Serverkvitterade");
});

test("lägesbilden har en rad per projekt och visar läget för valt projekt", async ({ page }) => {
  const rader = lage(page).getByRole("group", { name: "Välj projekt" }).getByRole("button");
  await expect(rader).toHaveCount(4);
  await expect(projektrad(page, /^36037 Växjö/)).toHaveAttribute("aria-pressed", "true");
  await expect(projektrad(page, /^36037 Växjö/)).toContainText(/av 16 grindar passerade/);
  await expect(projektrad(page, /^Göteborg/)).toContainText("Datum saknas");
  await oppnaStatus(page);
  const framdrift = status(page).getByRole("list", { name: "Framdrift i checklistan" });
  await expect(framdrift).toContainText(/Grindar passerade\s*\d+\/16/);
  await expect(framdrift).toContainText(/Hållpunkter klara\s*\d+\/55/);
  // Läget nu för valt projekt står i tre kort.
  for (const namn of ["Pågår nu", "Näst på tur", "Ledtider att starta"])
    await expect(page.getByRole("region", { name: namn })).toBeVisible();
});

test("ett annat projekt väljs i lägesbilden och guiden följer med", async ({ page }) => {
  await projektrad(page, /^36038 Alvesta/).click();
  await expect(projektrad(page, /^36038 Alvesta/)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Startdatum för Alvesta Batteripark")).toBeVisible();
  // Infällda moment ritar inte sitt innehåll — fäll ut moment 0 och se att rutan gäller Alvesta.
  await oppnaFas(page, 0);
  await expect(page.locator('aside[aria-label="Moment 0 i 36038 Alvesta"]')).toBeVisible();
});

test("version 1.3: källgenomgången, nyckelvärdena och de tolv motsägelserna finns med", async ({ page }) => {
  await expect(page.getByRole("region", { name: "Så byggs en batteripark" })).toContainText("Mallversion 1.3");
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("3,21 V");
  await expect(page.locator(".epc-rad")).toHaveCount(1);
  await expect(rad(page, "15.17")).toBeVisible();
  await expect(page.locator("#fas-15")).toContainText("Från källgenomgången");
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("");
  await oppnaRef(page, "epc-nyckelvarden");
  await oppnaRef(page, "epc-verifiera");
  await expect(page.getByRole("region", { name: "Nyckelvärden — snabbreferens" }).locator("dt")).toHaveCount(14);
  await expect(page.locator(".epc-verifiera dt")).toHaveCount(12);
});

test("filtret Hållpunkter visar bara de 55 hållpunkterna", async ({ page }) => {
  await page.getByRole("group", { name: "Visa markering" }).getByRole("button", { name: "Hållpunkter" }).click();
  await expect(page.locator(".epc-rad")).toHaveCount(55);
  await expect(page.locator(".epc-rad:not(.hp)")).toHaveCount(0);
});

test("sökningen hittar lärdomen om CT-fönster", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Sök i guiden" }).fill("CT-fönster");
  await expect(page.locator(".epc-rad")).toHaveCount(1);
  await expect(rad(page, "3.8")).toBeVisible();
  await expect(rad(page, "3.8").locator(".epc-markering.l")).toBeVisible();
});

test("en grind markeras passerad, fasen byter läge och det loggas", async ({ page }) => {
  const fas = page.locator("#fas-11");
  // Momentet som pågår idag är redan utfällt (det följer datumet), så öppna det bara om det är stängt.
  if (!(await fas.evaluate((el) => el.open))) await fas.locator("summary").click();
  const iProjektet = fas.getByRole("complementary", { name: "Moment 11 i 36037 Växjö" });
  await iProjektet.getByRole("button", { name: "Markera G11 passerad idag" }).click();
  await expect(fas.locator("summary")).toContainText("Grind passerad");
  await expect(iProjektet).toContainText(/G11 passerad \d{4}-\d{2}-\d{2}/);
  // En senare grind gör alla tidigare passerade.
  await expect(projektrad(page, /^36037 Växjö/)).toContainText("12 av 16 grindar passerade");

  await gaTill(page, "Översikt");
  await expect(page.getByRole("region", { name: "Aktivitet" })).toContainText("G11 passerad");
});

test("antaget startdatum är markerat tills någon anger det", async ({ page }) => {
  const plan = page.getByRole("region", { name: "Projektets datum" });
  await expect(plan.getByText("Antagande", { exact: true })).toBeVisible();
  const falt = plan.getByLabel("Startdatum för Växjö Batteripark");
  await falt.fill("2026-02-09");
  await falt.press("Enter");
  await expect(plan.getByText("Antagande", { exact: true })).toHaveCount(0);
});

test("en ledtid markeras klar i förväg och går att ångra", async ({ page }) => {
  await oppnaRef(page, "epc-ledtider");
  const tabell = page.getByRole("region", { name: "Ledtider för projektet" });
  const forsta = tabell.locator("tbody tr").filter({ has: page.getByRole("button", { name: /^Klar/ }) }).first();
  const arende = (await forsta.locator("td").first().locator("b").textContent()).trim();
  await forsta.getByRole("button", { name: /^Klar/ }).click();

  const raden = tabell.locator("tbody tr").filter({ hasText: arende });
  await expect(raden.getByRole("button", { name: /^Ångra/ })).toBeVisible();
  await raden.getByRole("button", { name: /^Ångra/ }).click();
  await expect(raden.getByRole("button", { name: /^Klar/ })).toBeVisible();
});

test("Gantt-schemats momentmeny öppnar fasen i guiden", async ({ page }) => {
  await gaTill(page, "Översikt");
  await page.getByRole("button", { name: /^Moment 12 Anslutning BESS/ }).click();
  await page.getByRole("group", { name: /^Moment 12 .*veckor och status/ }).getByRole("button", { name: "Öppna i guiden" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(KAPITEL);
  await expect(page.locator("#fas-12")).toHaveAttribute("open", "");
});

test("kommandopaletten hittar en kontrollpunkt och öppnar den", async ({ page }) => {
  await gaTill(page, "Översikt");
  await page.keyboard.press("Control+k");
  const sok = page.getByRole("combobox", { name: "Sök och hoppa" });
  await sok.fill("§ 28-anmälan");
  await sok.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(KAPITEL);
  await expect(page.locator("#fas-2")).toHaveAttribute("open", "");
  await expect(rad(page, "2.8")).toBeInViewport();
});

test("kapitlet renderar utan konsolfel", async ({ page }) => {
  const { fel } = await oppna(page, KAPITEL);
  await page.getByRole("button", { name: "Fäll ut alla" }).click();
  await expect(page.locator("details.epc-fas[open]")).toHaveCount(16);
  utanKonsolfel(fel);
});
