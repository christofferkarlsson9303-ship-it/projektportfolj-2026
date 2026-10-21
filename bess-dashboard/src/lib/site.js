/* Siten — volymer och nålar på projektets tomt, och matematiken för att gå
   runt bland dem. Ren logik utan three, så att den kan testas utan WebGL.

   Koordinater: three.js, högerhänt, +Y upp, meter. Tomten är 80 × 52 m (eller projektets egen) med
   mitten i origo. yaw 0 tittar mot −Z (norr när ingen situationsplan säger
   annat). Rotation på en volym är grader runt +Y, moturs sett ovanifrån —
   samma som rotation.y i three.

   Objekten ligger i portfolj/state som listan siteObjekt, en rad per objekt
   med id och projektId. Den slås ihop rad för rad i sammanfoga.js som alla
   andra listor. Situationsplanen är en bild och ligger bara i sessionStorage
   — den skulle spränga JSONB-raden och följa med synken. */

/** Standardtomten. Projektets egen tomt (projekt.siteTomt, F11) sätts med sattAktivTomt(). */
export const STANDARDTOMT = Object.freeze({ bredd: 80, djup: 52 });

/** Den aktiva tomten. Ett objekt som ändras på plats av sattAktivTomt(), så att all
 *  geometri (snapp, kollision, mark, planvy) läser samma mått utan att tomten måste
 *  skickas genom varje anrop. Siten sätter den för valt projekt innan något ritas. */
export const TOMT = { bredd: STANDARDTOMT.bredd, djup: STANDARDTOMT.djup };

/** Körytor när ingen situationsplan finns: en gata i söder och en infart i väster. */
export const KORYTOR = [];
function byggKorytor() {
  KORYTOR.length = 0;
  KORYTOR.push(
    { x: 0, z: TOMT.djup / 2 - 4, bredd: TOMT.bredd, djup: 6 },
    { x: -TOMT.bredd / 2 + 3, z: 0, bredd: 6, djup: TOMT.djup }
  );
}
byggKorytor();

/** Projektets tomt: projekt.siteTomt om bredd och djup är rimliga (20–1000 m), annars standard. */
export function tomtFor(projekt) {
  const t = projekt?.siteTomt;
  const ok = (v) => Number.isFinite(Number(v)) && Number(v) >= 20 && Number(v) <= 1000;
  return t && ok(t.bredd) && ok(t.djup) ? { bredd: Number(t.bredd), djup: Number(t.djup) } : { ...STANDARDTOMT };
}

/** Byter aktiv tomt. Returnerar true om måtten ändrades. */
export function sattAktivTomt({ bredd, djup }) {
  if (TOMT.bredd === bredd && TOMT.djup === djup) return false;
  TOMT.bredd = bredd;
  TOMT.djup = djup;
  byggKorytor();
  return true;
}

/** Avstånd i meter som en gående håller till en volyms sida. */
export const MARGINAL = 0.45;

export const OGONHOJD = 1.7;
export const GANGFART = 1.6;
export const SPRINGFART = 4.5;
export const LYFTFART = 2;
export const MAX_HOJD = 40;

/** Radianer per pixel musrörelse. */
export const MUSKANSLIGHET = 0.0025;

/** Mallar när användaren lägger till — mått i meter (bredd × djup × höjd). */
export const MALLAR = {
  skid: { namn: "Skid", bredd: 6.1, djup: 2.5, hojd: 2.9 },
  container: { namn: "Container", bredd: 6.1, djup: 2.5, hojd: 2.9 },
  ehouse: { namn: "E-House", bredd: 12, djup: 3.2, hojd: 3.4 },
  trafo: { namn: "Trafo", bredd: 3.2, djup: 2.6, hojd: 2.6 },
  lada: { namn: "Låda", bredd: 2, djup: 2, hojd: 2 },
  hagnad: { namn: "Hägnad", bredd: 5, djup: 0.2, hojd: 2.2 },
  nal: { namn: "Nål", bredd: 0, djup: 0, hojd: 0 },
};

export const MALLORDNING = ["skid", "container", "ehouse", "trafo", "hagnad", "lada", "nal"];

