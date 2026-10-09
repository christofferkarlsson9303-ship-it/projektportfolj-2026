import { expect, test } from "@playwright/test";
import { gaTill, oppna } from "./hjalpare.js";

/* Fliken Projektstart: sex faser. Projektet startar i fas 1 och nästa fas låses
   upp först när allt obligatoriskt i den förra är godkänt. Guidens sidor är
   16 stycken: 1 Projektkort, 2 Avropsacceptans, 3 Projektdirektiv (fas 1),
   4–10 Intressenter till Tillstånd och nätägare (fas 2), 11 HSEQ (fas 3),
   12 cBoP, eBoP och montage och 13 Provning (fas 4), 14 Slutbesiktning (fas 5),
   15 Eftermarknad och garanti (fas 6) och 16 Granska och skapa. */

const SISTA = 16;

async function oppnaProjektstart(page) {
  await gaTill(page, "Projektstart");
}

async function gaTillSteg(page, nummer, titel) {
  const val = page.getByLabel("Välj steg");
  if (await val.isVisible()) await val.selectOption({ label: `${nummer}. ${titel}` });
  else await page.getByRole("navigation", { name: "Stegen i projektstarten" }).getByRole("button", { name: titel }).click();
}

/** Är sidan låst? På mobil en inaktiverad rad i valet, annars en inaktiverad knapp i navigeringen. */
async function forvantaLast(page, nummer, titel, last = true) {
  const val = page.getByLabel("Välj steg");
  if (await val.isVisible()) {
    // Playwright räknar inte en <option> som inaktiverbar, så attributet kontrolleras direkt.
    const rad = val.locator("option", { hasText: new RegExp(`^${nummer}\\. ${titel}`) });
    if (last) await expect(rad).toHaveAttribute("disabled", "");
    else await expect(rad).not.toHaveAttribute("disabled");
    return;
  }
  const knapp = page.getByRole("navigation", { name: "Stegen i projektstarten" }).getByRole("button", { name: titel });
  if (last) await expect(knapp).toBeDisabled();
  else await expect(knapp).toBeEnabled();
}

/** Bockar av alla kontrollpunkter på sidan, grupp för grupp. */
async function bockaAlla(page) {
  const knappar = page.getByRole("button", { name: /^Bocka av alla i / });
  while (await knappar.count()) await knappar.first().click();
}

/** Fyller i de obligatoriska fälten i fas 1. Med `checklista` bockas också alla kontrollpunkter,
 *  och då är fasen godkänd och fas 2 upplåst. */
async function fyllFas1(page, { checklista = true, namn = "Fas-test", nr } = {}) {
  await gaTillSteg(page, 1, "Projektkort");
  await page.getByLabel(/^Projektnamn/).fill(namn);
  if (nr) await page.getByLabel(/^Projektnummer/).fill(nr);
  await page.getByLabel(/^Beställare/).fill("Testkund AB");
  await page.getByLabel(/^Projektnivå/).selectOption("Nivå 2");
  await gaTillSteg(page, 2, "Avropsacceptans");
  await page.locator("#ps-beslut").selectOption("Gå vidare");
  if (checklista) await bockaAlla(page);
  await gaTillSteg(page, 3, "Projektdirektiv");
  await page.getByLabel(/^Mål/).fill("Ett mätbart mål");
  await page.getByLabel(/^Vad får ge vika/).selectOption("Kostnad");
}

test("projektet startar i fas 1 och senare faser är låsta", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await expect(page.getByText(/ONE-P · Fas 1 av 6 · Steg 1 av 16/)).toBeVisible();
  await expect(page.getByText("Projektstatus:")).toContainText("Anbud");

  const faser = page.getByRole("list", { name: "Faser i projektet" });
  await expect(faser.getByRole("listitem")).toHaveCount(6);
  await expect(faser.getByRole("listitem").nth(0)).toHaveAttribute("aria-current", "step");

  // Sidor i fas 2–6 är låsta, sidor i fas 1 och den sista sidan är öppna.
  await forvantaLast(page, 4, "Intressenter");
  await forvantaLast(page, 7, "Riskregister");
  await forvantaLast(page, 11, "HSEQ och etablering");
  await forvantaLast(page, 15, "Eftermarknad och garanti");
  await forvantaLast(page, 2, "Avropsacceptans", false);
  await forvantaLast(page, SISTA, "Granska och skapa", false);

  // Det som återstår för att låsa upp fas 2 står överst.
  await expect(page.getByText(/Fas 1 · Anbud: \d+ obligatoriska punkter kvar för att låsa upp Fas 2 \(Planering\)/)).toBeVisible();

  // Från sista sidan i fas 1 går man inte vidare till fas 2.
  await gaTillSteg(page, 3, "Projektdirektiv");
  await expect(page.getByRole("button", { name: "Nästa" })).toBeDisabled();
  expect(fel).toEqual([]);
});

