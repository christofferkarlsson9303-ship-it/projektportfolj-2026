// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppFelgrans } from "./Felgrans.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Kastar() {
  throw new Error("trasigt datalager");
}

let rot, behallare;
afterEach(() => {
  act(() => rot?.unmount());
  behallare?.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

function rita(barn) {
  behallare = document.createElement("div");
  document.body.append(behallare);
  rot = createRoot(behallare);
  act(() => rot.render(h(AppFelgrans, null, barn)));
}

describe("AppFelgrans", () => {
  it("visar omladdning i stället för en vit sida när något utanför vyn kastar", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rita(h(Kastar));
    expect(behallare.textContent).toContain("Appen stötte på ett fel");
    expect(behallare.textContent).toContain("trasigt datalager");
    expect(behallare.querySelector("button").textContent).toBe("Ladda om");
    expect(behallare.textContent).not.toContain("Spara lokal kopia");
  });

  it("erbjuder den lokala kopian när det finns en", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("batchc-portfolj-v1", "{}");
    rita(h(Kastar));
    expect(behallare.textContent).toContain("Spara lokal kopia");
  });

  it("släpper igenom barnen när inget är fel", () => {
    rita(h("p", null, "allt väl"));
    expect(behallare.textContent).toBe("allt väl");
  });
});
