import { expect } from "@playwright/test";

/** Går till appen och väntar tills skalet är uppritat. */
export async function oppna(page, vy) {
  const fel = [];
  page.on("console", (m) => {
    if (m.type() === "error") fel.push(m.text());
  });
  page.on("pageerror", (e) => fel.push(String(e)));

  await page.goto("/");
  /* Egen, längre budget bara här. Första JS-delen är ca 1,5 MB (3D, Excel och
     PDF läses först när de behövs), och på emulerad mobil-CPU med flera
     workers igång hinner den inte parsas på standardens fem sekunder. Övriga assertions behåller den korta gränsen, så riktiga fel
     faller fortfarande snabbt. */
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

  if (vy) await gaTill(page, vy);

  return { fel };
}

/** Klickar i huvudmenyn. Öppnar först mobilmenyn om den är infälld.
 *  Vi frågar hamburgaren om aria-expanded i stället för att titta på menyns
 *  synlighet — den är utfälld ur bild med transform och räknas då fortfarande
 *  som "visible" av webbläsaren. */
export async function gaTill(page, namn) {
  const hamburgare = page.getByRole("button", { name: /Öppna menyn|Stäng menyn/ });

  if (await hamburgare.isVisible()) {
    if ((await hamburgare.getAttribute("aria-expanded")) === "false") await hamburgare.click();
  }

  const meny = page.getByRole("navigation", { name: "Huvudmeny" });
  const knapp = meny.getByRole("button", { name: namn, exact: true });
  if (!(await knapp.count())) await meny.getByRole("button", { name: "Visa alla funktioner", exact: true }).click();
  await knapp.click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(namn);
}

/** Kolumnvärden i ordning, från en tabell med angiven tillgänglig etikett. */
export async function kolumnvarden(page, tabellEtikett, kolumnIndex) {
  const rader = page.getByRole("region", { name: tabellEtikett }).locator("tbody tr");
  return rader.evaluateAll(
    (tr, i) => tr.map((r) => (r.children[i]?.textContent || "").trim()),
    kolumnIndex
  );
}

/** Kastar om sidan loggat fel i konsolen — fångar trasiga effekter och
 *  React-varningar som annars bara syns för den som själv tittar. */
export function utanKonsolfel(fel) {
  const relevanta = fel.filter(
    (f) =>
      !/favicon/i.test(f) &&
      !/Download the React DevTools/i.test(f) &&
      !/net::ERR_/i.test(f)
  );
  expect(relevanta, "sidan loggade fel i konsolen").toEqual([]);
}

/** Projektväljaren i toppraden — det enda stället man väljer projekt på. */
export const projektval = (page) => page.getByRole("combobox", { name: "Välj projekt" });

/** Väljer projekt i toppraden. `namn` är text eller regex som matchar alternativets text. */
export async function valjProjekt(page, namn) {
  const val = projektval(page);
  const alternativ = val.locator("option").filter({ hasText: namn });
  await val.selectOption({ value: await alternativ.first().getAttribute("value") });
}

/** Text och värde för det första projekt som inte är valt (portföljalternativet räknas inte). */
export async function annatProjekt(page) {
  const val = projektval(page);
  const aktuellt = await val.inputValue();
  const alt = await val.locator("option").evaluateAll((o) => o.map((x) => ({ v: x.value, t: x.textContent.trim() })));
  const annat = alt.find((a) => a.v !== aktuellt && a.v !== "__alla");
  return annat;
}
