/* Fullständig säkerhetskopia (granskning F06).

   JSON-exporten innehåller bara portföljens state. Bilagorna ligger på andra ställen:
   ritningsfiler i Storage eller IndexedDB, IFC-geometri i webbläsarens IndexedDB och
   mötesprotokoll i protokollarkivet. Den här filen packar allt i en ZIP:

     manifest.json   format, version, tid, vem, varje fil med typ, storlek och SHA-256,
                     och det som inte kunde hämtas (saknas) med orsak
     state.json      samma innehåll som JSON-exporten
     ritningar/…     ritningsfilerna under sin sökväg
     ifc/<id>.json   IFC-geometrin per modell
     protokoll/…     protokollfilerna

   Återläsningen kontrollerar varje kontrollsumma innan något används. Ren logik:
   källorna och målen skickas in, så att flödet går att prova utan webbläsare. */

import JSZip from "jszip";

export const ZIP_FORMAT = "one-nordic-projektportfolj-zip";
export const ZIP_VERSION = 1;

const enc = new TextEncoder();

/** SHA-256 som hex. */
export async function sha256(data) {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Blob, ArrayBuffer, Uint8Array, sträng eller JSON-objekt → Uint8Array. */
async function tillBytes(v) {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (typeof Blob !== "undefined" && v instanceof Blob) return new Uint8Array(await v.arrayBuffer());
  if (typeof v === "string") return enc.encode(v);
  return enc.encode(JSON.stringify(v));
}

const saker = (s) => String(s || "fil").normalize("NFD").replace(/[^\w./-]+/g, "_").replace(/\.\.+/g, ".").replace(/^\/+/, "");

/**
 * @typedef {object} Bilagekalla
 * @property {"ritning"|"ifc"|"protokoll"} typ
 * @property {string} id         radens id i state eller arkivet
 * @property {string} namn       läsbart namn
 * @property {string} sokvag     sökväg i ZIP-filen
 * @property {object} [meta]     det som behövs för återläsning (sokvag i lagring, projektId …)
 * @property {() => Promise<any>} hamta
 */

/** Bygger ZIP-filen. @param {{state: object, av?: string, kallor?: Bilagekalla[], nu?: Date}} indata */
export async function byggSakerhetskopia({ state, av = "", kallor = [], nu = new Date() }) {
  const zip = new JSZip();
  const skapad = nu.toISOString();
  const statePayload = { _format: "one-nordic-projektportfolj", _version: 1, _skapad: skapad, _av: av, state };
  const stateBytes = enc.encode(JSON.stringify(statePayload));
  zip.file("state.json", stateBytes);
  const filer = [{ sokvag: "state.json", typ: "state", storlek: stateBytes.length, sha256: await sha256(stateBytes) }];
  const saknas = [];

  for (const k of kallor) {
    try {
      const data = await k.hamta();
      if (data === null || data === undefined) throw new Error("finns inte på den här enheten");
      const bytes = await tillBytes(data);
      const sokvag = saker(k.sokvag);
      zip.file(sokvag, bytes);
      filer.push({ sokvag, typ: k.typ, id: k.id, namn: k.namn, meta: k.meta || {}, storlek: bytes.length, sha256: await sha256(bytes) });
    } catch (e) {
      saknas.push({ typ: k.typ, id: k.id, namn: k.namn, orsak: String(e?.message || e) });
    }
  }

  const manifest = { format: ZIP_FORMAT, version: ZIP_VERSION, skapad, av, filer, saknas };
  zip.file("manifest.json", JSON.stringify(manifest, null, 1));
  const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { data, manifest };
}

/**
 * Läser och kontrollerar en säkerhetskopia.
 * @returns {Promise<{manifest: object, stateText: string, filer: Array<object & {data: Uint8Array}>, fel: string[]}>}
 */
export async function lasSakerhetskopia(indata) {
  const zip = await JSZip.loadAsync(await tillBytes(indata));
  const mf = zip.file("manifest.json");
  if (!mf) throw new Error("manifest.json saknas – filen är ingen säkerhetskopia från portföljen.");
  const manifest = JSON.parse(await mf.async("string"));
  if (manifest.format !== ZIP_FORMAT) throw new Error("Okänt format i manifest.json.");
  if (manifest.version > ZIP_VERSION) throw new Error(`Säkerhetskopian har version ${manifest.version}; appen läser version ${ZIP_VERSION}.`);

  const fel = [];
  const filer = [];
  let stateText = null;
  for (const f of manifest.filer || []) {
    const z = zip.file(f.sokvag);
    if (!z) {
      fel.push(`${f.sokvag} saknas i ZIP-filen.`);
      continue;
    }
    const data = await z.async("uint8array");
    if ((await sha256(data)) !== f.sha256) {
      fel.push(`${f.sokvag}: kontrollsumman stämmer inte – filen är skadad eller ändrad.`);
      continue;
    }
    if (f.typ === "state") stateText = new TextDecoder().decode(data);
    else filer.push({ ...f, data });
  }
  if (stateText === null) throw new Error("state.json saknas eller är skadad – säkerhetskopian kan inte läsas in.");
  return { manifest, stateText, filer, fel };
}

/** Text till förhandsgranskningen: vad som följer med och vad som saknas. */
export function bilagaSammanfattning(manifest) {
  const per = (typ) => (manifest.filer || []).filter((f) => f.typ === typ).length;
  const ut = [`Bilagor: ${per("ritning")} ritningar, ${per("ifc")} IFC-modeller, ${per("protokoll")} protokoll.`];
  for (const s of manifest.saknas || []) ut.push(`Saknas i kopian: ${s.namn} (${s.typ}) – ${s.orsak}`);
  return ut;
}

/** Bilagorna som säkerhetskopian ska försöka hämta. Arkiven skickas in. */
export function bilagekallor(state, { ritningsArkiv, ifcCache, protokoll = [], protokollArkiv }) {
  const ut = [];
  for (const r of state.siteRitningar || []) {
    if (!r.sokvag) continue;
    ut.push({
      typ: "ritning", id: r.id, namn: r.filnamn || r.namn || r.id, sokvag: `ritningar/${r.sokvag}`,
      meta: { lagring: r.lagring, sokvag: r.sokvag },
      hamta: () => ritningsArkiv(r.lagring).hamta(r.sokvag),
    });
  }
  for (const m of state.ifcModeller || []) {
    ut.push({ typ: "ifc", id: m.id, namn: m.filnamn || m.namn || m.id, sokvag: `ifc/${m.id}.json`, meta: { modellId: m.id }, hamta: () => ifcCache.hamta(m.id) });
  }
  for (const p of protokoll) {
    ut.push({
      typ: "protokoll", id: p.id, namn: p.filnamn, sokvag: `protokoll/${p.id}-${p.filnamn}`,
      meta: { projektId: p.projektId, moteNr: p.moteNr, filnamn: p.filnamn, mime: p.mime },
      hamta: () => protokollArkiv.hamtaFil(p),
    });
  }
  return ut;
}

/**
 * Lägger tillbaka bilagorna. Befintliga filer skrivs inte över.
 * @returns {Promise<{aterlagda: number, hoppade: string[], fel: string[]}>}
 */
export async function aterstallBilagor(filer, { ritningsArkiv, ifcCache, protokollArkiv, befintligaProtokoll = [] }) {
  let aterlagda = 0;
  const hoppade = [];
  const fel = [];
  for (const f of filer) {
    try {
      if (f.typ === "ritning") {
        const arkiv = ritningsArkiv(f.meta.lagring);
        if (await arkiv.hamta(f.meta.sokvag).catch(() => null)) {
          hoppade.push(f.namn);
          continue;
        }
        await arkiv.ladda(new Blob([f.data]), f.meta.sokvag);
      } else if (f.typ === "ifc") {
        if (await ifcCache.finns(f.meta.modellId)) {
          hoppade.push(f.namn);
          continue;
        }
        await ifcCache.spara(f.meta.modellId, JSON.parse(new TextDecoder().decode(f.data)));
      } else if (f.typ === "protokoll") {
        if (befintligaProtokoll.some((p) => p.filnamn === f.meta.filnamn && (p.projektId || null) === (f.meta.projektId || null))) {
          hoppade.push(f.namn);
          continue;
        }
        const fil = new File([f.data], f.meta.filnamn, { type: f.meta.mime || "application/octet-stream" });
        await protokollArkiv.ladda(fil, { projektId: f.meta.projektId, moteNr: f.meta.moteNr });
      } else continue;
      aterlagda++;
    } catch (e) {
      fel.push(`${f.namn}: ${e?.message || e}`);
    }
  }
  return { aterlagda, hoppade, fel };
}
