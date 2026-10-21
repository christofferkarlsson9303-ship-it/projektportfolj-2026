import { KATALOG_RUBRIK, STEG } from "../data/projektstartSteg.js";
import { ANBUDSFRAGOR, ANBUDSLJUS, anbudsBedomning, anbudsfragaId, anbudsljusId } from "../data/anbudsfragor.js";
import { styrparametrarText } from "./styrparametrar.js";
import { KATALOG } from "../data/projektstartKatalog.js";
import { FAS_ANTAL, FAS_MODELL, arFasNr, faseFranGammal, faseInfo, fasFranStatus, riskFasFranGammal, statusEtikett } from "../data/projektfaser.ts";
import { arRiskKategori } from "../data/riskTyper.ts";
import { arAvbockad, stegPunkter } from "./stegpunkter.js";
import { RISKGRANSER, riskNivaFranVarde } from "./risknivaer.js";
import { aktuellFas, arEjVunnetUtkast, faltSynligt, fasLage, pdfKvar, rapportFas } from "./projektfas.js";
import { idag } from "./datum.js";
import { anbudsEkonomi, rangordnadeRisker, tolkaBelopp } from "./anbudsekonomi.js";
import { fmtKompakt } from "./format.js";

export { arAvbockad, stegPunkter, RISKGRANSER };

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
    fasModell: FAS_MODELL, kontraktsvarde: null, mw: null, mwh: null, natagare: "", natkontakt: "", fiber: "", mapp: "", anteckning: "", status: v.status || "PLANERING_OCH_UPPSTART",
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

/** Trafikljus per fas (metoden 3.4): projektledarens bedömning. Grön enligt plan, gul avvikelse som
 *  hanteras i projektet, röd allvarlig avvikelse som kräver hjälp eller beslut. */
export const LJUS = ["gron", "gul", "rod"];

export function tomtUtkast() {
  const v = {};
  for (const s of STEG) for (const f of s.falt || []) v[f.id] = f.standard ?? f.alternativ?.[0] ?? "";
  v.bolag = "ONE Nordic AB";
  for (const id of ["beslut", "niva", "offra", "orsakEjVunnet"]) v[id] = "";
  const rader = {};
  for (const s of STEG) if (s.tabell) rader[s.tabell.id] = (s.tabell.start?.length ? s.tabell.start : [{}]).map((g) => nyRad(s.tabell, g));
  return { steg: STEG[0].id, besokta: [], v, rader, kryss: {}, fasGolv: 1, trafikljus: {}, fm: FAS_MODELL };
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
  /* Utkast från sexfasmodellen (utan `fm`) räknas om en gång: golv, trafikljus, risker och besökta sidor. */
  const gammal = sparat.fm !== FAS_MODELL;
  const nyFas = (nr) => (gammal ? faseFranGammal(Number(nr)) : arFasNr(Number(nr)) ? Number(nr) : null);
  if (nyFas(sparat.fasGolv)) bas.fasGolv = nyFas(sparat.fasGolv);
  if (gammal && Array.isArray(bas.rader.risker)) {
    bas.rader.risker = bas.rader.risker.map((r) => {
      const f = riskFasFranGammal(Number(r.fas), r.kategori);
      return f ? { ...r, fas: String(f) } : r;
    });
  }
  for (const [nr, t] of Object.entries(sparat.trafikljus || {})) {
    if (nyFas(nr) && t && LJUS.includes(t.ljus)) bas.trafikljus[nyFas(nr)] = { ljus: t.ljus, kommentar: typeof t.kommentar === "string" ? t.kommentar.slice(0, 300) : "" };
  }
  if (ids.has(sparat.steg)) bas.steg = sparat.steg;
  if (Array.isArray(sparat.besokta)) {
    /* Sidorna som delades: cBoP och eBoP låg i "produktion", ekonomiskt avslut i "avslut". */
    const besokta = sparat.besokta.flatMap((id) => (!gammal ? [id] : id === "produktion" ? ["cbop", "ebop"] : id === "avslut" ? ["avslut", "ekonomi"] : [id]));
    bas.besokta = besokta.filter((id) => ids.has(id));
  }
  return bas;
}


