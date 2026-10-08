import { KATALOG_RUBRIK, STEG } from "../data/projektstartSteg.js";
import { KATALOG } from "../data/projektstartKatalog.js";

/** Platshållare som "-" eller "—" räknas som tomt, så att ett bindestreck i
 *  projektnumret varken sparas som nummer eller hamnar i sidhuvudet. */
export const varde = (x) => {
  const t = typeof x === "string" ? x.trim() : "";
  return /^[-–—_.]+$/.test(t) ? "" : t;
};

const lika = (a, b) => varde(a).toLocaleLowerCase("sv") === varde(b).toLocaleLowerCase("sv");

export function projektstartFel(state, v) {
  if (!v.namn?.trim()) return "Skriv ett projektnamn.";
  const nr = varde(v.nr);
  if (nr && state.projekt.some((p) => lika(p.nr, nr))) return "Projektnumret finns redan. Öppna det befintliga projektet.";
  if (!nr && state.projekt.some((p) => !varde(p.nr) && lika(p.namn, v.namn))) return "Det finns redan ett projekt med samma namn utan projektnummer. Öppna det i stället.";
  if (v.startdatum && v.fardigstallande && v.startdatum >= v.fardigstallande) return "Färdigdatum ska ligga efter startdatum.";
  return "";
}

export function nyttProjekt(v, id) {
  return { id, nr: varde(v.nr), namn: v.namn.trim(), ort: (v.ort || "").trim(), bestallare: (v.bestallare || "").trim(),
    startdatum: v.startdatum || "", fardigstallande: v.fardigstallande || "", startdatumAntagande: false,
    kontraktsvarde: null, mw: null, mwh: null, natagare: "", natkontakt: "", fiber: "", mapp: "", anteckning: "", status: v.status || "Planering",
    underlag: { kalla: "", datum: "", infort: "", av: "" } };
}

/* ---------- Projektstart-guiden ----------
   Utkastet är en vanlig JSON-post i webbläsaren tills projektet skapas. Det
   ligger inte i portfolj/state. Först när man går igenom guiden och trycker
   Skapa projekt blir det ett projekt med risker och milstolpar. */


export const UTKAST_NYCKEL = "bess-projektstart-utkast-v1";
export const SISTA_STEG = STEG.at(-1).id;

const nyttRadId = () => `rad-${Math.random().toString(36).slice(2, 9)}`;

function nyRad(tabell, grund = {}) {
  const rad = { id: nyttRadId() };
  for (const k of tabell.kolumner) rad[k.id] = grund[k.id] ?? k.standard ?? "";
  return rad;
}
export const nyTabellrad = nyRad;

export function tomtUtkast() {
  const v = {};
  for (const s of STEG) for (const f of s.falt || []) v[f.id] = f.standard ?? f.alternativ?.[0] ?? "";
  v.bolag = "ONE Nordic AB";
  for (const id of ["beslut", "niva", "offra"]) v[id] = "";
  const rader = {};
  for (const s of STEG) if (s.tabell) rader[s.tabell.id] = (s.tabell.start?.length ? s.tabell.start : [{}]).map((g) => nyRad(s.tabell, g));
  return { steg: STEG[0].id, besokta: [], v, rader, kryss: {} };
}

/** Läser ett sparat utkast och släpper bara in kända fält, så att en gammal eller
 *  trasig post aldrig kan välta guiden. */
export function lasUtkast(raw) {
  const bas = tomtUtkast();
  let sparat;
  try {
    sparat = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return bas;
  }
  if (!sparat || typeof sparat !== "object") return bas;
  const ids = new Set(STEG.map((s) => s.id));
  for (const k of Object.keys(bas.v)) if (typeof sparat.v?.[k] === "string") bas.v[k] = sparat.v[k];
  for (const k of Object.keys(bas.rader)) if (Array.isArray(sparat.rader?.[k]) && sparat.rader[k].length) bas.rader[k] = sparat.rader[k].filter((r) => r && typeof r === "object" && typeof r.id === "string");
  for (const [bucket, poster] of Object.entries(sparat.kryss || {})) if (KATALOG[bucket] && poster && typeof poster === "object") bas.kryss[bucket] = { ...poster };
  if (ids.has(sparat.steg)) bas.steg = sparat.steg;
  if (Array.isArray(sparat.besokta)) bas.besokta = sparat.besokta.filter((id) => ids.has(id));
  return bas;
}

