import { expect, test } from "@playwright/test";
import { gaTill, oppna, utanKonsolfel, valjProjekt } from "./hjalpare.js";

/* Fliken Projektstart: åtta faser. Projektet startar i fas 1 och nästa fas låses
   upp först när allt obligatoriskt i den förra är godkänt. Guidens sidor är
   19 stycken. Fas 1 har två delar: Anbud (1 Projektkort, 2 Avropsacceptans, 3 Anbudsfrågor,
   4 Kontrakt och kassaflöde) och Planering – projektdirektiv (5 Projektdirektiv, 6 Intressenter).
   Sedan 7 Organisation och uppstart, 8 Riskregister, 9 Tidplan, 10 Godkänd lösning, 11 Tillstånd och nätägare (fas 2),
   12 HSEQ (fas 3), 13 Mark och betong (fas 4), 14 Leveranser, lyft och montage (fas 5),
   15 Provning (fas 6), 16 Slutbesiktning (fas 7), 17 Ekonomiskt avslut och 18 Garanti (fas 8)
   och 19 Granska och skapa. */

const SISTA = 19;

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

/** Bockar av kontrollpunkterna på Kontrakt, så att de kritiska punkterna i fas 1 är klara. Organisation och uppstart hör till fas 2. */
async function bockaKontrakt(page) {
  await gaTillSteg(page, 4, "Kontrakt och kassaflöde");
  await bockaAlla(page);
}

/** Fyller i de obligatoriska fälten i fas 1. Med `checklista` bockas också alla kontrollpunkter,
 *  och då är fasen godkänd och fas 2 upplåst. */
async function fyllFas1(page, { checklista = true, namn = "Fas-test", nr, vunnet = true } = {}) {
  await gaTillSteg(page, 1, "Projektkort");
  await page.getByLabel(/^Projektnamn/).fill(namn);
  if (nr) await page.getByLabel(/^Projektnummer/).fill(nr);
  await page.getByLabel(/^Beställare/).fill("Testkund AB");
  await page.getByLabel(/^Projektnivå/).selectOption("Nivå 2");
  await gaTillSteg(page, 2, "Avropsacceptans");
  await page.getByLabel(/^Ersättningsform/).selectOption("Fast pris");
  await page.locator("#ps-beslut").selectOption("Gå vidare");
  if (vunnet) await page.getByLabel("Anbudsutfall", { exact: true }).selectOption("Vunnet anbud");
  if (checklista) await bockaAlla(page);
  // Den fasta frågelistan: varje fråga ska ha ett svar.
  await gaTillSteg(page, 3, "Anbudsfrågor");
  const svar = page.locator('[id^="ps-af_"]');
  for (let i = 0; i < (await svar.count()); i += 1) await svar.nth(i).fill(`Svar ${i + 1}`);
  await gaTillSteg(page, 5, "Projektdirektiv");
  await page.getByLabel(/^Mål/).fill("Ett mätbart mål");
  // Styrparametrarna ska summera till 100 %.
  await page.getByLabel(/^Kostnad \(%\)/).fill("60");
  await page.getByLabel(/^Kvalitet \(%\)/).fill("10");
  await page.getByLabel(/^Tid \(%\)/).fill("30");
  await page.getByLabel(/^Vad får ge vika/).selectOption("Kostnad");
  // Projektdirektivet ska vara signerat av projektledare och intern beställare.
  await page.getByLabel(/^Signerat av projektledare/).fill("PL Test");
  await page.getByLabel(/^Signerat av intern beställare/).fill("Beställare Test");
  await page.getByLabel(/^Signeringsdatum/).fill("2026-10-12");
  // Kontrakt hör också till fas 1. Organisation och uppstart är fas 2 och inget krav för anbudet.
  await gaTillSteg(page, 4, "Kontrakt och kassaflöde");
  await page.getByLabel(/^Betalvillkor/).fill("30 dagar netto");
  await page.locator("#ps-bankgaranti").fill("10 % i original");
  await page.getByLabel("Milstolpar, rad 1: Datum").fill("2027-01-15");
  if (checklista) await bockaAlla(page);
}

