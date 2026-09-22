import { expect } from "@playwright/test";

/** Går till appen och väntar tills skalet är uppritat. */
export async function oppna(page, vy) {
  const fel = [];
  page.on("console", (m) => {
    if (m.type() === "error") fel.push(m.text());
  });
  page.on("pageerror", (e) => fel.push(String(e)));

  await page.goto("/");
  /* Egen, längre budget bara här. Bygget är en enda självbärande fil på
     knappt 900 kB — ett medvetet arkitekturval — och på emulerad mobil-CPU
     med flera workers igång hinner den inte parsas på standardens fem
     sekunder. Övriga assertions behåller den korta gränsen, så riktiga fel
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
