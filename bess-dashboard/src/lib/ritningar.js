/* Ritningar i 3D-vyn: uppladdade PDF:er eller bilder som läggs på marken i skala.

   Filen ligger i Supabase Storage (bucket "ritningar") eller, i lokalt läge, i IndexedDB
   (state/ritningsArkiv.js). I portfolj/state ligger bara metadata: namn, var filen finns,
   skala och placering. Aldrig själva bilden — samma regel som för situationsplanen.

   Skala: en PDF-ritning har sitt pappersformat i punkter (1/72 tum) och en skala 1:N i
   ritningshuvudet. Bredd i meter = papperets bredd i meter × N. N läses ur texten ("SKALA
   1:100") när den går att hitta; annars får användaren ange den. En bild saknar
   pappersformat, så där anges bredden i meter direkt. */

export const PUNKT_M = 0.0254 / 72;

/** Skalan 1:N ur ritningstext. Ritningshuvuden anger ofta skalan per format ("SKALA A3 1:250
 *  A1 1:500"): då väljs den som hör till sidans format. Annars en skala nära ordet "skala",
 *  annars den första rimliga 1:N (10–5000). null om ingen finns. */
export function skalaUrText(text, format = "") {
  const t = String(text || "").replace(/\s+/g, " ");
  const rimlig = (n) => n >= 10 && n <= 5000;
  if (format) {
    const perFormat = t.match(new RegExp(`\\b${format}\\s*1\\s*:\\s*(\\d{2,4})`, "i"));
    if (perFormat && rimlig(Number(perFormat[1]))) return Number(perFormat[1]);
  }
  const nara = t.match(/skala[^0-9]{0,40}1\s*:\s*(\d{2,4})/i);
  if (nara && rimlig(Number(nara[1]))) return Number(nara[1]);
  for (const m of t.matchAll(/(?<![\d.,])1\s*:\s*(\d{2,4})(?![\d])/g)) {
    if (rimlig(Number(m[1]))) return Number(m[1]);
  }
  return null;
}

/** Pappersformat ur sidans mått i punkter: "A1", "A3" … eller "". */
export function pappersformat(bPt, hPt) {
  const kort = Math.min(bPt, hPt) * PUNKT_M * 1000;
  const lang = Math.max(bPt, hPt) * PUNKT_M * 1000;
  const format = [
    ["A0", 841, 1189],
    ["A1", 594, 841],
    ["A2", 420, 594],
    ["A3", 297, 420],
    ["A4", 210, 297],
  ];
  const traff = format.find(([, k, l]) => Math.abs(kort - k) < 6 && Math.abs(lang - l) < 6);
  return traff ? traff[0] : "";
}

/** Ritningens mått på marken i meter. PDF: sidan × skala. Bild: angiven bredd, djupet ur
 *  bildens proportion. */
export function ritningsMatt(r) {
  if (r.sida && Number(r.skala) > 0) {
    return { bredd: r.sida.b * PUNKT_M * Number(r.skala), djup: r.sida.h * PUNKT_M * Number(r.skala) };
  }
  const bredd = Number(r.bredd) > 0 ? Number(r.bredd) : 80;
  const prop = Number(r.proportion) > 0 ? Number(r.proportion) : 1;
  return { bredd, djup: bredd * prop };
}

/** En ny metadatarad för en uppladdad fil. */
export function nyRitning({ id, projektId, filnamn, mime, storlek, lagring, sokvag, sida = null, skala = null, proportion = 1, text = "", etiketter = [] }) {
  return {
    id,
    projektId,
    namn: String(filnamn || "Ritning").replace(/\.[a-z0-9]+$/i, ""),
    filnamn: filnamn || "",
    mime: mime || "",
    storlek: Number(storlek) || 0,
    lagring, // "delad" (Supabase) eller "lokal" (IndexedDB)
    sokvag: sokvag || "",
    sida, // { b, h } i punkter för PDF, annars null
    skala: skala ?? (sida ? skalaUrText(text, pappersformat(sida.b, sida.h)) || 100 : null),
    skalaKalla: sida ? (skalaUrText(text, pappersformat(sida.b, sida.h)) ? "ritningen" : "antagen") : null,
    bredd: sida ? null : 80,
    proportion,
    // Beteckningar på ritningen (SKID 1, +B1a …) med läge i punkter, för att lägga den över enheterna.
    etiketter: etiketter.slice(0, 60).map((e) => ({ namn: e.namn, x: Math.round(e.x * 10) / 10, y: Math.round(e.y * 10) / 10 })),
    x: 0,
    z: 0,
    rotation: 0,
    opacitet: 0.85,
    synlig: true,
    uppladdad: new Date().toISOString(),
  };
}

