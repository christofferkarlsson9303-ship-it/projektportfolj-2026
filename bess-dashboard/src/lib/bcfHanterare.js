/* BCF 2.1 — export och import av ärenden som .bcfzip.

   Ren logik utan WebGL och utan DOM: XML skrivs som text och läses av en liten
   parser för den delmängd BCF använder, så att allt går att testa i Node. Zip
   hanteras av JSZip. Scenen levererar bara skärmdumpen (PNG-bytes) utifrån.

   Ett ärende (UR/ÄTA-post) blir ett BCF-topic med tre filer i en mapp uppkallad
   efter topic-GUID: markup.bcf, viewpoint.bcfv och snapshot.png, plus bcf.version
   och project.bcfp i roten.

   Koordinater: appen är three.js (Y upp, högerhänt). BCF/IFC är Z upp, så en punkt
   (x, y, z) i appen är (x, −z, y) i BCF. Kameran skrivs som position, riktning och
   upp-vektor; BCF har inget mål, så vid import läggs målet CAMERA_AVSTAND meter
   framför kameran om modellens storlek inte är känd.

   Det som inte finns i BCF ligger i <Labels> (ata-nr, ata-status, ata-klass) så att
   en export följd av en import ger samma ärende tillbaka. Kommentarer läses inte in —
   antalet som hoppas över rapporteras. */

import JSZip from "jszip";

export const BCF_VERSION = "2.1";
export const CAMERA_AVSTAND = 10;
export const STANDARD_FOV = 55;
const URSPRUNG = "Projektportfölj";

/* ---------- GUID ---------- */

const hex = (n) => n.toString(16).padStart(2, "0");

/** UUID v4 som text i gemener — BCF:s Guid. */
export function nyGuid(slump = globalThis.crypto) {
  const b = new Uint8Array(16);
  if (slump?.getRandomValues) slump.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(hex).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const arGuid = (s) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** IFC:s 22 tecken långa GlobalId (base64-liknande). */
export const arIfcGuid = (s) => typeof s === "string" && /^[0-9A-Za-z_$]{22}$/.test(s);

/* ---------- Koordinater ---------- */

/** Appens punkt (Y upp) till BCF (Z upp). */
export const tillBcf = ([x, y, z]) => [x, -z, y];
/** BCF-punkt (Z upp) till appen (Y upp). Inversen av tillBcf. */
export const franBcf = ([x, y, z]) => [x, z, -y];

const norm = (v) => {
  const l = Math.hypot(...v);
  return l > 1e-12 ? v.map((n) => n / l) : [0, 0, -1];
};

/** Kameravy → BCF:s PerspectiveCamera-värden. */
export function viewpointTillBcfKamera(vp) {
  const pos = tillBcf(vp.cameraPosition);
  const dir = norm(tillBcf(vp.target).map((v, i) => v - pos[i]));
  // Upp är +Z; rakt upp- eller nedåtblick ger en godtycklig vågrät upp-vektor.
  const upp = Math.abs(dir[2]) > 0.999 ? [0, 1, 0] : [0, 0, 1];
  return { position: pos, riktning: dir, upp, fov: vp.fov };
}

/** BCF:s kamera → appens viewpoint. `avstand` är hur långt framför kameran målet läggs. */
export function bcfKameraTillViewpoint(k, avstand = CAMERA_AVSTAND) {
  const pos = franBcf(k.position);
  const dir = norm(franBcf(k.riktning));
  return { cameraPosition: pos.map(r3), target: pos.map((v, i) => r3(v + dir[i] * avstand)), fov: k.fov };
}

const r3 = (n) => Math.round(n * 1000) / 1000;
const r6 = (n) => Math.round(n * 1e6) / 1e6;

/* ---------- XML: skriva ---------- */

const ENTITETER = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
export const xmlEsc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ENTITETER[c]).replace(/[^\t\n\r\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu, "");

const tagg = (namn, innehall, attr = {}) => {
  const a = Object.entries(attr)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => ` ${k}="${xmlEsc(v)}"`)
    .join("");
  return innehall === undefined || innehall === null ? `<${namn}${a}/>` : `<${namn}${a}>${innehall}</${namn}>`;
};
const text = (namn, v, attr) => (v === undefined || v === null || v === "" ? "" : tagg(namn, xmlEsc(v), attr));
const XML_HUVUD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const vektor = (namn, v) => tagg(namn, `${tagg("X", r6(v[0]))}${tagg("Y", r6(v[1]))}${tagg("Z", r6(v[2]))}`);