test("projektet startar i fas 1 och senare faser är låsta", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await expect(page.getByText(/ONE-P · Fas 1 av 8 · Steg 1 av 19/)).toBeVisible();
  await expect(page.getByText("Projektstatus:")).toContainText("Planering och uppstart");

  const faser = page.getByRole("list", { name: "Faser i projektet" });
  await expect(faser.getByRole("listitem")).toHaveCount(8);
  await expect(faser.getByRole("listitem").nth(0)).toHaveAttribute("aria-current", "step");

  // Sidor i fas 2–8 är låsta, sidor i fas 1 och den sista sidan är öppna.
  await forvantaLast(page, 6, "Intressenter", false);
  await forvantaLast(page, 4, "Kontrakt och kassaflöde", false);
  // Organisation och uppstart hör till fas 2: låst under anbudet.
  await forvantaLast(page, 7, "Organisation och uppstart");
  await forvantaLast(page, 8, "Riskregister");
  await forvantaLast(page, 12, "HSEQ och etablering");
  await forvantaLast(page, 18, "Eftermarknad och garanti");
  await forvantaLast(page, 2, "Avropsacceptans", false);
  await forvantaLast(page, SISTA, "Granska och skapa", false);

  // Fas 1 är stor och delas i två delar med egen räknare i navigeringen (bara synlig i bred vy).
  const nav = page.getByRole("navigation", { name: "Stegen i projektstarten" });
  if (await nav.getByRole("button", { name: "Projektkort" }).isVisible()) {
    await expect(nav.getByText("Anbud", { exact: true })).toBeVisible();
    await expect(nav.getByText("Planering – projektdirektiv", { exact: true })).toBeVisible();
  }
  await expect(page.getByText(/Utkastet sparas automatiskt i den här webbläsaren/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Gå till Granska och skapa" })).toBeVisible();

  // Det som återstår för att låsa upp fas 2 står överst.
  await expect(page.getByText(/Fas 1 · Anbud: \d+ obligatoriska punkter kvar för att låsa upp Fas 2 \(Planering\)/)).toBeVisible();

  // Från sista sidan i fas 1 går man inte vidare till fas 2.
  await gaTillSteg(page, 6, "Intressenter");
  await expect(page.getByRole("button", { name: "Nästa" })).toBeDisabled();
  utanKonsolfel(fel);
});

test("fas 2 låses upp först när allt obligatoriskt i fas 1 är godkänt", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");

  // Bara fälten räcker inte. De kritiska kontrollpunkterna ska också vara bockade.
  await fyllFas1(page, { checklista: false });
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await forvantaLast(page, 8, "Riskregister");

  await bockaKontrakt(page);

  // Ett avropsbeslut som inte är Gå vidare godkänner inte fasen.
  await gaTillSteg(page, 2, "Avropsacceptans");
  await bockaAlla(page);
  await page.locator("#ps-beslut").selectOption("Skjut upp");
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await page.locator("#ps-beslut").selectOption("Gå vidare");

  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();
  await expect(page.getByText("Fas 2 (Planering) är upplåst. Projektets status är nu Planering och uppstart.")).toBeVisible();
  await expect(page.getByText("Projektstatus:")).toContainText("Planering och uppstart");
  await forvantaLast(page, 8, "Riskregister", false);
  await forvantaLast(page, 12, "HSEQ och etablering");

  // Att avboka en kritisk punkt i fas 1 låser fas 2 igen.
  await page.getByRole("button", { name: /^Rensa / }).first().click();
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await forvantaLast(page, 8, "Riskregister");
  utanKonsolfel(fel);
});

test("projektet skapas utan att alla faser är genomgångna och startar i sin fas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByLabel(/^Projektnamn/).fill("Kalmar testpark");
  await page.getByLabel(/^Projektnummer/).fill("90077");

  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(page.getByText("1 av 8 · Anbud")).toBeVisible();
  await expect(page.getByRole("button", { name: "Skapa projekt" })).toBeEnabled();
  await page.getByRole("button", { name: "Skapa projekt" }).click();

  // Obligatoriska fält saknas i fas 1, så ingen PDF laddas ned automatiskt (den går att ladda ned som utkast för hand).
  await expect(page.getByText(/Projektet är skapat i fas 1 \(Anbud\)\. PDF:en märks utkast tills fas 1 är godkänd, och går att ladda ned när du vill/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Min projektmetod");

  await oppnaProjektstart(page);
  const projekt = page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^90077 Kalmar testpark/ });
  await expect(projekt).toBeVisible();
  await projekt.click();
  await expect(page.getByText(/ONE-P · 90077 Kalmar testpark · Fas 1 av 8/)).toBeVisible();
  utanKonsolfel(fel);
});

