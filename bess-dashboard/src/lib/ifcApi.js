/* web-ifc i webbläsaren. Laddas först när någon importerar en IFC-fil, så att den vanliga appen
   inte får med parsern (≈1,6 MB wasm) i sin startbunt. Wasm-filen ligger i bygget, aldrig på CDN,
   och körs enkeltrådat — då behövs varken SharedArrayBuffer eller särskilda svarshuvuden. */

let lofte = null;

/** Ett initierat IfcAPI, delat mellan importerna. Misslyckas initieringen kan nästa försök börja om. */
export function hamtaIfcApi() {
  if (!lofte) {
    lofte = (async () => {
      const [{ IfcAPI }, wasm] = await Promise.all([import("web-ifc"), import("web-ifc/web-ifc.wasm?url")]);
      const api = new IfcAPI();
      const url = wasm.default;
      await api.Init((fil) => (String(fil).endsWith(".wasm") ? url : fil), true);
      return api;
    })().catch((e) => {
      lofte = null;
      throw e;
    });
  }
  return lofte;
}
