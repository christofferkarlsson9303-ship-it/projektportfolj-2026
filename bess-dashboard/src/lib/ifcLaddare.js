/* Läser en IFC-fil med web-ifc och ger metadata och geometri.

   Funktionen tar ett färdigt initierat IfcAPI utifrån (se lib/ifcApi.js i webbläsaren och testerna i Node),
   så att själva läsningen går att prova utan webbläsare. Inget här rör state eller lagring.

   Per element (mesh i web-ifc): GlobalId, expressID, namn, IFC-klass och omslutande låda, plus geometrin som
   positioner, normaler, index och färg per del. web-ifc ger redan Y upp och meter (enhetsskalan tillämpas),
   så vi transformerar bara hörnen med delens matris. Till sist flyttas hela modellen (geometri och lådor) så
   att fotavtrycket centreras på tomten och lägsta punkt hamnar på marken. */

import { IFC_MAX_OBJEKT, bbFranPositioner, centreringsFlytt, flyttaBb, kompaktaObjekt, slaIhopBb } from "./ifcModell.js";

/** Matris (kolumnvis, 16 tal) tillämpad på en punkt. */
function punkt(m, x, y, z) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

/** Matrisens rotationsdel tillämpad på en normal (vid enhetlig skala; sedan normaliseras den). */
function normal(m, x, y, z) {
  const v = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Lyfter en del ur web-ifc (hörnen ligger i wasm-minnet) till egna typade arrayer i världen. */
function laddaDel(api, modelID, placerad) {
  const geo = api.GetGeometry(modelID, placerad.geometryExpressID);
  try {
    // Kopiera ur wasm-minnet: vyerna ogiltigförklaras när geometrin släpps.
    const hornData = new Float32Array(api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize()));
    const index = new Uint32Array(api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize()));
    const m = placerad.flatTransformation;
    const n = Math.floor(hornData.length / 6);
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const p = punkt(m, hornData[i * 6], hornData[i * 6 + 1], hornData[i * 6 + 2]);
      const q = normal(m, hornData[i * 6 + 3], hornData[i * 6 + 4], hornData[i * 6 + 5]);
      pos.set(p, i * 3);
      nor.set(q, i * 3);
    }
    const c = placerad.color || { x: 0.7, y: 0.7, z: 0.7, w: 1 };
    return { pos, nor, idx: index, farg: [c.x, c.y, c.z, c.w] };
  } finally {
    geo.delete?.();
  }
}

/**
 * @param {object} api       ett initierat web-ifc IfcAPI
 * @param {Uint8Array} data  IFC-filens innehåll
 * @param {{maxObjekt?: number, centrera?: boolean, onFramsteg?: (p: {gjorda: number, totalt: number}) => void}} [val]
 * @returns {{schema: string, objekt: object[], antal: number, avkortad: boolean, geometri: object[], bb: number[]|null, forskjutning: number[]}}
 *   `objekt` är kompakt metadata (för state), `geometri` är { eid, delar: [{pos, nor, idx, farg}] } (för cachen).
 */
export function lasIfc(api, data, { maxObjekt = IFC_MAX_OBJEKT, centrera = true, onFramsteg } = {}) {
  let modelID;
  try {
    modelID = api.OpenModel(data, { COORDINATE_TO_ORIGIN: false });
  } catch (e) {
    throw new Error(`Filen gick inte att läsa som IFC (${e?.message || e}).`);
  }
  if (modelID === undefined || modelID === null || modelID < 0) throw new Error("Filen gick inte att läsa som IFC.");

  try {
    const schema = api.GetModelSchema?.(modelID) || "";
    const element = [];
    const geometri = [];
    let delFel = 0;

    api.StreamAllMeshes(modelID, (mesh, i, totalt) => {
      try {
        const eid = mesh.expressID;
        const linje = api.GetLine(modelID, eid);
        const guid = linje?.GlobalId?.value || "";
        const delar = [];
        for (let k = 0; k < mesh.geometries.size(); k += 1) {
          try {
            delar.push(laddaDel(api, modelID, mesh.geometries.get(k)));
          } catch {
            delFel += 1;
          }
        }
        const bb = slaIhopBb(delar.map((d) => bbFranPositioner(d.pos)));
        if (guid && bb && delar.length) {
          element.push({ guid, eid, namn: linje?.Name?.value || "", klass: api.GetNameFromTypeCode(linje.type) || "", bb });
          geometri.push({ eid, guid, delar });
        }
      } finally {
        mesh.delete?.();
        onFramsteg?.({ gjorda: i + 1, totalt });
      }
    });

    if (!element.length) throw new Error("Filen innehåller inga objekt med geometri.");

    const bb = slaIhopBb(element.map((e) => e.bb));
    const flytt = centrera ? centreringsFlytt(bb) : [0, 0, 0];
    if (flytt.some((v) => v !== 0)) {
      for (const g of geometri) {
        for (const d of g.delar) {
          for (let i = 0; i < d.pos.length; i += 3) {
            d.pos[i] += flytt[0];
            d.pos[i + 1] += flytt[1];
            d.pos[i + 2] += flytt[2];
          }
        }
      }
      for (const e of element) e.bb = flyttaBb(e.bb, flytt);
    }

    const kompakt = kompaktaObjekt(element, maxObjekt);
    // Geometrin sparas bara för objekten som också finns i metadatan, så att de två håller ihop.
    const behall = new Set(kompakt.objekt.map((o) => o.guid));
    return {
      schema,
      objekt: kompakt.objekt,
      antal: kompakt.antal,
      avkortad: kompakt.avkortad,
      geometri: geometri.filter((g) => behall.has(g.guid)).map(({ eid, delar }) => ({ eid, delar })),
      guidPerEid: Object.fromEntries(kompakt.objekt.map((o) => [o.eid, o.guid])),
      bb: bb ? flyttaBb(bb, flytt) : null,
      forskjutning: flytt,
      delFel,
    };
  } finally {
    api.CloseModel(modelID);
  }
}

/** Antal trianglar och hörn i geometrin — för minnesuppskattning och visning. */
export function geometriStorlek(geometri) {
  let tri = 0;
  let horn = 0;
  for (const g of geometri) for (const d of g.delar) {
    tri += d.idx.length / 3;
    horn += d.pos.length / 3;
  }
  return { trianglar: Math.round(tri), horn };
}
