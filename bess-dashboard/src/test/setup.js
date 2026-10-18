/* Nodes inbyggda localStorage (Node 25+) skuggar jsdoms och saknar clear()
   utan en giltig --localstorage-file. Fungerar den inte ersätts den med en
   minneslagring med samma gränssnitt, så att testen beter sig som i en webbläsare. */
function minneslagring() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => void m.set(String(k), String(v)),
    removeItem: (k) => void m.delete(String(k)),
    clear: () => m.clear(),
  };
}

if (typeof window !== "undefined") {
  let ok = false;
  try {
    ok = typeof globalThis.localStorage?.clear === "function";
  } catch {
    ok = false;
  }
  if (!ok) Object.defineProperty(globalThis, "localStorage", { value: minneslagring(), configurable: true, writable: true });
}
