import { defineConfig, devices } from "@playwright/test";

/* Playwright kör mot PRODUKTIONSBYGGET, inte dev-servern.

   Dev-servern kompilerar moduler på begäran. När sviten växte förbi
   hundra tester började enskilda tester slå i 30-sekundersgränsen under
   full parallellkörning — de passerade isolerat men föll i mängden, och
   nästan alltid på mobilprojektet som kör sist. Det var inte fel i koden
   utan i hur den serverades.

   Med `vite build` följt av `vite preview` är allt färdigkompilerat innan
   första testet startar. Vi testar dessutom exakt den singlefile-artefakt
   som deployas till Vercel, inte en dev-variant av den.

   Porten är 4173 (previews standard) och inte 5173 med flit: kör du
   `npm run dev` i en egen terminal ska den inte plockas upp av misstag
   och tysta bort poängen med det här. */

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.resultat",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: "http://localhost:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    locale: "sv-SE",
    timezoneId: "Europe/Stockholm",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // Sidomenyn fälls in under 980 px och tabellerna blir kort under 640 px —
    // båda brytpunkterna behöver testas, inte bara desktop.
    { name: "mobil", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    // Bygget ingår med flit: testen ska aldrig köra mot en gammal dist/.
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    /* Aldrig återanvända. Med återanvändning hoppas bygget över om en
       preview-server råkar stå kvar, och då körs sviten tyst mot en gammal
       dist/ — ett fel som inte syns någonstans. Med strictPort failar
       starten högljutt i stället om porten är upptagen. */
    reuseExistingServer: false,
    // Bygget tar några sekunder och ska hinna klart innan första testet.
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
