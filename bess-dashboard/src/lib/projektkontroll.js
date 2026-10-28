import { arGiltigtDatum, idag } from "./datum.js";
export const KONTROLLRESULTAT = [["", "Ej kontrollerad"], ["ok", "OK"], ["ej-ok", "Ej OK"], ["ej-tillamplig", "Ej tillämplig"]];
export const kontrollNamn = (v) => KONTROLLRESULTAT.find(([k]) => k === v)?.[1] || "Ej kontrollerad";
export const kontrollId = (projektId, omfattning, punktId) => JSON.stringify([projektId, omfattning.trim() || "Hela anläggningen", punktId]);
/* UE-egenkontroll (2026-10-28). När en underentreprenör utför arbetet gör ONE
   ingen egen kontroll av punkten. ONE:s kontroll är att UE:s egenkontroll är
   mottagen, granskad och skickad till beställaren. Fälten datum, kontrollant
   och referens betyder då mottaget datum, granskare och UE:s protokoll. */
export const UE_GRANSKNING = [
  ["ueSignerat", "Signerad av UE:s ansvarige"],
  ["ueDaterat", "Daterad och rätt projekt/objekt angivet"],
  ["ueAvvikelser", "Varje Nej/avvikelse har kommentar och åtgärd"],
];
/** Förslag när posten saknas: punkter där en entreprenör står först i rollen utförs av UE. */
export const foreslagenUtforare = (punkt) => (/entreprenör/i.test(String(punkt?.roll || "").split("/")[0]) ? "ue" : "egen");
export const arUe = (r) => r?.utforsAv === "ue";

/** @param {import("./typer.js").Kontrollpost|null|undefined} r @param {string} revision @returns {string[]} */
export function kontrollBrister(r, revision) {
  const ue = arUe(r);
  if (!r?.resultat) return [ue ? "Resultat saknas – granska UE:s egenkontroll" : "Resultat saknas"];
  const fel = [];
  if (r.resultat === "ej-ok") fel.push(ue ? "Avvikelse – UE:s egenkontroll åter till UE för åtgärd" : "Avvikelse – kräver åtgärd och ny kontroll");
  if (!KONTROLLRESULTAT.some(([k]) => k === r.resultat)) fel.push("Okänt resultat");
  if (!r.datum) fel.push(ue ? "Mottaget datum saknas" : "Kontrolldatum saknas");
  else if (!arGiltigtDatum(r.datum) || r.datum > idag()) fel.push("Datum är ogiltigt eller ligger i framtiden");
  if (!r.kontrollant?.trim()) fel.push(ue ? "Granskare saknas" : "Kontrollant saknas");
  if (!r.referens?.trim()) fel.push(ue ? "UE:s egenkontroll (dokument) saknas" : "Bevis/protokollreferens saknas");
  if (r.resultat === "ej-tillamplig" && !r.notering?.trim()) fel.push("Motivering saknas");
  if (ue && r.resultat === "ok") {
    if (!r.ue?.trim()) fel.push("UE (företag) saknas");
    const ej = UE_GRANSKNING.filter(([k]) => !r[k]).map(([, n]) => n.charAt(0).toLowerCase() + n.slice(1));
    if (ej.length) fel.push(`Granskning ej klar: ${ej.join(", ")}`);
    if (!r.skickadBestallare) fel.push("Ej skickad till beställaren");
    else if (!arGiltigtDatum(r.skickadBestallare) || r.skickadBestallare > idag()) fel.push("Skickat-datum är ogiltigt eller ligger i framtiden");
    else if (r.datum && r.skickadBestallare < r.datum) fel.push("Skickad till beställaren före mottaget datum");
  }
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

/** Rader till utskrift och PDF för en UE-kontroll, eller null för egen kontroll. */
export function ueUtskrift(k) {
  if (!arUe(k)) return null;
  const ja = (v) => (v ? "Ja" : "Nej");
  return [
    `UE:s egenkontroll: ${k.ue || "UE ej angiven"} · ${k.referens || "dokument ej angivet"}`,
    `Mottagen: ${k.datum || "Ej angivet"} · Granskad av (ONE): ${k.kontrollant || "Ej angiven"} · Granskning: ${kontrollNamn(k.resultat)}`,
    `Signerad: ${ja(k.ueSignerat)} · Daterad/rätt objekt: ${ja(k.ueDaterat)} · Avvikelser kommenterade: ${ja(k.ueAvvikelser)}`,
    `Skickad till beställaren: ${k.skickadBestallare || "Nej"}`,
  ];
}
