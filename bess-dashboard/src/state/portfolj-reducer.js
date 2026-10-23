/* Ren reducer för hela portföljen. Inga sidoeffekter, ingen DOM, ingen lagring —
   det ligger i PortfolioProvider. All uppdatering är immutabel, vilket är det
   som gör att React kan rendera om rätt delar av trädet. */

import { SEED } from "../data/seed.js";
import { ritningsFel } from "../lib/ritningar.js";
import { ATA_KLASS, ATA_STATUS, KANDA_MAPPAR, PILL, SLUTDOK_MALL } from "../data/konstanter.js";
import { LEDTIDER, PUNKT_FOR_ID } from "../data/bessChecklistData.ts";
import { migreraUr } from "../lib/berakningar.js";
import { nyApdRad } from "../lib/apd.js";
import { idag } from "../lib/datum.js";
import { forslagText, kanTillampas, tillampaForslag } from "../lib/importera.js";
import { angraFakturaunderlag, skapaFakturaunderlag } from "../lib/planering.js";
import { kalkylRader, kalkylSummor } from "../lib/atakalkyl.js";
import { fmtSEK } from "../lib/format.js";
import { IFC_MAX_MODELLER, ifcModellFel, ifcObjektForProjekt } from "../lib/ifcModell.js";
import { MALLAR, arNal, objektFel, punkterForSite } from "../lib/site.js";
import { boxFel, kopplingFel, viewpointFel } from "../lib/modellKoppling.js";
import { arGuid } from "../lib/bcfHanterare.js";
import { projektFasFranEpc } from "../lib/projektfasEpc.js";
import { arDold } from "../lib/arkiv.js";
import { sattVidSteg } from "../lib/sammanfoga.js";
import { projektstartFel, projektstartPost, tomtUtkast } from "../lib/projektstart.js";
import { ARVSDELAR, arv } from "../lib/projektmall.js";
import { EJ_VUNNET_ORSAKER, FAS_MODELL, arFasNr, faseFranGammal, fasFranStatus, faseInfo, riskFasFranGammal, forstaFasForStatus, normaliseraStatus, statusEtikett } from "../data/projektfaser.ts";
import { granskaProfil, rensaProfil } from "../lib/kontraktsprofil.js";

/** Namnet används i ändringsloggen och sparas per webbläsare, inte i delad data. */
export const NAMN_KEY = "batchc-portfolj-namn";