test("PDF:en går att ladda ned som utkast under anbudet och växer med de upplåsta faserna", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  const pdf = page.getByRole("button", { name: "Ladda ned PDF" });

  // Utan projektnamn finns inget att visa.
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(pdf).toBeDisabled();

  await gaTillSteg(page, 1, "Projektkort");
  await page.getByLabel(/^Projektnamn/).fill("PDF-test");
  await gaTillSteg(page, SISTA, "Granska och skapa");

  // Fas 1 är inte godkänd, men PDF:en är inte spärrad: den märks utkast, för genomgång med ledningen.
  await expect(pdf).toBeEnabled();
  await expect(page.getByText(/PDF:en är ett utkast tills fas 1 \(Anbud\) är godkänd/)).toBeVisible();
  // Varje sak som återstår är en knapp till sidan där den görs.
  await page.getByRole("button", { name: "Beställare", exact: true }).click();
  await expect(page.getByLabel(/^Beställare/)).toBeVisible();
  await gaTillSteg(page, SISTA, "Granska och skapa");
  const utkast = page.waitForEvent("download");
  await pdf.click();
  expect((await utkast).suggestedFilename()).toMatch(/^projektstart_.*\.pdf$/);

  // Fälten räcker inte för att godkänna fas 1. De kritiska kontrollpunkterna ska också vara bockade.
  await fyllFas1(page, { checklista: false, namn: "PDF-test" });
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(page.getByText(/PDF:en är ett utkast tills fas 1/)).toBeVisible();
  await bockaKontrakt(page);
  await gaTillSteg(page, 2, "Avropsacceptans");
  await bockaAlla(page);

  // Fas 1 är godkänd. Fas 2 är nu aktuell och upplåst: PDF:en omfattar den, märkt utkast tills fas 2 är godkänd.
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(pdf).toBeEnabled();
  await expect(page.getByText(/PDF:en är ett utkast tills fas 2 \(Planering\) är godkänd/)).toBeVisible();
  await expect(page.getByText(/PDF:en omfattar de upplåsta faserna/)).toBeVisible();
  const nedladdning = page.waitForEvent("download");
  await pdf.click();
  expect((await nedladdning).suggestedFilename()).toMatch(/^projektstart_.*\.pdf$/);
  utanKonsolfel(fel);
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
  utanKonsolfel(fel);
});

test("ett befintligt projekt utan sparad start öppnas i sin fas, fylls på och sparas", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByText("Projektet har ingen sparad projektstart")).toBeVisible();
  await expect(page.getByLabel(/^Projektnamn/)).toHaveValue("Växjö Batteripark");

  // Projektets fas räknas ur EPC-checklistan (antagande): fas 5, montage. Tidigare faser är öppna, provning och avslut är låsta.
  await expect(page.getByText(/ONE-P · 36037 Växjö Batteripark · Fas 5 av 8/)).toBeVisible();
  await forvantaLast(page, 2, "Avropsacceptans", false);
  await forvantaLast(page, 13, "Mark och betong", false);
  await forvantaLast(page, 15, "Provning och driftsättning");
  await forvantaLast(page, 16, "Slutbesiktning och överlämning");

  await page.getByLabel(/^Beställare/).fill("Ingrid Capacity");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await page.getByRole("button", { name: "Spara projektstart" }).click();

  await page.reload();
  await oppnaProjektstart(page);
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36037 Växjö Batteripark\s*(· ej ifylld)?$/ }).click();
  await expect(page.getByLabel(/^Beställare/)).toHaveValue("Ingrid Capacity");
  await expect(page.getByText(/Fas 5 av 8/)).toBeVisible();
  utanKonsolfel(fel);
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
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  utanKonsolfel(fel);
});

test("lägesrapport till ledningen: nuläge och ny risk med fas och kategori sparas och följer med till projektet", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await page.getByRole("group", { name: "Befintliga projekt" }).getByRole("button", { name: /^36038 Alvesta Batteripark\s*(· ej ifylld)?$/ }).click();
  await page.getByLabel("Nuläge till ledningen").fill("Kallelse till slutbesiktning skickad.");
  await page.getByLabel("Beslut som behövs från ledningen").fill("Godkänn extra resurs v. 48.");
  await gaTillSteg(page, 8, "Riskregister");
  await page.getByRole("button", { name: "Lägg till rad" }).click();
  const rader = page.getByLabel(/^Risker, rad \d+: Risk$/);
  await rader.last().fill("Ny risk från lägesrapporten");
  // Nya risker får den aktuella fasen som förval, och kategori kan väljas.
  await expect(page.getByLabel(/^Risker, rad \d+: Fas$/).last()).toHaveValue("5");
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
  await valjProjekt(page, "36038 Alvesta Batteripark");
  const nyRisk = page.getByText("Ny risk från lägesrapporten").or(page.locator('input[value="Ny risk från lägesrapporten"]'));
  await expect(nyRisk.first()).toBeVisible();
  utanKonsolfel(fel);
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
  utanKonsolfel(fel);
});

