/* Import av filer till portföljen.

   Allt här är rena funktioner. En fil blir först ett FÖRSLAG — vad som
   läggs till, vad som ändras och vad som varnas för — som visas för
   användaren. Först när förslaget godkänns tillämpas det, via reducern.
   Ingenting tas någonsin bort av en import; saknas en post i filen
   rapporteras det bara.

   Förslagets form:
     { typ, titel, filnamn, lista, projektId,
       nya: [rad], uppdateringar: [{ id, etikett, fore, efter }],
       oforandrade, varningar: [text], info: [text],
       ersatt?: state   // bara för säkerhetskopia — hela portföljen byts
       mote?: rad        // bara för protokoll — mötet som skapas i Byggmöten
     } */

import { CSV_TABELLER } from "../data/konstanter.js";
import { SEED } from "../data/seed.js";
import { excelDatum } from "./xlsx.js";

/* ---------- Filtyp ---------- */

export function filtyp(filnamn = "") {
  const n = filnamn.toLowerCase();
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".xlsx") || n.endsWith(".xlsm")) return "xlsx";
  if (/\.(pdf|docx?|odt)$/.test(n)) return "protokoll";
  return null;
}

/* ---------- Tolkning av värden ---------- */

/** "  6 985 kr" → 6985, "1 234,50" → 1234.5, "" → null. */
export function tolkaTal(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "")
    .replace(/\s|kr|sek|:-/gi, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Excel-serienummer, "2026-06-17", " 2026-06-17 " eller "17/6 2026" → ISO. */
export function tolkaDatum(v) {
  if (typeof v === "number") return excelDatum(v);
  const s = String(v ?? "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.\s]+(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

const rensa = (v) => String(v ?? "").replace(/\r\n?/g, "\n").trim();

/* ---------- Projekt ---------- */

const normal = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Hittar projektet som en text syftar på — AO-nr, ort eller namn.
 *  Returnerar null hellre än att gissa när flera projekt matchar. */
export function hittaProjekt(state, text) {
  const t = normal(text);
  if (!t) return null;

  // Bara ord som är unika för ett projekt räknas — "Batteripark" står i
  // flera namn och säger ingenting om vilket projekt som avses.
  const ordFor = (p) =>
    [...new Set([p.ort, ...(p.namn || "").split(/\s+/)].map(normal).filter((o) => o.length >= 4))];
  const antal = new Map();
  for (const p of state.projekt) for (const o of ordFor(p)) antal.set(o, (antal.get(o) || 0) + 1);

  const traffar = state.projekt.filter((p) => {
    if (p.nr && t.includes(normal(p.nr))) return true;
    return ordFor(p)
      .filter((o) => antal.get(o) === 1)
      .some((o) => new RegExp(`(^|[^a-z])${o}([^a-z]|$)`).test(t));
  });
  return traffar.length === 1 ? traffar[0].id : null;
}

/* ---------- UR-logg (Excel) ---------- */

const UR_KOLUMNER = {
  nr: /^nummer$/i,
  rubrik: /^rubrik$/i,
  skapad: /^datum skapad$/i,
  skapadAv: /^skapad av$/i,
  oppenStangd: /^öppen\s*\/\s*stängd$/i,
  stangd: /^datum stängd$/i,
  paverkan: /^påverkan$/i,
  kostnad: /^kostnad$/i,
  kommentar: /^kommentar$/i,
};

/** Hittar bladet och rubrikraden som ser ut som en UR-logg. */
export function hittaUrLogg(blad) {
  for (const b of blad) {
    for (let r = 0; r < Math.min(b.rader.length, 30); r++) {
      const rad = b.rader[r].map((c) => rensa(c));
      const kol = {};
      for (const [nyckel, re] of Object.entries(UR_KOLUMNER)) {
        const i = rad.findIndex((c) => re.test(c));
        if (i >= 0) kol[nyckel] = i;
      }
      if (kol.nr !== undefined && kol.rubrik !== undefined) {
        const projektText = b.rader
          .slice(0, r)
          .flat()
          .map(rensa)
          .find((c) => /^projekt\s*:/i.test(c));
        return { blad: b, rubrikrad: r, kol, projektText: projektText || "" };
      }
    }
  }
  return null;
}

/* Status: filen vet bara öppen/stängd, appen har ett finare flöde. Filen
   får stänga och återöppna, men skriver aldrig över ett finare läge. */
function urStatus(fil, nuvarande) {
  const stangd = /^stängd$/i.test(fil);
  const oppen = /^öppen$/i.test(fil);
  const avslutad = nuvarande === "stangd" || nuvarande === "utgar";
  if (stangd) return avslutad ? nuvarande : "stangd";
  if (oppen) return avslutad ? "oppen" : nuvarande || "oppen";
  return nuvarande || "oppen";
}

const likaNr = (a, b) => a !== b && a.replace(/^UR0*/i, "UR") === b.replace(/^UR0*/i, "UR");

export function forslagUrLogg(state, bok, { filnamn = "", projektId = null } = {}) {
  const hit = hittaUrLogg(bok.blad);
  if (!hit) {
    return fel("urlogg", filnamn, "Hittade ingen UR-logg — rubrikraden med Nummer och Rubrik saknas.");
  }

  const pid = projektId || hittaProjekt(state, hit.projektText) || hittaProjekt(state, filnamn);
  const bas = {
    typ: "urlogg",
    titel: "UR-logg → ÄTA och hinder",
    filnamn,
    lista: "ur",
    projektId: pid,
    nya: [],
    uppdateringar: [],
    oforandrade: 0,
    varningar: [],
    info: [],
  };
  if (!pid) {
    bas.varningar.push(
      `Kunde inte avgöra projektet${hit.projektText ? ` ur "${hit.projektText}"` : ""} — välj projekt innan du tillämpar.`
    );
    return bas;
  }

  const { kol } = hit;
  const cell = (rad, k) => (kol[k] === undefined ? "" : rad[kol[k]]);
  const befintliga = state.ur.filter((u) => u.projektId === pid);
  const sedda = new Set();
  let lopnr = Date.now();

  for (const rad of hit.blad.rader.slice(hit.rubrikrad + 1)) {
    const nr = rensa(cell(rad, "nr"));
    const text = rensa(cell(rad, "rubrik"));
    // Förnumrerade tomma rader (UR011 … UR336) är mallens reserv, inte poster.
    if (!nr || !text) continue;
    if (sedda.has(nr)) {
      bas.varningar.push(`${nr} förekommer flera gånger i filen — bara första raden används.`);
      continue;
    }
    sedda.add(nr);

    const [forsta, ...resten] = text.split("\n");
    const falt = {
      benamning: forsta.trim(),
      beskrivning: resten.join("\n").trim(),
      handelseDatum: tolkaDatum(cell(rad, "skapad")),
      skapadAv: rensa(cell(rad, "skapadAv")),
      stangdDatum: tolkaDatum(cell(rad, "stangd")),
      paverkan: rensa(cell(rad, "paverkan")),
      belopp: tolkaTal(cell(rad, "kostnad")),
      loggKommentar: rensa(cell(rad, "kommentar")),
    };
    const oppenStangd = rensa(cell(rad, "oppenStangd"));

    const u = befintliga.find((x) => x.nr === nr);
    if (!u) {
      const likt = befintliga.find((x) => likaNr(x.nr, nr));
      if (likt) bas.varningar.push(`${nr} läggs till som ny post — observera att ${likt.nr} redan finns.`);
      bas.nya.push({
        id: "u" + lopnr++,
        projektId: pid,
        nr,
        ...falt,
        status: urStatus(oppenStangd, ""),
        klass: "oklar",
        underrattelseDatum: "",
        prisgrund: "lopande",
        godkantDatum: "",
        fakturaDatum: "",
        arbeteStartat: false,
        orsak: "",
        ansvarig: "",
        kalla: filnamn,
      });
      continue;
    }

    const efter = {};
    const fore = {};
    const satt = (k, v) => {
      if (v === "" || v === null || v === undefined) return; // tom cell raderar aldrig
      if (String(u[k] ?? "") === String(v)) return;
      fore[k] = u[k] ?? "";
      efter[k] = v;
    };
    for (const [k, v] of Object.entries(falt)) satt(k, v);
    satt("status", urStatus(oppenStangd, u.status));
    if (Object.keys(efter).length) bas.uppdateringar.push({ id: u.id, etikett: `${nr} ${u.benamning || ""}`.trim(), fore, efter });
    else bas.oforandrade++;
  }

  const saknas = befintliga.filter((u) => !sedda.has(u.nr));
  if (saknas.length)
    bas.info.push(
      `${saknas.length} post${saknas.length > 1 ? "er" : ""} finns i appen men inte i filen (${saknas
        .map((u) => u.nr)
        .join(", ")}) — de lämnas orörda.`
    );
  return bas;
}

/* ---------- CSV (appens egen export) ---------- */

/** Semikolon-CSV med citattecken, BOM och CRLF — som export.js skriver. */
export function lasCsv(text) {
  const s = String(text).replace(/^﻿/, "");
  const rader = [];
  let rad = [];
  let falt = "";
  let citat = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (citat) {
      if (c === '"' && s[i + 1] === '"') {
        falt += '"';
        i++;
      } else if (c === '"') citat = false;
      else falt += c;
    } else if (c === '"') citat = true;
    else if (c === ";") {
      rad.push(falt);
      falt = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      rad.push(falt);
      rader.push(rad);
      rad = [];
      falt = "";
    } else falt += c;
  }
  if (falt !== "" || rad.length) {
    rad.push(falt);
    rader.push(rad);
  }
  return rader.filter((r) => r.some((c) => c !== ""));
}

/* Listor som inte får skrivas via import: ändringsloggen är append-only och
   betalplanen är administratörslåst (sparas i ett eget dokument). */
const SPARRADE = { andringslogg: "Ändringsloggen", betalplan: "Betalplanen" };

/** Vilken lista en CSV hör till — ur filnamnet Portfolj_<Namn>_<datum>.csv. */
export function listaForCsv(filnamn) {
  const rent = (s) => String(s).replace(/[^\wåäöÅÄÖ]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
  const n = rent(filnamn.replace(/\.csv$/i, ""));
  const traff = CSV_TABELLER.map(([lista, namn]) => [lista, rent(namn)])
    .filter(([, namn]) => n.includes(namn))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return traff ? traff[0] : null;
}

/* Värdet i CSV:n tillbaka till samma typ som fältet redan har. Nästlade
   objekt skrivs som JSON med ' i exporten och går inte att läsa tillbaka
   säkert — de lämnas som de är. */
function tillTyp(text, nuvarande) {
  if (nuvarande !== null && typeof nuvarande === "object") return { hoppa: true };
  if (typeof nuvarande === "number") return { v: text === "" ? null : tolkaTal(text) };
  if (typeof nuvarande === "boolean") return { v: /^(true|1|ja)$/i.test(text) };
  if (nuvarande === null && /^-?\d+([.,]\d+)?$/.test(text)) return { v: tolkaTal(text) };
  return { v: text };
}

export function forslagCsv(state, text, { filnamn = "", lista = null } = {}) {
  const l = lista || listaForCsv(filnamn);
  if (!l) return fel("csv", filnamn, "Kunde inte avgöra vilken tabell filen hör till — filnamnet ska vara som vid export.");
  if (SPARRADE[l]) return fel("csv", filnamn, `${SPARRADE[l]} kan inte skrivas via import.`);
  if (!Array.isArray(state[l])) return fel("csv", filnamn, `Okänd tabell: ${l}.`);

  const rader = lasCsv(text);
  const [rubriker, ...data] = rader;
  const idKol = (rubriker || []).indexOf("id");
  const namn = CSV_TABELLER.find(([k]) => k === l)?.[1] || l;
  const bas = {
    typ: "csv",
    titel: `CSV → ${namn}`,
    filnamn,
    lista: l,
    projektId: null,
    nya: [],
    uppdateringar: [],
    oforandrade: 0,
    varningar: [],
    info: [],
  };
  if (idKol < 0) {
    bas.varningar.push("Kolumnen id saknas — raderna kan inte matchas mot befintliga poster.");
    return bas;
  }

  let hoppadeNastlade = false;
  for (const cellar of data) {
    const id = cellar[idKol];
    if (!id) continue;
    const befintlig = state[l].find((r) => r.id === id);
    if (!befintlig) {
      const ny = {};
      rubriker.forEach((k, i) => {
        const v = cellar[i] ?? "";
        if (/^[[{]/.test(v)) {
          hoppadeNastlade = true;
          return;
        }
        ny[k] = tillTyp(v, null).v;
      });
      bas.nya.push(ny);
      continue;
    }
    const fore = {};
    const efter = {};
    rubriker.forEach((k, i) => {
      if (k === "id") return;
      const t = tillTyp(cellar[i] ?? "", befintlig[k]);
      if (t.hoppa) {
        hoppadeNastlade = true;
        return;
      }
      if (String(befintlig[k] ?? "") !== String(t.v ?? "")) {
        fore[k] = befintlig[k] ?? "";
        efter[k] = t.v;
      }
    });
    if (Object.keys(efter).length) {
      const etikett = befintlig.nr || befintlig.titel || befintlig.benamning || befintlig.krav || befintlig.namn || id;
      bas.uppdateringar.push({ id, etikett: String(etikett), fore, efter });
    } else bas.oforandrade++;
  }
  if (hoppadeNastlade) bas.info.push("Nästlade fält (listor och objekt) läses inte tillbaka från CSV och lämnas orörda.");
  return bas;
}

/* ---------- Säkerhetskopia (JSON) ---------- */

export function forslagBackup(state, text, { filnamn = "" } = {}) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fel("backup", filnamn, "Filen är inte giltig JSON.");
  }
  const inne = data && data._format === "one-nordic-projektportfolj" ? data.state : data;
  if (!inne || !Array.isArray(inne.projekt)) {
    return fel("backup", filnamn, "Filen ser inte ut som en säkerhetskopia av portföljen.");
  }

  const bas = {
    typ: "backup",
    titel: "Säkerhetskopia → hela portföljen",
    filnamn,
    lista: null,
    projektId: null,
    nya: [],
    uppdateringar: [],
    oforandrade: 0,
    varningar: ["Återställningen ersätter all arbetsdata i portföljen. Ta en ny säkerhetskopia först."],
    info: [
      "Kontraktsvärde och betalplan är administratörslåsta och behålls som de är.",
      "Ändringsloggen behålls — den är en egen tabell som bara går att lägga till i.",
    ],
    skapad: data._skapad || "",
    av: data._av || "",
    // Per tabell: antal nu → antal efter, för förhandsgranskningen.
    tabeller: Object.keys(SEED)
      .filter((k) => Array.isArray(SEED[k]) && k !== "andringslogg")
      .map((k) => ({ lista: k, nu: (state[k] || []).length, efter: Array.isArray(inne[k]) ? inne[k].length : 0 }))
      .filter((t) => t.nu || t.efter),
    ersatt: inne,
  };
  return bas;
}

/* ---------- Protokoll (Byggmöten) ---------- */

/** Mötesnummer ur filnamnet: "Byggmöte_9_-_Växjö", "BM09", "Byggmöte 10". */
export function moteNrUrFilnamn(filnamn) {
  const m =
    String(filnamn).match(/bygg\s*m[öo]te[\s_-]*(?:nr\.?\s*)?(\d{1,3})/i) || String(filnamn).match(/\bBM[\s_-]*(\d{1,3})\b/i);
  return m ? "BM-" + String(Number(m[1])).padStart(2, "0") : "";
}

export function forslagProtokoll(state, { filnamn = "", projektId = null, datum = "" } = {}) {
  const pid = projektId || hittaProjekt(state, filnamn);
  const nr = moteNrUrFilnamn(filnamn);
  const bas = {
    typ: "protokoll",
    titel: "Mötesprotokoll → Byggmöten",
    filnamn,
    lista: "byggmoten",
    projektId: pid,
    nya: [],
    uppdateringar: [],
    oforandrade: 0,
    varningar: [],
    info: ["Protokollet blir MASTER för projektet — tidigare protokoll arkiveras."],
    moteNr: nr,
  };
  if (!pid) bas.varningar.push("Kunde inte avgöra projektet ur filnamnet — välj projekt innan du tillämpar.");
  if (!nr) bas.info.push("Mötesnummer saknas i filnamnet — protokollet arkiveras utan att kopplas till ett möte.");
  if (!pid || !nr) return bas;

  const finns = (state.byggmoten || []).find((m) => m.projektId === pid && m.nr === nr);
  if (finns) {
    bas.uppdateringar.push({
      id: finns.id,
      etikett: nr,
      fore: { protokollFil: finns.protokollFil || "" },
      efter: { protokollFil: filnamn },
    });
  } else {
    bas.nya.push({
      id: "bm" + Date.now(),
      projektId: pid,
      nr,
      datum,
      plats: "",
      nasta: "",
      deltagare: "",
      status: "justerat",
      punkter: [],
      protokollFil: filnamn,
      importerat: true,
    });
  }
  return bas;
}

/* ---------- Gemensamt ---------- */

function fel(typ, filnamn, text) {
  return {
    typ,
    titel: "Kan inte läsas in",
    filnamn,
    lista: null,
    projektId: null,
    nya: [],
    uppdateringar: [],
    oforandrade: 0,
    varningar: [text],
    info: [],
    fel: true,
  };
}

/** Kan förslaget tillämpas? Kräver projekt där det behövs och något att göra. */
export function kanTillampas(f) {
  if (!f || f.fel) return false;
  if (f.typ === "backup") return !!f.ersatt;
  if ((f.typ === "urlogg" || f.typ === "protokoll") && !f.projektId) return false;
  return f.typ === "protokoll" || f.nya.length > 0 || f.uppdateringar.length > 0;
}

/** Sammanfattning till ändringsloggen. */
export function forslagText(f) {
  if (f.typ === "backup") return `Återställd från säkerhetskopia ${f.filnamn}`;
  const delar = [];
  if (f.nya.length) delar.push(`${f.nya.length} nya`);
  if (f.uppdateringar.length) delar.push(`${f.uppdateringar.length} uppdaterade`);
  return `Import ${f.filnamn}: ${delar.join(", ") || "inga ändringar"}`;
}

/** Tillämpar förslaget på state. Rent — reducern anropar den. */
export function tillampaForslag(state, f) {
  if (!kanTillampas(f)) return state;

  if (f.typ === "backup") {
    const inne = f.ersatt;
    const ekonomi = Object.fromEntries(state.projekt.map((p) => [p.id, p.kontraktsvarde ?? null]));
    const ut = { ...state };
    for (const k of Object.keys(SEED)) {
      if (k === "andringslogg" || k === "betalplan") continue;
      if (Array.isArray(SEED[k])) ut[k] = Array.isArray(inne[k]) ? inne[k] : [];
    }
    ut.projekt = ut.projekt.map((p) =>
      Object.prototype.hasOwnProperty.call(ekonomi, p.id) ? { ...p, kontraktsvarde: ekonomi[p.id] } : { ...p, kontraktsvarde: null }
    );
    return ut;
  }

  const lista = f.lista;
  const andringar = new Map(f.uppdateringar.map((u) => [u.id, u.efter]));
  const uppdaterad = (state[lista] || []).map((r) => (andringar.has(r.id) ? { ...r, ...andringar.get(r.id) } : r));
  return { ...state, [lista]: [...uppdaterad, ...f.nya] };
}
