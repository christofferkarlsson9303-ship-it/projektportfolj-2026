/* IFC-modeller i portföljen — metadata som sparas i state, och hjälpare för det som läses ur en IFC-fil.
   Ren logik utan web-ifc och utan WebGL, så att den går att testa.

   Vad som sparas var:
   - state.ifcModeller (portfolj/state, delas): en rad per modell med kompakt metadata om varje objekt —
     GlobalId (guid), expressID (eid), namn, IFC-klass och omslutande låda (bb) i siten-koordinater.
   - IndexedDB i webbläsaren (lib/ifcCache.js, delas INTE): själva geometrin. Andra som delar portföljen ser
     alltså objekten och ärendena men måste ladda upp samma IFC-fil för att se modellen i 3D.

   Koordinater: three.js, högerhänt, +Y upp, meter, som resten av siten. web-ifc levererar Y-upp i meter
   (enhetsskalan tillämpas), och modellen flyttas så att dess fotavtryck centreras på tomten och dess lägsta
   punkt hamnar på marken (y = 0) — georefererade modeller ligger annars kilometer från origo. */

export const IFC_MAX_OBJEKT = 3000;
export const IFC_MAX_MODELLER = 3;
/** Klasser utan egen geometri av intresse — rum, öppningar och liknande ritas inte och listas inte. */
export const IFC_UTELAMNA = new Set(["IfcSpace", "IfcOpeningElement", "IfcAnnotation", "IfcGrid", "IfcVirtualElement"]);

const r3 = (n) => Math.round(n * 1000) / 1000;
const arTal = (n) => typeof n === "number" && Number.isFinite(n);

/** Omslutande låda [minX, minY, minZ, maxX, maxY, maxZ] ur en lista positioner (x, y, z, x, y, z …), eller null. */
export function bbFranPositioner(pos) {
  if (!pos || pos.length < 3) return null;
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < pos.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const v = pos[i + k];
      if (v < bb[k]) bb[k] = v;
      if (v > bb[k + 3]) bb[k + 3] = v;
    }
  }
  return bb.every(Number.isFinite) ? bb : null;
}

/** Slår ihop lådor (null hoppas över). */
export function slaIhopBb(lador) {
  const ut = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  let nagon = false;
  for (const b of lador) {
    if (!b) continue;
    nagon = true;
    for (let k = 0; k < 3; k += 1) {
      ut[k] = Math.min(ut[k], b[k]);
      ut[k + 3] = Math.max(ut[k + 3], b[k + 3]);
    }
  }
  return nagon ? ut : null;
}

/** Förflyttningen som lägger modellens fotavtryck mitt på tomten och dess lägsta punkt på marken. */
export function centreringsFlytt(bb) {
  if (!bb) return [0, 0, 0];
  return [r3(-(bb[0] + bb[3]) / 2), r3(-bb[1]), r3(-(bb[2] + bb[5]) / 2)];
}

export const flyttaBb = (bb, [dx, dy, dz]) => [r3(bb[0] + dx), r3(bb[1] + dy), r3(bb[2] + dz), r3(bb[3] + dx), r3(bb[4] + dy), r3(bb[5] + dz)];

/**
 * Metadata som sparas i state: ett objekt per element med geometri, högst `max`. Klasser i IFC_UTELAMNA
 * och objekt utan låda hoppas över. Samma GUID två gånger ger ett objekt.
 * @returns {{objekt: object[], antal: number, avkortad: boolean}} antal = alla giltiga objekt i filen
 */
export function kompaktaObjekt(lista, max = IFC_MAX_OBJEKT) {
  const sedda = new Set();
  const ut = [];
  let antal = 0;
  for (const o of lista || []) {
    if (!o?.guid || !o.bb || IFC_UTELAMNA.has(o.klass) || sedda.has(o.guid)) continue;
    sedda.add(o.guid);
    antal += 1;
    if (ut.length < max) ut.push({ guid: String(o.guid), eid: Number(o.eid) || 0, namn: String(o.namn || "").slice(0, 120), klass: String(o.klass || ""), bb: o.bb.map(r3) });
  }
  return { objekt: ut, antal, avkortad: antal > ut.length };
}

/** En rad i state.ifcModeller. */
export function ifcModellRad({ id, projektId, namn, filnamn, storlek, schema, objekt, antal, avkortad, forskjutning, datum }) {
  return {
    id,
    projektId,
    namn: (String(namn || "").trim() || String(filnamn || "").trim() || "IFC-modell").slice(0, 120),
    filnamn: String(filnamn || ""),
    storlek: Number(storlek) || 0,
    schema: String(schema || ""),
    datum: datum || new Date().toISOString(),
    antal: Number(antal) || objekt.length,
    avkortad: !!avkortad,
    forskjutning: forskjutning || [0, 0, 0],
    objekt,
  };
}

/** Varför en modellrad inte kan sparas, eller null. */
export function ifcModellFel(m) {
  if (!m || typeof m !== "object") return "Modellen saknas.";
  if (!m.id || typeof m.id !== "string") return "Modellen saknar id.";
  if (!m.projektId) return "Modellen saknar projekt.";
  if (!Array.isArray(m.objekt)) return "Modellen saknar objekt.";
  if (m.objekt.length > IFC_MAX_OBJEKT) return `Modellen har fler än ${IFC_MAX_OBJEKT} objekt.`;
  for (const o of m.objekt) {
    if (!o || typeof o.guid !== "string" || !o.guid) return "Ett objekt saknar GlobalId.";
    if (!Array.isArray(o.bb) || o.bb.length !== 6 || !o.bb.every(arTal)) return `Objektet ${o.guid} har en ogiltig låda.`;
    if (o.bb[0] > o.bb[3] || o.bb[1] > o.bb[4] || o.bb[2] > o.bb[5]) return `Objektet ${o.guid} har en låda där min är större än max.`;
  }
  return null;
}

/** Ett IFC-objekt som ett objekt på siten: id = GlobalId, så att ärenden, BCF och 3D pratar om samma sak. */
export function ifcObjektSomSite(o, modell) {
  return { id: o.guid, typ: "ifc", namn: o.namn || o.klass || o.guid, klass: o.klass, eid: o.eid, bb: o.bb, modellId: modell.id, projektId: modell.projektId };
}

/** Alla IFC-objekt för ett projekt som objekt på siten. */
export function ifcObjektForProjekt(state, projektId) {
  const ut = [];
  for (const m of state?.ifcModeller || []) if (m.projektId === projektId) for (const o of m.objekt || []) ut.push(ifcObjektSomSite(o, m));
  return ut;
}

/** Söker bland objekten på namn, klass eller GlobalId (versaler och gemener spelar ingen roll). Högst `max` träffar. */
export function sokIfcObjekt(lista, fraga, max = 50) {
  const q = String(fraga || "").trim().toLowerCase();
  if (!q) return [];
  const ut = [];
  for (const o of lista) {
    if ((o.namn || "").toLowerCase().includes(q) || (o.klass || "").toLowerCase().includes(q) || (o.id || "").toLowerCase().includes(q)) {
      ut.push(o);
      if (ut.length >= max) break;
    }
  }
  return ut;
}

/** Läsbar storlek, till exempel "12,4 MB". */
export function fmtStorlek(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} kB`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Klassnamn utan "Ifc"-prefixet, till exempel "BuildingElementProxy". */
export const kortKlass = (k) => String(k || "").replace(/^Ifc/, "") || "Okänd";