export function hamtaNamn() {
  try {
    return (localStorage.getItem(NAMN_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function sparaNamn(v) {
  try {
    localStorage.setItem(NAMN_KEY, (v || "").trim());
  } catch {
    /* privat läge eller blockerad lagring — namnet blir bara tomt */
  }
}

/** Fyller ut saknade kollektioner ur SEED så att inget blir undefined. */
export function normalisera(d) {
  const bas = structuredClone(SEED);
  for (const k of Object.keys(bas)) if (Array.isArray(d?.[k])) bas[k] = d[k];
  return bas;
}

/** Migreringar som körs efter varje inläsning — gamla dokument saknar fält. */
export function efterInlasning(state) {
  const ur = migreraUr(state.ur);
  const projekt = state.projekt.map((p) => {
    const k = KANDA_MAPPAR[p.id];
    const nytt = { ...p };
    if (nytt.kontraktsvarde === undefined) nytt.kontraktsvarde = null;
    if (k) {
      if (nytt.mapp === undefined || nytt.mapp === "") nytt.mapp = k.mapp;
      if (nytt.bestallare === undefined || nytt.bestallare === "") nytt.bestallare = k.bestallare;
    }
    if (!nytt.underlag) {
      nytt.underlag =
        p.id === "36037" || p.id === "36038"
          ? { kalla: "Byggmötesprotokoll BM7/BM8", datum: "2026-08-17", infort: "2026-09-12", av: "" }
          : { kalla: "", datum: "", infort: "", av: "" };
    }
    /* Startdatum (NTP) styr EPC-checklistans fasplan. Batch C saknar det i
       underlaget; kontraktets milstolpar låg feb–sep 2026, så början av
       februari sätts som ANTAGANDE och markeras tills någon anger rätt datum.
       Bara när fältet aldrig funnits — ett tömt fält är ett medvetet val. */
    /* Alvestas kontraktssumma var 5 600 000 kr i det första underlaget; rätt
       värde enligt kontraktet är 6 614 187 kr (bekräftat 2026-09-27). Bara
       det kända felvärdet rättas — ett annat värde är ett medvetet val. */
    if (p.id === "36038" && nytt.kontraktsvarde === 5600000) nytt.kontraktsvarde = 6614187;
    if (nytt.startdatum === undefined) {
      const batchC = p.id === "36037" || p.id === "36038";
      nytt.startdatum = batchC ? "2026-02-02" : "";
      nytt.startdatumAntagande = batchC;
    }
    /* Projektets fas. Äldre projekt saknar den, då gäller deras (gamla) status. Fasen räknas
       före statusen normaliseras, eftersom Anbud och Planering annars inte går att skilja åt. */
    if (nytt.fasModell !== FAS_MODELL) {
      /* Sexfasmodellen räknas om en gång (gammal 5 → 7, gammal 6 → 8). Växjö och Alvesta saknade
         fas och får den ur EPC-checklistan (antagande, reserv fas 4). */
      const omr = faseFranGammal(nytt.fas);
      if (omr) nytt.fas = omr;
      else if (p.id === "36037" || p.id === "36038") nytt.fas = projektFasFranEpc(state, p.id);
      else nytt.fas = fasFranStatus(nytt.status);
      nytt.fasModell = FAS_MODELL;
    } else if (!arFasNr(nytt.fas)) nytt.fas = fasFranStatus(nytt.status);
    /* Statusen är en av fem id:n. Gamla värden (Anbud, Planering, Produktion …) mappas om. */
    nytt.status = normaliseraStatus(nytt.status);
    /* En äldre klient kan ha skrivit tillbaka projektet efter att ha nollställt en fas den inte känner igen
       (7 och 8 fanns inte i sexfasmodellen). Statusen är då det som gäller: fasen flyttas till första fasen som
       hör till statusen. Förlorade anbud har bara fas 1 och rörs inte. */
    if (nytt.status !== "ANBUD_EJ_VUNNET" && faseInfo(nytt.fas).status !== nytt.status) nytt.fas = forstaFasForStatus(nytt.status);
    return nytt;
  });
  /* Varje risk hör till en projektfas. Äldre risker saknar fas och får projektets. En risk
     som gäller flera projekt (projekt-id som inte är ett enskilt projekt) hamnar i
     genomförandefasen. */
  const fasForProjekt = new Map(projekt.map((p) => [p.id, p.fas]));
  /* Riskerna räknas om tillsammans med sitt projekt: bara risker i projekt som ännu inte var
     omräknade. Risker som läggs till efteråt hör till ett omräknat projekt och rörs inte. */
  const alla = new Set((state.projekt || []).map((p) => p.id));
  const omraknade = new Set((state.projekt || []).filter((p) => p.fasModell === FAS_MODELL).map((p) => p.id));
  const risker = (state.risker || []).map((r) => {
    /* En risk utan eget projekt (gemensam) bär själv markeringen. */
    const klar = alla.has(r.projektId) ? omraknade.has(r.projektId) : r.fasModell === FAS_MODELL;
    if (klar) return arFasNr(r.fas) ? r : { ...r, fas: fasForProjekt.get(r.projektId) ?? 4 };
    const omr = riskFasFranGammal(r.fas, r.kategori);
    return { ...r, fas: omr ?? fasForProjekt.get(r.projektId) ?? 4, ...(alla.has(r.projektId) ? {} : { fasModell: FAS_MODELL }) };
  });
  return {
    ...state,
    ur,
    projekt,
    risker,
    slutdok: medSlutdokrader(state, projekt),
    handlingsplaner: medHandlingsplaner(state, projekt),
    hseqApd: medApdRader(state, projekt),
  };
}

/* APD-planen och arbetsplatstavlan har en rad per projekt, sådd här av
   samma skäl som handlingsplanen: vyn ska inte skapa data bara för att någon
   öppnar den. Id:t härleds ur projekt-id, så sådden är idempotent och
   användarens bockar bevaras. */
function medApdRader(state, projekt) {
  const fanns = Array.isArray(state.hseqApd) ? state.hseqApd : [];
  const har = new Set(fanns.map((r) => r.projektId));
  const nya = projekt.filter((p) => !har.has(p.id)).map((p) => nyApdRad(p.id));
  return nya.length ? [...fanns, ...nya] : fanns;
}

/* Varje projekt har exakt ett planhuvud (mål, drivkraft, strategi,
   slutresultat) som vyn skriver i med UPPDATERA. Det sås här av samma skäl
   som slutdokumentationen: vyn ska inte skapa data bara för att någon öppnar
   den. Fälten sås tomma — vyn visar exempel som platshållare, så att inget
   påhittat hamnar i ett riktigt projekts plan. Id:t härleds ur projekt-id,
   vilket gör sådden idempotent. */
function medHandlingsplaner(state, projekt) {
  const fanns = Array.isArray(state.handlingsplaner) ? state.handlingsplaner : [];
  const har = new Set(fanns.map((h) => h.projektId));
  const nya = projekt
    .filter((p) => !har.has(p.id))
    .map((p) => ({
      id: `hp-${p.id}`,
      projektId: p.id,
      mal: "",
      drivkraft: "",
      strategi: "",
      slutresultat: "",
    }));
  return nya.length ? [...fanns, ...nya] : fanns;
}

/* Slutdokumentationens rader kommer ur SLUTDOK_MALL och måste finnas som data
   för att index och M6-grinden ska kunna räkna på dem.

   Standalone-versionen sår dem inuti sin slutdokRader, som därmed muterar
   state mitt i en läsning. Vår slutdokRader är ren och ska förbli det, så
   sådden ligger här i stället — samma krok som redan kompletterar ur och
   underlag vid inläsning.

   Idempotent: id:t är härlett ur projekt, kategori och radnummer, så en rad
   som redan finns skapas aldrig igen och användarens status bevaras. */
function medSlutdokrader(state, projekt) {
  const fanns = Array.isArray(state.slutdok) ? state.slutdok : [];
  const kanda = new Set(fanns.map((d) => d.id));
  const nya = [];

  for (const p of projekt) {
    SLUTDOK_MALL.forEach(([kategori, krav], ki) =>
      krav.forEach((k, i) => {
        const id = `sd-${p.id}-${ki}-${i}`;
        if (kanda.has(id)) return;
        nya.push({
          id,
          projektId: p.id,
          kategori,
          krav: k,
          status: "ejpaborjad",
          ansvarig: "",
          senast: "",
          referens: "",
        });
      })
    );
  }

  return nya.length ? [...fanns, ...nya] : fanns;
}

/* ---------- Ändringslogg ---------- */

const etikettFor = (state, lista, id) => {
  const rad = (state[lista] || []).find((r) => r.id === id);
  if (!rad) return null;
  const kort = (s) => (String(s).length > 60 ? String(s).slice(0, 57) + "…" : String(s));
  switch (lista) {
    case "projekt":
      return { etikett: (rad.nr ? rad.nr + " " : "") + rad.namn, projektId: rad.id };
    case "milstolpar":
      return { etikett: rad.titel, projektId: rad.projektId };
    case "leveranser":
      return { etikett: rad.benamning, projektId: rad.projektId };
    case "ur":
      return { etikett: (rad.nr ? rad.nr + " " : "") + rad.benamning, projektId: rad.projektId };
    case "risker":
    case "punkter":
      return { etikett: kort(rad.titel), projektId: rad.projektId };
    case "storningar":
      return { etikett: rad.rubrik || "Störning", projektId: rad.projektId };
    case "betalplan":
      return { etikett: `Betalplan ${rad.kod} — ${rad.benamning}`, projektId: rad.projektId };
    case "slutdok":
      return { etikett: `Slutdok: ${kort(rad.krav)}`, projektId: rad.projektId };
    case "hpAtgarder":
      return { etikett: `Handlingsplan: ${kort(rad.titel || "Namnlös åtgärd")}`, projektId: rad.projektId };
    case "fakturor":
      return { etikett: `Fakturaunderlag ${rad.nr}`, projektId: rad.projektId };
    default:
      return { etikett: String(id), projektId: rad.projektId || null };
  }
};

function medLogg(state, lista, id, gammalt, nytt) {
  const info = etikettFor(state, lista, id);
  if (!info) return state.andringslogg || [];
  const etikett = (x) => (lista === "projekt" ? statusEtikett(x) : (PILL[x] || [undefined, x || "—"])[1]);
  const g = etikett(gammalt);
  const n = etikett(nytt);
  const post = {
    ts: new Date().toISOString(),
    anvandare: hamtaNamn() || "Okänd",
    projektId: info.projektId || null,
    text: `${info.etikett}: status ändrad ${g} → ${n}`,
  };
  return [post, ...(state.andringslogg || [])].slice(0, 150);
}

/* ---------- Reducer ---------- */

const byt = (lista, id, andra) => lista.map((r) => (r.id === id ? andra(r) : r));

/** Uppdaterar raden som matchar, eller lägger till ny = {...ny, ...andring}. */
function uppsatt(lista, matchar, ny, andring) {
  const rader = lista || [];
  return rader.some(matchar)
    ? rader.map((r) => (matchar(r) ? { ...r, ...andring } : r))
    : [...rader, { ...ny, ...andring }];
}

/** Lägger en fritextpost i ändringsloggen. */
/** Ändrar kalkylraderna på en ÄTA-post. En post med originalverktygets
 *  kalkyl får sina rader omlästa först, så att inget av det gamla tappas. */
function medKalkylrader(state, id, andra) {
  const u = state.ur.find((r) => r.id === id);
  if (!u) return state;
  const rader = andra(kalkylRader(u));
  return {
    ...state,
    ur: byt(state.ur, id, (r) => ({ ...r, kalkyl: { ...(r.kalkyl || {}), rader, uppdaterad: idag() } })),
  };
}

/** "Skid 3" för en volym, "Nål på p2 Vågkvitto …" för en nål. */
function siteEtikett(state, o) {
  if (!arNal(o)) return o.namn || MALLAR[o.typ]?.namn || "Objekt";
  const p = (state.punkter || []).find((x) => x.id === o.punktId);
  const titel = p ? String(p.titel) : o.punktId;
  return `Nål på ${titel.length > 50 ? titel.slice(0, 47) + "…" : titel}`;
}

/** Fält en BCF-import får sätta på ett ärende. Allt annat (belopp, fakturering, datum m.m.) rörs aldrig. */
const BCF_FALT = ["benamning", "status", "klass", "ansvarig", "bcfGuid", "bcfBeskrivning", "bcfKomponenter", "objectGuid", "viewpoint", "boundingBox", "modelVersionId"];

/** Rensar BCF-fält: okända nycklar och ogiltiga värden tas bort i stället för att sparas. */
function bcfRensa(falt, objektIds) {
  const ut = {};
  for (const k of BCF_FALT) if (falt?.[k] !== undefined) ut[k] = falt[k];
  if (typeof ut.benamning !== "string" || !ut.benamning.trim()) delete ut.benamning;
  else ut.benamning = ut.benamning.trim().slice(0, 300);
  if (!ATA_STATUS.includes(ut.status)) delete ut.status;
  if (!ATA_KLASS.some(([k]) => k === ut.klass)) delete ut.klass;
  if (typeof ut.ansvarig !== "string") delete ut.ansvarig;
  if (typeof ut.bcfBeskrivning !== "string") delete ut.bcfBeskrivning;
  else ut.bcfBeskrivning = ut.bcfBeskrivning.slice(0, 2000);
  if (!arGuid(ut.bcfGuid)) delete ut.bcfGuid;
  if (!Array.isArray(ut.bcfKomponenter)) delete ut.bcfKomponenter;
  else ut.bcfKomponenter = ut.bcfKomponenter.filter((g) => typeof g === "string" && g).slice(0, 50);
  if (ut.viewpoint !== undefined && viewpointFel(ut.viewpoint) !== null) delete ut.viewpoint;
  if (ut.boundingBox !== undefined && boxFel(ut.boundingBox) !== null) delete ut.boundingBox;
  // En koppling kräver ett objekt som finns i projektet — annars faller den bort men kameran kan stå kvar.
  if (ut.objectGuid !== undefined && (typeof ut.objectGuid !== "string" || !objektIds.has(ut.objectGuid))) {
    delete ut.objectGuid;
    delete ut.boundingBox;
    delete ut.modelVersionId;
  }
  if (ut.modelVersionId !== undefined && typeof ut.modelVersionId !== "string") delete ut.modelVersionId;
  return ut;
}

function loggat(state, projektId, text) {
  const post = { ts: new Date().toISOString(), anvandare: hamtaNamn() || "Okänd", projektId: projektId || null, text };
  return { ...state, andringslogg: [post, ...(state.andringslogg || [])].slice(0, 150) };
}

export function reducer(state, action) {
  switch (action.type) {
    /* Ersätt hela state — används vid inläsning och vid inkommande delad ändring. */
    case "SATT_STATE":
      return action.state;

    /* Slår ihop poster från den delade loggtabellen med dem som finns lokalt.
       Nyckeln är ts+text, så serverns version av en post ersätter den egna —
       det är den som bär den inloggade avsändaren i stället för det namn
       användaren själv skrivit in. */
    case "SATT_LOGG": {
      const nyckel = (p) => `${p.ts}|${p.text}`;
      const sedda = new Map();
      for (const p of action.poster || []) sedda.set(nyckel(p), p);
      for (const p of state.andringslogg || []) if (!sedda.has(nyckel(p))) sedda.set(nyckel(p), p);
      const alla = [...sedda.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 150);
      return { ...state, andringslogg: alla };
    }

    case "FALT_KONTROLL": {
      const { rad } = action;
      if (!rad?.id || !state.projekt.some((p) => p.id === rad.projektId)) return state;
      const gamla = state.faltkontroller || [];
      const fore = gamla.find((p) => p.id === rad.id);
      const finns = !!fore;
      const nytt = { ...state, faltkontroller: finns ? byt(gamla, rad.id, () => ({ ...rad })) : [...gamla, { ...rad }] };
      const etiketter = { resultat: "resultat", datum: "kontrolldatum", kontrollant: "kontrollant", referens: "protokollreferens", notering: "notering", mallrevision: "mallrevision" };
      const andringar = Object.entries(etiketter).filter(([k]) => (fore?.[k] || "") !== (rad[k] || "")).map(([k, namn]) => `${namn}: ${fore?.[k] || "tomt"} → ${rad[k] || "tomt"}`);
      return andringar.length ? loggat(nytt, rad.projektId, `Egenkontroll ${rad.punktId} (${rad.omfattning}): ${andringar.join("; ")}`) : nytt;
    }

    /* Kontraktsprofil: ersätter projektets tidigare profil. Granskas igen här
       så att en felaktig fil aldrig sparas, oavsett varifrån den kommer. */
    case "SPARA_KONTRAKT": {
      const { profil, av = "", datum = "" } = action;
      if (granskaProfil(profil, state.projekt).fel.length) return state;
      const rad = rensaProfil(profil, { av, datum });
      const ovriga = (state.kontrakt || []).filter((k) => k.projektId !== rad.projektId);
      const fanns = ovriga.length !== (state.kontrakt || []).length;
      return loggat({ ...state, kontrakt: [...ovriga, rad] }, rad.projektId, `Kontraktsprofil ${fanns ? "uppdaterad" : "inläst"}: ${rad.kalla.dokument}${rad.kalla.datum ? ` (${rad.kalla.datum})` : ""}`);
    }

    case "TA_BORT_KONTRAKT": {
      const fore = state.kontrakt || [];
      if (!fore.some((k) => k.projektId === action.projektId)) return state;
      return loggat({ ...state, kontrakt: fore.filter((k) => k.projektId !== action.projektId) }, action.projektId, "Kontraktsprofil borttagen — standardmallen gäller igen");
    }

    case "SKAPA_PROJEKT": {
      const { rad } = action;
      if (!rad?.id || state.projekt.some((p) => p.id === rad.id) || projektstartFel(state, rad)) return state;
      // Ekonomivärden ändras fortsatt via administratörens vanliga flöde.
      const projekt = { ...rad, kontraktsvarde: null };
      const nytt = efterInlasning({ ...state, projekt: [...state.projekt, projekt] });
      return loggat(nytt, projekt.id, `Projekt skapat: ${projekt.nr || "nummer saknas"} ${projekt.namn}. Tomma mallar, inga tidigare resultat kopierade.`);
    }

    /* Ärv valda delar från ett tidigare projekt (lib/projektmall.js). Uttryckligt
       steg efter SKAPA_PROJEKT, som fortsatt startar tomt. */
    case "PROJEKT_ARV": {
      const { fran, till, delar } = action;
      if (!fran || !till || fran === till) return state;
      const kalla = state.projekt.find((p) => p.id === fran);
      if (!kalla || !state.projekt.some((p) => p.id === till)) return state;
      const { state: nytt, antal } = arv(state, fran, till, delar || [], { datum: idag(), namn: hamtaNamn() || "" });
      const delText = ARVSDELAR.filter(([k]) => antal[k]).map(([k, namn]) => `${namn.toLowerCase()} ${antal[k]}`).join(", ");
      if (!delText) return state;
      return loggat(nytt, till, `Ärvt från ${kalla.nr || kalla.namn}: ${delText}`);
    }

    case "UPPDATERA": {
      const { lista, id, falt, varde } = action;
      if (!state[lista]) return state;
      const rad = state[lista].find((r) => r.id === id);
      if (!rad || Object.is(rad[falt], varde)) return state;
      const nytt = { ...state, [lista]: byt(state[lista], id, (r) => ({ ...r, [falt]: varde })) };
      const info = etikettFor(state, lista, id);
      const kort = (v) => String(v ?? "—").slice(0, 100);
      return loggat(nytt, info?.projektId, `${info?.etikett || id}: ${falt} ändrad ${kort(rad[falt])} → ${kort(varde)}`);
    }

    /* Kommentar på en punkt. Kommentarerna är en lista med id, så att två personers
       kommentarer slås ihop av sammanfoga.js i stället för att den ena skriver över den andra. */
    case "PUNKT_KOMMENTAR": {
      const { id, kommentar } = action;
      const text = String(kommentar?.text || "").trim();
      const rad = (state.punkter || []).find((r) => r.id === id);
      if (!rad || !text || !kommentar.id) return state;
      const ny = { id: kommentar.id, text, av: kommentar.av || "", ts: kommentar.ts || "" };
      const nytt = { ...state, punkter: byt(state.punkter, id, (r) => ({ ...r, kommentarer: [...(r.kommentarer || []), ny] })) };
      const info = etikettFor(state, "punkter", id);
      return loggat(nytt, info?.projektId, `${info?.etikett || id}: kommentar — ${text.slice(0, 100)}`);
    }

    /* Komplettera en händelse med en länkad post (ÄTA, hinder, risk). Posten och
       länken läggs till tillsammans så att ingen av dem kan finnas utan den andra. */
    case "HANDELSE_KOPPLA": {
      const { punktId, lista, rad, lank } = action;
      const punkt = (state.punkter || []).find((r) => r.id === punktId);
      if (!punkt || !state[lista] || !rad?.id || !lank?.id) return state;
      if ((punkt.lankar || []).some((l) => l.id === lank.id)) return state;
      const nytt = {
        ...state,
        [lista]: [...state[lista], rad],
        punkter: byt(state.punkter, punktId, (r) => ({ ...r, lankar: [...(r.lankar || []), lank] })),
      };
      const info = etikettFor(state, "punkter", punktId);
      return loggat(nytt, punkt.projektId, `${info?.etikett || punktId}: kopplad till ${lank.etikett}`);
    }

    /* Statusändring loggas — det är den som revisionsspåret bygger på. */
    case "UPPDATERA_STATUS": {
      const { lista, id, falt, varde } = action;
      if (!state[lista]) return state;
      const rad = state[lista].find((r) => r.id === id);
      if (!rad) return state;
      const gammalt = rad[falt];
      /* Byter man projektets status för hand sätts fasen till statusens första, om projektet inte
         redan ligger i en fas som hör till den. Annars styr fasen statusen. */
      const flyttaFas = lista === "projekt" && falt === "status" && faseInfo(rad.fas).status !== varde;
      const nytt = { ...state, [lista]: byt(state[lista], id, (r) => ({ ...r, [falt]: varde, ...(flyttaFas ? { fas: forstaFasForStatus(varde) } : {}) })) };
      if (gammalt === varde) return nytt;
      return { ...nytt, andringslogg: medLogg(state, lista, id, gammalt, varde) };
    }

    case "LAGG_TILL": {
      const { lista, rad } = action;
      return { ...state, [lista]: [...(state[lista] || []), rad] };
    }

    case "TA_BORT": {
      const { lista, id } = action;
      return { ...state, [lista]: (state[lista] || []).filter((r) => r.id !== id) };
    }

    /* Ersätter en hel kollektion — för sorteringar och massuppdateringar. */
    /* Val i konfliktvyn (#70): sätt det valda värdet på sökvägen och logga valet. */
    case "LOS_KONFLIKT": {
      const { steg, varde, vag, val } = action;
      if (!Array.isArray(steg) || typeof steg[0] !== "string" || !Array.isArray(state[steg[0]])) return state;
      const nytt = { ...state, [steg[0]]: sattVidSteg(state[steg[0]], steg.slice(1), varde) };
      return loggat(nytt, null, `Konflikt löst: ${vag} — ${val === "mina" ? "min version" : "den sparade versionen"} valdes`);
    }

    case "SATT_LISTA": {
      /* Vyerna ser portföljen utan förlorade anbud (lib/arkiv.js). Deras rader hålls kvar här, så att
         en sortering eller massuppdatering aldrig tar bort arkivet. */
      const dolda = (state[action.lista] || []).filter((r) => arDold(state, action.lista, r));
      return { ...state, [action.lista]: dolda.length ? [...action.rader, ...dolda] : action.rader };
    }

    /* Tar tillbaka ett förlorat anbud från arkivet. Det börjar om i fas 1 med status Planering och uppstart.
       Orsaken rensas från projektet men står kvar i ändringsloggen. */
    case "ATERAKTIVERA_ANBUD": {
      const rad = state.projekt.find((p) => p.id === action.id);
      if (!rad || rad.status !== "ANBUD_EJ_VUNNET") return state;
      const nytt = {
        ...state,
        projekt: byt(state.projekt, action.id, (p) => {
          const { orsakEjVunnet: _o, orsakEjVunnetText: _t, ejVunnetDatum: _d, ...rest } = p;
          return { ...rest, status: "PLANERING_OCH_UPPSTART", fas: 1 };
        }),
      };
      /* En sparad projektstart bär avropsbeslutet Tacka nej. Det återställs, annars skulle guiden fortfarande
         behandla projektet som förlorat och arkivera det igen vid nästa sparning. */
      const projektstart = (state.projektstart || []).map((ps) => {
        if (ps.projektId !== action.id || ps.utkast?.v?.beslut !== "Tacka nej") return ps;
        return { ...ps, utkast: { ...ps.utkast, v: { ...ps.utkast.v, beslut: "", orsakEjVunnet: "", orsakEjVunnetText: "" } } };
      });
      return loggat({ ...nytt, projektstart }, action.id, "Förlorat anbud återaktiverat: tillbaka i fas 1, Planering och uppstart.");
    }

    /* Flyttar ett anbud till arkivet för förlorade anbud: fas 1, orsak och datum. Fas 2–8 döljs
       eftersom statusen bara hör till fas 1. */
    case "MARKERA_EJ_VUNNET": {
      const { id, orsak, text } = action;
      const rad = state.projekt.find((p) => p.id === id);
      if (!rad || !EJ_VUNNET_ORSAKER.some(([k]) => k === orsak)) return state;
      const nytt = {
        ...state,
        projekt: byt(state.projekt, id, (p) => ({ ...p, status: "ANBUD_EJ_VUNNET", fas: 1, orsakEjVunnet: orsak, orsakEjVunnetText: String(text || "").trim(), ejVunnetDatum: idag() })),
      };
      const namn = EJ_VUNNET_ORSAKER.find(([k]) => k === orsak)[1];
      return loggat(nytt, id, `Anbud markerat som ej vunnet (${namn})${text ? `: ${String(text).trim().slice(0, 100)}` : ""}. Flyttat till arkivet.`);
    }

    /* Sätter projektets fas för hand, till exempel när ett anbud vunnits (fas 1 → 2). Statusen följer
       fasen. Ett förlorat anbud har bara Återaktivera, och ogiltiga fasnummer avvisas. Loggas. */
    case "SATT_PROJEKTFAS": {
      const { id, fas } = action;
      const rad = state.projekt.find((p) => p.id === id);
      if (!rad || rad.status === "ANBUD_EJ_VUNNET" || !arFasNr(fas)) return state;
      const fore = arFasNr(rad.fas) ? rad.fas : fasFranStatus(rad.status);
      const ny = faseInfo(fas);
      if (fore === fas && normaliseraStatus(rad.status) === ny.status) return state;
      const nytt = { ...state, projekt: byt(state.projekt, id, (p) => ({ ...p, fas, status: ny.status, fasModell: FAS_MODELL })) };
      return loggat(nytt, id, `Fas ändrad: ${fore}. ${faseInfo(fore).kort} → ${fas}. ${ny.kort} (status ${statusEtikett(ny.status)})`);
    }

    /* Tillämpar ett granskat importförslag (lib/importera.js). En
       säkerhetskopia körs genom samma normalisering och migrering som en
       vanlig inläsning, så att äldre filer får de fält som tillkommit sedan.
       Importen hamnar i ändringsloggen med filnamn och omfattning. */
    case "IMPORTERA": {
      const { forslag } = action;
      if (!kanTillampas(forslag)) return state;
      let ut = tillampaForslag(state, forslag);
      if (forslag.typ === "backup") {
        ut = efterInlasning(normalisera(ut));
        ut.andringslogg = state.andringslogg || [];
      }
      const post = {
        ts: new Date().toISOString(),
        anvandare: hamtaNamn() || "Okänd",
        projektId: forslag.projektId || null,
        text: forslagText(forslag),
      };
      return { ...ut, andringslogg: [post, ...(ut.andringslogg || [])].slice(0, 150) };
    }

    /* Kontraktsvärde: administratörslåst, sparas i eget dokument. */
    case "UPPD_KONTRAKT": {
      const { pid, varde } = action;
      const v = varde === "" || varde === null || varde === undefined ? null : Number(varde);
      return { ...state, projekt: byt(state.projekt, pid, (p) => ({ ...p, kontraktsvarde: v })) };
    }

    /* Betalplan: administratörslåst, sparas i eget dokument. Status loggas. */
    case "UPPD_BETALPLAN": {
      const { id, falt, varde } = action;
      const rad = state.betalplan.find((r) => r.id === id);
      if (!rad) return state;
      const gammalt = rad[falt];
      const nytt = { ...state, betalplan: byt(state.betalplan, id, (r) => ({ ...r, [falt]: varde })) };
      if (falt !== "status" || gammalt === varde) return nytt;
      return { ...nytt, andringslogg: medLogg(state, "betalplan", id, gammalt, varde) };
    }

    /* Ny rad i betalplanen — även den administratörslåst. */
    case "UPPD_BETALPLAN_NY":
      return { ...state, betalplan: [...state.betalplan, action.rad] };

    /* Underlagsstämpel per projekt — sätter infört-datum och signatur. */
    case "UPPD_UNDERLAG": {
      const { pid, falt, varde, datum } = action;
      return {
        ...state,
        projekt: byt(state.projekt, pid, (p) => {
          const u = { ...(p.underlag || { kalla: "", datum: "", infort: "", av: "" }), [falt]: varde };
          if (falt === "kalla" || falt === "datum") {
            u.infort = datum;
            u.av = hamtaNamn() || "";
          }
          return { ...p, underlag: u };
        }),
      };
    }

    /* Milstolpestatus ligger i mstatus, som skapas lazy per projekt och kod. */
    case "UPPD_MSTATUS": {
      const { pid, kod, falt, varde } = action;
      const finns = (state.mstatus || []).some((x) => x.projektId === pid && x.kod === kod);
      const bas = { id: `ms-${pid}-${kod}`, projektId: pid, kod, underlag: {}, avisering: "", faktura: "" };
      const rader = finns ? state.mstatus : [...(state.mstatus || []), bas];
      return {
        ...state,
        mstatus: rader.map((r) =>
          r.projektId === pid && r.kod === kod ? { ...r, [falt]: varde } : r
        ),
      };
    }

    case "UPPD_MUNDERLAG": {
      const { pid, kod, n, varde } = action;
      const finns = (state.mstatus || []).some((x) => x.projektId === pid && x.kod === kod);
      const bas = { id: `ms-${pid}-${kod}`, projektId: pid, kod, underlag: {}, avisering: "", faktura: "" };
      const rader = finns ? state.mstatus : [...(state.mstatus || []), bas];
      return {
        ...state,
        mstatus: rader.map((r) =>
          r.projektId === pid && r.kod === kod
            ? { ...r, underlag: { ...(r.underlag || {}), [n]: !!varde } }
            : r
        ),
      };
    }

    /* Veckokollen: raden skapas första gången en fråga besvaras. */
    case "SATT_VECKORAD": {
      const { pid, vecka, falt, varde } = action;
      const finns = state.veckokoll.some((r) => r.projektId === pid && r.vecka === vecka);
      const rader = finns
        ? state.veckokoll
        : [...state.veckokoll, { id: `v-${pid}-${vecka}`, projektId: pid, vecka, klar: false, anteckning: "" }];
      return {
        ...state,
        veckokoll: rader.map((r) =>
          r.projektId === pid && r.vecka === vecka ? { ...r, [falt]: varde } : r
        ),
      };
    }

    /* Rutinpunkt av-/påbockad per projekt. */
    case "VAXLA_RUTINPUNKT": {
      const { pid, nyckel, klar } = action;
      const finns = state.rutinstatus.some((r) => r.projektId === pid && r.punkt === nyckel);
      if (!finns)
        return { ...state, rutinstatus: [...state.rutinstatus, { projektId: pid, punkt: nyckel, klar }] };
      return {
        ...state,
        rutinstatus: state.rutinstatus.map((r) =>
          r.projektId === pid && r.punkt === nyckel ? { ...r, klar } : r
        ),
      };
    }

    /* Bemanning per person, projekt och vecka. 0 timmar tar bort raden. */
    case "SATT_BEMANNING": {
      const { personId, projektId, vecka, timmar } = action;
      const t = Number(timmar) || 0;
      const utan = state.bemanning.filter(
        (b) => !(b.personId === personId && b.projektId === projektId && b.vecka === vecka)
      );
      if (t <= 0) return { ...state, bemanning: utan };
      return {
        ...state,
        bemanning: [...utan, { id: `b-${personId}-${projektId}-${vecka}`, personId, projektId, vecka, timmar: t }],
      };
    }

    /* Fakturaunderlag: skapas av allt ofakturerat och låser raderna i samma
       steg, så att ingen tidrad eller kostnad hamnar i två underlag. */
    case "SKAPA_FAKTURAUNDERLAG": {
      const ut = skapaFakturaunderlag(state, action.pid, action.datum);
      if (ut === state) return state;
      const f = ut.fakturor[ut.fakturor.length - 1];
      return loggat(ut, action.pid, `Fakturaunderlag ${f.nr} skapat (${f.summa} kr)`);
    }

    case "ANGRA_FAKTURAUNDERLAG": {
      const f = state.fakturor.find((x) => x.id === action.id);
      const ut = angraFakturaunderlag(state, action.id);
      if (ut === state) return state;
      return loggat(ut, f.projektId, `Fakturaunderlag ${f.nr} ångrat — raderna är upplåsta`);
    }

    /* ---------- ÄTA-kalkylen ----------
       Raderna ligger på posten (kalkyl.rader) och sparas som allt annat.
       Beloppet på posten ändras bara när användaren sparar kalkylen — då
       skrivs nettot (exkl. moms) och ändringen loggas. */
    case "ATA_KALKYL_LAGG_TILL": {
      const { id, rader, efter } = action;
      return medKalkylrader(state, id, (fore) => {
        const i = efter ? fore.findIndex((r) => r.id === efter) : -1;
        return i < 0 ? [...fore, ...rader] : [...fore.slice(0, i + 1), ...rader, ...fore.slice(i + 1)];
      });
    }

    case "ATA_KALKYL_ANDRA": {
      const { id, radId, andring } = action;
      return medKalkylrader(state, id, (fore) => fore.map((r) => (r.id === radId ? { ...r, ...andring } : r)));
    }

    case "ATA_KALKYL_TA_BORT": {
      const { id, radId } = action;
      return medKalkylrader(state, id, (fore) => fore.filter((r) => r.id !== radId));
    }

    case "ATA_KALKYL_SPARA": {
      const u = state.ur.find((r) => r.id === action.id);
      if (!u) return state;
      const rader = kalkylRader(u);
      const { netto } = kalkylSummor(rader);
      const ut = {
        ...state,
        ur: byt(state.ur, u.id, (r) => ({
          ...r,
          belopp: netto,
          kalkyl: { ...(r.kalkyl || {}), rader, uppdaterad: idag(), sparad: idag() },
        })),
      };
      const fore = u.belopp === null || u.belopp === undefined || u.belopp === "" ? "utan belopp" : fmtSEK(u.belopp);
      return loggat(ut, u.projektId, `${u.nr}: belopp ur kalkylen ${fore} → ${fmtSEK(netto)} (exkl. moms)`);
    }

    /* ---------- Siten ----------
       Volymer och nålar per projekt. En rad som inte går att spara (en nål
       utan punkt, en volym utan mått) avvisas — state lämnas orört. Flytt och
       måttändringar loggas inte, det skulle fylla loggen när någon drar. */
    case "SITE_LAGG_TILL": {
      const { rad } = action;
      if (objektFel(rad, punkterForSite(state, rad?.projektId)) !== null) return state;
      const ut = { ...state, siteObjekt: [...(state.siteObjekt || []), rad] };
      return loggat(ut, rad.projektId, `Site: ${siteEtikett(state, rad)} placerad`);
    }

    /* Profilens standardlayout (lib/siteLager.js) på en tom tomt, i ett steg och med en loggrad.
       Har projektet redan volymer på siten görs ingenting — layouten skriver aldrig över. */
    case "SITE_STANDARDLAYOUT": {
      const { projektId, rader, profil } = action;
      if (!Array.isArray(rader) || !rader.length || rader.some((r) => r.projektId !== projektId)) return state;
      if ((state.siteObjekt || []).some((r) => r.projektId === projektId && r.typ !== "nal")) return state;
      const punkter = punkterForSite(state, projektId);
      if (rader.some((r) => objektFel(r, punkter) !== null)) return state;
      const ut = { ...state, siteObjekt: [...(state.siteObjekt || []), ...rader] };
      return loggat(ut, projektId, `Site: standardlayout ${profil || ""} inlagd (${rader.length} objekt)`.replace("  ", " "));
    }

    case "SITE_ANDRA": {
      const { id, andring } = action;
      const o = (state.siteObjekt || []).find((r) => r.id === id);
      if (!o) return state;
      const nytt = { ...o, ...andring, id: o.id, projektId: o.projektId, typ: o.typ };
      if (objektFel(nytt, punkterForSite(state, o.projektId)) !== null) return state;
      return { ...state, siteObjekt: byt(state.siteObjekt, id, () => nytt) };
    }

    case "SITE_TA_BORT": {
      const o = (state.siteObjekt || []).find((r) => r.id === action.id);
      if (!o) return state;
      const ut = { ...state, siteObjekt: state.siteObjekt.filter((r) => r.id !== o.id) };
      return loggat(ut, o.projektId, `Site: ${siteEtikett(state, o)} borttagen`);
    }

    /* Ritningar i 3D-vyn: metadata och placering (lib/ritningar.js). Filen ligger i Storage
       eller IndexedDB och kommer aldrig in här. Uppladdning och borttagning loggas, flytt inte. */
    case "SITE_RITNING_LAGG_TILL": {
      const r = action.rad;
      if (!r?.id || !r.projektId || !r.sokvag || !state.projekt.some((p) => p.id === r.projektId)) return state;
      if ((state.siteRitningar || []).some((x) => x.id === r.id)) return state;
      if (/^data:/i.test(r.sokvag)) return state;
      return loggat({ ...state, siteRitningar: [...(state.siteRitningar || []), { ...r }] }, r.projektId, `Ritning uppladdad till siten: ${r.namn}`);
    }

    case "SITE_RITNING_ANDRA": {
      const { id, andring } = action;
      const r = (state.siteRitningar || []).find((x) => x.id === id);
      if (!r || ritningsFel(andring) !== null) return state;
      const tvatt = (k, v) => (k === "namn" ? String(v).trim() : k === "synlig" || k === "placering" ? v : Number(v));
      const tal = Object.fromEntries(Object.entries(andring).map(([k, v]) => [k, tvatt(k, v)]));
      return { ...state, siteRitningar: state.siteRitningar.map((x) => (x.id === id ? { ...x, ...tal } : x)) };
    }

    case "SITE_RITNING_TA_BORT": {
      const r = (state.siteRitningar || []).find((x) => x.id === action.id);
      if (!r) return state;
      return loggat({ ...state, siteRitningar: state.siteRitningar.filter((x) => x.id !== r.id) }, r.projektId, `Ritning borttagen från siten: ${r.namn}`);
    }

    /* Återställ = tomt läge för projektet. Andra projekts objekt lämnas. */
    case "SITE_ATERSTALL": {
      const { projektId } = action;
      const kvar = (state.siteObjekt || []).filter((r) => r.projektId !== projektId);
      if (kvar.length === (state.siteObjekt || []).length) return state;
      return loggat({ ...state, siteObjekt: kvar }, projektId, "Site: återställd till tom tomt");
    }

    /* ---------- Ärende ↔ modell (CDE/BCF-anda) ----------
       Ett UR/ÄTA-ärende pekar på ett siteObjekt (objectGuid), en kameravy, objektets
       omslutande låda och en modellversion. Fälten ligger direkt på ärendet. Kopplingen
       avvisas om ärendet eller objektet inte finns, eller om objektet hör till ett annat
       projekt — state lämnas då orört. */
    case "ATA_KOPPLA_OBJEKT": {
      const { id, koppling } = action;
      const u = (state.ur || []).find((r) => r.id === id);
      if (!u || kopplingFel(koppling) !== null) return state;
      const o = (state.siteObjekt || []).find((r) => r.id === koppling.objectGuid && r.projektId === u.projektId)
        || ifcObjektForProjekt(state, u.projektId).find((r) => r.id === koppling.objectGuid);
      if (!o) return state;
      const falt = {
        objectGuid: koppling.objectGuid,
        viewpoint: koppling.viewpoint ?? null,
        boundingBox: koppling.boundingBox ?? null,
        modelVersionId: koppling.modelVersionId ?? "",
      };
      if (JSON.stringify([u.objectGuid, u.viewpoint, u.boundingBox, u.modelVersionId]) === JSON.stringify([falt.objectGuid, falt.viewpoint, falt.boundingBox, falt.modelVersionId])) return state;
      const ut = { ...state, ur: byt(state.ur, id, (r) => ({ ...r, ...falt })) };
      return loggat(ut, u.projektId, `${u.nr || id}: kopplad till ${siteEtikett(state, o)} i 3D`);
    }

    case "ATA_LOSS_OBJEKT": {
      const u = (state.ur || []).find((r) => r.id === action.id);
      if (!u || !u.objectGuid) return state;
      const ut = {
        ...state,
        ur: byt(state.ur, u.id, (r) => {
          const { objectGuid: _g, viewpoint: _v, boundingBox: _b, modelVersionId: _m, ...kvar } = r;
          return kvar;
        }),
      };
      return loggat(ut, u.projektId, `${u.nr || u.id}: koppling till 3D-objekt borttagen`);
    }

    /* ---------- BCF ----------
       Import skapar nya ärenden och uppdaterar de som redan har samma bcfGuid. Bara BCF-fälten
       (se BCF_FALT) skrivs; en ogiltig status, kameravy eller koppling tas bort ur raden i
       stället för att sparas. Ett nytt ärende vars bcfGuid redan finns i projektet hoppas över. */
    case "ATA_IMPORTERA_BCF": {
      const { projektId, nya = [], uppdatera = [] } = action;
      if (!state.projekt.some((p) => p.id === projektId)) return state;
      const objektIds = new Set([...(state.siteObjekt || []).filter((o) => o.projektId === projektId), ...ifcObjektForProjekt(state, projektId)].map((o) => o.id));
      const ur = state.ur || [];
      let rader = ur;
      let antalNya = 0;
      let antalUppd = 0;
      for (const u of uppdatera) {
        const rad = rader.find((r) => r.id === u?.id && r.projektId === projektId);
        if (!rad) continue;
        const falt = bcfRensa(u.falt, objektIds);
        if (!Object.keys(falt).length) continue;
        rader = byt(rader, rad.id, (r) => ({ ...r, ...falt }));
        antalUppd += 1;
      }
      for (const n of nya) {
        if (!n || typeof n.id !== "string" || n.projektId !== projektId || rader.some((r) => r.id === n.id)) continue;
        if (n.bcfGuid && rader.some((r) => r.projektId === projektId && r.bcfGuid === n.bcfGuid)) continue;
        const falt = bcfRensa(n, objektIds);
        if (!falt.benamning) continue;
        // BCF-fälten kommer bara ur den rensade `falt` — inget som rensats bort får följa med n.
        const bas = Object.fromEntries(Object.entries(n).filter(([k]) => !BCF_FALT.includes(k)));
        rader = [...rader, { ...bas, ...falt }];
        antalNya += 1;
      }
      if (!antalNya && !antalUppd) return state;
      return loggat({ ...state, ur: rader }, projektId, `BCF-import: ${antalNya} nya och ${antalUppd} uppdaterade ärenden`);
    }

    /* Efter en export: ärenden som fick ett nytt BCF-guid sparar det, så att en senare import uppdaterar dem. */
    case "ATA_SATT_BCFGUID": {
      const guider = action.guider || {};
      let rader = state.ur || [];
      let andrat = false;
      for (const [id, g] of Object.entries(guider)) {
        const rad = rader.find((r) => r.id === id);
        if (!rad || !arGuid(g) || rad.bcfGuid === g) continue;
        rader = byt(rader, id, (r) => ({ ...r, bcfGuid: g }));
        andrat = true;
      }
      return andrat ? { ...state, ur: rader } : state;
    }

    /* ---------- Modellversioner ----------
       En ögonblicksbild av projektets siteObjekt, som jämförelseverktyget ställer mot
       nuläget. Bilden tas ur state, inte ur anroparen. De 20 senaste per projekt sparas. */
    case "MODELLVERSION_SKAPA": {
      const { projektId, id, namn, datum } = action;
      if (!projektId || !id || !state.projekt.some((p) => p.id === projektId)) return state;
      if ((state.modellVersioner || []).some((v) => v.id === id)) return state;
      const objekt = structuredClone((state.siteObjekt || []).filter((o) => o.projektId === projektId));
      const rad = { id, projektId, namn: String(namn || "").trim() || "Modellversion", datum: datum || new Date().toISOString(), objekt };
      const andra = (state.modellVersioner || []).filter((v) => v.projektId !== projektId);
      const egna = [...(state.modellVersioner || []).filter((v) => v.projektId === projektId), rad].slice(-20);
      return loggat({ ...state, modellVersioner: [...andra, ...egna] }, projektId, `Modellversion sparad: ${rad.namn} (${objekt.length} objekt)`);
    }

    case "MODELLVERSION_TA_BORT": {
      const v = (state.modellVersioner || []).find((r) => r.id === action.id);
      if (!v) return state;
      return loggat({ ...state, modellVersioner: state.modellVersioner.filter((r) => r.id !== v.id) }, v.projektId, `Modellversion borttagen: ${v.namn}`);
    }

    /* ---------- IFC-modeller ----------
       Bara metadata (GlobalId, expressID, namn, klass, låda) sparas här; geometrin ligger i
       webbläsarens IndexedDB (lib/ifcCache.js). Högst IFC_MAX_MODELLER per projekt. En modell
       som tas bort tar inte med sig ärendena — de behåller sitt GlobalId och sin kameravy. */
    case "IFC_MODELL_LAGG_TILL": {
      const m = action.modell;
      if (ifcModellFel(m) !== null || !state.projekt.some((p) => p.id === m.projektId)) return state;
      const alla = state.ifcModeller || [];
      if (alla.some((r) => r.id === m.id)) return state;
      if (alla.filter((r) => r.projektId === m.projektId).length >= IFC_MAX_MODELLER) return state;
      return loggat({ ...state, ifcModeller: [...alla, structuredClone(m)] }, m.projektId, `IFC-modell tillagd: ${m.namn} (${m.objekt.length} objekt)`);
    }

    case "IFC_MODELL_TA_BORT": {
      const m = (state.ifcModeller || []).find((r) => r.id === action.id);
      if (!m) return state;
      return loggat({ ...state, ifcModeller: state.ifcModeller.filter((r) => r.id !== m.id) }, m.projektId, `IFC-modell borttagen: ${m.namn}`);
    }

    /* ---------- Byggmöten ----------
       Protokollets punkter ligger nästlade i mötet, så de kan inte gå via
       UPPDATERA. Statusbyte på själva mötet loggas som alla andra. */
    case "UPPD_MOTE": {
      const { id, falt, varde } = action;
      const m = (state.byggmoten || []).find((x) => x.id === id);
      if (!m) return state;
      const gammalt = m[falt];
      const nytt = {
        ...state,
        byggmoten: state.byggmoten.map((x) => (x.id === id ? { ...x, [falt]: varde } : x)),
      };
      if (falt !== "status" || gammalt === varde) return nytt;
      return { ...nytt, andringslogg: medLogg(state, "byggmoten", id, gammalt, varde) };
    }

    case "NY_MOTESPUNKT": {
      const { moteId, punkt } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId ? { ...m, punkter: [...(m.punkter || []), punkt] } : m
        ),
      };
    }

    case "UPPD_MOTESPUNKT": {
      const { moteId, ptId, falt, varde } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId
            ? { ...m, punkter: m.punkter.map((pt) => (pt.id === ptId ? { ...pt, [falt]: varde } : pt)) }
            : m
        ),
      };
    }

    case "TA_BORT_MOTESPUNKT": {
      const { moteId, ptId } = action;
      return {
        ...state,
        byggmoten: (state.byggmoten || []).map((m) =>
          m.id === moteId ? { ...m, punkter: m.punkter.filter((pt) => pt.id !== ptId) } : m
        ),
      };
    }

    /* Rondavvikelser ligger nästlade i hseqRonder — uppdateras via avvikelsens id. */
    case "UPPD_RONDAVVIKELSE": {
      const { id, falt, varde } = action;
      const rond = (state.hseqRonder || []).find((r) => (r.avvikelser || []).some((a) => a.id === id));
      const fore = rond?.avvikelser.find((a) => a.id === id);
      const nytt = {
        ...state,
        hseqRonder: (state.hseqRonder || []).map((r) => {
          if (!(r.avvikelser || []).some((a) => a.id === id)) return r;
          return { ...r, avvikelser: r.avvikelser.map((a) => (a.id === id ? { ...a, [falt]: varde } : a)) };
        }),
      };
      // Statusbyte på en rondavvikelse är en HSEQ-händelse och ska finnas i spåret.
      if (falt !== "status" || !fore || fore.status === varde) return nytt;
      const text = String(fore.text || "Rondavvikelse");
      return loggat(nytt, rond.projektId, `Rondavvikelse ${text.length > 60 ? text.slice(0, 57) + "…" : text}: status ${fore.status || "—"} → ${varde}`);
    }

    /* EPC-checklistan: en ledtid markerad klar före sin fas. Loggas — det
       är ett besked om att något ledtidskrävande faktiskt är igångsatt. */
    case "EPC_LEDTID": {
      const { pid, ledtid, klar } = action;
      const nytt = {
        ...state,
        epcLedtider: uppsatt(state.epcLedtider, (r) => r.projektId === pid && r.ledtid === ledtid, {
          id: `el-${pid}-${ledtid}`,
          projektId: pid,
          ledtid,
        }, { klar, datum: klar ? idag() : "", av: klar ? hamtaNamn() || "" : "" }),
      };
      const l = LEDTIDER.find((x) => x.id === ledtid);
      return loggat(nytt, pid, `Ledtid ${klar ? "klar" : "återöppnad"}: ${l ? l.arende : ledtid}`);
    }

    /* EPC-checklistan: en punkt bockad av, satt som ej aktuell eller
       återöppnad. Loggas — en godkänd hållpunkt är ett besked i sig. */
    /* Skapar projektstarten för ett befintligt projekt, med guidens startrader och
       projektets fas som golv — så att t.ex. interface-listan kan föras i
       Veckokoll innan guiden öppnats. Finns den redan händer inget. */
    case "PROJEKTSTART_SKAPA": {
      const proj = (state.projekt || []).find((p) => p.id === action.pid);
      if (!proj || (state.projektstart || []).some((x) => x.projektId === action.pid)) return state;
      const u = tomtUtkast();
      u.fasGolv = arFasNr(proj.fas) ? proj.fas : fasFranStatus(proj.status);
      return loggat({ ...state, projektstart: [...(state.projektstart || []), projektstartPost(action.pid, u)] }, action.pid, "Projektstart skapad");
    }

    /* En rad i en Projektstart-tabell ändrad utanför guiden, t.ex. interface-listan i Veckokoll. */
    case "PROJEKTSTART_RAD": {
      const { pid, tabell, radId, falt, varde } = action;
      const post = (state.projektstart || []).find((x) => x.projektId === pid);
      const rader = post?.utkast?.rader?.[tabell] || [];
      const rad = rader.find((r) => r.id === radId);
      if (!rad || Object.is(rad[falt], varde)) return state;
      const nyPost = {
        ...post,
        utkast: { ...post.utkast, rader: { ...post.utkast.rader, [tabell]: rader.map((r) => (r.id === radId ? { ...r, [falt]: varde } : r)) } },
        uppdaterad: new Date().toISOString(),
      };
      const nytt = { ...state, projektstart: state.projektstart.map((x) => (x.id === post.id ? nyPost : x)) };
      return loggat(nytt, pid, `${tabell === "interface" ? "Interface-lista" : tabell}: ${rad.granssnitt || radId} ${falt} → ${String(varde ?? "—").slice(0, 60)}`);
    }

    case "EPC_PUNKT": {
      const { pid, punkt, status } = action;
      const nytt = {
        ...state,
        epcPunkter: uppsatt(state.epcPunkter, (r) => r.projektId === pid && r.punkt === punkt, {
          id: `ep-${pid}-${punkt}`,
          projektId: pid,
          punkt,
        }, { status, datum: status ? idag() : "", av: status ? hamtaNamn() || "" : "" }),
      };
      const hp = PUNKT_FOR_ID.get(punkt)?.badges.includes("HP");
      const vad =
        status === "klar" ? (hp ? "hållpunkt godkänd" : "klar") : status === "ejaktuell" ? "ej aktuell" : "återöppnad";
      return loggat(nytt, pid, `EPC ${punkt.replace("lop.", "∞.")} ${vad}`);
    }

    /* Kommentar, avvikelse eller lärdom på en punkt. Avvikelser och lärdomar
       blir erfarenhetslistan när projektet är klart. */
    case "EPC_KOMMENTAR": {
      const { pid, punkt, typ = "notering", text, gorSa = "", paverkan = 2, kostnad = "" } = action;
      const rad = {
        id: action.id || "ek" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        projektId: pid,
        punkt,
        typ,
        text: (text || "").trim(),
        gorSa: (gorSa || "").trim(),
        paverkan: Number(paverkan) || 2,
        kostnad,
        datum: idag(),
        av: hamtaNamn() || "",
      };
      if (!rad.text) return state;
      const nytt = { ...state, epcKommentarer: [...(state.epcKommentarer || []), rad] };
      const namn = { notering: "Kommentar", avvikelse: "Avvikelse", lardom: "Lärdom" }[typ] || "Kommentar";
      return loggat(nytt, pid, `${namn} på EPC ${punkt.replace("lop.", "∞.")}: ${rad.text.slice(0, 80)}`);
    }

    case "EPC_KOMMENTAR_UPPD": {
      const { id, falt, varde } = action;
      return { ...state, epcKommentarer: (state.epcKommentarer || []).map((k) => (k.id === id ? { ...k, [falt]: varde } : k)) };
    }

    case "EPC_KOMMENTAR_BORT":
      return { ...state, epcKommentarer: (state.epcKommentarer || []).filter((k) => k.id !== action.id) };

    /* EPC-checklistan: fasens egna datum, passerad grind och anteckningar.
       Grindpassage loggas — den låser upp nästa fas och ibland en betalning. */
    case "EPC_FAS": {
      const { pid, fas, falt, varde } = action;
      const nytt = {
        ...state,
        epcFaser: uppsatt(state.epcFaser, (r) => r.projektId === pid && r.fas === fas, {
          id: `ef-${pid}-${fas}`,
          projektId: pid,
          fas,
        }, { [falt]: varde }),
      };
      if (falt !== "grindDatum") return nytt;
      return loggat(nytt, pid, varde ? `G${fas} passerad ${varde}` : `G${fas} återöppnad`);
    }

    /* Tidplanens baslinje: en per projekt, skrivs över vid ny sparning. */
    case "SPARA_BASLINJE": {
      const { rad } = action;
      const lista = (state.epcBaslinje || []).filter((r) => r.projektId !== rad.projektId);
      return loggat({ ...state, epcBaslinje: [...lista, rad] }, rad.projektId, `Baslinje för tidplanen sparad ${rad.sparad}`);
    }

    /* Veckans prognos: en rad per projekt och vecka, skrivs över om den sparas igen. */
    case "SPARA_PROGNOS": {
      const { rad } = action;
      const lista = state.prognoser || [];
      const finns = lista.some((r) => r.id === rad.id);
      return { ...state, prognoser: finns ? lista.map((r) => (r.id === rad.id ? rad : r)) : [...lista, rad] };
    }

    /* Fritextpost i ändringsloggen — för händelser utan statusövergång. */
    case "LOGGA":
      return loggat(state, action.projektId, action.text);

    /* Kanban: flytta ett kort mellan kolumner. Loggas som statusändring. */
    case "FLYTTA_KORT": {
      const { lista, id, falt, varde } = action;
      return reducer(state, { type: "UPPDATERA_STATUS", lista, id, falt, varde });
    }

    default:
      return state;
  }
}

/** Sant för åtgärder som rör administratörslåst ekonomidata (eget dokument). */
export function arEkonomiAtgard(action) {
  return (
    action.type === "UPPD_KONTRAKT" ||
    action.type === "UPPD_BETALPLAN" ||
    action.type === "UPPD_BETALPLAN_NY"
  );
}
