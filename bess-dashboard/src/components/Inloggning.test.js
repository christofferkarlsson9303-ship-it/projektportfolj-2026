import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const auth = { status: "utloggad", epost: "", tillaten: false, skickaLank: vi.fn(), loggaInMedGoogle: vi.fn(), loggaUt: vi.fn() };
vi.mock("../state/hooks.js", () => ({ useAuth: () => auth }));

const { Inloggning } = await import("./Inloggning.jsx");

describe("Inloggning", () => {
  it("erbjuder Google och e-postlänk för den som är utloggad", () => {
    const html = renderToStaticMarkup(createElement(Inloggning));
    expect(html).toContain("Logga in med Google");
    expect(html).toContain("Skicka inloggningslänk");
    // Google kommer först, e-posten är alternativet.
    expect(html.indexOf("Logga in med Google")).toBeLessThan(html.indexOf("Skicka inloggningslänk"));
  });

  it("visar avvisning, inte inloggningsval, för en inloggad adress som saknar behörighet", () => {
    Object.assign(auth, { status: "inloggad", epost: "nagon@gmail.com", tillaten: false });
    const html = renderToStaticMarkup(createElement(Inloggning));
    expect(html).toContain("har inte behörighet");
    expect(html).not.toContain("Logga in med Google");
  });
});
