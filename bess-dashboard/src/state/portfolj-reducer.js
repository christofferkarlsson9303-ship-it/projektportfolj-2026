/* Ren reducer för hela portföljen. Inga sidoeffekter, ingen DOM, ingen lagring —
   det ligger i PortfolioProvider. All uppdatering är immutabel, vilket är det
   som gör att React kan rendera om rätt delar av trädet. */

import { SEED } from "../data/seed.js";
import { KANDA_MAPPAR, PILL, SLUTDOK_MALL } from "../data/konstanter.js";
import { migreraUr } from "../lib/berakningar.js";
import { forslagText, kanTillampas, tillampaForslag } from "../lib/importera.js";

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
    return nytt;
  });
  return {
    ...state,
    ur,
    projekt,
    slutdok: medSlutdokrader(state, projekt),
    handlingsplaner: medHandlingsplaner(state, projekt),
  };
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
    default:
      return { etikett: String(id), projektId: rad.projektId || null };
  }
};

function medLogg(state, lista, id, gammalt, nytt) {
  const info = etikettFor(state, lista, id);
  if (!info) return state.andringslogg || [];
  const g = (PILL[gammalt] || [undefined, gammalt || "—"])[1];
  const n = (PILL[nytt] || [undefined, nytt])[1];
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

    case "UPPDATERA": {
      const { lista, id, falt, varde } = action;
      if (!state[lista]) return state;
      return { ...state, [lista]: byt(state[lista], id, (r) => ({ ...r, [falt]: varde })) };
    }

    /* Statusändring loggas — det är den som revisionsspåret bygger på. */
    case "UPPDATERA_STATUS": {
      const { lista, id, falt, varde } = action;
      if (!state[lista]) return state;
      const rad = state[lista].find((r) => r.id === id);
      if (!rad) return state;
      const gammalt = rad[falt];
      const nytt = { ...state, [lista]: byt(state[lista], id, (r) => ({ ...r, [falt]: varde })) };
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
    case "SATT_LISTA":
      return { ...state, [action.lista]: action.rader };

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
      return {
        ...state,
        hseqRonder: (state.hseqRonder || []).map((r) => {
          if (!(r.avvikelser || []).some((a) => a.id === id)) return r;
          return { ...r, avvikelser: r.avvikelser.map((a) => (a.id === id ? { ...a, [falt]: varde } : a)) };
        }),
      };
    }

    /* Fritextpost i ändringsloggen — för händelser utan statusövergång. */
    case "LOGGA": {
      const post = {
        ts: new Date().toISOString(),
        anvandare: hamtaNamn() || "Okänd",
        projektId: action.projektId || null,
        text: action.text,
      };
      return { ...state, andringslogg: [post, ...(state.andringslogg || [])].slice(0, 150) };
    }

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
