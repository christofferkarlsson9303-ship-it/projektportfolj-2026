/* Export till CSV/Excel och JSON.

   CSV-formatet följer standalone-versionen: semikolon som avgränsare och BOM
   först. Det är vad svensk Excel förväntar sig — komma-separerat öppnas i en
   enda kolumn, och utan BOM blir å/ä/ö fel. */

import { idag } from "./datum.js";

function csvVarde(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v).replace(/"/g, "'");
  return String(v);
}

function citera(v) {
  const s = csvVarde(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Bygger CSV ur en lista objekt. Kolumnerna är unionen av alla nycklar. */
export function byggCsv(lista) {
  if (!lista || !lista.length) return "";
  const kol = [];
  lista.forEach((r) => Object.keys(r).forEach((k) => {
    if (!kol.includes(k)) kol.push(k);
  }));
  return (
    "﻿" +
    kol.join(";") +
    "\n" +
    lista.map((r) => kol.map((k) => citera(r[k])).join(";")).join("\n")
  );
}

/** Bygger CSV ur redan formaterade rader: [{rubrik: värde}]. */
export function byggCsvFranKolumner(kolumner, rader) {
  const rubriker = kolumner.map((k) => k.rubrik);
  const kropp = rader.map((rad) =>
    kolumner.map((k) => citera(k.exportVarde ? k.exportVarde(rad) : rad[k.nyckel])).join(";")
  );
  return "﻿" + rubriker.join(";") + "\n" + kropp.join("\n");
}

let DL = null;
let dlKlar = false;

async function hamtaDownloads() {
  if (dlKlar) return DL;
  dlKlar = true;
  try {
    DL = window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads") : null;
  } catch {
    DL = null;
  }
  return DL;
}

/** Sparar en fil. Använder Claudes downloads-capability när den finns,
 *  annars en vanlig Blob-nedladdning — standalone-versionen saknade det
 *  senare och kunde därför inte exportera alls utanför claude.ai. */
export async function laddaNer(filnamn, innehall, mimetyp = "text/csv;charset=utf-8") {
  const dl = await hamtaDownloads();

  if (dl) {
    try {
      await dl.save({ filename: filnamn, data: innehall });
      return { ok: true, txt: "Sparad: " + filnamn };
    } catch (e) {
      const kod = (e && e.code) || "";
      if (kod === "declined") return { ok: false, tyst: true };
      if (kod === "rate_limited") return { ok: false, txt: "Vänta en stund och försök igen.", typ: "warn" };
      // Faller vidare till Blob-vägen nedan.
    }
  }

  try {
    const blob = new Blob([innehall], { type: mimetyp });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filnamn;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Ge webbläsaren en stund att starta nedladdningen innan objektet släpps.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { ok: true, txt: "Sparad: " + filnamn };
  } catch {
    return { ok: false, txt: "Kunde inte spara filen.", typ: "bad" };
  }
}

const rent = (s) => String(s).replace(/[^\wåäöÅÄÖ]+/g, "_").replace(/^_|_$/g, "");

export function exporteraTabell(namn, kolumner, rader) {
  return laddaNer(`Portfolj_${rent(namn)}_${idag()}.csv`, byggCsvFranKolumner(kolumner, rader));
}

export function exporteraLista(namn, lista) {
  return laddaNer(`Portfolj_${rent(namn)}_${idag()}.csv`, byggCsv(lista));
}

export function exporteraJson(state, av) {
  const payload = {
    _format: "one-nordic-projektportfolj",
    _version: 1,
    _skapad: new Date().toISOString(),
    _av: av || "",
    state,
  };
  return laddaNer(
    `Projektportfolj_backup_${idag()}.json`,
    JSON.stringify(payload, null, 1),
    "application/json"
  );
}
