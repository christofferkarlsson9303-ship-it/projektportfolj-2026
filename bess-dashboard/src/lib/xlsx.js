/* Minimal läsare för .xlsx — utan beroenden.

   En .xlsx är ett zip-arkiv med XML. Vi behöver bara läsa: bladlistan, de
   delade strängarna och cellvärdena i ett blad. Det räcker för UR-loggen och
   liknande tabeller, och håller bundlen fri från ett tungt Excel-bibliotek.

   Zip-delen läser den centrala katalogen (i slutet av filen) och packar upp
   med webbläsarens/Nodes inbyggda DecompressionStream("deflate-raw").
   Formler läses som sitt senast beräknade värde (<v>), vilket är det Excel
   själv visar. */

const td = new TextDecoder("utf-8");

function u16(b, i) {
  return b[i] | (b[i + 1] << 8);
}
function u32(b, i) {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
}

async function inflateRaw(data) {
  const ds = new DecompressionStream("deflate-raw");
  const ut = new Blob([data]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(ut).arrayBuffer());
}

/** Läser ett zip-arkiv till { sökväg: Uint8Array }. Bara det som behövs för xlsx. */
export async function lasZip(buffer) {
  const b = new Uint8Array(buffer);
  // End of central directory: signatur 0x06054b50, sökes bakifrån.
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Filen är inte ett giltigt Excel-dokument (zip saknas).");

  const antal = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const filer = {};

  for (let n = 0; n < antal; n++) {
    if (u32(b, p) !== 0x02014b50) throw new Error("Trasig zip-katalog.");
    const metod = u16(b, p + 10);
    const komprStorlek = u32(b, p + 20);
    const namnLangd = u16(b, p + 28);
    const extraLangd = u16(b, p + 30);
    const kommLangd = u16(b, p + 32);
    const lokal = u32(b, p + 42);
    const namn = td.decode(b.subarray(p + 46, p + 46 + namnLangd));
    p += 46 + namnLangd + extraLangd + kommLangd;

    // Lokalt huvud: datat börjar efter dess egna namn- och extrafält.
    const start = lokal + 30 + u16(b, lokal + 26) + u16(b, lokal + 28);
    const data = b.subarray(start, start + komprStorlek);
    if (metod === 0) filer[namn] = data;
    else if (metod === 8) filer[namn] = await inflateRaw(data);
    // Andra metoder förekommer inte i Office-filer — hoppas över.
  }
  return filer;
}

/* ---------- XML ---------- */

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function avkoda(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENT[e] ?? m;
  });
}

const text = (xml) =>
  avkoda([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/** Kolumnbokstäver → index: A→0, Z→25, AA→26. */
export function kolIndex(ref) {
  const bokst = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const c of bokst) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel-serienummer → ISO-datum (1900-systemet, med Excels skottårsbugg). */
export function excelDatum(serie) {
  const n = Number(serie);
  if (!Number.isFinite(n) || n <= 0) return "";
  const ms = Math.round((n - 25569) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Läser en arbetsbok till { blad: [{ namn, rader: [[cell, …], …] }] }.
 *  Tomma celler blir "". Tal returneras som tal, text som text. */
export async function lasXlsx(buffer) {
  const filer = await lasZip(buffer);
  const las = (s) => (filer[s] ? td.decode(filer[s]) : "");

  const delade = [...las("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => text(m[1]));

  const bok = las("xl/workbook.xml");
  const rels = las("xl/_rels/workbook.xml.rels");
  const mal = Object.fromEntries(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      m[0].match(/Id="([^"]+)"/)?.[1],
      m[0].match(/Target="([^"]+)"/)?.[1],
    ])
  );

  const blad = [...bok.matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const namn = avkoda(m[0].match(/name="([^"]*)"/)?.[1] || "");
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1];
    let sokvag = mal[rid] || "";
    sokvag = sokvag.startsWith("/") ? sokvag.slice(1) : "xl/" + sokvag.replace(/^\.\//, "");
    const xml = las(sokvag);

    const rader = [];
    for (const [, nr, inne] of xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const rad = [];
      for (const c of inne.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attr = c[1];
        const kropp = c[2] || "";
        const ref = attr.match(/\br="([A-Z]+)\d+"/)?.[1];
        if (!ref) continue;
        const typ = attr.match(/\bt="(\w+)"/)?.[1];
        const v = kropp.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let varde = "";
        if (typ === "s") varde = delade[Number(v)] ?? "";
        else if (typ === "inlineStr") varde = text(kropp);
        else if (typ === "str" || typ === "e") varde = avkoda(v ?? "");
        else if (typ === "b") varde = v === "1";
        else if (v !== undefined && v !== "") varde = Number(v);
        rad[kolIndex(ref)] = varde;
      }
      for (let i = 0; i < rad.length; i++) if (rad[i] === undefined) rad[i] = "";
      rader[Number(nr) - 1] = rad;
    }
    for (let i = 0; i < rader.length; i++) if (!rader[i]) rader[i] = [];
    return { namn, rader };
  });

  return { blad };
}
