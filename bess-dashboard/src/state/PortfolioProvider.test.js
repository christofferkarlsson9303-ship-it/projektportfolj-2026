// @vitest-environment jsdom
/* Delat läge med två användare: A kör appen (PortfolioProvider), B skriver
   direkt i den falska databasen. Återskapar de fel som bara syns när flera
   arbetar samtidigt — e2e-testen kör i lokalt läge och ser dem aldrig. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h, useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";

const falsk = await vi.hoisted(async () => {
  const { skapaFalskSupabase } = await import("../test/falskSupabase.js");
  return skapaFalskSupabase();
});

vi.mock("../lib/supabase.js", () => ({ supabase: falsk.klient, KONFIGURERAD: true }));

const { PortfolioProvider, CONFIG } = await import("./PortfolioProvider.jsx");
const { PortfolioContext, UiContext } = await import("./kontexter.js");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STATE = "portfolj/state";
const EKONOMI = "portfolj/ekonomi";

let api = null;
let root = null;
const toaster = [];

function Fanga() {
  const v = useContext(PortfolioContext);
  useEffect(() => {
    api = v;
  });
  return null;
}

async function vantaTills(villkor, ms = 2000) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) {
    let ok = false;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    try {
      ok = !!villkor();
    } catch {
      ok = false;
    }
    if (ok) return;
  }
  throw new Error("villkoret uppfylldes aldrig: " + villkor.toString());
}

async function montera() {
  const div = document.createElement("div");
  document.body.append(div);
  root = createRoot(div);
  await act(async () => {
    root.render(
      h(
        UiContext.Provider,
        { value: { visaToast: (txt) => toaster.push(txt) } },
        h(PortfolioProvider, null, h("main", null, h("input", { id: "falt" }), h(Fanga)))
      )
    );
  });
  await vantaTills(() => falsk.appState.has(STATE) && falsk.appState.has(EKONOMI) && api.conn.txt.startsWith("Delad"));
}

/** B ändrar ett fält på en rad i portföljdokumentet. */
function bAndrar(lista, id, falt, varde) {
  const v = structuredClone(falsk.appState.get(STATE).value);
  v[lista].find((r) => r.id === id)[falt] = varde;
  falsk.annanSkriver(STATE, v);
}

const iDb = (lista, id) => falsk.appState.get(STATE).value[lista].find((r) => r.id === id);
const iVyn = (lista, id) => api.state[lista].find((r) => r.id === id);

beforeEach(() => {
  falsk.nollstall();
  localStorage.clear();
  toaster.length = 0;
  CONFIG.autosaveMs = 20;
  CONFIG.sparaOmMs = 10_000;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
  api = null;
});

describe("samtidig redigering", () => {
  it("B:s ändring skrivs inte över när A skriver i ett fält samtidigt", async () => {
    await montera();
    document.getElementById("falt").focus();

    bAndrar("risker", "r2", "atgard", "B:s åtgärd");
    await vantaTills(() => api.conn.txt.includes("läses in när du är klar"));

    await act(async () => api.uppd("risker", "r1", "atgard", "A:s åtgärd"));

    await vantaTills(() => iDb("risker", "r1").atgard === "A:s åtgärd");
    expect(iDb("risker", "r2").atgard).toBe("B:s åtgärd");
    expect(iVyn("risker", "r2").atgard).toBe("B:s åtgärd");
    expect(iVyn("risker", "r1").atgard).toBe("A:s åtgärd");
  });

  it("A:s osparade ändring försvinner inte när B:s ändring kommer in", async () => {
    await montera();
    CONFIG.autosaveMs = 300;

    await act(async () => api.uppd("risker", "r1", "atgard", "A:s åtgärd"));
    bAndrar("risker", "r2", "atgard", "B:s åtgärd");

    await vantaTills(() => iDb("risker", "r1").atgard === "A:s åtgärd");
    expect(iDb("risker", "r2").atgard).toBe("B:s åtgärd");
    expect(iVyn("risker", "r1").atgard).toBe("A:s åtgärd");
  });

  it("samma fält ändrat av båda: A:s version gäller och det sägs till", async () => {
    await montera();
    document.getElementById("falt").focus();

    bAndrar("risker", "r1", "atgard", "B:s åtgärd");
    await vantaTills(() => api.conn.txt.includes("läses in när du är klar"));
    await act(async () => api.uppd("risker", "r1", "atgard", "A:s åtgärd"));

    await vantaTills(() => iDb("risker", "r1").atgard === "A:s åtgärd");
    expect(toaster.some((t) => /1 fält ändrades av er båda/.test(t))).toBe(true);
  });

  it("väntande ändring läses in när fokus lämnar fältet", async () => {
    await montera();
    const falt = document.getElementById("falt");
    falt.focus();

    bAndrar("risker", "r2", "atgard", "B:s åtgärd");
    await vantaTills(() => api.conn.txt.includes("läses in när du är klar"));
    expect(iVyn("risker", "r2").atgard).not.toBe("B:s åtgärd");

    await act(async () => falt.blur());
    await vantaTills(() => iVyn("risker", "r2").atgard === "B:s åtgärd");
  });
});

