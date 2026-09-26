/* Protokollarkivet — uppladdade mötesprotokoll per projekt.

   Filerna hör inte hemma i portföljdokumentet (app_state): de är stora, och
   Make-flödet från Google Drive ska kunna lägga till protokoll utan att
   skriva i samma JSON som användarna redigerar. Därför ett eget arkiv med
   samma gränssnitt i två varianter:

     - delat: tabellen public.protokoll + den privata bucketen "protokoll" i
       Supabase. MASTER-regeln sköts av en trigger i databasen, så den gäller
       även för rader som Make skriver.
     - lokalt: IndexedDB i webbläsaren, för lokalt läge och e2e-testen. Samma
       MASTER-regel tillämpas här i klienten.

   MASTER: protokollet med högst mötesnummer är den aktiva sanningen för
   projektet. Ett nytt protokoll tar över när dess nummer är lika med eller
   högre än nuvarande MASTER:s — en ny version av samma möte ersätter den
   gamla. Ett äldre möte som laddas upp i efterhand arkiveras direkt, liksom
   ett protokoll utan nummer när MASTER har ett. Protokoll utan projekt
   påverkar inga andra. Samma regel finns som trigger i databasen
   (supabase/migrations/…_protokoll_master_motesnummer.sql). */

import { supabase } from "../lib/supabase.js";
import { moteNrUrFilnamn } from "../lib/importera.js";

export const BUCKET = "protokoll";

/** Mötesnumret som tal ("BM-09" → 9), null om det saknas. */
export const moteTal = (moteNr) => {
  const m = String(moteNr || "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

/** Ren MASTER-regel: lägger till `ny` först i listan med status satt, och
 *  arkiverar nuvarande MASTER om `ny` tar över. Mötesnummer som saknas läses
 *  ur filnamnet, precis som i databasen. */
export function medNyMaster(rader, ny) {
  const rad = { ...ny, moteNr: ny.moteNr || moteNrUrFilnamn(ny.filnamn || "") };
  if (!rad.projektId) return [{ ...rad, status: "master" }, ...rader];

  const master = rader.find((r) => r.projektId === rad.projektId && r.status === "master");
  const nyttTal = moteTal(rad.moteNr);
  const masterTal = master ? moteTal(master.moteNr) : null;
  if (masterTal !== null && (nyttTal === null || nyttTal < masterTal)) {
    return [{ ...rad, status: "arkiverad" }, ...rader];
  }
  return [
    { ...rad, status: "master" },
    ...rader.map((r) => (r.projektId === rad.projektId && r.status === "master" ? { ...r, status: "arkiverad" } : r)),
  ];
}

/** Grupperar per projekt, nyast först — MASTER alltid överst. */
export function perProjekt(rader) {
  const karta = new Map();
  for (const r of [...rader].sort((a, b) => (a.inlast < b.inlast ? 1 : -1))) {
    const k = r.projektId || "";
    if (!karta.has(k)) karta.set(k, []);
    karta.get(k).push(r);
  }
  for (const lista of karta.values()) lista.sort((a, b) => (a.status === "master" ? -1 : b.status === "master" ? 1 : 0));
  return karta;
}

const nyttId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "pr" + Date.now() + Math.random();

/* ---------- Lokalt (IndexedDB) ---------- */

const DB_NAMN = "batchc-protokoll";

function oppnaIdb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAMN, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("rader")) db.createObjectStore("rader", { keyPath: "id" });
      if (!db.objectStoreNames.contains("filer")) db.createObjectStore("filer");
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function idb(lager, lage, gor) {
  return oppnaIdb().then(
    (db) =>
      new Promise((res, rej) => {
        const tx = db.transaction(lager, lage);
        const ut = gor(tx);
        tx.oncomplete = () => res(ut && "result" in ut ? ut.result : ut);
        tx.onerror = () => rej(tx.error);
      })
  );
}

function lokaltArkiv() {
  return {
    lage: "lokal",
    async lista() {
      const rader = await idb(["rader"], "readonly", (tx) => tx.objectStore("rader").getAll());
      return rader || [];
    },
    async ladda(fil, { projektId = null, moteNr = "" } = {}) {
      const befintliga = await this.lista();
      const ny = {
        id: nyttId(),
        projektId,
        filnamn: fil.name,
        moteNr,
        storlek: fil.size,
        mime: fil.type || "",
        kalla: "manuell",
        inlast: new Date().toISOString(),
        inlastAv: "",
      };
      const alla = medNyMaster(befintliga, ny);
      await idb(["rader", "filer"], "readwrite", (tx) => {
        const s = tx.objectStore("rader");
        for (const r of alla) s.put(r);
        tx.objectStore("filer").put(fil, ny.id);
      });
      return alla[0];
    },
    async oppna(rad) {
      const blob = await idb(["filer"], "readonly", (tx) => tx.objectStore("filer").get(rad.id));
      return blob ? URL.createObjectURL(blob) : null;
    },
  };
}

/* ---------- Delat (Supabase) ---------- */

const franDb = (r) => ({
  id: r.id,
  projektId: r.projekt_id,
  filnamn: r.filnamn,
  moteNr: r.mote_nr || "",
  storlek: r.storlek,
  mime: r.mime || "",
  kalla: r.kalla,
  status: r.status,
  inlast: r.inlast,
  inlastAv: r.inlast_av || "",
  sokvag: r.storage_path,
});

/* Säker sökväg i bucketen: projekt/tid-filnamn, utan tecken som Storage
   inte tar emot. Originalnamnet ligger kvar i tabellen. */
const sokvagFor = (projektId, filnamn) =>
  `${projektId || "okopplat"}/${Date.now()}-${String(filnamn).normalize("NFD").replace(/[^\w.-]+/g, "_")}`;

function deltArkiv() {
  return {
    lage: "delad",
    async lista() {
      const { data, error } = await supabase.from("protokoll").select("*").order("inlast", { ascending: false });
      if (error) throw error;
      return (data || []).map(franDb);
    },
    async ladda(fil, { projektId = null, moteNr = "" } = {}) {
      const sokvag = sokvagFor(projektId, fil.name);
      const upp = await supabase.storage.from(BUCKET).upload(sokvag, fil, {
        contentType: fil.type || "application/octet-stream",
      });
      if (upp.error) throw upp.error;
      const { data, error } = await supabase
        .from("protokoll")
        .insert({
          projekt_id: projektId,
          filnamn: fil.name,
          mote_nr: moteNr || null,
          storage_path: sokvag,
          storlek: fil.size,
          mime: fil.type || null,
          kalla: "manuell",
        })
        .select("*")
        .single();
      if (error) throw error;
      return franDb(data);
    },
    async oppna(rad) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(rad.sokvag, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  };
}

/** Väljer arkiv: delat när Supabase är konfigurerat, annars lokalt. */
export function skapaArkiv() {
  return supabase ? deltArkiv() : lokaltArkiv();
}

/** Känner igen felet "tabellen finns inte" — migreringen är inte körd ännu. */
export function arEjAktiverat(fel) {
  const t = `${fel?.code || ""} ${fel?.message || ""}`;
  return /42P01|PGRST205|does not exist|Could not find the table|Bucket not found/i.test(t);
}