/* ---------- XML: läsa ---------- */

const ENTITET_TILL_TECKEN = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function xmlAvkoda(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTITET_TILL_TECKEN[e] ?? m;
  });
}

/**
 * Läser XML till ett träd: { namn, attr, barn, text }. Tål deklaration, kommentarer, CDATA,
 * enkla och dubbla citattecken i attribut och namnrymdsprefix (prefixet tas bort). Kastar ett
 * Error på text som inte är välformad (omatchade taggar, oavslutat element).
 */
export function parsaXml(kalla) {
  const s = String(kalla ?? "").replace(/^﻿/, "");
  let i = 0;
  const stack = [];
  let rot = null;
  const lokal = (n) => n.replace(/^[^:]+:/, "");
  const fel = (txt) => new Error(`Ogiltig XML: ${txt}`);

  while (i < s.length) {
    if (s[i] !== "<") {
      const j = s.indexOf("<", i);
      const raw = s.slice(i, j === -1 ? s.length : j);
      if (stack.length && raw.trim()) stack.at(-1).text += xmlAvkoda(raw);
      else if (!stack.length && raw.trim()) throw fel("text utanför rotelementet");
      i = j === -1 ? s.length : j;
      continue;
    }
    if (s.startsWith("<!--", i)) {
      const j = s.indexOf("-->", i + 4);
      if (j === -1) throw fel("oavslutad kommentar");
      i = j + 3;
    } else if (s.startsWith("<![CDATA[", i)) {
      const j = s.indexOf("]]>", i + 9);
      if (j === -1) throw fel("oavslutad CDATA");
      if (stack.length) stack.at(-1).text += s.slice(i + 9, j);
      i = j + 3;
    } else if (s.startsWith("<?", i)) {
      const j = s.indexOf("?>", i + 2);
      if (j === -1) throw fel("oavslutad deklaration");
      i = j + 2;
    } else if (s.startsWith("<!", i)) {
      const j = s.indexOf(">", i + 2);
      if (j === -1) throw fel("oavslutad deklaration");
      i = j + 1;
    } else if (s[i + 1] === "/") {
      const j = s.indexOf(">", i + 2);
      if (j === -1) throw fel("oavslutad sluttagg");
      const namn = lokal(s.slice(i + 2, j).trim());
      const nod = stack.pop();
      if (!nod || nod.namn !== namn) throw fel(`sluttaggen </${namn}> matchar inte ${nod ? `<${nod.namn}>` : "något öppet element"}`);
      i = j + 1;
    } else {
      // Starttagg: läs till > men hoppa över citerade attributvärden.
      let j = i + 1;
      let citat = null;
      while (j < s.length) {
        const c = s[j];
        if (citat) {
          if (c === citat) citat = null;
        } else if (c === '"' || c === "'") citat = c;
        else if (c === ">") break;
        j += 1;
      }
      if (j >= s.length) throw fel("oavslutad starttagg");
      let inre = s.slice(i + 1, j);
      const sjalvstangd = inre.endsWith("/");
      if (sjalvstangd) inre = inre.slice(0, -1);
      const m = /^([^\s/>]+)/.exec(inre);
      if (!m) throw fel("tagg utan namn");
      const attr = {};
      const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a;
      while ((a = re.exec(inre.slice(m[0].length)))) {
        if (a[1] === "xmlns" || a[1].startsWith("xmlns:")) continue;
        attr[lokal(a[1])] = xmlAvkoda(a[3] ?? a[4]);
      }
      const nod = { namn: lokal(m[1]), attr, barn: [], text: "" };
      if (stack.length) stack.at(-1).barn.push(nod);
      else if (rot) throw fel("mer än ett rotelement");
      else rot = nod;
      if (!sjalvstangd) stack.push(nod);
      i = j + 1;
    }
  }
  if (stack.length) throw fel(`elementet <${stack.at(-1).namn}> är inte avslutat`);
  if (!rot) throw fel("inget rotelement");
  return rot;
}

