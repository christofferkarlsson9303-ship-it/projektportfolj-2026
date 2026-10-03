import { describe, expect, it } from "vitest";
import { harBatchCKontrakt, kontraktsText } from "./kontraktsgrund.js";

describe("kontraktsgrund", () => {
  it("känner igen Batch C-projekten", () => {
    expect(harBatchCKontrakt("36037")).toBe(true);
    expect(harBatchCKontrakt("36038")).toBe(true);
  });

  it("påstår inte att mallvillkor gäller ett nytt projekts kontrakt", () => {
    expect(harBatchCKontrakt("projekt-abc")).toBe(false);
    expect(kontraktsText("projekt-abc", "Kontraktets plan", "Standardmall")).toBe("Standardmall");
    expect(kontraktsText("36037", "Kontraktets plan", "Standardmall")).toBe("Kontraktets plan");
  });
});
