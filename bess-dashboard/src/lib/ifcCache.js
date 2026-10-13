/* Lokal lagring av IFC-geometri i IndexedDB. Geometrin är för tung för portfolj/state (tiotals megabyte) och
   delas därför inte: den ligger bara i den här webbläsaren, nycklad på modellens id. Metadatan (GlobalId,
   namn, låda) ligger i state och syns för alla; geometrin måste laddas upp igen på varje dator.

   Lagret är separerat från IndexedDB bakom ett litet gränssnitt (get, put, delete, keys) så att logiken går att
   testa med en Map. `indexedDbLager()` är det riktiga. Allt är löften, och alla fel blir ett Error med svensk text
   — IndexedDB kan saknas (privat läge, blockerad lagring) eller vara full, och då ska appen säga det i stället
   för att kasta något obegripligt. */

const DB_NAMN = "bess-ifc";
const BUTIK = "geometri";

export class IfcCacheFel extends Error {
  constructor(text, orsak) {
    super(text);
    this.name = "IfcCacheFel";
    this.orsak = orsak;
  }
}

function omvandlaFel(e) {
  const namn = e?.name || "";
  if (namn === "QuotaExceededError") return new IfcCacheFel("Webbläsarens lagring är full — modellens geometri kunde inte sparas. Ta bort en annan IFC-modell och försök igen.", "full");
  return new IfcCacheFel(`Webbläsarens lagring för IFC-modeller fungerar inte (${e?.message || namn || "okänt fel"}).`, "blockerad");
}


/** Det riktiga lagret ovanpå IndexedDB. `fabrik` är en IDBFactory (globalThis.indexedDB som standard). */
export function indexedDbLager(fabrik = globalThis.indexedDB) {
  let db = null;
  const oppna = () => {
    if (!fabrik) return Promise.reject(new IfcCacheFel("Den här webbläsaren saknar lokal lagring (IndexedDB) för IFC-modeller.", "saknas"));
    if (!db) {
      db = new Promise((resolve, reject) => {
        let req;
        try {
          req = fabrik.open(DB_NAMN, 1);
        } catch (e) {
          reject(omvandlaFel(e));
          return;
        }
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(BUTIK)) req.result.createObjectStore(BUTIK);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(omvandlaFel(req.error));
        req.onblocked = () => reject(new IfcCacheFel("Lagringen är blockerad av en annan flik. Stäng andra flikar med appen och försök igen.", "blockerad"));
      });
      db.catch(() => {
        db = null;
      });
    }
    return db;
  };
  const kor = async (lage, fn) => {
    const d = await oppna();
    return new Promise((resolve, reject) => {
      let t;
      try {
        t = d.transaction(BUTIK, lage);
      } catch (e) {
        reject(omvandlaFel(e));
        return;
      }
      const butik = t.objectStore(BUTIK);
      let svar;
      try {
        svar = fn(butik);
      } catch (e) {
        reject(omvandlaFel(e));
        return;
      }
      t.oncomplete = () => resolve(svar && "result" in svar ? svar.result : undefined);
      t.onerror = () => reject(omvandlaFel(t.error));
      t.onabort = () => reject(omvandlaFel(t.error));
    });
  };
  return {
    get: (nyckel) => kor("readonly", (b) => b.get(nyckel)),
    put: (nyckel, varde) => kor("readwrite", (b) => b.put(varde, nyckel)),
    delete: (nyckel) => kor("readwrite", (b) => b.delete(nyckel)),
    keys: () => kor("readonly", (b) => b.getAllKeys()),
  };
}

/** Lager ovanpå en Map — för tester och som reserv när IndexedDB saknas men appen ska fortsätta fungera. */
export function minneslager() {
  const m = new Map();
  return {
    get: async (k) => m.get(k),
    put: async (k, v) => void m.set(k, v),
    delete: async (k) => void m.delete(k),
    keys: async () => [...m.keys()],
  };
}

/** Geometrin per modell: { eid, delar: [{pos, nor, idx, farg}] }[]. Sparas som en post per modell. */
export function skapaIfcCache(lager = indexedDbLager()) {
  return {
    /** Sparar modellens geometri. Skriver över en tidigare post med samma id. */
    async spara(modellId, geometri) {
      if (!modellId || !Array.isArray(geometri)) throw new IfcCacheFel("Ogiltig modell att spara.", "ogiltig");
      try {
        await lager.put(modellId, { version: 1, sparad: Date.now(), geometri });
      } catch (e) {
        throw e instanceof IfcCacheFel ? e : omvandlaFel(e);
      }
    },
    /** Läser modellens geometri, eller null om den inte finns i den här webbläsaren. */
    async hamta(modellId) {
      try {
        const r = await lager.get(modellId);
        return r && Array.isArray(r.geometri) ? r.geometri : null;
      } catch (e) {
        throw e instanceof IfcCacheFel ? e : omvandlaFel(e);
      }
    },
    async finns(modellId) {
      return (await this.hamta(modellId).catch(() => null)) !== null;
    },
    async ta(modellId) {
      try {
        await lager.delete(modellId);
      } catch (e) {
        throw e instanceof IfcCacheFel ? e : omvandlaFel(e);
      }
    },
    /** Id:n som har geometri i den här webbläsaren. */
    async nycklar() {
      try {
        return (await lager.keys()).map(String);
      } catch {
        return [];
      }
    },
  };
}