/* Nivåerna räknas i risknivaer.js, samma definition som resten av appen. */
export const riskNivaForVarde = riskNivaFranVarde;

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

/** Guidens sidor för utkastet. Ett förlorat anbud (avropsbeslut Tacka nej) har bara fas 1 och sista sidan. */
export const synligaSteg = (u) => (arEjVunnetUtkast(u) ? STEG.filter((s) => s.fas === null || s.fas === 1) : STEG);

/** Hur långt ett steg har kommit: "klar", "pagar", "ny" eller "last". Steg med
 *  kontrollpunkter är klara först när alla är bockade. Övriga steg räknas som
 *  klara när man har gått igenom dem. Steg i en fas som inte är upplåst är "last". */
export function stegTillstand(u, steg) {
  if (steg.fas !== null && steg.fas > aktuellFas(u)) return "last";
  const punkter = stegPunkter(steg);
  const klara = punkter.filter((p) => arAvbockad(u, p)).length;
  const besokt = u.besokta.includes(steg.id);
  if (punkter.length) {
    if (klara === punkter.length) return "klar";
    return klara > 0 || besokt ? "pagar" : "ny";
  }
  return besokt ? "klar" : "ny";
}

/** Kontrollpunkter och steg som återstår. `tillFas` begränsar räkningen till de faser som är
 *  upplåsta, så att en rapport inte räknar sidor man ännu inte kan öppna. */
export function luckor(u, tillFas = FAS_ANTAL) {
  const iOmfattning = (s) => s.fas === null || s.fas <= tillFas;
  const alla = STEG.filter(iOmfattning).flatMap(stegPunkter);
  const kritiska = alla.filter((p) => p.kritisk);
  return {
    totalt: alla.length,
    klara: alla.filter((p) => arAvbockad(u, p)).length,
    kritiskaTotalt: kritiska.length,
    kritiskaOppna: kritiska.filter((p) => !arAvbockad(u, p)),
    stegKvar: STEG.filter((s) => s.id !== SISTA_STEG && iOmfattning(s) && !u.besokta.includes(s.id)),
  };
}

/** Fasen en riskrad hör till. Ett ogiltigt eller saknat värde blir reservfasen. */
const radFas = (x, reserv) => (arFasNr(Number(x)) ? Number(x) : reserv);