/** Komponentmenyn: vilka mallar som hör ihop. Varje typ finns i exakt en grupp. */
export const KOMPONENTGRUPPER = [
  { id: "containers", namn: "Containers", typer: ["container"] },
  { id: "inverters", namn: "Inverters / MV-skids", typer: ["skid", "ehouse"] },
  { id: "transformatorer", namn: "Transformatorer", typer: ["trafo"] },
  { id: "hagnad", namn: "Hägnad", typer: ["hagnad"] },
  { id: "ovrigt", namn: "Övrigt", typer: ["lada", "nal"] },
];

/** Färg per typ som CSS-variabel ur designsystemet. 3D-scenen läser värdet
 *  vid körning och toppvyn använder variabeln direkt — inga egna hex-värden. */
export const TYPFARG = {
  skid: "--himmel",
  container: "--one-bla",
  ehouse: "--one-djup",
  trafo: "--duvbla",
  lada: "--morkgra",
  hagnad: "--ink-soft",
  nal: "--orange",
};

export const arNal = (o) => o?.typ === "nal";
export const arVolym = (o) => !!o && !arNal(o);

/* ---------- Gång ---------- */

/** Framåt för en blickriktning, i markplanet. */
export function framat(yaw) {
  return { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
}

/** Höger för en blickriktning, i markplanet. */
export function hoger(yaw) {
  return { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
}

/** Tangent → avsikt. Piltangenter gör samma sak som WASD. */
export const TANGENTER = {
  KeyW: "fram",
  ArrowUp: "fram",
  KeyS: "bak",
  ArrowDown: "bak",
  KeyA: "vanster",
  ArrowLeft: "vanster",
  KeyD: "hoger",
  ArrowRight: "hoger",
  KeyQ: "upp",
  KeyE: "ner",
  ShiftLeft: "spring",
  ShiftRight: "spring",
};

/**
 * Förflyttning under dt sekunder. `in` har fram/bak/vanster/hoger/upp/ner/
 * spring som booleaner, eller framAxel/sidAxel i [−1, 1] från joysticken.
 * A är strafe åt vänster: minus höger, relativt blickriktningen.
 * @returns {{x:number,y:number,z:number}}
 */
export function forflyttning(yaw, ind, dt) {
  const fa = (ind.framAxel ?? 0) + (ind.fram ? 1 : 0) - (ind.bak ? 1 : 0);
  const sa = (ind.sidAxel ?? 0) + (ind.hoger ? 1 : 0) - (ind.vanster ? 1 : 0);
  const f = framat(yaw);
  const h = hoger(yaw);
  let x = f.x * fa + h.x * sa;
  let z = f.z * fa + h.z * sa;
  const langd = Math.hypot(x, z);
  if (langd > 1) {
    x /= langd;
    z /= langd;
  }
  const fart = ind.spring ? SPRINGFART : GANGFART;
  const y = ((ind.upp ? 1 : 0) - (ind.ner ? 1 : 0)) * LYFTFART;
  return { x: x * fart * dt, y: y * dt, z: z * fart * dt };
}

/** Musrörelse → ny blick. Pitch hålls inom ±85°. */
export function titta(yaw, pitch, movementX, movementY, k = MUSKANSLIGHET) {
  const grans = (85 * Math.PI) / 180;
  return {
    yaw: yaw - movementX * k,
    pitch: Math.max(-grans, Math.min(grans, pitch - movementY * k)),
  };
}

/* ---------- Kollision ---------- */

/** Punkt i världen → volymens lokala koordinater (rotation runt +Y). */
export function tillLokal(o, x, z) {
  const t = ((o.rotation || 0) * Math.PI) / 180;
  const dx = x - (o.x || 0);
  const dz = z - (o.z || 0);
  return { x: dx * Math.cos(t) - dz * Math.sin(t), z: dx * Math.sin(t) + dz * Math.cos(t) };
}

/** Ligger punkten (på ögonhöjd y) inne i volymens låda plus marginal? */
export function krockar(o, x, z, y = OGONHOJD, marginal = MARGINAL) {
  if (!arVolym(o)) return false;
  // Över taket går man fritt — fötterna är ögonhöjden under kameran.
  if (y - OGONHOJD >= (o.hojd || 0)) return false;
  const l = tillLokal(o, x, z);
  return Math.abs(l.x) < (o.bredd || 0) / 2 + marginal && Math.abs(l.z) < (o.djup || 0) / 2 + marginal;
}

/**
 * Ett steg. Blockerat steg stannar — positionen blir den gamla. Höjden
 * följer alltid med (Q/E) men hålls mellan ögonhöjd och taket.
 */
export function steg(pos, delta, objekt, marginal = MARGINAL) {
  const y = Math.max(OGONHOJD, Math.min(MAX_HOJD, pos.y + delta.y));
  const x = pos.x + delta.x;
  const z = pos.z + delta.z;
  const kant = 30;
  const utanfor = Math.abs(x) > TOMT.bredd / 2 + kant || Math.abs(z) > TOMT.djup / 2 + kant;
  const blockerad = utanfor || objekt.some((o) => krockar(o, x, z, y, marginal));
  return blockerad ? { x: pos.x, y, z: pos.z, blockerad: true } : { x, y, z, blockerad: false };
}

/**
 * Kompassnålens vinkel i grader medurs på skärmen, för en kamera som tittar från `kamera` mot
 * `mal` (båda {x, z}). Norr är −Z, även med situationsplan (planen vrids så att norr blir −Z).
 * 0 = norr uppåt i bilden, 90 = norr åt höger. I gåläget: mål = position + framat(yaw), och då
 * blir vinkeln yaw i grader.
 */
export function kompassVinkel(kamera, mal) {
  const dx = (kamera?.x || 0) - (mal?.x || 0);
  const dz = (kamera?.z || 0) - (mal?.z || 0);
  if (Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9) return 0;
  return (Math.atan2(dx, dz) * 180) / Math.PI;
}

/** Startpunkt när användaren går in: söder om tomten, blicken mot norr. */
export const INGANG = { x: 0, y: OGONHOJD, z: TOMT.djup / 2 + 6, yaw: 0, pitch: 0 };


/* ---------- Rutnät, snap och placering ---------- */

/** Rutnätets steg i meter. Tomtens kanter (±40, ±26) ligger på rutnätet. */
export const RUTNAT = 1;
/** Rotation sker i steg om 90° — så att moduler ligger kant mot kant. */
export const ROTATIONSSTEG = 90;
const EPS = 1e-4;

const r3 = (n) => Math.round(n * 1000) / 1000;

/** Rotation i grader till närmaste steg, 0–359. */
export function snappaRotation(grader, steg = ROTATIONSSTEG) {
  const n = Math.round((Number(grader) || 0) / steg) * steg;
  return ((n % 360) + 360) % 360;
}

/** Nästa rotation när användaren trycker R. */
export const roteraSteg = (grader) => snappaRotation((Number(grader) || 0) + ROTATIONSSTEG);

/** Måtten längs världens X och Z efter rotation (omslutande rektangel). */
export function yttermatt(o) {
  const t = ((o.rotation || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  const b = o.bredd || 0;
  const d = o.djup || 0;
  return { bredd: b * c + d * s, djup: b * s + d * c };
}

function snappaAxel(v, langd, tomt, rutnat) {
  const min = -tomt / 2 + langd / 2;
  const max = tomt / 2 - langd / 2;
  if (min > max) return 0; // större än tomten: mitt på
  const centrum = rutnat > 0 ? Math.round((v - langd / 2) / rutnat) * rutnat + langd / 2 : v;
  return r3(Math.max(min, Math.min(max, centrum)));
}

/**
 * Snappar ett objekts centrum så att dess hörn hamnar på rutnätet efter
 * rotation, och håller hela fotavtrycket inom tomten. rutnat = 0 stänger av
 * snappen men behåller tomtgränsen.
 */
export function snappa(x, z, o, rutnat = RUTNAT) {
  const m = yttermatt(o);
  return { x: snappaAxel(x, m.bredd, TOMT.bredd, rutnat), z: snappaAxel(z, m.djup, TOMT.djup, rutnat) };
}

/** Rektangel i planet: centrum, halva sidor och lokala axlar (samma som tillLokal). */
function rekt(o) {
  const t = ((o.rotation || 0) * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: o.x || 0, z: o.z || 0, hb: (o.bredd || 0) / 2, hd: (o.djup || 0) / 2, u: [c, -s], v: [s, c] };
}

/**
 * Överlappar två vridna rektanglar? Separerande axel-test. Att bara röra
 * vid varandra räknas inte som överlapp — moduler får stå kant mot kant.
 * `luft` kräver ett fritt avstånd i meter mellan dem.
 */
export function rektanglarOverlappar(a, b, luft = 0) {
  const A = rekt(a);
  const B = rekt(b);
  const d = [B.x - A.x, B.z - A.z];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
  for (const n of [A.u, A.v, B.u, B.v]) {
    const ra = A.hb * Math.abs(dot(n, A.u)) + A.hd * Math.abs(dot(n, A.v));
    const rb = B.hb * Math.abs(dot(n, B.u)) + B.hd * Math.abs(dot(n, B.v));
    if (Math.abs(dot(d, n)) >= ra + rb + luft - EPS) return false;
  }
  return true;
}

/**
 * Får kandidaten stå här? Hela fotavtrycket inom tomten och inget annat
 * objekt i vägen. Nålar har ingen yta och kontrolleras inte.
 * @returns {{ok:true}|{ok:false,orsak:"utanfor"|"krock",med?:object}}
 */
/** @param {any} kandidat @param {any[]} objekt @param {{ignorera?: any, luft?: number|((granne: any) => number)}} [val] */
export function kanPlaceras(kandidat, objekt, { ignorera = null, luft = 0 } = {}) {
  const luftMot = typeof luft === "function" ? luft : () => luft;
  if (!arVolym(kandidat)) return { ok: true };
  const m = yttermatt(kandidat);
  if (Math.abs(kandidat.x) + m.bredd / 2 > TOMT.bredd / 2 + EPS || Math.abs(kandidat.z) + m.djup / 2 > TOMT.djup / 2 + EPS) {
    return { ok: false, orsak: "utanfor" };
  }
  const med = objekt.find((o) => o.id !== ignorera && arVolym(o) && rektanglarOverlappar(kandidat, o, luftMot(o)));
  return med ? { ok: false, orsak: "krock", med } : { ok: true };
}

/** Grannar som kantsnappen kan luta sig mot: volymer vridna i kvartsvarv. */
const arKvartsvarv = (o) => Math.abs(Math.sin((((o.rotation || 0) * Math.PI) / 180) * 2)) < 1e-6;

/** Största avstånd i meter där en kant dras mot en grannes kant. */
export const KANTTROSKEL = 0.6;

/**
 * Kantsnapp: rutnätet ger en bra plats, men mått som 6,1 m går inte jämnt ut
 * i hela meter. Ligger en kant inom tröskeln från en grannes kant dras
 * objektet så att kanterna möts exakt (kant mot kant) eller ligger i linje.
 * Bara grannar vars sida ligger i höjd med objektet räknas. `luft` håller
 * önskat fritt avstånd vid kant mot kant – ett tal, eller en funktion av grannen
 * (profilens skyddsavstånd per objekttyp, F11).
 */
/** @param {{x: number, z: number}} q @param {any} o @param {any[]} objekt
 *  @param {{ignorera?: any, luft?: number|((granne: any) => number), troskel?: number}} [val] */
export function kantSnappa(q, o, objekt, { ignorera = null, luft = 0, troskel = KANTTROSKEL } = {}) {
  const luftMot = typeof luft === "function" ? luft : () => luft;
  const m = yttermatt(o);
  const grannar = objekt.filter((n) => n.id !== ignorera && arVolym(n) && arKvartsvarv(n));
  const axel = (c, halv, liggerIHojd, kanter) => {
    let b = null;
    for (const n of grannar) {
      const nm = yttermatt(n);
      if (!liggerIHojd(n, nm)) continue;
      const [nc, nh] = kanter(n, nm);
      const l = luftMot(n);
      /* Med krav på fritt avstånd snappar den bara till kravet, inte kant mot kant. */
      const lagen = l > 0 ? [nc + nh + l + halv - c, nc - nh - l - halv - c] : [nc + nh + halv - c, nc - nh - halv - c];
      for (const delta of [...lagen, nc + nh - halv - c, nc - nh + halv - c]) {
        if (Math.abs(delta) <= troskel && (b === null || Math.abs(delta) < Math.abs(b))) b = delta;
      }
    }
    return b === null ? c : r3(c + b);
  };
  const x = axel(
    q.x,
    m.bredd / 2,
    (n, nm) => Math.abs(n.z - q.z) < nm.djup / 2 + m.djup / 2 + troskel,
    (n, nm) => [n.x, nm.bredd / 2]
  );
  const z = axel(
    q.z,
    m.djup / 2,
    (n, nm) => Math.abs(n.x - x) < nm.bredd / 2 + m.bredd / 2 + troskel,
    (n, nm) => [n.z, nm.djup / 2]
  );
  // Aldrig ut ur tomten av en kantsnapp.
  return {
    x: Math.max(-TOMT.bredd / 2 + m.bredd / 2, Math.min(TOMT.bredd / 2 - m.bredd / 2, x)),
    z: Math.max(-TOMT.djup / 2 + m.djup / 2, Math.min(TOMT.djup / 2 - m.djup / 2, z)),
  };
}

/**
 * Snappa och kontrollera i ett steg — det scenen, planvyn och placeringen
 * alla använder. `o` har typ, bredd, djup, hojd och rotation.
 * @returns {{x:number,z:number,ok:boolean,orsak?:string,med?:object}}
 */
/** @param {any} o @param {{x: number, z: number}} punkt @param {any[]} objekt
 *  @param {{ignorera?: any, rutnat?: number, luft?: number|((granne: any) => number), snappLuft?: number|((granne: any) => number)}} [val] */
export function provaPlacering(o, punkt, objekt, { ignorera = null, rutnat = RUTNAT, luft = 0, snappLuft = luft } = {}) {
  if (!arVolym(o)) {
    const q = innanforTomt(punkt.x, punkt.z);
    return { ...q, ok: true };
  }
  let q = snappa(punkt.x, punkt.z, o, rutnat);
  if (rutnat > 0) q = kantSnappa(q, o, objekt, { ignorera, luft: snappLuft });
  return { ...q, ...kanPlaceras({ ...o, ...q }, objekt, { ignorera, luft }) };
}

/** Felmeddelande till användaren, eller null när placeringen är ok. */
export function placeringsText(res) {
  if (!res || res.ok) return null;
  if (res.orsak === "utanfor") return "Det får inte plats där — objektet skulle hamna utanför tomten.";
  return `Platsen är upptagen av ${res.med?.namn || "ett annat objekt"}.`;
}

/* ---------- BESS-data på volymer ---------- */

export const SITE_STATUS = [
  ["planerad", "Planerad"],
  ["levererad", "Levererad"],
  ["monterad", "Monterad"],
  ["driftsatt", "Driftsatt"],
];

/** Numeriska fält med namn och eventuellt tak — används av objektFel. */
/** @type {Array<[string, string, number?]>} */
const BESS_TAL = [
  ["mw", "Effekt (MW)"],
  ["mwh", "Energi (MWh)"],
  ["mva", "Märkeffekt (MVA)"],
  ["soc", "Laddstatus (SoC)", 100],
];

/** Fält per typ i sidopanelen. Hägnad och Låda har ingen BESS-data. */
export const BESS_FALT = {
  container: [
    ["mwh", "Energi (MWh)"],
    ["mw", "Effekt (MW)"],
    ["soc", "Laddstatus SoC (%)"],
  ],
  skid: [["mw", "Effekt (MW)"]],
  ehouse: [["mw", "Effekt (MW)"]],
  trafo: [["mva", "Märkeffekt (MVA)"]],
};

export const harBessData = (typ) => !!BESS_FALT[typ];

const num = (v) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** Svenskt talformat med högst `d` decimaler. */
export const fmtTal = (n, d = 1) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: d }).format(Number(n) || 0);

/**
 * Sammanställning av parken. Energi och effekt räknas på containrarna
 * (batterierna); inverter och trafo summeras för sig. Saknade fält räknas som
 * "ej angivet", inte som 0.
 *
 * SoC (granskning F08): energiviktad bara när ALLA containrar med SoC har MWh.
 * Saknar någon av dem kapacitet blir `soc` null och `socUnderlag.metod`
 * "delvis" — en viktad siffra som tyst tappat en container ser tillförlitlig
 * ut men är fel. Har ingen container MWh blir det ett aritmetiskt medel
 * ("medel"). SoC är manuellt inmatad, inte telemetri; `socUnderlag` säger hur
 * stor del av parken siffran bygger på.
 */
/** @param {any[]} objekt @returns {import("./typer.js").ParkSumma} */
export function parkSumma(objekt) {
  const v = objekt.filter(arVolym);
  const cont = v.filter((o) => o.typ === "container");
  const summa = (lista, falt) => lista.reduce((a, o) => a + (num(o[falt]) ?? 0), 0);
  const medSoc = cont.filter((o) => num(o.soc) !== null);
  const viktade = medSoc.filter((o) => (num(o.mwh) ?? 0) > 0);
  const utanKapacitet = medSoc.length - viktade.length;
  /** @type {import("./typer.js").SocUnderlag["metod"]} */
  let metod = null;
  let soc = null;
  if (medSoc.length && !viktade.length) {
    metod = "medel";
    soc = medSoc.reduce((a, o) => a + num(o.soc), 0) / medSoc.length;
  } else if (medSoc.length && utanKapacitet) {
    metod = "delvis";
  } else if (medSoc.length) {
    metod = "energiviktad";
    const vikt = viktade.reduce((a, o) => a + num(o.mwh), 0);
    soc = viktade.reduce((a, o) => a + num(o.mwh) * num(o.soc), 0) / vikt;
  }
  const bess = v.filter((o) => harBessData(o.typ));
  return {
    mwh: summa(cont, "mwh"),
    mw: summa(cont, "mw"),
    inverterMw: summa(v.filter((o) => o.typ === "skid" || o.typ === "ehouse"), "mw"),
    trafoMva: summa(v.filter((o) => o.typ === "trafo"), "mva"),
    soc,
    socUnderlag: { metod, medSoc: medSoc.length, viktade: viktade.length, utanKapacitet, containrar: cont.length, kalla: "manuell" },
    antal: bess.length,
    driftsatta: bess.filter((o) => o.status === "driftsatt").length,
  };
}

/** Text under SoC-siffran: beräkningsgrund, täckning och att värdet är manuellt. */
export function socHint(u) {
  if (!u?.medSoc) return "Ingen container har SoC angiven";
  const tackning = u.medSoc < u.containrar ? ` · ${u.medSoc} av ${u.containrar} containrar` : "";
  if (u.metod === "delvis") return `Delvis underlag: ${u.utanKapacitet} av ${u.medSoc} saknar MWh · manuellt värde`;
  if (u.metod === "medel") return `Aritmetiskt medel (MWh saknas)${tackning} · manuellt värde`;
  return `Energiviktat medel${tackning} · manuellt värde`;
}

/* ---------- Objekt i state ---------- */

const avrunda = (n, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;

/** Håller en punkt inom tomten. */
export function innanforTomt(x, z) {
  return {
    x: avrunda(Math.max(-TOMT.bredd / 2, Math.min(TOMT.bredd / 2, x)), 1),
    z: avrunda(Math.max(-TOMT.djup / 2, Math.min(TOMT.djup / 2, z)), 1),
  };
}

export function siteObjekt(state, projektId) {
  return (state.siteObjekt || []).filter((o) => o.projektId === projektId);
}

export const volymer = (state, projektId) => siteObjekt(state, projektId).filter(arVolym);

/** Nästa lediga namn för en typ: "Skid 3" om Skid 1 och 2 finns. */
export function nastaNamn(befintliga, typ) {
  const bas = MALLAR[typ].namn;
  const tagna = new Set(befintliga.filter((o) => o.typ === typ).map((o) => o.namn));
  let n = befintliga.filter((o) => o.typ === typ).length + 1;
  while (tagna.has(`${bas} ${n}`)) n += 1;
  return `${bas} ${n}`;
}

/** Nytt objekt ur en mall, på en punkt på marken. */
export function nyttObjekt(typ, projektId, punkt, befintliga = [], extra = {}) {
  const m = MALLAR[typ];
  if (!m) throw new Error(`Okänd typ: ${typ}`);
  // `exakt`: positionen kommer redan snappad till rutnätet — avrunda inte om den.
  const { x, z } = extra.exakt ? { x: avrunda(punkt.x, 3), z: avrunda(punkt.z, 3) } : innanforTomt(punkt.x, punkt.z);
  const rad = {
    id: `so${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    projektId,
    typ,
    x,
    z,
    rotation: extra.rotation ? snappaRotation(extra.rotation) : 0,
  };
  if (typ === "nal") return { ...rad, punktId: extra.punktId || "" };
  return { ...rad, namn: extra.namn || nastaNamn(befintliga, typ), bredd: m.bredd, djup: m.djup, hojd: m.hojd };
}

/**
 * Varför ett objekt inte kan sparas, eller null. En nål måste peka på en
 * befintlig punkt — ingen lös text som inte är en punkt.
 */
export function objektFel(o, punkter = []) {
  if (!o || !MALLAR[o.typ]) return "Okänd typ.";
  if (!o.projektId) return "Objektet saknar projekt.";
  if (arNal(o)) {
    if (!o.punktId) return "En nål måste peka på en öppen punkt.";
    if (!punkter.some((p) => p.id === o.punktId)) return "Punkten finns inte.";
    return null;
  }
  for (const [falt, text] of [["bredd", "Bredd"], ["djup", "Djup"], ["hojd", "Höjd"]]) {
    if (!(Number(o[falt]) > 0)) return `${text} måste vara större än 0.`;
  }
  for (const [falt, text, max] of BESS_TAL) {
    const v = o[falt];
    if (v === undefined || v === null || v === "") continue;
    if (!Number.isFinite(Number(v)) || Number(v) < 0) return `${text} måste vara ett tal som inte är negativt.`;
    if (max !== undefined && Number(v) > max) return `${text} kan högst vara ${max}.`;
  }
  if (o.status !== undefined && o.status !== "" && !SITE_STATUS.some(([id]) => id === o.status)) return "Okänd status.";
  return null;
}

/** Öppen punkt — samma regel som arbetslistan (lib/faltmaterial.js). */
export const arOppenPunkt = (p) => !!p && p.status !== "klarmarkerad";

/** Punkter som en nål i projektet kan peka på. */
export function punkterForSite(state, projektId) {
  return (state.punkter || []).filter((p) => p.projektId === projektId || p.projektId === "bada");
}

/* ---------- Situationsplan (sessionStorage) ---------- */

export const PLAN_NYCKEL = (projektId) => `batchc-situationsplan:${projektId}`;

/* Själva uppslaget av sessionStorage kan kasta (SecurityError i en sandlådad
   iframe eller med blockerad lagring), så det görs inne i try — aldrig som
   standardvärde på en parameter, där det skulle kasta före try. */
const sessionen = (lagring) => lagring ?? globalThis.sessionStorage;

/** Läser planen för projektet, eller null. */
export function lasPlan(projektId, lagring) {
  try {
    const v = JSON.parse(sessionen(lagring)?.getItem(PLAN_NYCKEL(projektId)) || "null");
    return v && typeof v.bild === "string" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Sparar planen i sessionStorage. Returnerar ett fel som text om lagringen
 * är full eller blockerad — bilden hamnar aldrig i portfolj/state.
 */
export function sparaPlan(projektId, plan, lagring) {
  try {
    sessionen(lagring).setItem(
      PLAN_NYCKEL(projektId),
      JSON.stringify({
        bild: plan.bild,
        namn: plan.namn || "",
        bredd: Number(plan.bredd) > 0 ? Number(plan.bredd) : TOMT.bredd,
        norr: Number(plan.norr) || 0,
        proportion: Number(plan.proportion) > 0 ? Number(plan.proportion) : 1,
      })
    );
    return null;
  } catch {
    return "Bilden får inte plats i webbläsarens sessionslagring. Välj en mindre bild.";
  }
}

export function rensaPlan(projektId, lagring) {
  try {
    sessionen(lagring).removeItem(PLAN_NYCKEL(projektId));
  } catch {
    /* blockerad lagring — inget att ta bort */
  }
}

/** Planens mått i meter: bredden användaren angav, djupet ur bildens proportion. */
export function planMatt(plan) {
  const bredd = Number(plan?.bredd) > 0 ? Number(plan.bredd) : TOMT.bredd;
  return { bredd, djup: bredd * (Number(plan?.proportion) > 0 ? Number(plan.proportion) : 1) };
}