const TAL = ["skala", "bredd", "x", "z", "rotation", "opacitet"];

/** Fel i en ändring, eller null. Bara placering, skala, namn och synlighet får ändras. */
export function ritningsFel(andring) {
  for (const [k, v] of Object.entries(andring || {})) {
    if (TAL.includes(k)) {
      if (!Number.isFinite(Number(v))) return `${k} måste vara ett tal.`;
      if ((k === "skala" || k === "bredd") && !(Number(v) > 0)) return `${k} måste vara större än noll.`;
      if (k === "opacitet" && (Number(v) < 0.1 || Number(v) > 1)) return "Opaciteten ska vara mellan 0,1 och 1.";
      if ((k === "x" || k === "z") && Math.abs(Number(v)) > 500) return "Placeringen ligger för långt från tomten.";
    } else if (k === "namn") {
      if (!String(v).trim()) return "Namnet får inte vara tomt.";
    } else if (k === "placering") {
      if (!v || !["etiketter", "mitten"].includes(v.satt)) return "Okänd placering.";
    } else if (k === "synlig") {
      if (typeof v !== "boolean") return "Synlig ska vara ja eller nej.";
    } else return `Fältet ${k} kan inte ändras.`;
  }
  return null;
}

/** Kort beskrivning för listan: "A3 · 1:250 · 105 × 74 m". */
export function ritningsText(r) {
  const { bredd, djup } = ritningsMatt(r);
  const m = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
  const delar = [];
  if (r.sida) {
    const f = pappersformat(r.sida.b, r.sida.h);
    if (f) delar.push(f);
    delar.push(`1:${r.skala}${r.skalaKalla === "antagen" ? " (antagen)" : ""}`);
  }
  delar.push(`${m(bredd)} × ${m(djup)} m`);
  return delar.join(" · ");
}

/* ---------- Placering efter etiketter ----------
   Står samma beteckningar på ritningen som på enheterna i 3D-vyn (SKID 1, +B1a, MVS 2 …)
   läggs ritningen så att etiketterna hamnar över enheterna: medelförskjutningen mellan
   etikettens läge på marken och enhetens läge. Ritningen antas ha norr uppåt (vridning 0).
   Kräver minst två par. Avvikelsen (RMS i meter) säger hur väl det stämmer. */

export const ETIKETT = /^(?:(?:SKID|MVS|BESS)\s*\d+|\+?B\d+[a-z]?)$/i;
const nyckel = (t) => String(t || "").replace(/[\s+]/g, "").toUpperCase();

/** Etiketter ur pdfjs textbitar: [{ namn, x, y }] i punkter med y nedåt. Dubbletter tas bort. */
export function etiketterUrText(bitar, sidaHojd) {
  const ut = new Map();
  for (const b of bitar || []) {
    const t = String(b.str || "").trim();
    if (!ETIKETT.test(t) || ut.has(nyckel(t))) continue;
    const h = Math.abs(b.transform?.[3] || 0);
    ut.set(nyckel(t), { namn: t, x: b.transform[4] + (b.width || 0) / 2, y: sidaHojd - b.transform[5] - h / 2 });
  }
  return [...ut.values()];
}

export function placeraEfterEtiketter(etiketter, objekt, sida, skala) {
  if (!sida || !(skala > 0)) return null;
  const m = PUNKT_M * skala;
  const enheter = new Map((objekt || []).filter((o) => o.typ !== "nal").map((o) => [nyckel(o.namn), o]));
  const par = (etiketter || []).map((e) => [e, enheter.get(nyckel(e.namn))]).filter(([, o]) => o);
  if (par.length < 2) return null;
  const lokal = par.map(([e, o]) => ({ o, lx: (e.x - sida.b / 2) * m, lz: (e.y - sida.h / 2) * m }));
  const x = lokal.reduce((s, p) => s + (Number(p.o.x) - p.lx), 0) / lokal.length;
  const z = lokal.reduce((s, p) => s + (Number(p.o.z) - p.lz), 0) / lokal.length;
  const rms = Math.sqrt(lokal.reduce((s, p) => s + (x + p.lx - p.o.x) ** 2 + (z + p.lz - p.o.z) ** 2, 0) / lokal.length);
  const r1 = (v) => Math.round(v * 10) / 10;
  return { x: r1(x), z: r1(z), antal: par.length, avvikelse: Math.round(rms * 100) / 100 };
}