/** Kontrollpunkter för ett steg, med avbockning ur utkastet. */
export const stegPunkter = (steg) => (steg.katalog || []).flatMap((b) => KATALOG[b].map((p) => ({ ...p, bucket: b })));
export const arAvbockad = (u, p) => !!u.kryss?.[p.bucket]?.[p.id];

/** Riskvärdets nivåer i Projektstart: låg 1–6, medel 7–14, hög 15–25.
 *  Gränserna är de första värdena i varje nivå. */
export const RISKGRANSER = { medel: 7, hog: 15 };

export const riskNivaForVarde = (v) => ((Number(v) || 0) >= RISKGRANSER.hog ? "hog" : (Number(v) || 0) >= RISKGRANSER.medel ? "medel" : "lag");

/** Riskvärde = sannolikhet (1–5) × konsekvens (1–5). Värden utanför skalan hålls inom 1–5. */
export const riskvardeForRad = (r) => {
  const hall = (x) => Math.max(1, Math.min(5, Number(x) || 3));
  return hall(r.sannolikhet) * hall(r.konsekvens);
};

/** Fördelning låg/medel/hög över de rader som har en risktext, alltså de som blir risker i projektet. */
export function riskFordelning(rader) {
  const f = { lag: 0, medel: 0, hog: 0, totalt: 0 };
  for (const r of rader || []) {
    if (!r.titel?.trim()) continue;
    f[riskNivaForVarde(riskvardeForRad(r))] += 1;
    f.totalt += 1;
  }
  return f;
}

/** Hur långt ett steg har kommit: "klar", "pagar" eller "ny". Steg med
 *  kontrollpunkter är klara först när alla är bockade. Övriga steg räknas som
 *  klara när man har gått igenom dem. */
export function stegTillstand(u, steg) {
  const punkter = stegPunkter(steg);
  const klara = punkter.filter((p) => arAvbockad(u, p)).length;
  const besokt = u.besokta.includes(steg.id);
  if (punkter.length) {
    if (klara === punkter.length) return "klar";
    return klara > 0 || besokt ? "pagar" : "ny";
  }
  return besokt ? "klar" : "ny";
}

/** Samma tillstånd samlat per fas, i stegens ordning. */
export function fasStatus(u, steg = STEG.filter((s) => s.id !== SISTA_STEG)) {
  const faser = [];
  for (const s of steg) {
    let f = faser.find((x) => x.fas === s.fas);
    if (!f) faser.push((f = { fas: s.fas, klara: 0, totalt: 0 }));
    f.totalt += 1;
    if (stegTillstand(u, s) === "klar") f.klara += 1;
  }
  return faser;
}

export function luckor(u) {
  const alla = STEG.flatMap(stegPunkter);
  const kritiska = alla.filter((p) => p.kritisk);
  return {
    totalt: alla.length,
    klara: alla.filter((p) => arAvbockad(u, p)).length,
    kritiskaTotalt: kritiska.length,
    kritiskaOppna: kritiska.filter((p) => !arAvbockad(u, p)),
    stegKvar: STEG.filter((s) => s.id !== SISTA_STEG && !u.besokta.includes(s.id)),
  };
}

