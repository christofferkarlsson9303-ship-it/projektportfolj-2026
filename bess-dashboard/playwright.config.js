import { defineConfig, devices } from "@playwright/test";

/* Playwright startar dev-servern själv (webServer nedan), så det räcker att
   köra `npm run e2e`. Kör du redan `npm run dev` i en egen terminal återanvänds
   den servern i stället för att en andra startas. */

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.resultat",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: "http://localhost:5173",
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
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 90_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
