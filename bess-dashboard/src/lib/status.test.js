import { describe, expect, it } from "vitest";
import { registerStatus, tonFor } from "./status.js";

describe("registerStatus", () => {
  it("ger ton och text för registrens statusnycklar", () => {
    expect(registerStatus("fakturerad")).toEqual({ ton: "ok", label: "Fakturerad" });
    expect(registerStatus("skickad")).toEqual({ ton: "warn", label: "Skickad" });
    expect(registerStatus("utkast")).toEqual({ ton: "neutral", label: "Utkast" });
  });

  it("visar en okänd nyckel som den är, i neutral ton", () => {
    expect(registerStatus("nagot_nytt")).toEqual({ ton: "neutral", label: "nagot_nytt" });
  });
});

describe("tonFor", () => {
  it("slår upp designsystemets statusar och släpper igenom toner", () => {
    expect(tonFor("forsenad")).toBe("bad");
    expect(tonFor("warn")).toBe("warn");
    expect(tonFor("okand")).toBe("neutral");
  });
});