/** Raderna som blir poster i portföljen. Tomma rader hoppas över. */
export function projektFranUtkast(u, id) {
  const v = u.v;
  const rad = nyttProjekt({ namn: v.namn, nr: v.nr, ort: v.plats, bestallare: v.bestallare, startdatum: v.startdatum, fardigstallande: v.fardigdatum, status: v.skede }, id);
  const rader = [
    v.kontraktsform && `Kontraktsform: ${v.kontraktsform}${v.niva ? `, ${v.niva.toLowerCase()}` : ""}`,
    v.nulage && `Nuläge vid start: ${v.nulage.trim()}`,
    v.kritiskLinje && `Kritisk linje: ${v.kritiskLinje.trim()}`,
    v.beslut && `Avropsbeslut: ${v.beslut}`,
  ].filter(Boolean);
  const projekt = { ...rad, natagare: (v.natagare || "").trim(), anteckning: rader.join("\n") };
  const risker = (u.rader.risker || [])
    .filter((r) => r.titel?.trim())
    .map((r, i) => ({ id: `r-${id}-${i + 1}`, projektId: id, titel: r.titel.trim(), sannolikhet: Number(r.sannolikhet) || 3, konsekvens: Number(r.konsekvens) || 3, atgard: (r.atgard || "").trim(), agare: (r.agare || "").trim(), status: "oppen" }));
  const milstolpar = (u.rader.milstolpar || [])
    .filter((m) => m.namn?.trim() && m.datum)
    .map((m, i) => ({ id: `m-${id}-${i + 1}`, projektId: id, titel: m.namn.trim(), datum: m.datum, status: "planerad" }));
  return { projekt, risker, milstolpar };
}

/** Milstolpar med namn men utan datum. De kan inte läggas in och ska synas för användaren. */
export const milstolparUtanDatum = (u) => (u.rader.milstolpar || []).filter((m) => m.namn?.trim() && !m.datum).length;

/** Risker och milstolpar från guiden som projektet inte redan har (jämfört på titel).
 *  Används när en sparad projektstart uppdateras: nya rader förs över, befintliga
 *  poster i riskregistret och milstolparna ändras aldrig härifrån. */
export function nyaRaderForProjekt(u, projektId, state, nu = Date.now()) {
  const { risker, milstolpar } = projektFranUtkast(u, projektId);
  const har = (lista, titel) => (lista || []).some((x) => x.projektId === projektId && lika(x.titel, titel));
  return {
    risker: risker.filter((r) => !har(state.risker, r.titel)).map((r, i) => ({ ...r, id: `r-${projektId}-${nu}-${i + 1}` })),
    milstolpar: milstolpar.filter((m) => !har(state.milstolpar, m.titel)).map((m, i) => ({ ...m, id: `m-${projektId}-${nu}-${i + 1}` })),
  };
}

/** En rad i projektstartens uppdateringslogg: vad ledningen såg vid varje sparning. */
export function historikRad(u, { datum, av = "" }) {
  const l = luckor(u);
  return { datum, av, skede: varde(u.v.skede), nulage: (u.v.nulage || "").trim(), klara: l.klara, totalt: l.totalt, kritiskaOppna: l.kritiskaOppna.length };
}

/** Lägger till en loggrad. Samma dag ersätts den senaste raden i stället för att logga varje klick. */
export function medHistorik(historik, rad, max = 30) {
  const lista = Array.isArray(historik) ? [...historik] : [];
  if (lista.length && lista.at(-1).datum === rad.datum) lista[lista.length - 1] = rad;
  else lista.push(rad);
  return lista.slice(-max);
}

/** Underlaget till PDF:en. Samma dokumentform som övriga PDF:er (projekt, datum,
 *  skapadAv) plus `projektstart` med sektioner per steg. Tomma fält och rader
 *  utelämnas, så PDF:en blir lika kort som utkastet är ifyllt. */
/** Långa texter (flera stycken eller mer än några rader) visas som rubrik med
 *  brödtext i stället för som en rad i en tabell. */
export const arLangText = (t) => /\n\s*\n/.test(t) || t.length > 230;

const MILSTOLPE = /^Milstolpe\s+(\d+)\s*\(([^)]*)\)\s*:?\s*([\s\S]*)$/;
const NYCKEL = /^([A-ZÅÄÖ][^:\n]{1,44}?):\s+([\s\S]+)$/;

/** Delar en lång text i stycken för PDF:en.
 *  - Tom rad skiljer stycken.
 *  - "Milstolpe N (Namn - andel %): utlösare" blir ett milstolpskort.
 *  - "Nyckel: text" i början av ett stycke får nyckeln i fetstil. */
