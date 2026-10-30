/* Ren reducer för hela portföljen. Inga sidoeffekter, ingen DOM, ingen lagring —
   det ligger i PortfolioProvider. All uppdatering är immutabel, vilket är det
   som gör att React kan rendera om rätt delar av trädet. */

import { SEED } from "../data/seed.js";
import { KANDA_MAPPAR, SLUTDOK_MALL } from "../data/konstanter.js";
import { migreraUr } from "../lib/berakningar.js";
import { nyApdRad } from "../lib/apd.js";
import { idag } from "../lib/datum.js";
import { forslagText, kanTillampas, tillampaForslag } from "../lib/importera.js";
import { projektFasFranEpc } from "../lib/projektfasEpc.js";
import { medNyaMoment, medPostmoment } from "../lib/postmoment.js";
import { arDold } from "../lib/arkiv.js";
import { sattVidSteg } from "../lib/sammanfoga.js";
import { ARVSDELAR, arv } from "../lib/projektmall.js";
import { projektstartFel } from "../lib/projektstart.js";
import { EJ_VUNNET_ORSAKER, FAS_MODELL, arFasNr, faseFranGammal, fasFranStatus, faseInfo, riskFasFranGammal, forstaFasForStatus, normaliseraStatus, statusEtikett } from "../data/projektfaser.ts";
import { hamtaNamn, etikettFor, medLogg, byt, loggat } from "./reducers/hjalp.js";
import { ataReducer } from "./reducers/ataReducer.js";
import { punkterReducer } from "./reducers/punkterReducer.js";
import { hseqReducer } from "./reducers/hseqReducer.js";
import { siteReducer } from "./reducers/siteReducer.js";
import { ekonomiReducer } from "./reducers/ekonomiReducer.js";

/* Publikt gränssnitt oförändrat: namn och ekonomikanal bor nu i reducers/. */
export { NAMN_KEY, hamtaNamn, sparaNamn } from "./reducers/hjalp.js";
export { arEkonomiAtgard } from "./reducers/ekonomiReducer.js";

/* Domänreducers som frågas i tur och ordning när kärnan inte känner igen åtgärden. */
const DOMANER = [ataReducer, punkterReducer, hseqReducer, siteReducer, ekonomiReducer];

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
  return medPostmoment({
    ...state,
    ur,
    projekt,
    risker,
    slutdok: medSlutdokrader(state, projekt),
    handlingsplaner: medHandlingsplaner(state, projekt),
    hseqApd: medApdRader(state, projekt),
  });
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

/* ---------- Reducer ---------- */

/* Varje ändring passerar medNyaMoment: nya poster utan moment får projektets aktuella
   moment (lib/postmoment.js). Hela state från inläsning och delning går orört igenom —
   efterInlasning sätter moment där. */
export function reducer(state, action) {
  const nytt = reducerInre(state, action);
  if (nytt === state || action.type === "SATT_STATE" || action.type === "SATT_LOGG") return nytt;
  return medNyaMoment(state, nytt);
}

function reducerInre(state, action) {
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

    /* Fritextpost i ändringsloggen — för händelser utan statusövergång. */
    case "LOGGA":
      return loggat(state, action.projektId, action.text);

    /* Kanban: flytta ett kort mellan kolumner. Loggas som statusändring. */
    case "FLYTTA_KORT": {
      const { lista, id, falt, varde } = action;
      return reducer(state, { type: "UPPDATERA_STATUS", lista, id, falt, varde });
    }

    default: {
      for (const doman of DOMANER) {
        const ut = doman(state, action);
        if (ut !== undefined) return ut;
      }
      return state;
    }
  }
}