test("riskregistret: nivåer, donut och ny rad följer varandra", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page);
  await gaTillSteg(page, 8, "Riskregister");

  const donut = page.getByRole("img", { name: /^Riskfördelning:/ });
  // Tre startrader à 3 × 3 = 9 är alla medel.
  await expect(donut).toHaveAttribute("aria-label", "Riskfördelning: 0 låg, 3 medel, 0 hög");
  await expect(page.getByText("9 riskvärde, medel").first()).toBeVisible();

  // Startraderna hör till fas 4 och har en kategori. Alla åtta faser och kategorierna finns att välja.
  await expect(page.getByLabel("Risker, rad 1: Fas")).toHaveValue("4");
  await expect(page.getByLabel("Risker, rad 1: Kategori")).toHaveValue("tid");
  await expect(page.getByLabel("Risker, rad 1: Fas").locator("option")).toHaveCount(8);
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
  await expect(page.getByText(/ONE-P · Fas 2 av 8 · Steg 8 av 19/)).toBeVisible();
  await page.getByRole("button", { name: "Nästa" }).click();
  await expect(page.getByText(/ONE-P · Fas 2 av 8 · Steg 9 av 19/)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Steg i guiden" })).toHaveAttribute("aria-valuenow", "47");
  utanKonsolfel(fel);
});

test("sista sidan visar alla åtta faser med status, och Öppna är låst för låsta faser", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  const faser = page.getByRole("region", { name: "Faserna" });
  await expect(faser.getByRole("listitem")).toHaveCount(8);
  await expect(faser.getByRole("listitem").nth(0)).toContainText("Pågår");
  await expect(faser.getByRole("listitem").nth(1)).toContainText("Låst");
  await expect(faser.getByRole("listitem").nth(1).getByRole("button", { name: "Öppna" })).toBeDisabled();

  // Öppna går till fasens första sida.
  await faser.getByRole("listitem").nth(0).getByRole("button", { name: "Öppna" }).click();
  await expect(page.getByRole("heading", { name: "1. Projektkort" })).toBeVisible();

  // Efter att fas 1 är godkänd är fas 2 upplåst och går att öppna härifrån.
  await fyllFas1(page);
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(faser.getByRole("listitem").nth(0)).toContainText("Godkänd");
  await expect(faser.getByRole("listitem").nth(1)).toContainText("Pågår");
  await faser.getByRole("listitem").nth(1).getByRole("button", { name: "Öppna" }).click();
  // Fas 2 öppnas på dess första sida, Organisation och uppstart.
  await expect(page.getByRole("heading", { name: "7. Organisation och uppstart" })).toBeVisible();
  utanKonsolfel(fel);
});

test("projektkorten i översikten visar projektets fas", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  // Växjö och Alvesta är i produktion; fasen räknas ur EPC-checklistan (antagande), nu fas 5.
  await expect(page.getByText("Fas 5 av 8 · Montage").first()).toBeVisible();
  utanKonsolfel(fel);
});