export function textstycken(text) {
  const ut = [];
  for (const block of String(text || "").split(/\n\s*\n/)) {
    const b = block.trim();
    if (!b) continue;
    const m = b.match(MILSTOLPE);
    if (m) {
      const inne = m[2].trim();
      const i = inne.lastIndexOf(" - ");
      ut.push({ typ: "milstolpe", kod: `M${m[1]}`, namn: i > 0 ? inne.slice(0, i).trim() : inne, andel: i > 0 ? inne.slice(i + 3).trim() : "", text: m[3].trim() });
      continue;
    }
    // Rader som själva börjar med "Nyckel:" blir egna stycken.
    for (const rad of b.split(/\n(?=[A-ZÅÄÖ][^:\n]{1,44}:\s)/)) {
      const n = rad.trim().match(NYCKEL);
      ut.push(n && !/https?$/i.test(n[1]) ? { typ: "stycke", nyckel: n[1].trim(), text: n[2].trim() } : { typ: "stycke", text: rad.trim() });
    }
  }
  return ut;
}

/** Relativ kolumnbredd i PDF:en: breda textkolumner får mer plats, val och datum mindre. */
const kolumnVikt = (k) => (k.bredd === "wide" ? 3 : k.typ === "select" ? 1 : k.typ === "date" ? 1.2 : 2);

export function projektstartDokument(u, { datum, skapadAv = "", historik = [], sparad = "" }) {
  const v = u.v;
  const sektioner = STEG.filter((s) => s.id !== SISTA_STEG).map((s, i) => {
    /* Fält: [etikett, värde, stycken]. Långa fält får stycken och visas som
       rubrik med brödtext i PDF:en, korta som rad. Saknat projektnummer skrivs
       ut som "Ej skapat" så att ledningen ser att det saknas. */
    const falt = (s.falt || [])
      .map((f) => {
        const val = f.id === "nr" ? varde(v[f.id]) || "Ej skapat" : varde(v[f.id]);
        return [f.etikett, val, arLangText(val) ? textstycken(val) : null];
      })
      .filter(([, val]) => val);
    const tomma = (s.falt || []).filter((f) => f.id !== "nr" && !varde(v[f.id])).map((f) => f.etikett);
    const tabell = s.tabell
      ? {
          titel: s.tabell.titel,
          kolumner: s.tabell.kolumner.map((k) => k.etikett),
          vikter: s.tabell.kolumner.map(kolumnVikt),
          rader: (u.rader[s.tabell.id] || [])
            .filter((r) => s.tabell.kolumner.some((k) => (r[k.id] || "").trim() && (k.typ === "text" || k.typ === "date")))
            .map((r) => s.tabell.kolumner.map((k) => (r[k.id] || "").trim())),
        }
      : null;
    const punkter = stegPunkter(s);
    /* Alla kontrollpunkter i stegets ordning, grupperade som i guiden, med avbockning. */
    const grupper = [];
    for (const p of punkter) {
      const rubrik = s.katalog.length > 1 ? `${KATALOG_RUBRIK[p.bucket]}: ${p.grupp}` : p.grupp;
      let g = grupper.at(-1);
      if (!g || g.rubrik !== rubrik) grupper.push((g = { rubrik, punkter: [] }));
      g.punkter.push({ text: p.text, kritisk: !!p.kritisk, klar: arAvbockad(u, p) });
    }
    const kontroll = punkter.length
      ? {
          klara: punkter.filter((p) => arAvbockad(u, p)).length,
          totalt: punkter.length,
          kritiskaOppna: punkter.filter((p) => p.kritisk && !arAvbockad(u, p)).map((p) => p.text),
          grupper,
        }
      : null;
    return {
      id: s.id,
      nr: i + 1,
      fas: s.fas,
      titel: s.titel,
      sammanfattning: s.sammanfattning || "",
      falt,
      tomma,
      tabell: tabell?.rader.length ? tabell : null,
      tomTabell: tabell && !tabell.rader.length ? tabell.titel : "",
      kontroll,
      besokt: u.besokta.includes(s.id),
    };
  });
  const l = luckor(u);
  return {
    projekt: { id: varde(v.nr) || "utkast", nr: varde(v.nr), namn: (v.namn || "").trim(), bestallare: varde(v.bestallare) },
    datum,
    skapadAv,
    projektstart: {
      sektioner,
      klara: l.klara,
      totalt: l.totalt,
      kritiskaOppna: l.kritiskaOppna.length,
      kritiskaTotalt: l.kritiskaTotalt,
      historik: Array.isArray(historik) ? historik : [],
      sparad,
      lage: { skede: varde(v.skede), nulage: (v.nulage || "").trim(), beslut: (v.beslutLedning || "").trim() },
      kort: {
        plats: varde(v.plats),
        start: varde(v.startdatum),
        slut: varde(v.fardigdatum),
        kontraktsform: varde(v.kontraktsform),
        niva: varde(v.niva),
        beslut: varde(v.beslut),
      },
    },
  };
}

