import { describe, expect, it } from "vitest";
import { IfcCacheFel, indexedDbLager, minneslager, skapaIfcCache } from "./ifcCache.js";

const geo = () => [{ eid: 41, delar: [{ pos: new Float32Array([0, 0, 0, 1, 1, 1]), nor: new Float32Array([0, 1, 0, 0, 1, 0]), idx: new Uint32Array([0, 1, 0]), farg: [1, 1, 1, 1] }] }];

describe("ifcCache med minneslager", () => {
  it("sparar och hämtar geometrin, och ger null för en modell som saknas", async () => {
    const c = skapaIfcCache(minneslager());
    expect(await c.hamta("m1")).toBeNull();
    expect(await c.finns("m1")).toBe(false);
    await c.spara("m1", geo());
    const g = await c.hamta("m1");
    expect(g).toHaveLength(1);
    expect(g[0].eid).toBe(41);
    expect(g[0].delar[0].pos).toBeInstanceOf(Float32Array);
    expect(await c.finns("m1")).toBe(true);
  });

  it("modellerna är åtskilda, kan skrivas över och tas bort", async () => {
    const c = skapaIfcCache(minneslager());
    await c.spara("a", geo());
    await c.spara("b", [{ eid: 1, delar: [] }]);
    expect((await c.hamta("b"))[0].eid).toBe(1);
    await c.spara("a", [{ eid: 2, delar: [] }]);
    expect((await c.hamta("a"))[0].eid).toBe(2);
    expect((await c.nycklar()).sort()).toEqual(["a", "b"]);
    await c.ta("a");
    expect(await c.hamta("a")).toBeNull();
    expect(await c.nycklar()).toEqual(["b"]);
    await c.ta("finns-inte"); // ingen fel
  });

  it("avvisar ogiltiga anrop med ett begripligt fel", async () => {
    const c = skapaIfcCache(minneslager());
    await expect(c.spara("", geo())).rejects.toThrow(/Ogiltig modell/);
    await expect(c.spara("m", null)).rejects.toThrow(IfcCacheFel);
  });

  it("en trasig post läses som saknad", async () => {
    const l = minneslager();
    await l.put("m", { version: 1, geometri: "inte en lista" });
    expect(await skapaIfcCache(l).hamta("m")).toBeNull();
  });
});

describe("fel i lagret blir svensk text", () => {
  const trasig = (namn, text = "x") => {
    const e = Object.assign(new Error(text), { name: namn });
    return { get: () => Promise.reject(e), put: () => Promise.reject(e), delete: () => Promise.reject(e), keys: () => Promise.reject(e) };
  };

  it("full lagring (QuotaExceededError) ger orsak 'full' och en uppmaning", async () => {
    const c = skapaIfcCache(trasig("QuotaExceededError"));
    const fel = await c.spara("m", geo()).catch((e) => e);
    expect(fel).toBeInstanceOf(IfcCacheFel);
    expect(fel.orsak).toBe("full");
    expect(fel.message).toMatch(/full/);
    expect(fel.message).toMatch(/Ta bort/);
  });

  it("andra fel ger orsak 'blockerad', och nycklar() svarar tomt i stället för att kasta", async () => {
    const c = skapaIfcCache(trasig("SecurityError", "nekad"));
    const fel = await c.hamta("m").catch((e) => e);
    expect(fel.orsak).toBe("blockerad");
    expect(fel.message).toMatch(/nekad/);
    expect(await c.nycklar()).toEqual([]);
    expect(await c.finns("m")).toBe(false);
    await expect(c.ta("m")).rejects.toBeInstanceOf(IfcCacheFel);
  });

  it("utan IndexedDB säger lagret det tydligt", async () => {
    const c = skapaIfcCache(indexedDbLager(undefined));
    // globalThis.indexedDB saknas i Node, men ett uttryckligt undefined faller tillbaka på den — kontrollera båda vägarna.
    const fel = await c.spara("m", geo()).catch((e) => e);
    expect(fel).toBeInstanceOf(IfcCacheFel);
    expect(["saknas", "blockerad"]).toContain(fel.orsak);
  });
});

describe("indexedDbLager mot en liten IDB-attrapp", () => {
  /** Tillräckligt av IndexedDB för lagret: open → upgrade → transaction → objectStore get/put/delete/getAllKeys. */
  function attrapp() {
    const data = new Map();
    const butiker = new Set();
    const req = (varde) => {
      const r = { result: undefined, error: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        r.result = varde();
        r.onsuccess?.();
      }, 0);
      return r;
    };
    const db = {
      objectStoreNames: { contains: (n) => butiker.has(n) },
      createObjectStore: (n) => butiker.add(n),
      transaction: () => {
        const t = { oncomplete: null, onerror: null, onabort: null, error: null };
        const butik = {
          get: (k) => req(() => data.get(k)),
          put: (v, k) => req(() => (data.set(k, structuredClone(v)), k)),
          delete: (k) => req(() => data.delete(k)),
          getAllKeys: () => req(() => [...data.keys()]),
        };
        t.objectStore = () => butik;
        setTimeout(() => t.oncomplete?.(), 5);
        return t;
      },
    };
    return {
      open: () => {
        const r = { result: db, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
        setTimeout(() => {
          r.onupgradeneeded?.();
          r.onsuccess?.();
        }, 0);
        return r;
      },
    };
  }

  it("skapar butiken en gång och lagrar och läser poster genom lagret", async () => {
    const c = skapaIfcCache(indexedDbLager(attrapp()));
    await c.spara("m1", geo());
    const g = await c.hamta("m1");
    expect(g[0].eid).toBe(41);
    expect(await c.nycklar()).toEqual(["m1"]);
    await c.ta("m1");
    expect(await c.hamta("m1")).toBeNull();
  });

  it("ett open som kastar blir ett svenskt fel", async () => {
    const c = skapaIfcCache(indexedDbLager({ open: () => { throw Object.assign(new Error("nekad"), { name: "SecurityError" }); } }));
    const fel = await c.hamta("m").catch((e) => e);
    expect(fel).toBeInstanceOf(IfcCacheFel);
    expect(fel.orsak).toBe("blockerad");
  });
});