const barn = (n, namn) => (n ? n.barn.filter((b) => b.namn === namn) : []);
const ett = (n, namn) => barn(n, namn)[0] || null;
const textAv = (n, namn) => {
  const b = ett(n, namn);
  return b ? b.text.trim() : "";
};
const talAv = (n, namn) => {
  const v = textAv(n, namn);
  const t = Number(v);
  return v !== "" && Number.isFinite(t) ? t : null;
};
const vektorAv = (n, namn) => {
  const v = ett(n, namn);
  if (!v) return null;
  const t = [talAv(v, "X"), talAv(v, "Y"), talAv(v, "Z")];
  return t.every((x) => x !== null) ? t : null;
};

/* ---------- Status och typ ---------- */

/** Vårt statusid → BCF:s TopicStatus (fri text i 2.1, men Open/In Progress/Resolved/Closed känns igen överallt). */
export const STATUS_TILL_BCF = {
  oppen: "Open",
  prissattning: "In Progress",
  skickad_best: "In Progress",
  godkand_dok: "Resolved",
  godkand: "Resolved",
  fakturerad: "Closed",
  stangd: "Closed",
  utgar: "Closed",
};
const BCF_TILL_STATUS = { open: "oppen", new: "oppen", active: "oppen", "in progress": "prissattning", resolved: "godkand", closed: "stangd" };
export const KLASS_TILL_TYP = { ata: "ÄTA", hinder: "Hinder", bada: "Hinder och ÄTA", oklar: "Ärende" };

export const ATA_STATUSAR = Object.keys(STATUS_TILL_BCF);
export const ATA_KLASSER = Object.keys(KLASS_TILL_TYP);

/** BCF-status till vår, med ata-status-etiketten före gissningen. */
export function bcfStatusTillAta(status, etikettStatus) {
  if (ATA_STATUSAR.includes(etikettStatus)) return etikettStatus;
  return BCF_TILL_STATUS[String(status || "").trim().toLowerCase()] || "oppen";
}

export function bcfTypTillKlass(typ, etikettKlass) {
  if (ATA_KLASSER.includes(etikettKlass)) return etikettKlass;
  const t = String(typ || "").toLowerCase();
  const harHinder = t.includes("hinder");
  const harAta = t.includes("äta") || t.includes("ata") || t.includes("change");
  if (harHinder && harAta) return "bada";
  if (harHinder) return "hinder";
  if (harAta) return "ata";
  return "oklar";
}

/* ---------- Skriva: markup, viewpoint, zip ---------- */

const datumIso = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? `${d}T00:00:00Z` : new Date().toISOString());

/** Objektets id i komponentlistan: IFC-GUID som IfcGuid, annat som AuthoringToolId. */
const komponent = (guid) =>
  tagg("Component", `${text("OriginatingSystem", URSPRUNG)}${arIfcGuid(guid) ? "" : text("AuthoringToolId", guid)}`, arIfcGuid(guid) ? { IfcGuid: guid } : {});

/** Komponent-GUID:n ett ärende pekar på: dess objekt, annars de från en tidigare BCF-import. */
export const komponenterFor = (u) => (u.objectGuid ? [u.objectGuid] : Array.isArray(u.bcfKomponenter) ? u.bcfKomponenter : []);

export function byggMarkup(u, { topicGuid, viewpointGuid, harSnapshot, forfattare = "Okänd", projektNamn = "" }) {
  const etiketter = [u.nr ? `ata-nr:${u.nr}` : "", `ata-status:${u.status || "oppen"}`, `ata-klass:${u.klass || "oklar"}`].filter(Boolean);
  const topic = tagg(
    "Topic",
    [
      text("Title", u.benamning || u.nr || "Ärende"),
      text("Description", u.bcfBeskrivning),
      ...etiketter.map((e) => text("Labels", e)),
      text("CreationDate", datumIso(u.handelseDatum)),
      text("CreationAuthor", forfattare),
      text("AssignedTo", u.ansvarig),
    ].join(""),
    { Guid: topicGuid, TopicType: KLASS_TILL_TYP[u.klass] || "Ärende", TopicStatus: STATUS_TILL_BCF[u.status] || "Open" }
  );
  const vp = viewpointGuid
    ? tagg("Viewpoints", `${text("Viewpoint", "viewpoint.bcfv")}${harSnapshot ? text("Snapshot", "snapshot.png") : ""}`, { Guid: viewpointGuid })
    : "";
  return `${XML_HUVUD}${tagg("Markup", `${projektNamn ? tagg("Header", tagg("File", text("Filename", projektNamn))) : ""}${topic}${vp}`, {
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
  })}`;
}

