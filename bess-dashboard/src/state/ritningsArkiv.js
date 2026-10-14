/* Filerna bakom ritningarna i 3D-vyn (lib/ritningar.js).

   Samma upplägg som protokollarkivet (state/protokoll-arkiv.js):
     - delat: den privata bucketen "ritningar" i Supabase Storage. Inloggade på allowed_users
       läser och laddar upp; bara administratören tar bort
       (supabase/migrations/…_site_ritningar.sql).
     - lokalt: IndexedDB i webbläsaren, för lokalt läge och e2e-testen.

   Metadata och placering ligger i portfolj/state (siteRitningar). Här finns bara filen. */

import { supabase } from "../lib/supabase.js";

export const BUCKET = "ritningar";
export const MAX_BYTE = 50 * 1024 * 1024;

/** Säker sökväg i bucketen: projekt/id-filnamn, utan tecken som Storage inte tar emot. */
export const sokvagFor = (projektId, id, filnamn) =>
  `${projektId}/${id}-${String(filnamn || "ritning").normalize("NFD").replace(/[^\w.-]+/g, "_")}`;

/* ---------- Lokalt (IndexedDB) ---------- */

const DB_NAMN = "batchc-ritningar";

function oppnaIdb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAMN, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("filer")) req.result.createObjectStore("filer");
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function idb(lage, gor) {
  return oppnaIdb().then(
    (db) =>
      new Promise((res, rej) => {
        const tx = db.transaction("filer", lage);
        const req = gor(tx.objectStore("filer"));
        tx.oncomplete = () => res(req?.result);
        tx.onerror = () => rej(tx.error);
      })
  );
}

function lokaltArkiv() {
  return {
    lage: "lokal",
    async ladda(fil, sokvag) {
      await idb("readwrite", (s) => s.put(fil, sokvag));
      return sokvag;
    },
    async hamta(sokvag) {
      return (await idb("readonly", (s) => s.get(sokvag))) || null;
    },
    async taBort(sokvag) {
      await idb("readwrite", (s) => s.delete(sokvag));
    },
  };
}

/* ---------- Delat (Supabase Storage) ---------- */

function deltArkiv() {
  return {
    lage: "delad",
    async ladda(fil, sokvag) {
      const { error } = await supabase.storage.from(BUCKET).upload(sokvag, fil, { contentType: fil.type || "application/octet-stream", upsert: false });
      if (error) throw error;
      return sokvag;
    },
    async hamta(sokvag) {
      const { data, error } = await supabase.storage.from(BUCKET).download(sokvag);
      if (error) throw error;
      return data;
    },
    async taBort(sokvag) {
      const { error } = await supabase.storage.from(BUCKET).remove([sokvag]);
      if (error) throw error;
    },
  };
}

/** Delat när Supabase är konfigurerat, annars lokalt. */
export function skapaRitningsArkiv(lage = supabase ? "delad" : "lokal") {
  return lage === "delad" && supabase ? deltArkiv() : lokaltArkiv();
}

/** Bucketen finns inte — migreringen är inte körd. */
export function arEjAktiverat(fel) {
  return /Bucket not found|not found|404/i.test(`${fel?.message || ""} ${fel?.statusCode || ""}`);
}