test("fas 2 låses upp först när allt obligatoriskt i fas 1 är godkänt", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");

  // Bara fälten räcker inte. De kritiska kontrollpunkterna ska också vara bockade.
  await fyllFas1(page, { checklista: false });
  await expect(page.getByText(/ONE-P · Fas 1 av 6/)).toBeVisible();
  await forvantaLast(page, 7, "Riskregister");

  // Ett avropsbeslut som inte är Gå vidare godkänner inte fasen.
  await gaTillSteg(page, 2, "Avropsacceptans");
  await bockaAlla(page);
  await page.locator("#ps-beslut").selectOption("Skjut upp");
  await expect(page.getByText(/ONE-P · Fas 1 av 6/)).toBeVisible();
  await page.locator("#ps-beslut").selectOption("Gå vidare");

  await expect(page.getByText(/ONE-P · Fas 2 av 6/)).toBeVisible();
  await expect(page.getByText("Fas 2 (Planering) är upplåst. Projektets status är nu Planering.")).toBeVisible();
  await expect(page.getByText("Projektstatus:")).toContainText("Planering");
  await forvantaLast(page, 7, "Riskregister", false);
  await forvantaLast(page, 11, "HSEQ och etablering");

  // Att avboka en kritisk punkt i fas 1 låser fas 2 igen.
  await page.getByRole("button", { name: /^Rensa / }).first().click();
  await expect(page.getByText(/ONE-P · Fas 1 av 6/)).toBeVisible();
  await forvantaLast(page, 7, "Riskregister");
  expect(fel).toEqual([]);
});

test("projektet skapas utan att alla faser är genomgångna och startar i sin fas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel(/^Projektnamn/).fill("Kalmar testpark");
  await page.getByLabel(/^Projektnummer/).fill("90077");

  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(page.getByText("1 av 6 · Anbud")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeEnabled();
  await page.getByRole("button", { name: "Skapa projekt" }).click();

  // Obligatoriska fält saknas i fas 1, så PDF:en för inlämning är spärrad och ingen laddas ned.
  await expect(page.getByText(/Projektet är skapat i fas 1 \(Anbud\)\. PDF:en är spärrad tills fas 1 är godkänd/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");

  await oppnaProjektstart(page);
  const projekt = page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90077 Kalmar testpark/ });
  await expect(projekt).toBeVisible();
  await projekt.click();
  await expect(page.getByText(/ONE-P · 90077 Kalmar testpark · Fas 1 av 6/)).toBeVisible();
  expect(fel).toEqual([]);
});

test("PDF för inlämning är spärrad tills en fas är godkänd och omfattar de godkända faserna", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel(/^Projektnamn/).fill("PDF-test");
  await gaTillSteg(page, SISTA, "Granska och skapa");

  const pdf = page.getByRole("button", { name: "Ladda ned PDF" });
  await expect(pdf).toBeDisabled();
  await expect(page.getByText("PDF för inlämning är spärrad: ingen fas är godkänd än")).toBeVisible();
  // Varje sak som återstår är en knapp till sidan där den görs.
  await page.getByRole("button", { name: "Beställare" }).click();
  await expect(page.getByLabel(/^Beställare/)).toBeVisible();

  // Fälten räcker inte. De kritiska kontrollpunkterna i fasen ska också vara bockade.
  await fyllFas1(page, { checklista: false, namn: "PDF-test" });
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(pdf).toBeDisabled();
  await gaTillSteg(page, 2, "Avropsacceptans");
  await bockaAlla(page);

  // Fas 1 är godkänd. Fas 2 är nu aktuell och dess fält är tomma, men det spärrar inte PDF:en.
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(pdf).toBeEnabled();
  await expect(page.getByText(/PDF:en omfattar de godkända faserna\./)).toBeVisible();
  const nedladdning = page.waitForEvent("download");
  await pdf.click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_.*\.pdf$/);
  expect(fel).toEqual([]);
});

