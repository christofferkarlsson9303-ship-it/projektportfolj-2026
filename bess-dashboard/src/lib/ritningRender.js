/* Ritar en uppladdad ritning till en canvas för 3D-vyn.

   PDF: första sidan med pdfjs-dist (samma laddning som lib/protokolltext.js), upp till
   MAX_PX på längsta sidan så att linjer och text syns när man går nära, och sidans text för
   skalan i ritningshuvudet. Bild: ritas rakt av. Canvasen blir en textur i SiteScen; den
   sparas aldrig. */

import { etiketterUrText } from "./ritningar.js";

const MAX_PX = 4096;

async function pdfjs() {
  if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  return import("pdfjs-dist/build/pdf.min.mjs");
}

export const arPdf = (fil) => /pdf/i.test(fil?.type || "") || /\.pdf$/i.test(fil?.name || "");

/** Läser första sidans mått (punkter) och text, utan att rita. För uppladdningen. */
export async function lasPdfSida(blob) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise;
  try {
    const sida = await doc.getPage(1);
    const vp = sida.getViewport({ scale: 1 });
    const bitar = (await sida.getTextContent()).items;
    const text = bitar.map((b) => b.str || "").join(" ");
    return { sida: { b: Math.round(vp.width), h: Math.round(vp.height) }, text, etiketter: etiketterUrText(bitar, vp.height), sidor: doc.numPages };
  } finally {
    await doc.destroy();
  }
}

/** Ritningen som canvas: { canvas, proportion } där proportion = höjd/bredd. */
export async function ritaRitning(blob, { pdf } = {}) {
  if (pdf) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise;
    try {
      const sida = await doc.getPage(1);
      const bas = sida.getViewport({ scale: 1 });
      const vp = sida.getViewport({ scale: MAX_PX / Math.max(bas.width, bas.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white"; // papperet, bildinnehåll — inte en gränssnittsfärg
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await sida.render({ canvasContext: ctx, viewport: vp }).promise;
      return { canvas, proportion: canvas.height / canvas.width };
    } finally {
      await doc.destroy();
    }
  }
  const bild = await createImageBitmap(blob);
  const skala = Math.min(1, MAX_PX / Math.max(bild.width, bild.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bild.width * skala);
  canvas.height = Math.round(bild.height * skala);
  canvas.getContext("2d").drawImage(bild, 0, 0, canvas.width, canvas.height);
  bild.close?.();
  return { canvas, proportion: canvas.height / canvas.width };
}
