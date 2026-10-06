/* Text ur ett uppladdat mötesprotokoll — PDF eller Word — i webbläsaren.

   Ingenting skickas någonstans: filen läses lokalt och bara texten går vidare
   till tolkningen i lib/protokolltolkning.js.

   PDF: pdfjs-dist, laddas först när ett protokoll faktiskt läses in. Workern
   körs i huvudtråden, eftersom bygget är en enda fil.
   Textbitarna sätts ihop till rader efter y-läge, och en tom rad läggs in där
   avståndet till föregående rad är tydligt större än radavståndet — det är så
   stycken syns i en PDF.

   Word (.docx): word/document.xml via jszip (finns redan genom exceljs).
   Varje <w:p> blir en rad, tomma stycken blir tomma rader.

   Äldre .doc och .odt går inte att läsa här; då returneras null och
   protokollet arkiveras som förut, utan tolkning. */

export async function lasProtokollText(fil) {
  const namn = (fil.name || "").toLowerCase();
  if (namn.endsWith(".pdf")) return lasPdf(await fil.arrayBuffer());
  if (namn.endsWith(".docx")) return lasDocx(await fil.arrayBuffer());
  return null;
}

async function lasPdf(buffer) {
  // Workern körs i huvudtråden: pdfjs använder globalThis.pdfjsWorker när den
  // finns. Ett protokoll är några sidor, så det märks inte, och bygget slipper
  // en base64-kodad workerfil.
  if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0 }).promise;
  const sidor = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const sida = await doc.getPage(i);
    const innehall = await sida.getTextContent();
    sidor.push(raderUrTextbitar(innehall.items));
  }
  await doc.destroy();
  return sidor.join("\n\n");
}

/** Textbitar från pdfjs → rader. Exporteras för test. */
export function raderUrTextbitar(bitar) {
  const rader = [];
  for (const b of bitar) {
    if (typeof b.str !== "string") continue;
    const y = Math.round(b.transform[5]);
    const x = b.transform[4];
    const h = Math.abs(b.transform[3]) || b.height || 10;
    let rad = rader.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.3));
    if (!rad) {
      rad = { y, h, bitar: [] };
      rader.push(rad);
    }
    rad.bitar.push({ x, w: b.width || 0, h, str: b.str });
  }
  rader.sort((a, b) => b.y - a.y);
  const ut = [];
  let forra = null;
  for (const r of rader) {
    // Mellanslag bara där det finns ett synligt glapp. PDF:er delar ofta ett
    // ord i flera bitar ("20 2 6", "Joh an") utan att det står något mellanrum.
    let text = "";
    let slutX = null;
    for (const b of r.bitar.sort((a, c) => a.x - c.x)) {
      const glapp = slutX === null ? 0 : b.x - slutX;
      if (text && glapp > b.h * 0.18 && !/\s$/.test(text) && !/^\s/.test(b.str)) text += " ";
      text += b.str;
      slutX = b.x + b.w;
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (forra && forra.y - r.y > Math.max(forra.h, r.h) * 1.9) ut.push("");
    ut.push(text);
    forra = r;
  }
  return ut.join("\n");
}

async function lasDocx(buffer) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return null;
  return xml
    .split(/<\/w:p>/)
    .map((p) =>
      [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
        .map((m) => (m[1] !== undefined ? m[1] : " "))
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    )
    .join("\n");
}
