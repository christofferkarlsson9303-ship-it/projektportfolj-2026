import { idag } from "./datum.js";
export const KONTROLLRESULTAT = [["", "Ej kontrollerad"], ["ok", "OK"], ["ej-ok", "Ej OK"], ["ej-tillamplig", "Ej tillämplig"]];
export const kontrollNamn = (v) => KONTROLLRESULTAT.find(([k]) => k === v)?.[1] || "Ej kontrollerad";
export const kontrollId = (projektId, omfattning, punktId) => JSON.stringify([projektId, omfattning.trim() || "Hela anläggningen", punktId]);
export function kontrollBrister(r, revision) {
  if (!r?.resultat) return ["Resultat saknas"];
  const fel = [];
  if (r.resultat === "ej-ok") fel.push("Avvikelse – kräver åtgärd och ny kontroll");
  if (!KONTROLLRESULTAT.some(([k]) => k === r.resultat)) fel.push("Okänt resultat");
  if (!r.datum) fel.push("Kontrolldatum saknas");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(r.datum) || Number.isNaN(Date.parse(r.datum)) || r.datum > idag()) fel.push("Datum är ogiltigt eller ligger i framtiden");
  if (!r.kontrollant?.trim()) fel.push("Kontrollant saknas");
  if (!r.referens?.trim()) fel.push("Bevis/protokollreferens saknas");
  if (r.resultat === "ej-tillamplig" && !r.notering?.trim()) fel.push("Motivering saknas");
  if (r.mallrevision !== revision) fel.push("Äldre mallrevision – kontrollera igen");
  return fel;
}
export function kontrollSummering(moment, revision) {
  const punkter = moment.flatMap((m) => m.punkter);
  return { totalt: punkter.length, klara: punkter.filter((p) => !kontrollBrister(p.kontroll, revision).length).length,
    avvikelser: punkter.filter((p) => p.kontroll?.resultat === "ej-ok").length,
    oppna: punkter.filter((p) => kontrollBrister(p.kontroll, revision).length).length };
}
export function rapportStatus(d) {
  if (!d.visaResultat) return "Blank projektchecklista";
  if (!d.komplett) return "Delurval – arbetsunderlag";
  if (!d.kontrollplan?.trim() || d.sammanstallning.oppna) return "Arbetsunderlag – öppna eller ofullständiga kontroller";
  return "Egenkontroll – redo för granskning";
}