export function byggViewpoint(u, { viewpointGuid }) {
  const k = u.viewpoint ? viewpointTillBcfKamera(u.viewpoint) : null;
  const komp = komponenterFor(u);
  const delar = [
    komp.length ? tagg("Components", tagg("Selection", komp.map(komponent).join(""))) : "",
    k
      ? tagg("PerspectiveCamera", `${vektor("CameraViewPoint", k.position)}${vektor("CameraDirection", k.riktning)}${vektor("CameraUpVector", k.upp)}${tagg("FieldOfView", r6(k.fov))}`)
      : "",
  ];
  return `${XML_HUVUD}${tagg("VisualizationInfo", delar.join(""), { Guid: viewpointGuid })}`;
}

/**
 * Bygger en .bcfzip av ärendena. `snapshots` är ett objekt ärende-id → PNG-bytes (valfritt).
 * Ärendets `bcfGuid` återanvänds så att en senare import uppdaterar i stället för dubblerar;
 * saknas det skapas ett, och svaret säger vilket ärende som fick vilket (`nyaGuid`).
 * @returns {Promise<{data: Uint8Array, antal: number, nyaGuid: Object<string,string>}>}
 */
export async function byggBcf(arenden, { snapshots = {}, forfattare = "Okänd", projektNamn = "" } = {}) {
  const zip = new JSZip();
  zip.file("bcf.version", `${XML_HUVUD}${tagg("Version", tagg("DetailedVersion", BCF_VERSION), { VersionId: BCF_VERSION })}`);
  zip.file("project.bcfp", `${XML_HUVUD}${tagg("ProjectExtension", tagg("Project", text("Name", projektNamn || "Projekt"), { ProjectId: nyGuid() }))}`);
  /** @type {Object<string,string>} */
  const nyaGuid = {};
  for (const u of arenden) {
    const topicGuid = arGuid(u.bcfGuid) ? u.bcfGuid : nyGuid();
    if (topicGuid !== u.bcfGuid) nyaGuid[u.id] = topicGuid;
    const viewpointGuid = u.viewpoint || komponenterFor(u).length ? nyGuid() : null;
    const snap = snapshots[u.id];
    const harSnapshot = !!viewpointGuid && snap instanceof Uint8Array && snap.length > 0;
    const mapp = zip.folder(topicGuid);
    mapp.file("markup.bcf", byggMarkup(u, { topicGuid, viewpointGuid, harSnapshot, forfattare, projektNamn }));
    if (viewpointGuid) mapp.file("viewpoint.bcfv", byggViewpoint(u, { viewpointGuid }));
    if (harSnapshot) mapp.file("snapshot.png", snap);
  }
  const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: "application/octet-stream" });
  return { data, antal: arenden.length, nyaGuid };
}

/** Filnamn för en export, utan tecken som filsystem ogillar. */
export function bcfFilnamn(projektNamn, datum = new Date()) {
  const d = datum.toISOString().slice(0, 10);
  const namn = String(projektNamn || "arenden").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "arenden";
  return `${namn}_${d}.bcfzip`;
}

/* ---------- Läsa ---------- */

function lasViewpoint(xml) {
  const rot = parsaXml(xml);
  if (rot.namn !== "VisualizationInfo") throw new Error("viewpoint.bcfv saknar VisualizationInfo");
  const sel = ett(ett(rot, "Components"), "Selection");
  const komponenter = barn(sel, "Component")
    .map((c) => ({ ifcGuid: c.attr.IfcGuid || "", authoringId: textAv(c, "AuthoringToolId") }))
    .filter((c) => c.ifcGuid || c.authoringId);
  const p = ett(rot, "PerspectiveCamera");
  let kamera = null;
  if (p) {
    const position = vektorAv(p, "CameraViewPoint");
    const riktning = vektorAv(p, "CameraDirection");
    const fov = talAv(p, "FieldOfView");
    if (position && riktning) kamera = { position, riktning, fov: fov !== null && fov >= 10 && fov <= 120 ? fov : STANDARD_FOV };
  }
  return { komponenter, kamera, ortogonal: !!ett(rot, "OrthogonalCamera") };
}

