/* DXF-ritningar på siten.

   DXF är AutoCADs öppna utbytesformat. Till skillnad från en PDF anger filen sina enheter
   ($INSUNITS), så ritningen kan läggas på marken i exakt skala. Här finns bara ren logik:
   läsa filen, plocka ut linjer och texter i ritningens koordinater och räkna om till meter.
   Själva ritandet till canvas ligger i ritningRender.js.

   DWG (AutoCADs eget, stängda format) läses inte här. Spara som DXF i AutoCAD eller med en
   konverterare. Se docs/modellarenden.md. */

import DxfParser from "dxf-parser";
import { ETIKETT } from "./ritningar.js";

/** $INSUNITS → [namn, meter per enhet]. 0 eller saknas = enhetslös. */
export const DXF_ENHETER = {
  1: ["tum", 0.0254],
  2: ["fot", 0.3048],
  4: ["mm", 0.001],
  5: ["cm", 0.01],
  6: ["m", 1],
};

export const arDxf = (fil) => /\.dxf$/i.test(fil?.name || "") || /dxf/i.test(fil?.type || "");
export const arDwg = (fil) => /\.dwg$/i.test(fil?.name || "") || /dwg/i.test(fil?.type || "");

/** Texten ur filens bytes. Äldre DXF är ofta Windows-1252 (å, ä, ö); nyare är UTF-8. */
export function dxfText(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Tolkar DXF-text. Kastar ett begripligt fel om det inte är en DXF. */
export function lasDxf(text) {
  if (!/\bSECTION\b/.test(String(text || "").slice(0, 20000))) throw new Error("Filen ser inte ut som en DXF.");
  let dxf;
  try {
    dxf = new DxfParser().parseSync(text);
  } catch (e) {
    throw new Error(`DXF-filen gick inte att läsa: ${e?.message || e}`);
  }
  if (!dxf || !Array.isArray(dxf.entities)) throw new Error("DXF-filen saknar ritningsobjekt.");
  return dxf;
}

/** Enheten: { namn, tillMeter, antagen }. Utan $INSUNITS gissas mm eller m efter ritningens
 *  storlek (en site är 10–5000 m), och gissningen märks som antagen. */
export function dxfEnhet(header, breddEnheter = 0) {
  const kod = Number(header?.$INSUNITS);
  if (DXF_ENHETER[kod]) return { namn: DXF_ENHETER[kod][0], tillMeter: DXF_ENHETER[kod][1], antagen: false };
  const somMm = breddEnheter / 1000;
  return somMm >= 10 && somMm <= 5000 ? { namn: "mm", tillMeter: 0.001, antagen: true } : { namn: "m", tillMeter: 1, antagen: true };
}

/* ---------- Geometri ---------- */

const I = [1, 0, 0, 1, 0, 0]; // [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const pkt = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const skalaAv = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
const vinkelAv = (m) => Math.atan2(m[1], m[0]);

function bage(cx, cy, r, a0, a1, steg = 32) {
  let slut = a1;
  while (slut <= a0) slut += Math.PI * 2;
  const n = Math.max(4, Math.ceil(((slut - a0) / (Math.PI * 2)) * steg));
  const ut = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((slut - a0) * i) / n;
    ut.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return ut;
}

/** Polylinje med bulge (bågsegment) → punkter. */
function polylinje(hornen, sluten) {
  const v = hornen.filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  const ut = [];
  const n = sluten ? v.length : v.length - 1;
  for (let i = 0; i < n; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    if (!i) ut.push([a.x, a.y]);
    const bu = Number(a.bulge) || 0;
    if (!bu) {
      ut.push([b.x, b.y]);
      continue;
    }
    const theta = 4 * Math.atan(bu);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const korda = Math.hypot(dx, dy);
    if (!korda) continue;
    const r = korda / (2 * Math.sin(Math.abs(theta) / 2));
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const h = Math.sqrt(Math.max(0, r * r - (korda / 2) ** 2)) * Math.sign(bu) * (Math.abs(theta) > Math.PI ? -1 : 1);
    const cx = mx - (h * dy) / korda;
    const cy = my + (h * dx) / korda;
    const a0 = Math.atan2(a.y - cy, a.x - cx);
    const steg = Math.max(4, Math.ceil((Math.abs(theta) / (Math.PI * 2)) * 32));
    for (let k = 1; k <= steg; k++) {
      const t = a0 + (theta * k) / steg;
      ut.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
  }
  if (v.length === 1) ut.push([v[0].x, v[0].y]);
  return ut;
}

/** MTEXT-formatkoder bort: \P radbrytning, {\fArial;…}, \A1; osv. */
export function rensaMtext(t) {
  return String(t || "")
    .replace(/\\P/g, " ")
    .replace(/\\[ACcFfHQTWp][^;\\{}]*;/g, "")
    .replace(/\\[LlOoKk]/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Synliga lager: av, frysta och negativ färg räknas som dolda. */
function doldaLager(dxf) {
  const ut = new Set();
  for (const [namn, l] of Object.entries(dxf?.tables?.layer?.layers || {})) {
    if (l.visible === false || l.frozen || Number(l.color) < 0) ut.add(namn);
  }
  return ut;
}

/** Linjer och texter i ritningens koordinater (y uppåt), med omfång.
 *  { linjer: [[x,y][]], texter: [{ x, y, h, text, rot }], omfang: { minX, minY, maxX, maxY } | null } */
export function dxfGeometri(dxf) {
  const linjer = [];
  const texter = [];
  const dolda = doldaLager(dxf);
  const block = dxf?.blocks || {};

  const lagg = (m, punkter) => {
    if (punkter.length >= 2) linjer.push(punkter.map(([x, y]) => pkt(m, x, y)));
  };

  const ritaEntiteter = (lista, m, djup) => {
    for (const e of lista || []) {
      if (e.visible === false || (e.layer && dolda.has(e.layer))) continue;
      switch (e.type) {
        case "LINE":
          if (e.vertices?.length >= 2) lagg(m, e.vertices.map((p) => [p.x, p.y]));
          break;
        case "LWPOLYLINE":
        case "POLYLINE":
          lagg(m, polylinje(e.vertices || [], !!(e.shape || e.closed)));
          break;
        case "CIRCLE":
          lagg(m, bage(e.center.x, e.center.y, e.radius, 0, Math.PI * 2, 48));
          break;
        case "ARC":
          lagg(m, bage(e.center.x, e.center.y, e.radius, e.startAngle, e.endAngle));
          break;
        case "ELLIPSE": {
          const { center: c, majorAxisEndPoint: a, axisRatio: k } = e;
          const R = Math.hypot(a.x, a.y);
          const vr = Math.atan2(a.y, a.x);
          const t0 = e.startAngle ?? 0;
          const t1 = e.endAngle ?? Math.PI * 2;
          const p = bage(0, 0, 1, t0, t1, 48).map(([x, y]) => {
            const ex = x * R;
            const ey = y * R * k;
            return [c.x + ex * Math.cos(vr) - ey * Math.sin(vr), c.y + ex * Math.sin(vr) + ey * Math.cos(vr)];
          });
          lagg(m, p);
          break;
        }
        case "SPLINE": {
          const p = (e.fitPoints?.length ? e.fitPoints : e.controlPoints) || [];
          lagg(m, p.map((q) => [q.x, q.y]));
          break;
        }
        case "SOLID":
        case "3DFACE":
          if (e.points?.length >= 3) lagg(m, [...e.points, e.points[0]].map((q) => [q.x, q.y]));
          break;
        case "TEXT":
        case "MTEXT": {
          const p = e.type === "TEXT" ? e.startPoint : e.position;
          const text = e.type === "MTEXT" ? rensaMtext(e.text) : String(e.text || "").trim();
          if (!p || !text) break;
          const [x, y] = pkt(m, p.x, p.y);
          const h = (Number(e.textHeight || e.height) || 1) * skalaAv(m);
          const rot = ((Number(e.rotation) || 0) * Math.PI) / 180 + vinkelAv(m);
          texter.push({ x, y, h, text, rot });
          break;
        }
        case "INSERT": {
          const b = block[e.name];
          if (!b || djup > 8) break;
          const sx = Number(e.xScale ?? 1) || 1;
          const sy = Number(e.yScale ?? 1) || 1;
          const v = ((Number(e.rotation) || 0) * Math.PI) / 180;
          const bas = b.position || { x: 0, y: 0 };
          const rader = Math.max(1, Number(e.rowCount) || 1);
          const kolumner = Math.max(1, Number(e.columnCount) || 1);
          for (let r = 0; r < rader; r++) {
            for (let k = 0; k < kolumner; k++) {
              const ox = k * (Number(e.columnSpacing) || 0);
              const oy = r * (Number(e.rowSpacing) || 0);
              // Block → insättning: flytta basen till origo, skala, vrid, flytta till insättningspunkten.
              const lokal = mul(
                [Math.cos(v), Math.sin(v), -Math.sin(v), Math.cos(v), e.position.x, e.position.y],
                mul([sx, 0, 0, sy, 0, 0], [1, 0, 0, 1, ox - bas.x, oy - bas.y]),
              );
              ritaEntiteter(b.entities, mul(m, lokal), djup + 1);
            }
          }
          break;
        }
        default:
          break; // HATCH, DIMENSION, POINT m.fl. ritas inte
      }
    }
  };
  ritaEntiteter(dxf?.entities, I, 0);

  let omfang = null;
  const utoka = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!omfang) omfang = { minX: x, minY: y, maxX: x, maxY: y };
    else {
      omfang.minX = Math.min(omfang.minX, x);
      omfang.minY = Math.min(omfang.minY, y);
      omfang.maxX = Math.max(omfang.maxX, x);
      omfang.maxY = Math.max(omfang.maxY, y);
    }
  };
  for (const l of linjer) for (const [x, y] of l) utoka(x, y);
  for (const t of texter) utoka(t.x, t.y);
  return { linjer, texter, omfang };
}

/* PDF-ritningar har sidans mått i punkter (1/72 tum) och skala 1:N; resten av ritningskoden
   räknar så. En DXF beskrivs likadant med skala 1: sidan i "punkter" där en punkt är
   PUNKT_M meter i verkligheten. Då fungerar mått, text och placering efter etiketter som för PDF. */
const PUNKT_M = 0.0254 / 72;

/** Allt uppladdningen behöver: { sida, etiketter, enhet, bredd, djup, geometri }.
 *  Kastar om ritningen saknar ritbara objekt. */
export function dxfUnderlag(dxf) {
  const geometri = dxfGeometri(dxf);
  const o = geometri.omfang;
  if (!o || o.maxX - o.minX <= 0 || o.maxY - o.minY <= 0) throw new Error("DXF-filen innehåller inga linjer eller texter som går att rita.");
  const enhet = dxfEnhet(dxf.header, o.maxX - o.minX);
  const bredd = (o.maxX - o.minX) * enhet.tillMeter;
  const djup = (o.maxY - o.minY) * enhet.tillMeter;
  const tillPt = enhet.tillMeter / PUNKT_M;
  const sida = { b: Math.round(bredd / PUNKT_M), h: Math.round(djup / PUNKT_M) };
  const sett = new Set();
  const etiketter = [];
  for (const t of geometri.texter) {
    const namn = t.text.trim();
    const nyckel = namn.replace(/[\s+]/g, "").toUpperCase();
    if (!ETIKETT.test(namn) || sett.has(nyckel)) continue;
    sett.add(nyckel);
    // y nedåt från ritningens överkant, som i en PDF.
    etiketter.push({ namn, x: (t.x - o.minX) * tillPt, y: (o.maxY - t.y) * tillPt });
  }
  return { sida, etiketter, enhet, bredd, djup, geometri };
}