test("projektkortet öppnar projektstarten för sitt projekt", async ({ page }) => {
  const { fel } = await oppna(page, "Översikt");
  await page.getByRole("button", { name: "Öppna projektstart för Växjö Batteripark" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projektstart");
  await expect(page.getByText("Du ändrar projektstarten för 36037 Växjö Batteripark")).toBeVisible();
  await expect(page.getByText(/ONE-P · 36037 Växjö Batteripark · Fas 5 av 8/)).toBeVisible();

  // Öppnar man fliken på vanligt sätt (via en annan vy) är det fortfarande en ny projektstart.
  await gaTill(page, "Översikt");
  await oppnaProjektstart(page);
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  utanKonsolfel(fel);
});

test("projektledarens trafikljus per fas sparas i utkastet och finns bara för upplåsta faser", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  const faser = page.getByRole("region", { name: "Faserna" });
  await expect(faser.getByRole("group", { name: "Trafikljus för fas 1" })).toBeVisible();
  await expect(faser.getByRole("group", { name: "Trafikljus för fas 2" })).toHaveCount(0);

  const ljus = faser.getByRole("group", { name: "Trafikljus för fas 1" });
  await ljus.getByRole("button", { name: "Röd" }).click();
  await expect(ljus.getByRole("button", { name: "Röd" })).toHaveAttribute("aria-pressed", "true");
  await faser.getByLabel("Kommentar till trafikljuset för fas 1").fill("Behöver beslut om leverantör");

  await page.reload();
  await oppnaProjektstart(page);
  await gaTillSteg(page, SISTA, "Granska och skapa");
  await expect(faser.getByRole("group", { name: "Trafikljus för fas 1" }).getByRole("button", { name: "Röd" })).toHaveAttribute("aria-pressed", "true");
  await expect(faser.getByLabel("Kommentar till trafikljuset för fas 1")).toHaveValue("Behöver beslut om leverantör");

  // Samma val igen rensar trafikljuset.
  await faser.getByRole("group", { name: "Trafikljus för fas 1" }).getByRole("button", { name: "Röd" }).click();
  await expect(faser.getByLabel("Kommentar till trafikljuset för fas 1")).toHaveCount(0);
  utanKonsolfel(fel);
});

test("direktivet måste signeras, och uppstartsavstämning och interface-lista (båda fas 2) finns", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page);
  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();

  // Tar man bort signeringen låses fas 2 igen.
  await gaTillSteg(page, 5, "Projektdirektiv");
  await page.getByLabel(/^Signerat av intern beställare/).fill("");
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await page.getByLabel(/^Signerat av intern beställare/).fill("Beställare Test");
  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();

  await gaTillSteg(page, 7, "Organisation och uppstart");
  await expect(page.getByRole("region", { name: "Uppstartsavstämning: Före startmötet" })).toBeVisible();
  await expect(page.getByLabel("Uppstartsavstämningen är genomförd med intern beställare före startmötet")).toBeVisible();

  await gaTillSteg(page, 10, "Godkänd lösning");
  await expect(page.getByRole("region", { name: "Interface-lista" })).toBeVisible();
  await expect(page.getByLabel(/^Interface-lista, rad \d+: Gränssnitt$/)).toHaveCount(5);
  utanKonsolfel(fel);
});



test("anbudsgenomgång stannar i fas 1 tills anbudet är vunnet", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page, { vunnet: false, namn: "Anbudsgenomgång" });
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await forvantaLast(page, 7, "Organisation och uppstart");
  await gaTillSteg(page, 5, "Projektdirektiv");
  await page.getByLabel("Identifierade risker", { exact: true }).fill("Leveransfönstret måste bekräftas.");
  await page.getByLabel("Övergripande tidplan och kontraktsdatum").fill("Anbud i oktober, tilldelning i december.");
  await page.getByLabel("HSEQ och BAS-U", { exact: true }).fill("BAS-U-ansvar planeras efter kontrakt.");
  await page.getByLabel("Risker, rad 1: Risk", { exact: true }).fill("Gemensam risk från anbudet");
  await gaTillSteg(page, SISTA, "Granska och skapa");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ned PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await gaTillSteg(page, 2, "Avropsacceptans");
  await page.getByLabel("Anbudsutfall", { exact: true }).selectOption("Anbud inlämnat");
  await forvantaLast(page, 7, "Organisation och uppstart");
  await page.getByLabel("Anbudsutfall", { exact: true }).selectOption("Vunnet anbud");
  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();
  await gaTillSteg(page, 8, "Riskregister");
  await expect(page.getByLabel("Risker, rad 1: Risk", { exact: true })).toHaveValue("Gemensam risk från anbudet");
  utanKonsolfel(fel);
});

test("styrparametertriangeln visar summan och fas 1 kräver 100 %", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await fyllFas1(page);
  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();
  await gaTillSteg(page, 5, "Projektdirektiv");
  const triangel = page.getByRole("region", { name: "Styrparametrar: kostnad, kvalitet och tid" });
  await expect(triangel.getByText("Summa 100 %")).toBeVisible();
  await page.getByLabel(/^Tid \(%\)/).fill("20");
  await expect(triangel.getByText("Summa 90 % – ska vara 100 %")).toBeVisible();
  await expect(page.getByText(/ONE-P · Fas 1 av 8/)).toBeVisible();
  await page.getByLabel(/^Tid \(%\)/).fill("30");
  await expect(page.getByText(/ONE-P · Fas 2 av 8/)).toBeVisible();
  if (process.env.PDF_UT) {
    await gaTillSteg(page, SISTA, "Granska och skapa");
    const d = page.waitForEvent("download");
    await page.getByRole("button", { name: "Ladda ned PDF" }).click();
    await (await d).saveAs(process.env.PDF_UT);
  }
  utanKonsolfel(fel);
});

