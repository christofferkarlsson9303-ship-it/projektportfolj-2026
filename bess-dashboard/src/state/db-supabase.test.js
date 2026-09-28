import { beforeEach, describe, expect, it, vi } from "vitest";

const falsk = await vi.hoisted(async () => {
  const { skapaFalskSupabase } = await import("../test/falskSupabase.js");
  return skapaFalskSupabase();
});

vi.mock("../lib/supabase.js", () => ({ supabase: falsk.klient, KONFIGURERAD: true }));

const { skapaDb } = await import("./db-supabase.js");

const vanta = () => new Promise((r) => setTimeout(r, 5));
const KEY = "portfolj/state";

describe("db-supabase — optimistisk låsning", () => {
  beforeEach(() => {
    falsk.nollstall();
    falsk.appState.set(KEY, { key: KEY, value: { v: "start" }, version: 1 });
  });

  it("skrivning efter läsning går igenom", async () => {
    const doc = skapaDb().doc(KEY);
    await doc.get();
    await doc.set({ v: "min" });
    expect(falsk.appState.get(KEY).value).toEqual({ v: "min" });
  });

  it("en ändring som bara kommit via realtid skrivs inte över utan konflikt", async () => {
    const doc = skapaDb().doc(KEY);
    await doc.get();
    const snapshots = [];
    const av = doc.onSnapshot((s) => snapshots.push(s));

    falsk.annanSkriver(KEY, { v: "deras" });
    await vanta();
    expect(snapshots).toHaveLength(1);

    // Klienten har sett ändringen men inte tagit in den (användaren skrev).
    // Då måste nästa skrivning upptäcka att den andra hunnit före.
    await expect(doc.set({ v: "min" })).rejects.toMatchObject({ code: "konflikt" });
    expect(falsk.appState.get(KEY).value).toEqual({ v: "deras" });
    av();
  });

  it("snapshoten bär versionen, och antaVersion gör skrivningen giltig", async () => {
    const doc = skapaDb().doc(KEY);
    await doc.get();
    let senast = null;
    const av = doc.onSnapshot((s) => (senast = s));

    falsk.annanSkriver(KEY, { v: "deras" });
    await vanta();
    expect(senast.version).toBe(2);
    doc.antaVersion(senast.version);
    await doc.set({ v: "sammanslagen" });
    expect(falsk.appState.get(KEY).value).toEqual({ v: "sammanslagen" });
    av();
  });
});