/**
 * Läser en .bcfzip. Ogiltiga topics hoppas över med en varning i stället för att stoppa hela importen.
 * @returns {Promise<{version: string, topics: object[], varningar: string[], antalKommentarer: number}>}
 */
export async function lasBcf(data) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error("Filen är ingen giltig zip-fil (.bcfzip).");
  }
  const varningar = [];
  let version = "";
  const vf = zip.file("bcf.version");
  if (vf) {
    try {
      version = parsaXml(await vf.async("string")).attr.VersionId || "";
    } catch {
      varningar.push("bcf.version kunde inte läsas.");
    }
  }
  if (version && !version.startsWith("2.")) throw new Error(`BCF ${version} stöds inte — bara 2.0 och 2.1.`);

  const mappar = [...new Set(Object.keys(zip.files).filter((n) => n.endsWith("/markup.bcf")).map((n) => n.slice(0, -"/markup.bcf".length)))];
  if (!mappar.length) throw new Error("Filen innehåller inga ÄTA (ingen markup.bcf hittades).");

  const topics = [];
  let antalKommentarer = 0;
  for (const mapp of mappar) {
    try {
      const rot = parsaXml(await zip.file(`${mapp}/markup.bcf`).async("string"));
      const t = ett(rot, "Topic");
      if (!t || !t.attr.Guid) throw new Error("Topic saknar Guid");
      const etiketter = barn(t, "Labels").map((l) => l.text.trim());
      const etikett = (prefix) => etiketter.find((e) => e.startsWith(prefix))?.slice(prefix.length) || "";
      antalKommentarer += barn(rot, "Comment").length;

      let viewpoint = null;
      let snapshot = null;
      const vpEl = barn(rot, "Viewpoints")[0];
      if (vpEl) {
        const vpFil = textAv(vpEl, "Viewpoint") || "viewpoint.bcfv";
        const f = zip.file(`${mapp}/${vpFil}`);
        if (f) {
          try {
            viewpoint = lasViewpoint(await f.async("string"));
          } catch (e) {
            varningar.push(`${t.attr.Guid}: kameravyn hoppades över (${e.message}).`);
          }
        }
        const sf = zip.file(`${mapp}/${textAv(vpEl, "Snapshot") || "snapshot.png"}`);
        if (sf) snapshot = await sf.async("uint8array");
      }
      if (viewpoint?.ortogonal && !viewpoint.kamera) varningar.push(`${t.attr.Guid}: ortogonal kamera stöds inte, vyn hoppades över.`);

      topics.push({
        guid: t.attr.Guid,
        titel: textAv(t, "Title"),
        typ: t.attr.TopicType || "",
        status: t.attr.TopicStatus || "",
        beskrivning: textAv(t, "Description"),
        forfattare: textAv(t, "CreationAuthor"),
        datum: textAv(t, "CreationDate"),
        tilldelad: textAv(t, "AssignedTo"),
        etiketter,
        ataNr: etikett("ata-nr:"),
        ataStatus: etikett("ata-status:"),
        ataKlass: etikett("ata-klass:"),
        viewpoint,
        snapshot,
      });
    } catch (e) {
      varningar.push(`Mappen ${mapp} hoppades över: ${e.message}.`);
    }
  }
  if (!topics.length) throw new Error(`Inga ÄTA gick att läsa. ${varningar.join(" ")}`.trim());
  return { version: version || "okänd", topics, varningar, antalKommentarer };
}

/* ---------- Import → ärenden ---------- */

const datumFran = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? iso.slice(0, 10) : "");