test("anbudsfrågorna har trafikljus och anbudshjulet ger domen", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await gaTillSteg(page, 3, "Anbudsfrågor");
  await expect(page.getByText("12 av 12 frågor är inte bedömda.")).toBeVisible();
  const forsta = page.getByRole("group", { name: "Trafikljus: Vad bygger vi – och vad bygger vi inte?" });
  await forsta.getByRole("button", { name: "Gul" }).click();
  await expect(forsta.getByRole("button", { name: "Gul" })).toHaveAttribute("aria-pressed", "true");
  const andra = page.getByRole("group", { name: "Trafikljus: Är avtalet tuffare än vanligt?" });
  await andra.getByRole("button", { name: "Röd" }).click();
  await expect(page.getByText("1 röd: ledningen måste ta ställning innan anbudet lämnas.")).toBeVisible();
  // Samma val igen tar bort bedömningen.
  await andra.getByRole("button", { name: "Röd" }).click();
  await expect(page.getByText("11 av 12 frågor är inte bedömda.")).toBeVisible();
  // Svaret är fortfarande det obligatoriska fältet, med frågan som etikett.
  await page.getByLabel(/^Vad ingår i uppdraget/).fill("Allt utom nätanslutningen.");
  await expect(page.locator("#ps-af_omfattning")).toHaveValue("Allt utom nätanslutningen.");
  utanKonsolfel(fel);
});

test("riskmatrisen sätter ljuset, hjulet filtrerar och kortets val följer med", async ({ page }) => {
  const { fel } = await oppna(page, "Projektstart");
  await gaTillSteg(page, 3, "Anbudsfrågor");
  const matris = page.getByRole("region", { name: "Riskmatris" });

  // Klicka på frågan och sedan på rutan: hög sannolikhet, hög konsekvens blir röd.
  await matris.getByRole("button", { name: "2. Är avtalet tuffare än vanligt?" }).click();
  await matris.getByRole("button", { name: /sannolikhet hög, konsekvens hög \(Röd\)/ }).click();
  const andra = page.getByRole("group", { name: "Trafikljus: Är avtalet tuffare än vanligt?" });
  await expect(andra.getByRole("button", { name: "Röd" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 röd: ledningen måste ta ställning innan anbudet lämnas.")).toBeVisible();

  // Dra-och-släpp: fråga 1 till låg/låg blir grön.
  await matris.getByRole("button", { name: "1. Vad bygger vi – och vad bygger vi inte?" }).dragTo(matris.getByRole("button", { name: /sannolikhet låg, konsekvens låg/ }).locator(".."));
  const forsta = page.getByRole("group", { name: "Trafikljus: Vad bygger vi – och vad bygger vi inte?" });
  await expect(forsta.getByRole("button", { name: "Grön" })).toHaveAttribute("aria-pressed", "true");

  // Kortets val flyttar frågan i matrisen: medel/medel blir gul.
  const kort = page.locator("#af-kort-omfattning");
  await kort.getByLabel("Sannolikhet").selectOption("2");
  await kort.getByLabel("Konsekvens").selectOption("2");
  await expect(forsta.getByRole("button", { name: "Gul" })).toHaveAttribute("aria-pressed", "true");

  // Hjulet filtrerar listan.
  const filter = page.getByRole("group", { name: "Filtrera frågorna" });
  await filter.getByRole("button", { name: "1 röd" }).click();
  await expect(page.getByText("Visar 1 av 12 frågor.")).toBeVisible();
  await expect(page.locator("[id^=af-kort-]")).toHaveCount(1);
  await filter.getByRole("button", { name: "1 röd" }).click();
  await expect(page.locator("[id^=af-kort-]")).toHaveCount(12);

  // Ändrat ljus för hand visas som avvikelse från matrisen.
  await andra.getByRole("button", { name: "Gul" }).click();
  await expect(page.locator("#af-kort-villkor")).toContainText("Avviker från matrisen (Röd)");
  utanKonsolfel(fel);
});
