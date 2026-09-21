import { defineConfig } from "vitest/config";

/* Tidszonen låses innan testen laddas. datum.js räknar i lokal tid med flit —
   annars slår nedräkningar fel ett dygn öster om Greenwich — så testen måste
   köra i samma zon som användarna för att betyda något. */
process.env.TZ = "Europe/Stockholm";

export default defineConfig({
  test: {
    // Playwright äger e2e/, Vitest äger src/. Utan detta försöker Vitest
    // köra e2e-specarna och havererar på @playwright/test.
    include: ["src/**/*.test.js"],
    environment: "node",
  },
});