test("den sparade projektstarten kan öppnas, ändras och laddas ned igen", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page, { namn: "Sparad start", nr: "90088" });
  await gaTillSteg(page, SISTA, "Granska och skapa");
  const skapad = page.waitForEvent("download");
  await page.getByRole("button", { name: "Skapa projekt" }).click();
  expect((await skapad).suggestedFilename()).toMatch(/^projektstart_90088_.*\.pdf$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");

  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90088 Sparad start\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel(/^Projektnamn/)).toHaveValue("Sparad start");
  await page.getByLabel(/^Projektnamn/).fill("Sparad start 2");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await page.getByRole("button", { name: "Spara ändringar" }).click();

  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_90088_.*\.pdf$/);
  await page.reload();
  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90088 Sparad start 2\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel(/^Projektnamn/)).toHaveValue("Sparad start 2");
  expect(fel).toEqual([]);
});

test("ett befintligt projekt utan sparad start öppnas i sin fas, fylls på och sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByText("Projektet har ingen sparad projektstart")).toBeVisible();
  await expect(page.getByLabel(/^Projektnamn/)).toHaveValue("Växjö Batteripark");

  // Projektet är i produktion, alltså fas 4. Tidigare faser är öppna, avslutet är låst.
  await expect(page.getByText(/ONE-P · 36037 Växjö Batteripark · Fas 4 av 6/)).toBeVisible();
  await forvantaLast(page, 2, "Avropsacceptans", false);
  await forvantaLast(page, 13, "Provning och driftsättning", false);
  await forvantaLast(page, 14, "Slutbesiktning och överlämning");

  await page.getByLabel(/^Beställare/).fill("Ingrid Capacity");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();

  await page.reload();
  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel(/^Beställare/)).toHaveValue("Ingrid Capacity");
  await expect(page.getByText(/Fas 4 av 6/)).toBeVisible();
  expect(fel).toEqual([]);
});

test("ett befintligt projekt öppnas direkt med sin knapp och man kan gå tillbaka till ny projektstart", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  const befintliga = page.getByRole("group", { name: "Befintliga projekt" });
  await befintliga.getByRole("button", { name: /36037 Växjö Batteripark/ }).click();
  await expect(page.getByText("Du ändrar projektstarten för 36037 Växjö Batteripark")).toBeVisible();
  await expect(page.getByLabel(/^Projektnamn/)).toHaveValue("Växjö Batteripark");
  await expect(befintliga.getByRole("button", { name: /36037 Växjö Batteripark/ })).toHaveAttribute("aria-pressed", "true");
  if (process.env.SKARMBILD) await page.screenshot({ path: process.env.SKARMBILD });
  await befintliga.getByRole("button", { name: "Ny projektstart" }).click();
  await expect(page.getByText("Ändra ett befintligt projekt")).toBeVisible();
  await expect(page.getByText(/ONE-P · Fas 1 av 6/)).toBeVisible();
  expect(fel).toEqual([]);
});

test("lägesrapport till ledningen: nuläge och ny risk med fas och kategori sparas och följer med till projektet", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36038 Alvesta Batteripark\s*(· ej ifylld)?$/ }).click();
  await page.getByLabel("Nuläge till ledningen").fill("Kallelse till slutbesiktning skickad.");
  await page.getByLabel("Beslut som behövs från ledningen").fill("Godkänn extra resurs v. 48.");
  await gaTillSteg(page, 7, "Riskregister");
  await page.getByRole("button", { name: "Lägg till rad" }).click();
  const rader = page.getByLabel(/^Risker, rad \d+: Risk$/);
  await rader.last().fill("Ny risk från lägesrapporten");
  // Nya risker får den aktuella fasen som förval, och kategori kan väljas.
  await expect(page.getByLabel(/^Risker, rad \d+: Fas$/).last()).toHaveValue("4");
  await page.getByLabel(/^Risker, rad \d+: Kategori$/).last().selectOption("kma");
  await page.getByLabel(/^Risker, rad \d+: Ägare$/).last().fill("PL");
  await page.getByLabel(/^Risker, rad \d+: Åtgärdsplan$/).last().fill("Bevaka veckovis");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();
  await expect(page.getByText(/1 risk lades till i projektet/)).toBeVisible();
  await expect(page.getByText(/Senast sparad \d{4}-\d{2}-\d{2}/)).toBeVisible();

  const nedladdning = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await nedladdning).suggestedFilename()).toMatch(/\.pdf$/);

  // Sparar man igen läggs risken inte till en gång till.
  await gaTillSteg(page, 1, "Projektkort");
  await page.getByLabel("Nuläge till ledningen").fill("Slutbesiktning bokad.");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await page.getByRole("button", { name: "Spara ändringar" }).click();
  await expect(page.getByText("Projektstarten är sparad och projektkortet uppdaterat.", { exact: true })).toBeVisible();

  // Riskregistret har fått risken.
  await gaTill(page, "Risker");
  await page.getByRole("button", { name: "36038 Alvesta Batteripark" }).click();
  const nyRisk = page.getByText("Ny risk från lägesrapporten").or(page.locator('input[value="Ny risk från lägesrapporten"]'));
  await expect(nyRisk.first()).toBeVisible();
  expect(fel).toEqual([]);
});

