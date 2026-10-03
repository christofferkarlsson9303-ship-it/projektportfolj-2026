export function projektstartFel(state, v) {
  if (!v.namn?.trim()) return "Skriv ett projektnamn.";
  if (v.nr?.trim() && state.projekt.some((p) => (p.nr || "").trim().toLocaleLowerCase("sv") === v.nr.trim().toLocaleLowerCase("sv"))) return "Projektnumret finns redan. Öppna det befintliga projektet.";
  if (v.startdatum && v.fardigstallande && v.startdatum >= v.fardigstallande) return "Färdigdatum ska ligga efter startdatum.";
  return "";
}

export function nyttProjekt(v, id) {
  return { id, nr: (v.nr || "").trim(), namn: v.namn.trim(), ort: (v.ort || "").trim(), bestallare: (v.bestallare || "").trim(),
    startdatum: v.startdatum || "", fardigstallande: v.fardigstallande || "", startdatumAntagande: false,
    kontraktsvarde: null, mw: null, mwh: null, natagare: "", natkontakt: "", fiber: "", mapp: "", anteckning: "", status: "Planering",
    underlag: { kalla: "", datum: "", infort: "", av: "" } };
}