/** Raderna som blir poster i portföljen. Tomma rader hoppas över. */
export function projektFranUtkast(u, id) {
  const v = u.v;
  const fas = aktuellFas(u);
  const ejVunnet = arEjVunnetUtkast(u);
  const rad = {
    ...nyttProjekt({ namn: v.namn, nr: v.nr, ort: v.plats, bestallare: v.bestallare, startdatum: v.startdatum, fardigstallande: v.fardigdatum, status: ejVunnet ? "ANBUD_EJ_VUNNET" : faseInfo(fas).status }, id),
    fas,
    ...(ejVunnet ? { orsakEjVunnet: v.orsakEjVunnet, orsakEjVunnetText: (v.orsakEjVunnetText || "").trim(), ejVunnetDatum: idag() } : {}),
  };
  const rader = [
    v.kontraktsform && `Kontraktsform: ${v.kontraktsform}${v.niva ? `, ${v.niva.toLowerCase()}` : ""}`,
    v.nulage && `Nuläge vid start: ${v.nulage.trim()}`,
    v.kritiskLinje && `Kritisk linje: ${v.kritiskLinje.trim()}`,
    v.beslut && `Avropsbeslut: ${v.beslut}`,
  ].filter(Boolean);
  const projekt = { ...rad, natagare: (v.natagare || "").trim(), anteckning: rader.join("\n") };
  /* Ett förlorat anbud får inga risker eller milstolpar: det ska inte räknas i aktiva vyer. */
  const risker = (ejVunnet ? [] : u.rader.risker || [])
    .filter((r) => r.titel?.trim())
    .map((r, i) => ({
      id: `r-${id}-${i + 1}`, projektId: id, fas: radFas(r.fas, fas), ...(arRiskKategori(r.kategori) ? { kategori: r.kategori } : {}),
      titel: r.titel.trim(), sannolikhet: Number(r.sannolikhet) || 3, konsekvens: Number(r.konsekvens) || 3, atgard: (r.atgard || "").trim(), agare: (r.agare || "").trim(), status: "oppen",
    }));
  const milstolpar = (ejVunnet ? [] : u.rader.milstolpar || [])
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
  const fas = aktuellFas(u);
  return { datum, av, fas, skede: rapporteringsSkede(u), nulage: (u.v.nulage || "").trim(), klara: l.klara, totalt: l.totalt, kritiskaOppna: l.kritiskaOppna.length };
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
const kolumnVikt = (k) => (k.bredd === "wide" ? 3 : k.bredd === "mid" ? 1.5 : k.typ === "select" ? 1 : k.typ === "date" ? 1.2 : 2);

/** Etiketten för ett valt värde i en select-kolumn. Alternativen är strängar eller [värde, etikett]-par. */
const altEtikett = (k, val) => {
  const par = (k.alternativ || []).map((a) => (Array.isArray(a) ? a : [a, a])).find(([x]) => x === val);
  return par ? par[1] : val;
};

/** Riskvärde (S × K) som text, för kolumnen Värde i PDF:ens riskregister. */
const riskvardeText = (r) => String((Math.max(1, Math.min(5, Number(r.sannolikhet) || 3))) * Math.max(1, Math.min(5, Number(r.konsekvens) || 3)));

/** Underlaget till PDF:en. Rapporten är ackumulerande och omfattar de upplåsta faserna, alltså
 *  fas 1 till `rapportFas` (projektets aktuella fas). Är aktuell fas inte godkänd märks rapporten
 *  som utkast (`fas.utkast`), så att den går att visa för ledningen innan anbudet lämnas. */
/** Standardrubriken följer affärsbeslut och upplåst fas. Ett manuellt valt skede kan precisera den. */
export function rapporteringsSkede(u) {
  const fas = aktuellFas(u);
  if (arEjVunnetUtkast(u)) return "Ej vunnet / avbrutet";
  if (fas === 1) {
    if (u.v.anbudsutfall === "Anbud inlämnat") return "Anbud inlämnat - inväntar tilldelning";
    if (u.v.anbudsutfall === "Vunnet anbud") return "Vunnet anbud - inför uppstart";
  }
  const valt = u.v.rapporteringsskede;
  if (valt && valt !== "Ej angivet") return valt;
  return { 1: "Inför anbudsinlämning", 2: "Uppstart", 3: "Etablering", 4: "Genomförande", 5: "Genomförande", 6: "Provning och driftsättning", 7: "Överlämning", 8: "Avslut och garanti" }[fas];
}

/** Ledningsunderlag enligt ONE-P. Anbudsantaganden och gemensamma register är
 *  tillgängliga redan i fas 1, utan krav på färdig etablering eller inköpslösning. */
const beloppText = (x) => { const b = tolkaBelopp(x); return b === null ? varde(x) : fmtKompakt(b); };

/** Försättsbladet i fas 1: ekonomi, PL:s rekommendation, de största riskerna och hur
 *  komplett underlaget är. Ledningen ska kunna besluta från första sidan. */
export function anbudsSammanfattning(u, kvar = pdfKvar(u)) {
  const v = u.v;
  const obesvarade = ANBUDSFRAGOR.filter((f) => !varde(v[anbudsfragaId(f)]));
  return {
    ekonomi: anbudsEkonomi(v, u.rader.risker || []),
    rekommendation: { beslut: varde(v.beslut), text: varde(v[anbudsfragaId({ id: "rekommendation" })]), motivering: varde(v.motivering) },
    toppRisker: rangordnadeRisker(u.rader.risker || []).slice(0, 3),
    fullstandighet: { fragorTotalt: ANBUDSFRAGOR.length, obesvarade: obesvarade.length, kvar: kvar.length, saknas: kvar.map((k) => k.etikett) },
  };
}

export function anbudsDirektiv(u) {
  const v = u.v;
  const falt = (poster) => poster.filter(([, val]) => varde(val)).map(([k, val]) => [k, val.trim(), textstycken(val)]);
  const tabell = (titel, kolumner, vikter, rader) => rader.length ? { titel, kolumner, vikter, rader } : null;
  const risks = (u.rader.risker || []).filter((r) => r.titel?.trim()).map((r) => [r.titel.trim(), riskvardeText(r), varde(r.agare), varde(r.atgard), beloppText(r.belopp)]);
  const tider = (u.rader.faser || []).filter((r) => r.namn?.trim() && (r.start || r.slut)).map((r) => [r.namn, r.start || "Ej angivet", r.slut || "Ej angivet", r.kritisk || "Nej"]);
  const intressenter = (u.rader.intressenter || []).filter((r) => r.namn?.trim()).map((r) => [r.namn, r.roll || "", r.organisation || "", r.kommunikation || ""]);
  const prioritering = styrparametrarText(v);
  const delar = [
    ["Bakgrund, syfte, mål och avgränsningar", falt([["Bakgrund", v.bakgrund], ["Syfte", v.syfte], ["Mål och förväntningar", v.mal], ["Ingår", v.ingar], ["Avgränsningar - ingår inte", v.ingarEj]])],
    ["Identifierade risker", falt([["Riskbild inför anbud", v.anbudRiskbild]]), tabell("Riskregister - preliminära bedömningar", ["Risk", "S × K", "Ägare", "Åtgärdsplan", "Reserverat"], [3, 0.8, 1.3, 2.7, 1.3], risks)],
    ["Tidplan och styrparametrar", falt([["Övergripande tidplan och kontraktsdatum", v.anbudTidplan], ["Planerad start", v.startdatum], ["Planerat färdigställande", v.fardigdatum], ["Kritisk linje", v.kritiskLinje], ["Styrparametrar", prioritering], ["Vad får ge vika först?", v.offra]]), tabell("Kända datum", ["Aktivitet", "Start", "Slut", "Kritisk"], [3, 1.5, 1.5, 1], tider)],
    ["Nulägesanalys och intressenter", falt([["Nulägesanalys", v.nulagesanalys], ["Öppna frågor", v.oppnaFragor]]), tabell("Intressenter", ["Namn", "Roll", "Organisation", "Kommunikation"], [2, 2, 2, 3], intressenter)],
    ["HSEQ och arbetsmiljö", falt([["Förutsättningar inför anbud", v.anbudHseq], ["Planerad BAS-P", v.roll_basP], ["Planerad BAS-U", v.roll_basU]])],
    ["Organisation, rapportering och överlämning", falt([["Planerad organisation och överlämning", v.anbudOrganisation], ["Intern beställare", v.roll_internalClient], ["Projektledare", v.roll_pl], ["Rapportering till kund", v.rapporteringKund], ["Intern rapportering", v.rapporteringIntern]])],
  ];
  return delar.map(([titel, innehall, t], i) => ({ id: `direktiv-${i + 1}`, nr: i + 1, titel, sammanfattning: "", falt: innehall, tabell: t || null, tomma: [], tomTabell: "", kontroll: null }));
}

/** Del 1 i beslutsunderlaget: anbudet. Entreprenad- och ersättningsform, anbudsprocessen,
 *  svaren på den fasta frågelistan och avropsbeslutet med kontrakts- och kassaflödesvillkor.
 *  Obesvarade frågor står kvar som "Ej besvarad", så att ledningen ser vad som saknas. */
export function anbudsUnderlag(u) {
  const v = u.v;
  const falt = (poster) => poster.filter(([, val]) => varde(val)).map(([k, val]) => [k, String(val).trim(), arLangText(String(val).trim()) ? textstycken(val) : null]);
  const fragor = ANBUDSFRAGOR.map((f) => {
    const svar = varde(v[anbudsfragaId(f)]);
    const ljus = ANBUDSLJUS[v[anbudsljusId(f)]];
    /* Frågan blir rubrik och svaret brödtext, även när svaret är kort. Trafikljuset står
       som första stycke, så att ledningen ser bedömningen före motiveringen. */
    return [f.fraga, svar || "Ej besvarad", [...(ljus ? [{ typ: "stycke", nyckel: "Bedömning", text: ljus[1] }] : []), ...textstycken(svar || "Ej besvarad")]];
  });
  const { antal, dom } = anbudsBedomning(v);
  const samlad = `${antal.gron} gröna, ${antal.gul} gula, ${antal.rod} röda, ${antal.obedomd} ej bedömda. ${dom.text}`;
  const delar = [
    ["Entreprenadform och anbudsprocess", falt([["Entreprenadform (kontraktsform)", v.kontraktsform], ["Ersättningsform", v.ersattningsform], ["Anbudsutfall", v.anbudsutfall || "Anbudsarbete pågår"], ["Anbudsprocessen just nu", v.anbudsprocess], ["Sista dag för frågor", v.sistaFragedag], ["Anbudet lämnas senast", v.anbudsdag], ["Anbudet giltigt till", v.anbudGiltigt], ["Tilldelning väntas", v.tilldelning]])],
    ["Svar på anbudsfrågor", [["Samlad bedömning (trafikljus)", samlad, null], ...fragor]],
    ["Ekonomi, kontrakt och kassaflöde", falt([["PL:s rekommendation", v.beslut], ["Motivering", v.motivering], ["Kalkyl", v.kalkylRev], ["Anbudssumma", v.anbudssumma], ["Kalkylerad kostnad", v.kalkylkostnad], ["Riskreserv", v.riskreserv], ["Kassaflöde: lägsta punkt", v.kassaflodeLagst], ["Öppna frågor till intern beställare", v.oppnaFragor], ["Betalvillkor", v.betalvillkor], ["Bankgaranti", v.bankgaranti], ["Viten och deltidsmilstolpar", v.viten], ["Hävningsgrunder", v.havning], ["Indexregel", v.index], ["Kassaflöde: längsta negativa period", v.kassaflode]])],
  ];
  return delar.map(([titel, innehall], i) => ({ id: `anbud-${i + 1}`, nr: i + 1, titel, sammanfattning: "", falt: innehall, tabell: null, tomma: [], tomTabell: "", kontroll: null }));
}

/** Signaturblocket: intern beställare och projektledare. Namn ur signeringen i direktivet,
 *  annars de planerade rollerna. Datum bara när direktivet är signerat. */
export function signering(u) {
  const v = u.v;
  const datum = varde(v.signDatum);
  return [
    { roll: "Intern beställare", namn: varde(v.signBestallare) || varde(v.roll_internalClient), datum: varde(v.signBestallare) ? datum : "" },
    { roll: "Projektledare", namn: varde(v.signPL) || varde(v.roll_pl), datum: varde(v.signPL) ? datum : "" },
  ];
}

export function projektstartDokument(u, { datum, skapadAv = "", historik = [], sparad = "" }) {
  const v = u.v;
  const nuFas = aktuellFas(u);
  const fasInfo = faseInfo(nuFas);
  const lager = fasLage(u);
  const omfattar = Math.max(1, rapportFas(u));
  const kvar = pdfKvar(u);
  const sektioner = STEG.filter((s) => s.id !== SISTA_STEG && s.fas <= omfattar).map((s) => {
    /* Fält: [etikett, värde, stycken]. Långa fält får stycken och visas som
       rubrik med brödtext i PDF:en, korta som rad. Saknat projektnummer skrivs
       ut som "Ej skapat" så att ledningen ser att det saknas. */
    const synliga = (s.falt || []).filter((f) => faltSynligt(f, u));
    const falt = synliga
      .map((f) => {
        const val = f.id === "nr" ? varde(v[f.id]) || "Ej skapat" : varde(v[f.id]);
        return [f.etikett, val, arLangText(val) ? textstycken(val) : null];
      })
      .filter(([, val]) => val);
    const tomma = synliga.filter((f) => f.id !== "nr" && !varde(v[f.id])).map((f) => f.etikett);
    const arRisker = s.tabell?.id === "risker";
    const tabell = s.tabell
      ? {
          titel: s.tabell.titel,
          kolumner: [...s.tabell.kolumner.map((k) => arRisker && k.id === "sannolikhet" ? "S (1-5)" : arRisker && k.id === "konsekvens" ? "K (1-5)" : k.etikett), ...(arRisker ? ["Värde"] : [])],
          vikter: [...s.tabell.kolumner.map(kolumnVikt), ...(arRisker ? [0.8] : [])],
          rader: (u.rader[s.tabell.id] || [])
            .filter((r) => s.tabell.kolumner.some((k) => (r[k.id] || "").trim() && (k.typ === "text" || k.typ === "date")))
            /* Risker från faser som inte ingår hör inte hemma i rapporten. */
            .filter((r) => !arRisker || radFas(r.fas, nuFas) <= omfattar)
            .sort((a, b) => (arRisker ? radFas(a.fas, nuFas) - radFas(b.fas, nuFas) : 0))
            .map((r) => [
              ...s.tabell.kolumner.map((k) => (k.typ === "select" ? altEtikett(k, (r[k.id] || "").trim()) : (r[k.id] || "").trim())),
              ...(arRisker ? [riskvardeText(r)] : []),
            ]),
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
      nr: STEG.indexOf(s) + 1,
      fasNr: s.fas,
      fas: `Fas ${s.fas} · ${faseInfo(s.fas).kort}`,
      fasTitel: faseInfo(s.fas).titel,
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
  const l = luckor(u, omfattar);
  return {
    projekt: { id: varde(v.nr) || "utkast", nr: varde(v.nr), namn: (v.namn || "").trim(), bestallare: varde(v.bestallare) },
    datum,
    skapadAv,
    projektstart: {
      sektioner,
      anbud: anbudsUnderlag(u),
      sammanfattning: nuFas === 1 ? anbudsSammanfattning(u, kvar) : null,
      direktiv: anbudsDirektiv(u),
      signering: signering(u),
      anbudsutfall: v.anbudsutfall || "Anbudsarbete pågår",
      klara: l.klara,
      totalt: l.totalt,
      kritiskaOppna: l.kritiskaOppna.length,
      kritiskaTotalt: l.kritiskaTotalt,
      historik: Array.isArray(historik) ? historik : [],
      sparad,
      /* Projektets nuvarande fas och status, överst i rapporten. */
      fas: {
        nr: nuFas,
        omfattar,
        utkast: kvar.length > 0,
        kvar: kvar.length,
        antal: FAS_ANTAL,
        kort: fasInfo.kort,
        titel: fasInfo.titel,
        status: statusEtikett(fasInfo.status),
        statusId: fasInfo.status,
        klarAllt: lager.every((f) => f.status === "klar"),
        faser: lager.map((f) => ({ nr: f.nr, kort: f.kort, status: f.status, klara: f.klara, totalt: f.totalt, ljus: u.trafikljus?.[f.nr]?.ljus || "", kommentar: (u.trafikljus?.[f.nr]?.kommentar || "").trim() })),
      },
      lage: { skede: rapporteringsSkede(u), nastaSteg: (v.nastaStegLedning || "").trim(), beslutSenast: varde(v.beslutSenast), nulage: (v.nulage || "").trim(), beslut: (v.beslutLedning || "").trim() },
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
  return { id: `ps-${projektId}`, projektId, utkast: { v: u.v, rader: u.rader, kryss: u.kryss, fasGolv: u.fasGolv, trafikljus: u.trafikljus || {}, fm: FAS_MODELL }, skapad: nu, uppdaterad: nu, historik };
}

/** Öppnar en sparad projektstart i guiden. Alla steg räknas som genomgångna. */
export function utkastFranPost(post, projekt) {
  const u = lasUtkast(post?.utkast);
  /* Golvet är det högsta av det som sparades och projektets egen fas. En projektstart som sparades
     innan faserna fanns saknar golv, och då gäller projektets fas eller status. */
  if (projekt) {
    const franProjekt = arFasNr(projekt.fas) ? projekt.fas : fasFranStatus(projekt.status);
    u.fasGolv = Math.max(u.fasGolv, franProjekt);
  }
  u.besokta = STEG.filter((s) => s.id !== SISTA_STEG).map((s) => s.id);
  u.steg = STEG[0].id;
  return u;
}

const KORTFALT = [["namn", "namn"], ["nr", "nr"], ["plats", "ort"], ["bestallare", "bestallare"], ["startdatum", "startdatum"], ["fardigdatum", "fardigstallande"], ["natagare", "natagare"]];

/** Ändringar i projektkortet som ska föras över till projektet: [fält, nytt värde]. */
export function kortAndringar(u, projekt) {
  const andringar = KORTFALT.map(([fran, till]) => [till, fran === "nr" ? varde(u.v[fran]) : (u.v[fran] || "").trim()]).filter(
    ([till, nytt]) => nytt !== (projekt[till] || "") && (!["namn", "status"].includes(till) || nytt),
  );
  /* Status följer fasen, men bara när fasen har ändrats. En status som någon satt för hand
     på projektkortet skrivs alltså inte över av en vanlig sparning. */
  const fas = aktuellFas(u);
  const ejVunnet = arEjVunnetUtkast(u);
  const status = ejVunnet ? "ANBUD_EJ_VUNNET" : faseInfo(fas).status;
  if (fas !== projekt.fas || ejVunnet !== (projekt.status === "ANBUD_EJ_VUNNET")) andringar.push(["fas", fas], ["status", status]);
  if (ejVunnet) {
    const orsak = [["orsakEjVunnet", u.v.orsakEjVunnet || ""], ["orsakEjVunnetText", (u.v.orsakEjVunnetText || "").trim()]];
    for (const [falt, nytt] of orsak) if (nytt !== (projekt[falt] || "")) andringar.push([falt, nytt]);
    if (!projekt.ejVunnetDatum) andringar.push(["ejVunnetDatum", idag()]);
  }
  return andringar;
}

export const utkastAndrat = (a, b) => JSON.stringify([a.v, a.rader, a.kryss, a.trafikljus]) !== JSON.stringify([b.v, b.rader, b.kryss, b.trafikljus]);

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
  });
  /* Projekt som redan är igång börjar i den fas deras status motsvarar. */
  u.fasGolv = arFasNr(projekt.fas) ? projekt.fas : fasFranStatus(projekt.status);
  const risker = (state.risker || []).filter((r) => r.projektId === projekt.id);
  if (risker.length) {
    const t = STEG.find((x) => x.id === "risker").tabell;
    u.rader.risker = risker.map((r) => nyRad(t, {
      titel: r.titel, fas: String(radFas(r.fas, u.fasGolv)), kategori: arRiskKategori(r.kategori) ? r.kategori : "",
      sannolikhet: String(r.sannolikhet ?? 3), konsekvens: String(r.konsekvens ?? 3), agare: r.agare, atgard: r.atgard,
    }));
  }
  const milstolpar = (state.milstolpar || []).filter((m) => m.projektId === projekt.id);
  if (milstolpar.length) {
    const t = STEG.find((x) => x.id === "kontrakt").tabell;
    u.rader.milstolpar = milstolpar.map((m) => nyRad(t, { namn: m.titel, datum: m.datum }));
  }
  return u;
}