describe("ändringsloggen", () => {
  it("andras poster skickas inte upp igen i mitt namn", async () => {
    await montera();

    const post = { ts: new Date(Date.now() + 1000).toISOString(), projekt_id: null, text: "Kim: status ändrad" };
    falsk.annanLoggar(post);
    await vantaTills(() => api.state.andringslogg.some((p) => p.text === post.text));
    await act(async () => new Promise((r) => setTimeout(r, 50)));

    expect(falsk.logg.filter((p) => p.text === post.text)).toHaveLength(1);
    expect(falsk.logg.find((p) => p.text === post.text).anvandare).toBe("kim@one-nordic.se");
  });

  it("egna poster skickas upp en gång", async () => {
    await montera();

    await act(async () => api.uppdStatus("risker", "r1", "status", "stangd"));
    await vantaTills(() => falsk.logg.length === 1);
    await act(async () => new Promise((r) => setTimeout(r, 50)));

    expect(falsk.logg).toHaveLength(1);
    expect(falsk.logg[0].anvandare).toBe("jag@one-nordic.se");
  });
});

describe("ändringsloggen vid fel (granskning F04)", () => {
  it("en misslyckad skrivning markeras inte som skickad och skickas igen", async () => {
    await montera();
    CONFIG.loggAterforsokMs = 40;
    let nekaLogg = true;
    falsk.sattFel((tabell, op) => (nekaLogg && tabell === "andringslogg" && (op === "insert" || op === "upsert") ? { code: "PGRST000", message: "nät" } : null));

    await act(async () => api.uppdStatus("risker", "r1", "status", "stangd"));
    await vantaTills(() => api.conn.txt.includes("Loggposten"));
    expect(falsk.logg).toHaveLength(0);

    nekaLogg = false;
    await vantaTills(() => falsk.logg.length === 1);
    await act(async () => new Promise((r) => setTimeout(r, 120)));
    expect(falsk.logg).toHaveLength(1); // ingen dubblett efter återförsöket
    CONFIG.loggAterforsokMs = 15000;
  });

  it("ett tappat svar efter lyckad skrivning ger ingen dubblett vid återförsöket", async () => {
    await montera();
    CONFIG.loggAterforsokMs = 40;
    let tappa = true;
    falsk.sattFelEfterSkrivning((tabell) => (tappa && tabell === "andringslogg" ? { code: "PGRST000", message: "nät" } : null));

    await act(async () => api.uppdStatus("risker", "r1", "status", "stangd"));
    await vantaTills(() => falsk.logg.length === 1);
    tappa = false;
    await act(async () => new Promise((r) => setTimeout(r, 200)));
    expect(falsk.logg).toHaveLength(1);
    CONFIG.loggAterforsokMs = 15000;
  });
});

