import { beforeEach, describe, expect, it, vi } from "vitest";

const falsk = await vi.hoisted(async () => {
  const { skapaFalskSupabase } = await import("../test/falskSupabase.js");
  return skapaFalskSupabase();
});

vi.mock("../lib/supabase.js", () => ({ supabase: falsk.klient, KONFIGURERAD: true }));

const { skapaDb } = await import("./db-supabase.js");
const { radId } = await import("./db-poster.js");

const vanta = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const DOK = "portfolj/state";

const START = {
  projekt: [{ id: "36037", namn: "Växjö" }],
  risker: [
    { id: "r1", projektId: "36037", titel: "Trafo", status: "oppen" },
    { id: "r2", projektId: "36037", titel: "Mark", status: "oppen" },
  ],
  rutinstatus: [{ projektId: "36037", punkt: "v1", klar: true }],
};

/** En klient som läst in portföljen. */
async function klient() {
  const doc = skapaDb().doc(DOK);
  const snap = await doc.get();
  return { doc, data: snap.data() };
}

const andra = (data, lista, id, falt) => ({
  ...data,
  [lista]: data[lista].map((r) => (r.id === id ? { ...r, ...falt } : r)),
});

beforeEach(async () => {
  falsk.nollstall({ poster: true });
  const doc = skapaDb().doc(DOK);
  await doc.get(); // tom tabell
  await doc.set(START);
});

describe("db-poster — rad per post", () => {
  it("läser tillbaka samma dokument som skrevs, i samma ordning", async () => {
    const { data } = await klient();
    expect(data).toEqual(START);
    expect(falsk.post("rutinstatus", "rs-36037-v1").data).toEqual(START.rutinstatus[0]);
  });

  it("väljer app_state när poster-tabellen saknas", async () => {
    falsk.nollstall({ poster: false });
    falsk.appState.set(DOK, { key: DOK, value: { risker: [] }, version: 1 });
    const doc = skapaDb().doc(DOK);
    expect((await doc.get()).data()).toEqual({ risker: [] });
    expect(doc.radlage).toBe(false);
  });

  it("skriver bara raderna som ändrats", async () => {
    const { doc, data } = await klient();
    const fore = falsk.post("risker", "r2").version;
    await doc.set(andra(data, "risker", "r1", { status: "stangd" }));
    expect(falsk.post("risker", "r1")).toMatchObject({ version: 2, data: { status: "stangd" } });
    expect(falsk.post("risker", "r2").version).toBe(fore);
  });

  it("två användare som ändrar olika poster krockar inte", async () => {
    const a = await klient();
    const b = await klient();
    await b.doc.set(andra(b.data, "risker", "r2", { status: "bevakas" }));
    await a.doc.set(andra(a.data, "risker", "r1", { status: "stangd" }));
    expect(falsk.post("risker", "r1").data.status).toBe("stangd");
    expect(falsk.post("risker", "r2").data.status).toBe("bevakas");
  });

  it("samma post ändrad av båda ger konflikt, men övriga rader skrivs", async () => {
    const a = await klient();
    const b = await klient();
    await b.doc.set(andra(b.data, "risker", "r1", { status: "bevakas" }));
    let aData = andra(a.data, "risker", "r1", { status: "stangd" });
    aData = andra(aData, "risker", "r2", { titel: "Mark (ny)" });
    await expect(a.doc.set(aData)).rejects.toMatchObject({ code: "konflikt" });
    expect(falsk.post("risker", "r1").data.status).toBe("bevakas");
    expect(falsk.post("risker", "r2").data.titel).toBe("Mark (ny)");
  });

  it("borttagning är mjuk och syns i historiken", async () => {
    const { doc, data } = await klient();
    await doc.set({ ...data, risker: data.risker.filter((r) => r.id !== "r2") });
    expect(falsk.post("risker", "r2").borttagen).toBe(true);
    expect((await klient()).data.risker.map((r) => r.id)).toEqual(["r1"]);
    const h = await doc.historik("risker", "r2");
    expect(h.map((v) => v.operation)).toEqual(["borttagen", "skapad"]);
  });

  it("en realtidsändring tas inte in förrän providern säger det", async () => {
    const { doc, data } = await klient();
    const snaps = [];
    const av = doc.onSnapshot((s) => snaps.push(s));

    falsk.annanPost("risker", "r1", { status: "bevakas" });
    await vanta();
    expect(snaps).toHaveLength(1);
    expect(snaps[0].data().risker[0].status).toBe("bevakas");

    // Utan antaVersion: en egen ändring av samma rad ger konflikt.
    await expect(doc.set(andra(data, "risker", "r1", { status: "stangd" }))).rejects.toMatchObject({
      code: "konflikt",
    });

    // Med antaVersion: samma rad kan skrivas.
    doc.antaVersion(snaps[0].version);
    await doc.set(andra(snaps[0].data(), "risker", "r1", { status: "stangd" }));
    expect(falsk.post("risker", "r1").data.status).toBe("stangd");
    av();
  });

  it("en osedd realtidsändring på en annan rad skrivs inte över", async () => {
    const { doc, data } = await klient();
    const av = doc.onSnapshot(() => {});
    falsk.annanPost("risker", "r2", { status: "bevakas" });
    await vanta();
    await doc.set(andra(data, "risker", "r1", { status: "stangd" }));
    expect(falsk.post("risker", "r2").data.status).toBe("bevakas");
    av();
  });

  it("egna skrivningar kommer inte tillbaka som snapshots", async () => {
    const { doc, data } = await klient();
    const snaps = [];
    const av = doc.onSnapshot((s) => snaps.push(s));
    await doc.set(andra(data, "risker", "r1", { status: "stangd" }));
    await vanta();
    expect(snaps).toHaveLength(0);
    av();
  });

  it("historiken visar versionerna nyast först med avsändare", async () => {
    const { doc, data } = await klient();
    await doc.set(andra(data, "risker", "r1", { status: "stangd" }));
    falsk.annanPost("risker", "r1", { titel: "Trafo (retur)" });
    const h = await doc.historik("risker", "r1");
    expect(h.map((v) => [v.version, v.operation, v.av])).toEqual([
      [3, "andrad", "kim@one-nordic.se"],
      [2, "andrad", "jag@one-nordic.se"],
      [1, "skapad", "jag@one-nordic.se"],
    ]);
  });

  it("radId: id i första hand, rutinstatus på projekt och punkt", () => {
    expect(radId("risker", { id: 7 })).toBe("7");
    expect(radId("rutinstatus", { projektId: "p", punkt: "x" })).toBe("rs-p-x");
    expect(radId("okand", { a: 1 })).toMatch(/^~[0-9a-f]+$/);
  });
});