test("interaktiv guide: bocka alla, filter och stegstatus uppdateras direkt", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page, { checklista: false });

  await gaTillSteg(page, 2, "Avropsacceptans");
  const oppnaText = page.getByText(/^\d+ öppna/);
  await expect(oppnaText).toBeVisible();
  const bocka = page.getByRole("button", { name: /^Bocka av alla i / }).first();
  await bocka.click();
  await expect(page.getByRole("button", { name: /^Rensa / }).first()).toBeVisible();
  await page.getByLabel("Visa bara öppna").check();
  await page.getByLabel("Visa bara öppna").uncheck();

  // Framdrift och fasstatus finns i huvudet och i navigeringen.
  await expect(page.getByRole("list", { name: "Faser i projektet" })).toBeVisible();
  expect(fel).toEqual([]);
});

test("riskregistret: nivåer, donut och ny rad följer varandra", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page);
  await gaTillSteg(page, 7, "Riskregister");

  const donut = page.getByRole("img", { name: /^Riskfördelning:/ });
  // Tre startrader à 3 × 3 = 9 är alla medel.
  await expect(donut).toHaveAttribute("aria-label", "Riskfördelning: 0 låg, 3 medel, 0 hög");
  await expect(page.getByText("9 riskvärde, medel").first()).toBeVisible();

  // Startraderna hör till fas 4 och har en kategori. Alla sex faser och kategorierna finns att välja.
  await expect(page.getByLabel("Risker, rad 1: Fas")).toHaveValue("4");
  await expect(page.getByLabel("Risker, rad 1: Kategori")).toHaveValue("tid");
  await expect(page.getByLabel("Risker, rad 1: Fas").locator("option")).toHaveCount(6);
  await expect(page.getByLabel("Risker, rad 1: Kategori").locator("option")).toHaveCount(10);

  // 2 × 3 = 6 är låg, 5 × 3 = 15 är hög, och 7 är medel i hela appen.
  await page.getByLabel("Risker, rad 1: Sannolikhet 1–5").selectOption("2");
  await expect(page.getByText("6 riskvärde, låg").first()).toBeVisible();
  await page.getByLabel("Risker, rad 2: Sannolikhet 1–5").selectOption("5");
  await expect(page.getByText("15 riskvärde, hög").first()).toBeVisible();
  await expect(donut).toHaveAttribute("aria-label", "Riskfördelning: 1 låg, 1 medel, 1 hög");

  // Ny rad: får fas 2 (aktuell fas) och fokus i risktexten, och räknas först när den har text.
  await page.getByRole("button", { name: "Lägg till rad" }).click();
  const nyRad = page.getByLabel(/^Risker, rad 4: Risk$/);
  await expect(nyRad).toBeFocused();
  await expect(page.getByLabel("Risker, rad 4: Fas")).toHaveValue("2");
  await expect(donut).toHaveAttribute("aria-label", "Riskfördelning: 1 låg, 1 medel, 1 hög");
  await nyRad.fill("Ny risk");
  await expect(donut).toHaveAttribute("aria-label", "Riskfördelning: 1 låg, 2 medel, 1 hög");

  // Stegindikatorn i headern följer samma steg som navigeringen.
  await expect(page.getByText(/ONE-P · Fas 2 av 6 · Steg 7 av 16/)).toBeVisible();
  await page.getByRole("button", { name: "Nästa" }).click();
  await expect(page.getByText(/ONE-P · Fas 2 av 6 · Steg 8 av 16/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Steg i guiden" })).toHaveAttribute("aria-valuenow", "50");
  expect(fel).toEqual([]);
});