/**
 * Planerar vad en import gör med projektets ärenden. Ren funktion: ändrar inget.
 * - Ett topic vars Guid är ett befintligt ärendes `bcfGuid` uppdaterar det (titel, status, klass,
 *   ansvarig, beskrivning, kameravy och koppling).
 * - Annars skapas ett nytt ärende via `skapaPost`, som anroparen ger (nyAtaPost) så att nummer och
 *   id följer projektets serie.
 * - Komponenter som matchar ett känt objekt (`objekt`: { id, ...låda? }) blir objectGuid + låda.
 *   Okända sparas i `bcfKomponenter` och kan kopplas när modellen finns.
 *
 * @param {object[]} topics   ur lasBcf()
 * @param {{ur: object[], projektId: string, objekt: object[], skapaPost: (falt: object) => object, lada?: (o: object) => object}} ctx
 */
export function planeraImport(topics, { ur, projektId, objekt, skapaPost, lada }) {
  const befintliga = new Map((ur || []).filter((u) => u.projektId === projektId && u.bcfGuid).map((u) => [u.bcfGuid, u]));
  const objektPerId = new Map((objekt || []).map((o) => [o.id, o]));
  const nya = [];
  const uppdatera = [];
  let kopplade = 0;
  let utanKoppling = 0;

  for (const t of topics) {
    const falt = {
      benamning: t.titel || "Importerad ÄTA",
      status: bcfStatusTillAta(t.status, t.ataStatus),
      klass: bcfTypTillKlass(t.typ, t.ataKlass),
      bcfGuid: t.guid,
    };
    if (t.tilldelad) falt.ansvarig = t.tilldelad;
    if (t.beskrivning) falt.bcfBeskrivning = t.beskrivning;

    const ids = (t.viewpoint?.komponenter || []).map((c) => c.ifcGuid || c.authoringId);
    const traff = ids.map((g) => objektPerId.get(g)).find(Boolean);
    if (traff) {
      falt.objectGuid = traff.id;
      if (lada) falt.boundingBox = lada(traff);
      kopplade += 1;
    } else if (ids.length) {
      falt.bcfKomponenter = ids;
      utanKoppling += 1;
    }
    if (t.viewpoint?.kamera) {
      // Avståndet till målet: till objektets mitt om vi vet var det är, annars standardavstånd.
      let avstand = CAMERA_AVSTAND;
      if (traff && falt.boundingBox) {
        const c = [0, 1, 2].map((i) => (falt.boundingBox.min[i] + falt.boundingBox.max[i]) / 2);
        const p = franBcf(t.viewpoint.kamera.position);
        avstand = Math.max(1, Math.hypot(...p.map((v, i) => v - c[i])));
      }
      falt.viewpoint = bcfKameraTillViewpoint(t.viewpoint.kamera, avstand);
    }

    const finns = befintliga.get(t.guid);
    if (finns) uppdatera.push({ id: finns.id, falt });
    else {
      const rad = skapaPost({ ...falt, ...(datumFran(t.datum) ? { handelseDatum: datumFran(t.datum) } : {}) });
      nya.push(rad);
      // Nästa nya post ska se denna i serien.
      befintliga.set(t.guid, rad);
      if (ur) ur = [...ur, rad];
    }
  }
  return { nya, uppdatera, kopplade, utanKoppling };
}

/** Text till bekräftelsen före import. */
export function importSammanfattning(plan, { antalKommentarer = 0, varningar = [] } = {}) {
  const delar = [`${plan.nya.length} ${plan.nya.length === 1 ? "ny ÄTA" : "nya ÄTA"}`, `${plan.uppdatera.length} uppdateras`];
  if (plan.kopplade) delar.push(`${plan.kopplade} kopplas till objekt`);
  if (plan.utanKoppling) delar.push(`${plan.utanKoppling} pekar på objekt som inte finns i modellen`);
  let t = delar.join(", ") + ".";
  if (antalKommentarer) t += ` ${antalKommentarer} kommentarer läses inte in.`;
  if (varningar.length) t += ` ${varningar.length} varningar: ${varningar.slice(0, 3).join(" ")}`;
  return t;
}

/** PNG-bytes ur en data-URL (canvas.toDataURL). Null om det inte är en PNG. */
export function dataUrlTillBytes(url) {
  const m = /^data:image\/png;base64,(.+)$/.exec(url || "");
  if (!m) return null;
  const bin = atob(m[1]);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) b[i] = bin.charCodeAt(i);
  return b;
}