/** Sparad projektstart: guidens svar, knutna till projektet. */
export function projektstartPost(projektId, u, nu = new Date().toISOString(), historik = []) {
  return { id: `ps-${projektId}`, projektId, utkast: { v: u.v, rader: u.rader, kryss: u.kryss }, skapad: nu, uppdaterad: nu, historik };
}

/** Öppnar en sparad projektstart i guiden. Alla steg räknas som genomgångna. */
export function utkastFranPost(post) {
  const u = lasUtkast(post?.utkast);
  u.besokta = STEG.filter((s) => s.id !== SISTA_STEG).map((s) => s.id);
  u.steg = STEG[0].id;
  return u;
}

const KORTFALT = [["namn", "namn"], ["skede", "status"], ["nr", "nr"], ["plats", "ort"], ["bestallare", "bestallare"], ["startdatum", "startdatum"], ["fardigdatum", "fardigstallande"], ["natagare", "natagare"]];

/** Ändringar i projektkortet som ska föras över till projektet: [fält, nytt värde]. */
export function kortAndringar(u, projekt) {
  return KORTFALT.map(([fran, till]) => [till, fran === "nr" ? varde(u.v[fran]) : (u.v[fran] || "").trim()]).filter(
    ([till, nytt]) => nytt !== (projekt[till] || "") && (!["namn", "status"].includes(till) || nytt),
  );
}

export const utkastAndrat = (a, b) => JSON.stringify([a.v, a.rader, a.kryss]) !== JSON.stringify([b.v, b.rader, b.kryss]);

/** Guiden för ett projekt som saknar sparad projektstart: ifylld från projektkortet,
 *  riskregistret och milstolparna. Checklistor och direktiv börjar tomma. */
export function utkastFranProjekt(projekt, state) {
  const u = utkastFranPost(null);
  Object.assign(u.v, {
    namn: projekt.namn || "",
    nr: projekt.nr || "",
    plats: projekt.ort || "",
    bestallare: projekt.bestallare || "",
    startdatum: projekt.startdatum || "",
    fardigdatum: projekt.fardigstallande || "",
    natagare: projekt.natagare || "",
    skede: projekt.status || "Planering",
  });
  const risker = (state.risker || []).filter((r) => r.projektId === projekt.id);
  if (risker.length) {
    const t = STEG.find((x) => x.id === "risker").tabell;
    u.rader.risker = risker.map((r) => nyRad(t, { titel: r.titel, sannolikhet: String(r.sannolikhet ?? 3), konsekvens: String(r.konsekvens ?? 3), agare: r.agare, atgard: r.atgard }));
  }
  const milstolpar = (state.milstolpar || []).filter((m) => m.projektId === projekt.id);
  if (milstolpar.length) {
    const t = STEG.find((x) => x.id === "kontrakt").tabell;
    u.rader.milstolpar = milstolpar.map((m) => nyRad(t, { namn: m.titel, datum: m.datum }));
  }
  return u;
}