describe("ekonomin", () => {
  it("ett nätverksfel rullar inte tillbaka ändringen", async () => {
    await montera();
    falsk.sattFel((tabell, op, data) =>
      tabell === "app_state" && op === "update" && data?.value?.kontraktsvarde ? { code: "PGRST000", message: "nät" } : null
    );

    await act(async () => api.dispatch({ type: "UPPD_KONTRAKT", pid: "36037", varde: 12000000 }));
    await vantaTills(() => api.ekonomiFel !== "");

    expect(api.ekonomiFel).toMatch(/finns kvar/);
    expect(api.state.projekt.find((p) => p.id === "36037").kontraktsvarde).toBe(12000000);
  });

  it("nekad behörighet rullar tillbaka ändringen", async () => {
    await montera();
    const fore = api.state.projekt.find((p) => p.id === "36037").kontraktsvarde;
    falsk.sattFel((tabell, op, data) =>
      tabell === "app_state" && op === "update" && data?.value?.kontraktsvarde ? { code: "42501", message: "rls" } : null
    );

    await act(async () => api.dispatch({ type: "UPPD_KONTRAKT", pid: "36037", varde: 12000000 }));
    await vantaTills(() => api.ekonomiFel !== "");

    expect(api.ekonomiFel).toMatch(/administratören/);
    expect(api.state.projekt.find((p) => p.id === "36037").kontraktsvarde).toBe(fore);
  });
});

describe("offline och återanslutning", () => {
  it("en ändring som aldrig nådde databasen försvinner inte vid nästa start", async () => {
    await montera();
    falsk.sattFel((tabell, op) => (tabell === "app_state" && op === "update" ? { code: "PGRST000", message: "nät" } : null));

    await act(async () => api.uppd("risker", "r1", "atgard", "gjord offline"));
    await vantaTills(() => api.conn.txt.includes("försöker igen"));
    expect(iDb("risker", "r1").atgard).not.toBe("gjord offline");

    // Fliken stängs, och medan den är stängd ändrar någon annan en annan rad.
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    falsk.sattFel(null);
    bAndrar("risker", "r2", "atgard", "B:s åtgärd");

    await montera();
    await vantaTills(() => iDb("risker", "r1").atgard === "gjord offline");
    expect(iDb("risker", "r2").atgard).toBe("B:s åtgärd");
    expect(iVyn("risker", "r1").atgard).toBe("gjord offline");
    expect(iVyn("risker", "r2").atgard).toBe("B:s åtgärd");
  });

  it("ett nätfel vid sparandet ger nytt försök utan ny redigering", async () => {
    await montera();
    CONFIG.sparaOmMs = 50;
    let nekade = 0;
    falsk.sattFel((tabell, op) => {
      if (tabell === "app_state" && op === "update" && nekade < 2) {
        nekade += 1;
        return { code: "PGRST000", message: "nät" };
      }
      return null;
    });

    await act(async () => api.uppd("risker", "r1", "atgard", "kommer fram till slut"));
    await vantaTills(() => iDb("risker", "r1").atgard === "kommer fram till slut", 3000);
    expect(nekade).toBe(2);
  });

  it("inget skrivs delat förrän första läsningen lyckats, sedan läggs ändringen in", async () => {
    CONFIG.sparaOmMs = 50;
    falsk.sattFel((tabell, op) => (op === "select" ? { code: "PGRST000", message: "nät" } : null));

    const div = document.createElement("div");
    document.body.append(div);
    root = createRoot(div);
    await act(async () => {
      root.render(
        h(
          UiContext.Provider,
          { value: { visaToast: (txt) => toaster.push(txt) } },
          h(PortfolioProvider, null, h("main", null, h(Fanga)))
        )
      );
    });
    await vantaTills(() => api?.conn.txt.includes("svarar inte"));

    await act(async () => api.uppd("risker", "r1", "atgard", "skriven före kontakt"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(falsk.appState.has(STATE)).toBe(false);

    falsk.sattFel(null);
    await vantaTills(() => falsk.appState.has(STATE) && iDb("risker", "r1").atgard === "skriven före kontakt", 3000);
  });
});
